/**
 * VoterScope Demo — Voter Detail & Update API
 *
 * GET   /api/voters/[id] — Retrieve voter detail with IDOR verification
 * PATCH /api/voters/[id] — Update voter demographics with audit logging
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessVoter, canPerformVoterAction } from "@/lib/authorization";
import { decryptNik, maskNik } from "@/lib/security/nik";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { VoterUpdateSchema } from "@/lib/validation/schemas";
import { ensureTerritoryExists } from "@/lib/territory/kodewilayah";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { AuditAction, AuditResourceType, AuditResult } from "@/lib/types";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformVoterAction(user, "read")) {
      return errorResponse("FORBIDDEN");
    }

    const { id } = await props.params;

    const voter = await prisma.voter.findUnique({
      where: { id },
      include: {
        province: { select: { id: true, name: true, code: true } },
        kabupaten: { select: { id: true, name: true, code: true } },
        kecamatan: { select: { id: true, name: true, code: true } },
        kelurahan: { select: { id: true, name: true, code: true } },
        createdByUser: { select: { id: true, fullName: true, username: true, role: true } },
        updatedByUser: { select: { id: true, fullName: true, username: true, role: true } },
      },
    });

    if (!voter) {
      return errorResponse("NOT_FOUND", "Data pemilih tidak ditemukan.");
    }

    // IDOR Check: Ensure voter belongs to the authenticated user's scope
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
        metadata: { reason: "IDOR_ATTEMPT_SCOPE_MISMATCH" },
      });

      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki hak akses untuk melihat data pemilih ini."
      );
    }

    // Decrypt synthetic NIK
    let syntheticNik = "";
    let nikMasked = "****************";
    try {
      syntheticNik = decryptNik(voter.nikEncrypted);
      nikMasked = maskNik(syntheticNik);
    } catch (err) {
      console.error("[VOTER_DETAIL] NIK decryption failed:", err);
    }

    const searchParams = new URL(request.url).searchParams;
    const reveal = searchParams.get("reveal") === "true";

    // Write audit log for viewing record detail
    await createAuditLog({
      userId: user.id,
      action: AuditAction.VOTER_VIEW_DETAIL,
      resourceType: AuditResourceType.VOTER,
      resourceId: voter.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: { revealed: reveal },
    });

    return successResponse({
      id: voter.id,
      nikMasked,
      // Only include full synthetic NIK if explicitly requested and authorized
      ...(reveal ? { syntheticNik } : {}),
      fullName: voter.fullName,
      placeOfBirth: voter.placeOfBirth,
      dateOfBirth: voter.dateOfBirth.toISOString().split("T")[0],
      gender: voter.gender,
      address: voter.address,
      religion: voter.religion,
      maritalStatus: voter.maritalStatus,
      occupation: voter.occupation,
      citizenship: voter.citizenship,
      validUntil: voter.validUntil ? voter.validUntil.toISOString().split("T")[0] : null,
      tps: voter.tps,
      status: voter.status,
      createdAt: voter.createdAt.toISOString(),
      updatedAt: voter.updatedAt.toISOString(),
      archivedAt: voter.archivedAt ? voter.archivedAt.toISOString() : null,
      provinceId: voter.provinceId,
      kabupatenId: voter.kabupatenId,
      kecamatanId: voter.kecamatanId,
      kelurahanId: voter.kelurahanId,
      province: voter.province,
      kabupaten: voter.kabupaten,
      kecamatan: voter.kecamatan,
      kelurahan: voter.kelurahan,
      createdByUser: voter.createdByUser,
      updatedByUser: voter.updatedByUser,
    });
  } catch (err) {
    console.error("[VOTER_DETAIL_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformVoterAction(user, "update")) {
      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki izin untuk mengubah data pemilih."
      );
    }

    const { id } = await props.params;

    const existingVoter = await prisma.voter.findUnique({
      where: { id },
    });

    if (!existingVoter) {
      return errorResponse("NOT_FOUND", "Data pemilih tidak ditemukan.");
    }

    // IDOR Check on existing record
    const canAccessExisting = canAccessVoter(user, {
      provinceId: existingVoter.provinceId,
      kabupatenId: existingVoter.kabupatenId,
      kecamatanId: existingVoter.kecamatanId,
      kelurahanId: existingVoter.kelurahanId,
    });

    if (!canAccessExisting) {
      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki hak akses untuk mengubah pemilih di luar wilayah Anda."
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Body JSON tidak valid.");
    }

    const parseResult = VoterUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data pembaruan tidak valid.",
            issues: parseResult.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    // If updating territory, ensure target territory is also within user's scope
    const targetProvinceId = data.provinceId ?? existingVoter.provinceId;
    const targetKabupatenId = data.kabupatenId ?? existingVoter.kabupatenId;
    const targetKecamatanId = data.kecamatanId ?? existingVoter.kecamatanId;
    const targetKelurahanId = data.kelurahanId ?? existingVoter.kelurahanId;

    const canAccessTarget = canAccessVoter(user, {
      provinceId: targetProvinceId,
      kabupatenId: targetKabupatenId,
      kecamatanId: targetKecamatanId,
      kelurahanId: targetKelurahanId,
    });

    if (!canAccessTarget) {
      return errorResponse(
        "FORBIDDEN",
        "Target wilayah administrasi pemilih berada di luar cakupan wewenang Anda."
      );
    }

    // Ensure target territory exists in database before updating voter
    await ensureTerritoryExists({
      provinceId: targetProvinceId,
      kabupatenId: targetKabupatenId,
      kecamatanId: targetKecamatanId,
      kelurahanId: targetKelurahanId,
    });

    const updated = await prisma.voter.update({
      where: { id },
      data: {
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.placeOfBirth ? { placeOfBirth: data.placeOfBirth } : {}),
        ...(data.dateOfBirth ? { dateOfBirth: new Date(data.dateOfBirth) } : {}),
        ...(data.gender ? { gender: data.gender } : {}),
        ...(data.address ? { address: data.address } : {}),
        ...(data.religion ? { religion: data.religion } : {}),
        ...(data.maritalStatus ? { maritalStatus: data.maritalStatus } : {}),
        ...(data.occupation ? { occupation: data.occupation } : {}),
        ...(data.citizenship ? { citizenship: data.citizenship } : {}),
        ...(data.validUntil !== undefined
          ? { validUntil: data.validUntil ? new Date(data.validUntil) : null }
          : {}),
        ...(data.tps ? { tps: data.tps } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.provinceId ? { provinceId: data.provinceId } : {}),
        ...(data.kabupatenId ? { kabupatenId: data.kabupatenId } : {}),
        ...(data.kecamatanId ? { kecamatanId: data.kecamatanId } : {}),
        ...(data.kelurahanId ? { kelurahanId: data.kelurahanId } : {}),
        updatedBy: user.id,
      },
      include: {
        province: { select: { id: true, name: true, code: true } },
        kabupaten: { select: { id: true, name: true, code: true } },
        kecamatan: { select: { id: true, name: true, code: true } },
        kelurahan: { select: { id: true, name: true, code: true } },
      },
    });

    // Write audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.VOTER_UPDATE,
      resourceType: AuditResourceType.VOTER,
      resourceId: updated.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: {
        updatedFields: Object.keys(data),
      },
    });

    return successResponse({
      id: updated.id,
      fullName: updated.fullName,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
      province: updated.province,
      kabupaten: updated.kabupaten,
      kecamatan: updated.kecamatan,
      kelurahan: updated.kelurahan,
    });
  } catch (err) {
    console.error("[VOTER_UPDATE_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
