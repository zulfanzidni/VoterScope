/**
 * VoterScope Demo — Password Change API
 *
 * POST /api/profile/change-password — Verify current password and hash new password with Argon2id
 *
 * ALL USER DATA REPRESENTS SYNTHETIC DEMO CREDENTIALS.
 */

import { NextRequest, NextResponse } from "next/server";
import * as argon2 from "argon2";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { ChangePasswordSchema } from "@/lib/validation/schemas";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { AuditAction, AuditResourceType, AuditResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return errorResponse("UNAUTHORIZED");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Body JSON tidak valid.");
    }

    const parseResult = ChangePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Format kata sandi tidak valid.",
            issues: parseResult.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    // Fetch user record with passwordHash
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    if (!user) {
      return errorResponse("NOT_FOUND", "Pengguna tidak ditemukan.");
    }

    // Verify current password with Argon2id
    const isCurrentValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      await createAuditLog({
        userId: user.id,
        action: AuditAction.USER_UPDATE,
        resourceType: AuditResourceType.USER,
        resourceId: user.id,
        ipAddress: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
        result: AuditResult.FAILURE,
        metadata: { reason: "PASSWORD_CHANGE_CURRENT_MISMATCH" },
      });

      return errorResponse(
        "VALIDATION_ERROR",
        "Kata sandi saat ini yang Anda masukkan salah."
      );
    }

    // Hash new password using Argon2id
    const newPasswordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    await createAuditLog({
      userId: user.id,
      action: AuditAction.USER_UPDATE,
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: { action: "PASSWORD_CHANGED" },
    });

    return successResponse({
      message: "Kata sandi Anda berhasil diperbarui.",
    });
  } catch (err) {
    console.error("[CHANGE_PASSWORD_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
