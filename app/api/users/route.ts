/**
 * VoterScope Demo — Users Collection API
 *
 * GET  /api/users — List scoped users based on administrator role hierarchy
 * POST /api/users — Create new user with Argon2id password hashing
 *
 * ALL USER DATA REPRESENTS SYNTHETIC DEMO CREDENTIALS.
 */

import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canPerformUserAction, getUserScope, normalizeUserTerritoryByRole } from "@/lib/authorization";
import { UserCreateSchema } from "@/lib/validation/schemas";
import { ensureTerritoryExists } from "@/lib/territory/kodewilayah";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { AuditAction, AuditResourceType, AuditResult, UserRole } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const actor = await getSessionUser();
    if (!actor) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformUserAction(actor, "read")) {
      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki izin untuk mengelola data akun pengguna."
      );
    }

    const scope = getUserScope(actor);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    // Scope boundary filter
    const scopeFilter: Prisma.UserWhereInput = {};
    if (scope.level === "PROVINCE" && scope.provinceId) {
      scopeFilter.provinceId = scope.provinceId;
    } else if (scope.level === "KABUPATEN" && scope.kabupatenId) {
      scopeFilter.kabupatenId = scope.kabupatenId;
    } else if (scope.level === "KECAMATAN" && scope.kecamatanId) {
      scopeFilter.kecamatanId = scope.kecamatanId;
    }

    const where: Prisma.UserWhereInput = {
      ...scopeFilter,
      ...(role ? { role } : {}),
      ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search } },
              { fullName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        provinceId: true,
        kabupatenId: true,
        kecamatanId: true,
        kelurahanId: true,
        province: { select: { id: true, name: true, code: true } },
        kabupaten: { select: { id: true, name: true, code: true } },
        kecamatan: { select: { id: true, name: true, code: true } },
        kelurahan: { select: { id: true, name: true, code: true } },
      },
    });

    return successResponse({
      data: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    console.error("[USERS_API] GET error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getSessionUser();
    if (!actor) {
      return errorResponse("UNAUTHORIZED");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Body JSON tidak valid.");
    }

    const parseResult = UserCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data pendaftaran akun pengguna tidak valid.",
            issues: parseResult.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    // Role Escalation Protection
    const isAllowed = canPerformUserAction(actor, "create", data.role as UserRole);
    if (!isAllowed) {
      await createAuditLog({
        userId: actor.id,
        action: AuditAction.ACCESS_DENIED,
        resourceType: AuditResourceType.USER,
        ipAddress: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
        result: AuditResult.FAILURE,
        metadata: {
          reason: "ROLE_ESCALATION_ATTEMPT",
          actorRole: actor.role,
          targetRole: data.role,
        },
      });

      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki hak untuk membuat akun dengan peran setara atau lebih tinggi dari Anda."
      );
    }

    // Normalize territory fields strictly by role hierarchy
    const normalizedTerritory = normalizeUserTerritoryByRole(data.role, {
      provinceId: data.provinceId,
      kabupatenId: data.kabupatenId,
      kecamatanId: data.kecamatanId,
      kelurahanId: data.kelurahanId,
    });

    // Territory Scope Check for subordinate roles
    const actorScope = getUserScope(actor);
    if (actorScope.level === "PROVINCE" && normalizedTerritory.provinceId !== actorScope.provinceId) {
      return errorResponse("FORBIDDEN", "Pengguna harus berada dalam provinsi yang sama.");
    }
    if (actorScope.level === "KABUPATEN" && normalizedTerritory.kabupatenId !== actorScope.kabupatenId) {
      return errorResponse("FORBIDDEN", "Pengguna harus berada dalam kabupaten yang sama.");
    }
    if (actorScope.level === "KECAMATAN" && normalizedTerritory.kecamatanId !== actorScope.kecamatanId) {
      return errorResponse("FORBIDDEN", "Pengguna harus berada dalam kecamatan yang sama.");
    }

    // Duplicate Check: Username & Email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
      },
    });

    if (existing) {
      const isUsernameDuplicate = existing.username === data.username;
      return errorResponse(
        "CONFLICT",
        isUsernameDuplicate
          ? "Username sudah digunakan oleh akun lain."
          : "Alamat email sudah terdaftar dalam sistem."
      );
    }

    // Ensure referenced territories exist in database to prevent foreign key violations (P2003)
    await ensureTerritoryExists(normalizedTerritory);

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
    });

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        passwordHash,
        role: data.role,
        isActive: true,
        ...normalizedTerritory,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        provinceId: true,
        kabupatenId: true,
        kecamatanId: true,
        kelurahanId: true,
      },
    });

    await createAuditLog({
      userId: actor.id,
      action: AuditAction.USER_CREATE,
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: {
        createdUsername: user.username,
        role: user.role,
      },
    });

    return successResponse(
      {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
      201
    );
  } catch (err) {
    console.error("[USERS_API] POST error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
