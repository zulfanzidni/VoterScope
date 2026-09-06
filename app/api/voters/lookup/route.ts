/**
 * VoterScope Demo — NIK Lookup API
 *
 * POST /api/voters/lookup — Check if a synthetic NIK exists via HMAC lookup hash
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessVoter, canPerformVoterAction } from "@/lib/authorization";
import { hashNikForLookup } from "@/lib/security/nik";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { VoterLookupSchema } from "@/lib/validation/schemas";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { AuditAction, AuditResourceType, AuditResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformVoterAction(user, "nik_lookup")) {
      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki izin untuk melakukan pencarian NIK."
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Body JSON tidak valid.");
    }

    const parseResult = VoterLookupSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Format NIK sintetis harus berupa 16 digit angka."
      );
    }

    const { nik } = parseResult.data;
    const lookupHash = hashNikForLookup(nik);

    const voter = await prisma.voter.findUnique({
      where: { nikLookupHash: lookupHash },
      select: {
        id: true,
        provinceId: true,
        kabupatenId: true,
        kecamatanId: true,
        kelurahanId: true,
        status: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: AuditAction.VOTER_NIK_LOOKUP,
      resourceType: AuditResourceType.VOTER,
      resourceId: voter?.id ?? null,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: { matchFound: !!voter },
    });

    if (!voter) {
      return successResponse({ exists: false });
    }

    const inScope = canAccessVoter(user, {
      provinceId: voter.provinceId,
      kabupatenId: voter.kabupatenId,
      kecamatanId: voter.kecamatanId,
      kelurahanId: voter.kelurahanId,
    });

    return successResponse({
      exists: true,
      inScope,
      voterId: inScope ? voter.id : undefined,
      status: inScope ? voter.status : undefined,
    });
  } catch (err) {
    console.error("[VOTER_LOOKUP_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
