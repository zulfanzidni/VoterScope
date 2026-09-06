/**
 * VoterScope Demo — Voters Collection API
 *
 * GET  /api/voters — List voters with hierarchical scope filtering and pagination
 * POST /api/voters — Create a new voter with AES-256-GCM encrypted synthetic NIK
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildAuthorizedVoterFilter,
  canAccessVoter,
  canPerformVoterAction,
} from "@/lib/authorization";
import { encryptNik, decryptNik, hashNikForLookup, maskNik } from "@/lib/security/nik";
import { createAuditLog, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit";
import { VoterCreateSchema, VoterSearchSchema } from "@/lib/validation/schemas";
import { ensureTerritoryExists } from "@/lib/territory/kodewilayah";
import { errorResponse, successResponse } from "@/lib/api/errors";
import { AuditAction, AuditResourceType, AuditResult } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformVoterAction(user, "read")) {
      return errorResponse("FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);
    const queryObj: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (value) queryObj[key] = value;
    }

    const parseResult = VoterSearchSchema.safeParse(queryObj);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter pencarian tidak valid",
            issues: parseResult.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const params = parseResult.data;
    const authorizedScopeFilter = buildAuthorizedVoterFilter(user);

    // Build Prisma query condition
    const where: Prisma.VoterWhereInput = {
      // User's requested filters
      ...(params.gender ? { gender: params.gender } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.tps ? { tps: { contains: params.tps } } : {}),
      ...(params.provinceId ? { provinceId: params.provinceId } : {}),
      ...(params.kabupatenId ? { kabupatenId: params.kabupatenId } : {}),
      ...(params.kecamatanId ? { kecamatanId: params.kecamatanId } : {}),
      ...(params.kelurahanId ? { kelurahanId: params.kelurahanId } : {}),
      // Search query (fullName or TPS)
      ...(params.q
        ? {
            OR: [
              { fullName: { contains: params.q } },
              { tps: { contains: params.q } },
            ],
          }
        : {}),
      // Server-enforced scope filter MUST ALWAYS OVERWRITE to prevent scope escape
      ...authorizedScopeFilter,
    };

    const [total, voters] = await Promise.all([
      prisma.voter.count({ where }),
      prisma.voter.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          province: { select: { id: true, name: true, code: true } },
          kabupaten: { select: { id: true, name: true, code: true } },
          kecamatan: { select: { id: true, name: true, code: true } },
          kelurahan: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const sanitizedData = voters.map((v) => {
      let nikMasked = "****************";
      try {
        const decrypted = decryptNik(v.nikEncrypted);
        nikMasked = maskNik(decrypted);
      } catch {
        // In case of decryption issue, keep masked fallback
      }

      return {
        id: v.id,
        nikMasked,
        fullName: v.fullName,
        placeOfBirth: v.placeOfBirth,
        dateOfBirth: v.dateOfBirth.toISOString().split("T")[0],
        gender: v.gender,
        address: v.address,
        religion: v.religion,
        maritalStatus: v.maritalStatus,
        occupation: v.occupation,
        citizenship: v.citizenship,
        tps: v.tps,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        province: v.province,
        kabupaten: v.kabupaten,
        kecamatan: v.kecamatan,
        kelurahan: v.kelurahan,
      };
    });

    return successResponse({
      data: sanitizedData,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    });
  } catch (err) {
    console.error("[VOTERS_API] GET error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canPerformVoterAction(user, "create")) {
      return errorResponse(
        "FORBIDDEN",
        "Anda tidak memiliki izin untuk menambahkan data pemilih."
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Body request tidak valid JSON.");
    }

    const parseResult = VoterCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data pemilih yang dikirim tidak valid.",
            issues: parseResult.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    // Scope check: Ensure user has jurisdiction over the chosen territory (Anti-IDOR)
    const hasScope = canAccessVoter(user, {
      provinceId: data.provinceId,
      kabupatenId: data.kabupatenId,
      kecamatanId: data.kecamatanId,
      kelurahanId: data.kelurahanId,
    });

    if (!hasScope) {
      return errorResponse(
        "FORBIDDEN",
        "Wilayah administrasi pemilih berada di luar cakupan wewenang akun Anda."
      );
    }

    // Duplicate check using HMAC-SHA256 lookup hash
    // ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
    const lookupHash = hashNikForLookup(data.nik);
    const existing = await prisma.voter.findUnique({
      where: { nikLookupHash: lookupHash },
    });

    if (existing) {
      await createAuditLog({
        userId: user.id,
        action: AuditAction.VOTER_CREATE,
        resourceType: AuditResourceType.VOTER,
        ipAddress: getIpFromRequest(request),
        userAgent: getUserAgentFromRequest(request),
        result: AuditResult.FAILURE,
        metadata: {
          reason: "DUPLICATE_NIK_HASH",
          fullName: data.fullName,
        },
      });

      return errorResponse(
        "CONFLICT",
        "Pemilih dengan NIK tersebut sudah terdaftar dalam sistem."
      );
    }

    // Ensure all 4 territory levels exist in database before verification and insertion
    await ensureTerritoryExists({
      provinceId: data.provinceId,
      kabupatenId: data.kabupatenId,
      kecamatanId: data.kecamatanId,
      kelurahanId: data.kelurahanId,
    });

    // Verify territory exists in database
    const kelurahan = await prisma.kelurahan.findUnique({
      where: { id: data.kelurahanId },
      include: { kecamatan: { include: { kabupaten: true } } },
    });

    if (
      !kelurahan ||
      kelurahan.kecamatanId !== data.kecamatanId ||
      kelurahan.kecamatan.kabupatenId !== data.kabupatenId ||
      kelurahan.kecamatan.kabupaten.provinceId !== data.provinceId
    ) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Hierarki wilayah yang dipilih tidak valid atau tidak berelasi."
      );
    }

    // Encrypt synthetic NIK with AES-256-GCM
    const encryptedNik = encryptNik(data.nik);

    const voter = await prisma.voter.create({
      data: {
        nikEncrypted: encryptedNik,
        nikLookupHash: lookupHash,
        fullName: data.fullName,
        placeOfBirth: data.placeOfBirth,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        address: data.address,
        religion: data.religion,
        maritalStatus: data.maritalStatus,
        occupation: data.occupation,
        citizenship: data.citizenship,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        tps: data.tps,
        status: data.status,
        provinceId: data.provinceId,
        kabupatenId: data.kabupatenId,
        kecamatanId: data.kecamatanId,
        kelurahanId: data.kelurahanId,
        createdBy: user.id,
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
      action: AuditAction.VOTER_CREATE,
      resourceType: AuditResourceType.VOTER,
      resourceId: voter.id,
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      result: AuditResult.SUCCESS,
      metadata: {
        fullName: voter.fullName,
        kelurahanId: voter.kelurahanId,
        tps: voter.tps,
      },
    });

    return successResponse(
      {
        id: voter.id,
        nikMasked: maskNik(data.nik),
        fullName: voter.fullName,
        placeOfBirth: voter.placeOfBirth,
        dateOfBirth: voter.dateOfBirth.toISOString().split("T")[0],
        gender: voter.gender,
        address: voter.address,
        religion: voter.religion,
        maritalStatus: voter.maritalStatus,
        occupation: voter.occupation,
        citizenship: voter.citizenship,
        tps: voter.tps,
        status: voter.status,
        createdAt: voter.createdAt.toISOString(),
        province: voter.province,
        kabupaten: voter.kabupaten,
        kecamatan: voter.kecamatan,
        kelurahan: voter.kelurahan,
      },
      201
    );
  } catch (err) {
    console.error("[VOTERS_API] POST error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
