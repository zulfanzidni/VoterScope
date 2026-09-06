/**
 * VoterScope Demo — Territory Synchronization & Existence Verification
 *
 * Ensures that referenced administrative territories (Province, Kabupaten, Kecamatan, Kelurahan)
 * exist in SQLite before user or voter records are inserted or updated,
 * preventing foreign key constraint violations (Prisma P2003).
 *
 * Automatically resolves missing territory records from:
 * 1. Predefined 38 official Kemendagri provinces
 * 2. Comprehensive local offline snapshots (DKI Jakarta, Jawa Barat, Jawa Tengah, Jawa Timur)
 * 3. Standardized Kode Wilayah fetch endpoints as runtime fallback
 */

import { prisma } from "@/lib/db/prisma";
import {
  ALL_38_PROVINCES,
  FALLBACK_REGENCIES,
  FALLBACK_DISTRICTS,
  FALLBACK_VILLAGES,
  getRegencies,
  getDistricts,
  getVillages,
} from "./kodewilayah";

export interface TerritorySyncParams {
  provinceId?: string | null;
  kabupatenId?: string | null;
  kecamatanId?: string | null;
  kelurahanId?: string | null;
}

/**
 * Ensures that all non-null territory levels exist in the database in hierarchical order.
 * Upserts missing records on-demand to satisfy foreign key constraints.
 */
export async function ensureTerritoryExists(params: TerritorySyncParams): Promise<void> {
  const provinceId = params.provinceId?.trim() || null;
  const kabupatenId = params.kabupatenId?.trim() || null;
  const kecamatanId = params.kecamatanId?.trim() || null;
  const kelurahanId = params.kelurahanId?.trim() || null;

  // 1. Ensure Province exists if provinceId is provided
  if (provinceId) {
    const existingProv = await prisma.province.findUnique({
      where: { id: provinceId },
    });

    if (!existingProv) {
      const provData = ALL_38_PROVINCES.find((p) => p.id === provinceId || p.code === provinceId);
      const name = provData ? provData.name : `PROVINSI ${provinceId}`;
      const code = provData ? provData.code : provinceId;

      await prisma.province.upsert({
        where: { id: provinceId },
        create: {
          id: provinceId,
          code,
          name,
          isActive: true,
        },
        update: {},
      });
    }
  }

  // 2. Ensure Kabupaten exists if kabupatenId and provinceId are provided
  if (provinceId && kabupatenId) {
    const existingKab = await prisma.kabupaten.findUnique({
      where: { id: kabupatenId },
    });

    if (!existingKab) {
      let regencies = FALLBACK_REGENCIES[provinceId] ?? [];
      if (regencies.length === 0) {
        try {
          regencies = await getRegencies(provinceId);
        } catch {
          // Graceful fallback
        }
      }

      const item = regencies.find((r) => r.id === kabupatenId || r.code === kabupatenId);
      const name = item ? item.name : `KABUPATEN/KOTA ${kabupatenId}`;
      const code = item ? item.code : kabupatenId;

      await prisma.kabupaten.upsert({
        where: { id: kabupatenId },
        create: {
          id: kabupatenId,
          code,
          name,
          provinceId,
          isActive: true,
        },
        update: {},
      });
    }
  }

  // 3. Ensure Kecamatan exists if kecamatanId and kabupatenId are provided
  if (kabupatenId && kecamatanId) {
    const existingKec = await prisma.kecamatan.findUnique({
      where: { id: kecamatanId },
    });

    if (!existingKec) {
      let districts = FALLBACK_DISTRICTS[kabupatenId] ?? [];
      if (districts.length === 0) {
        try {
          districts = await getDistricts(kabupatenId);
        } catch {
          // Graceful fallback
        }
      }

      const item = districts.find((d) => d.id === kecamatanId || d.code === kecamatanId);
      const name = item ? item.name : `KECAMATAN ${kecamatanId}`;
      const code = item ? item.code : kecamatanId;

      await prisma.kecamatan.upsert({
        where: { id: kecamatanId },
        create: {
          id: kecamatanId,
          code,
          name,
          kabupatenId,
          isActive: true,
        },
        update: {},
      });
    }
  }

  // 4. Ensure Kelurahan exists if kelurahanId and kecamatanId are provided
  if (kecamatanId && kelurahanId) {
    const existingKel = await prisma.kelurahan.findUnique({
      where: { id: kelurahanId },
    });

    if (!existingKel) {
      let villages = FALLBACK_VILLAGES[kecamatanId] ?? [];
      if (villages.length === 0) {
        try {
          villages = await getVillages(kecamatanId);
        } catch {
          // Graceful fallback
        }
      }

      const item = villages.find((v) => v.id === kelurahanId || v.code === kelurahanId);
      const name = item ? item.name : `KELURAHAN/DESA ${kelurahanId}`;
      const code = item ? item.code : kelurahanId;

      await prisma.kelurahan.upsert({
        where: { id: kelurahanId },
        create: {
          id: kelurahanId,
          code,
          name,
          kecamatanId,
          isActive: true,
        },
        update: {},
      });
    }
  }
}
