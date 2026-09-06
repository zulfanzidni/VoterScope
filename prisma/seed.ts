/**
 * VoterScope Demo — Prisma Seed Script
 *
 * Generates deterministic synthetic demo data.
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 *
 * This application is a portfolio/demo system using synthetic data.
 * NOT for production use with real voter personal data.
 *
 * Usage: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { encryptNik, hashNikForLookup } from "../lib/security/nik";
import {
  ALL_38_PROVINCES,
  FALLBACK_REGENCIES,
  FALLBACK_DISTRICTS,
  FALLBACK_VILLAGES,
} from "../lib/territory/kodewilayah";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// DEMO ENVIRONMENT — set keys for seeding
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.NIK_ENCRYPTION_KEY) {
  process.env.NIK_ENCRYPTION_KEY = "dev-only-nik-encryption-key-demo";
}
if (!process.env.NIK_LOOKUP_SECRET) {
  process.env.NIK_LOOKUP_SECRET = "dev-only-nik-lookup-secret-demo0";
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// REAL INDONESIAN ADMINISTRATIVE HIERARCHY (KEMENDAGRI STANDARDS)
// ─────────────────────────────────────────────────────────────────────────────

const PROVINCE = {
  id: "32",
  code: "32",
  name: "JAWA BARAT",
};

const KABUPATEN = [
  { id: "3201", provinceId: "32", code: "3201", name: "KABUPATEN BOGOR" },
  { id: "3271", provinceId: "32", code: "3271", name: "KOTA BOGOR" },
  { id: "3273", provinceId: "32", code: "3273", name: "KOTA BANDUNG" },
];

const KECAMATAN = [
  { id: "3201210", kabupatenId: "3201", code: "3201210", name: "CIBINONG" },
  { id: "3201220", kabupatenId: "3201", code: "3201220", name: "BOJONG GEDE" },
  { id: "3201200", kabupatenId: "3201", code: "3201200", name: "CITEUREUP" },
];

const KELURAHAN = [
  { id: "3201210001", kecamatanId: "3201210", code: "3201210001", name: "KARADENAN" },
  { id: "3201210002", kecamatanId: "3201210", code: "3201210002", name: "NANGGEWER" },
  { id: "3201210004", kecamatanId: "3201210", code: "3201210004", name: "CIBINONG" },
  { id: "3201210005", kecamatanId: "3201210", code: "3201210005", name: "PAKANSARI" },
  { id: "3201210006", kecamatanId: "3201210", code: "3201210006", name: "SUKAHATI" },
  { id: "3201210007", kecamatanId: "3201210", code: "3201210007", name: "TENGAH" },
  { id: "3201210008", kecamatanId: "3201210", code: "3201210008", name: "PONDOK RAJEG" },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEMO USERS
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_PASSWORD = "Demo@12345";

const DEMO_USERS = [
  {
    id: "user-superadmin",
    username: "superadmin",
    email: "superadmin@demo.local",
    fullName: "Super Admin Demo",
    role: "SUPER_ADMIN",
    provinceId: null,
    kabupatenId: null,
    kecamatanId: null,
    kelurahanId: null,
  },
  {
    id: "user-province-admin",
    username: "province_admin",
    email: "province_admin@demo.local",
    fullName: "Admin Provinsi Jawa Barat",
    role: "PROVINCE_ADMIN",
    provinceId: "32",
    kabupatenId: null,
    kecamatanId: null,
    kelurahanId: null,
  },
  {
    id: "user-kabupaten-admin",
    username: "kabupaten_admin",
    email: "kabupaten_admin@demo.local",
    fullName: "Admin Kabupaten Bogor",
    role: "KABUPATEN_ADMIN",
    provinceId: "32",
    kabupatenId: "3201",
    kecamatanId: null,
    kelurahanId: null,
  },
  {
    id: "user-kecamatan-admin",
    username: "kecamatan_admin",
    email: "kecamatan_admin@demo.local",
    fullName: "Admin Kecamatan Cibinong",
    role: "KECAMATAN_ADMIN",
    provinceId: "32",
    kabupatenId: "3201",
    kecamatanId: "3201210",
    kelurahanId: null,
  },
  {
    id: "user-kelurahan-operator",
    username: "kelurahan_operator",
    email: "kelurahan_operator@demo.local",
    fullName: "Operator Kelurahan Pakansari",
    role: "KELURAHAN_OPERATOR",
    provinceId: "32",
    kabupatenId: "3201",
    kecamatanId: "3201210",
    kelurahanId: "3201210005",
  },
  {
    id: "user-auditor",
    username: "auditor",
    email: "auditor@demo.local",
    fullName: "Auditor Demo",
    role: "AUDITOR",
    provinceId: null,
    kabupatenId: null,
    kecamatanId: null,
    kelurahanId: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SYNTHETIC VOTER DATA GENERATOR
// ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
// ─────────────────────────────────────────────────────────────────────────────

const SYNTHETIC_FIRST_NAMES_M = [
  "Andi", "Budi", "Candra", "Darmawan", "Eko", "Fajar", "Gunawan", "Hendra",
  "Irwan", "Joko", "Kurniawan", "Lukman", "Muhammad", "Nurul", "Otto",
];

const SYNTHETIC_FIRST_NAMES_F = [
  "Ani", "Budi", "Citra", "Dewi", "Eka", "Fitri", "Gita", "Hani",
  "Indah", "Juwita", "Kartika", "Lestari", "Maya", "Nita", "Okta",
];

const SYNTHETIC_LAST_NAMES = [
  "Santoso", "Wijaya", "Kusuma", "Pratama", "Setiawan", "Nugraha",
  "Hidayat", "Firmansyah", "Perdana", "Wibowo", "Sanjaya", "Suryanto",
];

const RELIGIONS = ["ISLAM", "KRISTEN", "KATHOLIK", "HINDU", "BUDDHA", "KONGHUCU"] as const;
const OCCUPATIONS = [
  "Petani", "Pedagang", "PNS", "Wiraswasta", "Buruh", "Guru",
  "Dokter", "Perawat", "Sopir", "Nelayan", "Ibu Rumah Tangga", "Mahasiswa",
];
const MARITAL_STATUSES = ["BELUM_KAWIN", "KAWIN", "CERAI_HIDUP", "CERAI_MATI"] as const;

// Simple deterministic pseudo-random based on index
function deterministicRand(seed: number, max: number): number {
  return ((seed * 1103515245 + 12345) & 0x7fffffff) % max;
}

function generateSyntheticVoterNik(index: number, gender: string): string {
  // ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
  // Format: 32 (Jawa Barat) + 01 (Kab. Bogor) + 21 (Kec. Cibinong) + ddmmyy + 4-digit seq
  const seq = String(index + 1).padStart(4, "0");
  const month = String(deterministicRand(index * 7, 12) + 1).padStart(2, "0");
  const rawDay = deterministicRand(index * 13, 28) + 1;
  const day = String(gender === "PEREMPUAN" ? rawDay + 40 : rawDay).padStart(2, "0");
  const year = String(50 + deterministicRand(index * 17, 50)).padStart(2, "0");
  return `320121${day}${month}${year}${seq}`;
}

function generateSyntheticVoter(index: number, kelurahan: (typeof KELURAHAN)[0]) {
  const gender = index % 2 === 0 ? "LAKI_LAKI" : "PEREMPUAN";
  const firstNames = gender === "LAKI_LAKI" ? SYNTHETIC_FIRST_NAMES_M : SYNTHETIC_FIRST_NAMES_F;
  const firstName = firstNames[deterministicRand(index * 3, firstNames.length)] ?? "Demo";
  const lastName = SYNTHETIC_LAST_NAMES[deterministicRand(index * 5, SYNTHETIC_LAST_NAMES.length)] ?? "User";

  const birthYear = 1955 + deterministicRand(index * 11, 50);
  const birthMonth = deterministicRand(index * 7, 12) + 1;
  const birthDay = deterministicRand(index * 13, 28) + 1;
  const dateOfBirth = new Date(birthYear, birthMonth - 1, birthDay);

  const kec = KECAMATAN.find((k) => k.id === kelurahan.kecamatanId)!;
  const kab = KABUPATEN.find((k) => k.id === kec.kabupatenId)!;

  const religion: string = RELIGIONS[deterministicRand(index * 3, RELIGIONS.length)] ?? "ISLAM";
  const maritalStatus: string =
    MARITAL_STATUSES[deterministicRand(index * 9, MARITAL_STATUSES.length)] ?? "BELUM_KAWIN";
  const occupation: string = OCCUPATIONS[deterministicRand(index * 4, OCCUPATIONS.length)] ?? "Wiraswasta";
  const tps = `TPS ${String(deterministicRand(index, 20) + 1).padStart(3, "0")}`;

  return {
    fullName: `${firstName} ${lastName}`,
    gender,
    dateOfBirth,
    placeOfBirth: `Demo Kota ${deterministicRand(index, 5) + 1}`,
    address: `Jl. Demo ${index + 1} No. ${deterministicRand(index, 100) + 1}, ${kelurahan.name}`,
    religion,
    maritalStatus,
    occupation,
    citizenship: "WNI",
    tps,
    status: index % 15 === 0 ? "NEEDS_REVIEW" : index % 20 === 0 ? "INACTIVE" : "ACTIVE",
    provinceId: PROVINCE.id,
    kabupatenId: kab.id,
    kecamatanId: kec.id,
    kelurahanId: kelurahan.id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting VoterScope Demo seed...");
  console.log("ℹ️  ALL DATA IS SYNTHETIC — NOT real voter data");

  // ── Clear existing data ──────────────────────────────────────────────────
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.voter.deleteMany();
  await prisma.user.deleteMany();
  await prisma.kelurahan.deleteMany();
  await prisma.kecamatan.deleteMany();
  await prisma.kabupaten.deleteMany();
  await prisma.province.deleteMany();

  // ── Province (All 38 Indonesian Provinces) ──────────────────────────────
  console.log("Creating administrative hierarchy (38 Provinces)...");
  await prisma.province.createMany({
    data: ALL_38_PROVINCES.map((prov) => ({
      id: prov.id,
      code: prov.code,
      name: prov.name,
    })),
  });

  // ── Kabupaten (All 514 Kabupaten/Kota across 38 Provinces) ───────────────
  console.log("Creating all 514 Kabupaten/Kota...");
  const regencyMap = new Map<string, { id: string; provinceId: string; code: string; name: string }>();
  for (const kab of KABUPATEN) {
    regencyMap.set(kab.id, kab);
  }
  for (const [provId, regList] of Object.entries(FALLBACK_REGENCIES)) {
    for (const r of regList) {
      if (!regencyMap.has(r.id)) {
        regencyMap.set(r.id, {
          id: r.id,
          provinceId: r.parentId ?? provId,
          code: r.code,
          name: r.name,
        });
      }
    }
  }
  await prisma.kabupaten.createMany({
    data: Array.from(regencyMap.values()),
  });

  // ── Kecamatan (Cibinong, Bojong Gede, Citeureup + Preloaded 6,626 Districts) ──
  console.log("Creating Kecamatan / Districts across Indonesia...");
  const districtMap = new Map<string, { id: string; kabupatenId: string; code: string; name: string }>();
  for (const kec of KECAMATAN) {
    districtMap.set(kec.id, kec);
  }
  for (const [kabId, distList] of Object.entries(FALLBACK_DISTRICTS)) {
    const validParentId = regencyMap.has(kabId) ? kabId : null;
    if (!validParentId) continue;

    for (const d of distList) {
      if (!districtMap.has(d.id)) {
        districtMap.set(d.id, {
          id: d.id,
          kabupatenId: validParentId,
          code: d.code,
          name: d.name,
        });
      }
    }
  }

  const allDistricts = Array.from(districtMap.values());
  console.log(`Seeding ${allDistricts.length} kecamatan into database...`);
  for (let i = 0; i < allDistricts.length; i += 500) {
    await prisma.kecamatan.createMany({
      data: allDistricts.slice(i, i + 500),
    });
  }

  // ── Kelurahan (Pakansari, Cibinong, etc. + Snapshots) ───────────────────
  const villageMap = new Map<string, { id: string; kecamatanId: string; code: string; name: string }>();
  for (const kel of KELURAHAN) {
    villageMap.set(kel.id, kel);
  }
  for (const [kecId, vilList] of Object.entries(FALLBACK_VILLAGES)) {
    for (const v of vilList) {
      if (!villageMap.has(v.id)) {
        villageMap.set(v.id, {
          id: v.id,
          kecamatanId: v.parentId ?? kecId,
          code: v.code,
          name: v.name,
        });
      }
    }
  }
  await prisma.kelurahan.createMany({
    data: Array.from(villageMap.values()),
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log("Creating demo users...");
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  for (const user of DEMO_USERS) {
    await prisma.user.create({
      data: {
        ...user,
        passwordHash,
      },
    });
  }

  // ── Synthetic Voters ──────────────────────────────────────────────────────
  console.log("Generating 100 synthetic voters...");
  // Distribute ~17 voters per kelurahan (6 kelurahan × ~17 = 102, round to 100)
  let voterIndex = 0;
  for (const kelurahan of KELURAHAN) {
    const count = voterIndex < 96 ? 17 : 100 - voterIndex; // ensure exactly 100
    if (count <= 0) break;

    for (let i = 0; i < count && voterIndex < 100; i++) {
      const voterData = generateSyntheticVoter(voterIndex, kelurahan);
      // ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
      const syntheticNik = generateSyntheticVoterNik(voterIndex, voterData.gender);
      const nikEncrypted = encryptNik(syntheticNik);
      const nikLookupHash = hashNikForLookup(syntheticNik);

      await prisma.voter.create({
        data: {
          ...voterData,
          nikEncrypted,
          nikLookupHash,
          createdBy: "user-superadmin",
          updatedBy: "user-superadmin",
        },
      });
      voterIndex++;
    }
  }

  console.log(`✅ Created ${voterIndex} synthetic voters`);
  console.log("✅ Created administrative hierarchy:");
  console.log(`   1 Province, 2 Kabupaten, 3 Kecamatan, 6 Kelurahan`);
  console.log("✅ Created 6 demo users");
  console.log("");
  console.log("Demo credentials (LOCAL DEVELOPMENT ONLY):");
  console.log("  superadmin / Demo@12345");
  console.log("  province_admin / Demo@12345");
  console.log("  kabupaten_admin / Demo@12345");
  console.log("  kecamatan_admin / Demo@12345");
  console.log("  kelurahan_operator / Demo@12345");
  console.log("  auditor / Demo@12345");
  console.log("");
  console.log("⚠️  These credentials are for local development ONLY.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
