/**
 * VoterScope Demo — User Profile API
 *
 * GET   /api/profile — Fetch current authenticated user profile
 * PATCH /api/profile — Self-service profile update (fullName, email)
 *
 * ALL USER DATA REPRESENTS SYNTHETIC DEMO CREDENTIALS.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { ProfileUpdateSchema } from "@/lib/validation/schemas";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { AuditAction, AuditResourceType, AuditResult } from "@/lib/types";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
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

    if (!profile) {
      return errorResponse("NOT_FOUND", "Profil pengguna tidak ditemukan.");
    }

    return successResponse({
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("[PROFILE_API] GET error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Body JSON tidak valid.");
    }

    const parseResult = ProfileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data pembaruan profil tidak valid.",
            issues: parseResult.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    // Check email conflict if email changed
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id: user.id },
      },
    });

    if (emailTaken) {
      return errorResponse(
        "CONFLICT",
        "Alamat email sudah digunakan oleh pengguna lain."
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: data.fullName,
        email: data.email,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: AuditAction.USER_UPDATE,
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: {
        selfUpdate: true,
        updatedFields: Object.keys(data),
      },
    });

    return successResponse({
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("[PROFILE_API] PATCH error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
