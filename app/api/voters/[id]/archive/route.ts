/**
 * VoterScope Demo — Voter Archive API
 *
 * POST /api/voters/[id]/archive — Soft-delete / archive a voter record
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessVoter, canPerformVoterAction } from "@/lib/authorization";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { AuditAction, AuditResourceType, AuditResult, VoterStatus } from "@/lib/types";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformVoterAction(user, "archive")) {
      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki izin untuk mengarsipkan data pemilih."
      );
    }

    const { id } = await props.params;

    const voter = await prisma.voter.findUnique({
      where: { id },
    });

    if (!voter) {
      return errorResponse("NOT_FOUND", "Data pemilih tidak ditemukan.");
    }

    // IDOR Check
    const isAuthorized = canAccessVoter(user, {
      provinceId: voter.provinceId,
      kabupatenId: voter.kabupatenId,
      kecamatanId: voter.kecamatanId,
      kelurahanId: voter.kelurahanId,
    });

    if (!isAuthorized) {
      await createAuditLog({
        userId: user.id,
        action: AuditAction.ACCESS_DENIED,
        resourceType: AuditResourceType.VOTER,
        resourceId: voter.id,
        ipAddress: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
        result: AuditResult.FAILURE,
        metadata: { reason: "ARCHIVE_IDOR_ATTEMPT" },
      });

      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki wewenang untuk mengarsipkan pemilih di wilayah ini."
      );
    }

    if (voter.status === VoterStatus.ARCHIVED) {
      return errorResponse("CONFLICT", "Data pemilih ini sudah diarsipkan sebelumnya.");
    }

    const updated = await prisma.voter.update({
      where: { id },
      data: {
        status: VoterStatus.ARCHIVED,
        archivedAt: new Date(),
        updatedBy: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: AuditAction.VOTER_ARCHIVE,
      resourceType: AuditResourceType.VOTER,
      resourceId: updated.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: {
        fullName: updated.fullName,
        previousStatus: voter.status,
      },
    });

    return successResponse({
      message: "Data pemilih berhasil diarsipkan.",
      id: updated.id,
      status: updated.status,
      archivedAt: updated.archivedAt?.toISOString(),
    });
  } catch (err) {
    console.error("[VOTER_ARCHIVE_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
