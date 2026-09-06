/**
 * VoterScope Demo — User Detail & Lifecycle API
 *
 * GET   /api/users/[id] — Retrieve single user details
 * PATCH /api/users/[id] — Update user details, reset password, or toggle active status
 *
 * ALL DATA REPRESENTS SYNTHETIC DEMO CREDENTIALS.
 */

import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canPerformUserAction, getUserScope, normalizeUserTerritoryByRole } from "@/lib/authorization";
import { UserUpdateSchema } from "@/lib/validation/schemas";
import { ensureTerritoryExists } from "@/lib/territory/kodewilayah";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { AuditAction, AuditResourceType, AuditResult, UserRole } from "@/lib/types";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const actor = await getSessionUser();
    if (!actor) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformUserAction(actor, "read")) {
      return errorResponse("FORBIDDEN");
    }

    const { id } = await props.params;

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return errorResponse("NOT_FOUND", "Pengguna tidak ditemukan.");
    }

    return successResponse({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("[USER_DETAIL_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const actor = await getSessionUser();
    if (!actor) {
      return errorResponse("UNAUTHORIZED");
    }

    const { id } = await props.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return errorResponse("NOT_FOUND", "Pengguna tidak ditemukan.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Body JSON tidak valid.");
    }

    const parseResult = UserUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data pembaruan pengguna tidak valid.",
            issues: parseResult.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    // Self-Protection Guards
    if (actor.id === id) {
      if (data.isActive === false) {
        return errorResponse(
          "FORBIDDEN",
          "Anda tidak diperkenankan menonaktifkan akun Anda sendiri."
        );
      }
      if (data.role && data.role !== actor.role) {
        return errorResponse(
          "FORBIDDEN",
          "Anda tidak dapat mengubah peran akun Anda sendiri."
        );
      }
    } else {
      // Modifying another user: verify role escalation boundaries
      const isAllowed = canPerformUserAction(
        actor,
        "update",
        existingUser.role as UserRole
      );
      if (!isAllowed) {
        return errorResponse(
          "FORBIDDEN",
          "Anda tidak memiliki wewenang untuk mengubah akun pengguna ini."
        );
      }

      if (data.role) {
        const canAssignTargetRole = canPerformUserAction(
          actor,
          "create",
          data.role as UserRole
        );
        if (!canAssignTargetRole) {
          return errorResponse(
            "FORBIDDEN",
            "Anda tidak dapat menetapkan peran setara atau lebih tinggi dari Anda."
          );
        }
      }
    }

    // Territory scope verification
    const actorScope = getUserScope(actor);
    if (actorScope.level === "PROVINCE" && data.provinceId && data.provinceId !== actorScope.provinceId) {
      return errorResponse("FORBIDDEN", "Pengguna harus berada dalam yurisdiksi provinsi Anda.");
    }
    if (actorScope.level === "KABUPATEN" && data.kabupatenId && data.kabupatenId !== actorScope.kabupatenId) {
      return errorResponse("FORBIDDEN", "Pengguna harus berada dalam yurisdiksi kabupaten Anda.");
    }
    if (actorScope.level === "KECAMATAN" && data.kecamatanId && data.kecamatanId !== actorScope.kecamatanId) {
      return errorResponse("FORBIDDEN", "Pengguna harus berada dalam yurisdiksi kecamatan Anda.");
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailTaken) {
        return errorResponse("CONFLICT", "Alamat email sudah digunakan akun lain.");
      }
    }

    const targetRole = data.role ?? existingUser.role;
    const hasTerritoryUpdate =
      data.role !== undefined ||
      data.provinceId !== undefined ||
      data.kabupatenId !== undefined ||
      data.kecamatanId !== undefined ||
      data.kelurahanId !== undefined;

    const normalizedTerritory = hasTerritoryUpdate
      ? normalizeUserTerritoryByRole(targetRole, {
          provinceId: data.provinceId !== undefined ? data.provinceId : existingUser.provinceId,
          kabupatenId: data.kabupatenId !== undefined ? data.kabupatenId : existingUser.kabupatenId,
          kecamatanId: data.kecamatanId !== undefined ? data.kecamatanId : existingUser.kecamatanId,
          kelurahanId: data.kelurahanId !== undefined ? data.kelurahanId : existingUser.kelurahanId,
        })
      : null;

    if (normalizedTerritory) {
      await ensureTerritoryExists(normalizedTerritory);
    }

    // Hash password if password reset is requested
    let passwordHash: string | undefined = undefined;
    if (data.password) {
      passwordHash = await argon2.hash(data.password, {
        type: argon2.argon2id,
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.role ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(normalizedTerritory ? normalizedTerritory : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Determine audit action
    let auditAction: string = AuditAction.USER_UPDATE;
    if (data.isActive === false && existingUser.isActive) {
      auditAction = AuditAction.USER_DEACTIVATE;
    } else if (data.isActive === true && !existingUser.isActive) {
      auditAction = AuditAction.USER_ACTIVATE;
    }

    await createAuditLog({
      userId: actor.id,
      action: auditAction as typeof AuditAction.USER_UPDATE,
      resourceType: AuditResourceType.USER,
      resourceId: updated.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: {
        targetUsername: updated.username,
        updatedFields: Object.keys(data),
      },
    });

    return successResponse({
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("[USER_UPDATE_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
