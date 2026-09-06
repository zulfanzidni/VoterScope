/**
 * VoterScope Demo — Dashboard Stats & Analytics API
 *
 * GET /api/dashboard/stats — Aggregated demographic metrics scoped to authenticated user
 *
 * ALL DEMOGRAPHIC DATA IS DERIVED FROM SYNTHETIC DEMO DATA.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { buildAuthorizedVoterFilter, getUserScope } from "@/lib/authorization";
import { calculateDemographics } from "@/lib/analytics";
import { errorResponse, successResponse } from "@/lib/api/errors";

export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    const scope = getUserScope(user);
    const voterFilter = buildAuthorizedVoterFilter(user);

    // 1. Overall counts
    const [totalVoters, activeVoters, needsReview, archivedVoters, tpsList, allVoters] =
      await Promise.all([
        prisma.voter.count({
          where: { ...voterFilter, status: { not: "ARCHIVED" } },
        }),
        prisma.voter.count({
          where: { ...voterFilter, status: "ACTIVE" },
        }),
        prisma.voter.count({
          where: { ...voterFilter, status: "NEEDS_REVIEW" },
        }),
        prisma.voter.count({
          where: { ...voterFilter, status: "ARCHIVED" },
        }),
        prisma.voter.groupBy({
          by: ["tps"],
          where: { ...voterFilter, status: { not: "ARCHIVED" } },
        }),
        prisma.voter.findMany({
          where: { ...voterFilter, status: { not: "ARCHIVED" } },
          select: {
            dateOfBirth: true,
            gender: true,
            status: true,
            address: true,
            placeOfBirth: true,
            provinceId: true,
            kabupatenId: true,
            kecamatanId: true,
            kelurahanId: true,
            tps: true,
            kelurahan: { select: { name: true } },
            kecamatan: { select: { name: true } },
            kabupaten: { select: { name: true } },
          },
        }),
      ]);

    // 2. Compute demographics (gender, age cohorts, data quality)
    const demographics = calculateDemographics(allVoters);

    // 3. Dynamic sub-territory distribution based on scope level
    const territoryMap = new Map<string, number>();

    for (const v of allVoters) {
      let key = "Lainnya";
      if (scope.level === "NATIONAL" || scope.level === "PROVINCE") {
        key = v.kabupaten?.name ?? "Kabupaten";
      } else if (scope.level === "KABUPATEN") {
        key = v.kecamatan?.name ?? "Kecamatan";
      } else if (scope.level === "KECAMATAN") {
        key = v.kelurahan?.name ?? "Kelurahan";
      } else {
        key = `TPS ${v.tps}`;
      }
      territoryMap.set(key, (territoryMap.get(key) ?? 0) + 1);
    }

    const territoryDistribution = Array.from(territoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 territories for clean display

    return successResponse({
      summary: {
        totalVoters,
        activeVoters,
        needsReview,
        archivedVoters,
        totalTps: tpsList.length,
      },
      demographics,
      territoryDistribution,
      scopeLevel: scope.level,
    });
  } catch (err) {
    console.error("[DASHBOARD_STATS_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
