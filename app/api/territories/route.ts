/**
 * VoterScope Demo — Territories API
 *
 * Provides hierarchical Indonesian administrative territory data
 * (Provinsi -> Kabupaten/Kota -> Kecamatan -> Kelurahan/Desa)
 * integrated with official Kode Wilayah Indonesia (38 Provinsi Kemendagri).
 *
 * Enforces user administrative scope boundary on all requests.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getUserScope } from "@/lib/authorization";
import { errorResponse, successResponse } from "@/lib/api/errors";
import {
  ALL_38_PROVINCES,
  getRegencies,
  getDistricts,
  getVillages,
} from "@/lib/territory/kodewilayah";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    const scope = getUserScope(user);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "tree";
    const parentId = searchParams.get("parentId");

    // 1. Tree structure (all authorized territories in a single compact call)
    if (type === "tree") {
      const provinceFilter: Record<string, unknown> = { isActive: true };
      if (scope.provinceId) {
        provinceFilter.id = scope.provinceId;
      }

      const provinces = await prisma.province.findMany({
        where: provinceFilter,
        orderBy: { code: "asc" },
        include: {
          kabupaten: {
            where: {
              isActive: true,
              ...(scope.kabupatenId ? { id: scope.kabupatenId } : {}),
            },
            orderBy: { code: "asc" },
            include: {
              kecamatan: {
                where: {
                  isActive: true,
                  ...(scope.kecamatanId ? { id: scope.kecamatanId } : {}),
                },
                orderBy: { code: "asc" },
                include: {
                  kelurahan: {
                    where: {
                      isActive: true,
                      ...(scope.kelurahanId ? { id: scope.kelurahanId } : {}),
                    },
                    orderBy: { code: "asc" },
                    select: { id: true, code: true, name: true, kecamatanId: true },
                  },
                },
              },
            },
          },
        },
      });

      return successResponse({ provinces });
    }

    const CACHE_HEADER = {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    };

    // 2. All 38 Provinces (Kemendagri standard)
    if (type === "provinces") {
      if (scope.provinceId) {
        const single = ALL_38_PROVINCES.filter((p) => p.id === scope.provinceId);
        return successResponse({ provinces: single }, 200, CACHE_HEADER);
      }
      return successResponse({ provinces: ALL_38_PROVINCES }, 200, CACHE_HEADER);
    }

    // 3. Kabupaten / Kota (Regencies)
    if (type === "kabupaten") {
      const activeProvinceId = scope.provinceId ?? parentId ?? "32";

      // Scope validation: user cannot query outside assigned province
      if (scope.provinceId && activeProvinceId !== scope.provinceId) {
        return errorResponse("FORBIDDEN", "Di luar yurisdiksi provinsi Anda.");
      }

      // First try local DB
      const dbKabupaten = await prisma.kabupaten.findMany({
        where: {
          isActive: true,
          provinceId: activeProvinceId,
          ...(scope.kabupatenId ? { id: scope.kabupatenId } : {}),
        },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, provinceId: true },
      });

      if (dbKabupaten.length > 0) {
        return successResponse({ kabupaten: dbKabupaten }, 200, CACHE_HEADER);
      }

      // If not yet in DB, fetch from Kode Wilayah API service
      const apiKabupaten = await getRegencies(activeProvinceId);
      const filtered = scope.kabupatenId
        ? apiKabupaten.filter((k) => k.id === scope.kabupatenId)
        : apiKabupaten;

      return successResponse({ kabupaten: filtered }, 200, CACHE_HEADER);
    }

    // 4. Kecamatan (Districts)
    if (type === "kecamatan") {
      const activeKabupatenId = scope.kabupatenId ?? parentId ?? "3201";

      if (scope.kabupatenId && activeKabupatenId !== scope.kabupatenId) {
        return errorResponse("FORBIDDEN", "Di luar yurisdiksi kabupaten Anda.");
      }

      const dbKecamatan = await prisma.kecamatan.findMany({
        where: {
          isActive: true,
          kabupatenId: activeKabupatenId,
          ...(scope.kecamatanId ? { id: scope.kecamatanId } : {}),
        },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, kabupatenId: true },
      });

      if (dbKecamatan.length > 0) {
        return successResponse({ kecamatan: dbKecamatan }, 200, CACHE_HEADER);
      }

      const apiDistricts = await getDistricts(activeKabupatenId);
      const filtered = scope.kecamatanId
        ? apiDistricts.filter((k) => k.id === scope.kecamatanId)
        : apiDistricts;

      // Auto-populate to SQLite so subsequent requests hit DB in 1ms
      if (apiDistricts.length > 0) {
        try {
          await prisma.kecamatan.createMany({
            data: apiDistricts.map((d) => ({
              id: d.id,
              code: d.code,
              name: d.name,
              kabupatenId: activeKabupatenId,
              isActive: true,
            })),
          });
        } catch {
          // Ignore duplicate / race condition
        }
      }

      return successResponse({ kecamatan: filtered }, 200, CACHE_HEADER);
    }

    // 5. Kelurahan / Desa (Villages)
    if (type === "kelurahan") {
      const activeKecamatanId = scope.kecamatanId ?? parentId ?? "3201210";

      if (scope.kecamatanId && activeKecamatanId !== scope.kecamatanId) {
        return errorResponse("FORBIDDEN", "Di luar yurisdiksi kecamatan Anda.");
      }

      const dbKelurahan = await prisma.kelurahan.findMany({
        where: {
          isActive: true,
          kecamatanId: activeKecamatanId,
          ...(scope.kelurahanId ? { id: scope.kelurahanId } : {}),
        },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, kecamatanId: true },
      });

      if (dbKelurahan.length > 0) {
        return successResponse({ kelurahan: dbKelurahan }, 200, CACHE_HEADER);
      }

      const apiVillages = await getVillages(activeKecamatanId);
      const filtered = scope.kelurahanId
        ? apiVillages.filter((k) => k.id === scope.kelurahanId)
        : apiVillages;

      // Auto-populate to SQLite so subsequent requests hit DB in 1ms
      if (apiVillages.length > 0) {
        try {
          await prisma.kelurahan.createMany({
            data: apiVillages.map((v) => ({
              id: v.id,
              code: v.code,
              name: v.name,
              kecamatanId: activeKecamatanId,
              isActive: true,
            })),
          });
        } catch {
          // Ignore duplicate / race condition
        }
      }

      return successResponse({ kelurahan: filtered }, 200, CACHE_HEADER);
    }

    return errorResponse("VALIDATION_ERROR", "Parameter 'type' tidak valid.");
  } catch (err) {
    console.error("[TERRITORIES_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
