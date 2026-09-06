/**
 * VoterScope Demo — Unit Tests: Voter CRUD, Validation, Security & Anti-IDOR
 *
 * Comprehensive tests for voter data handling, cryptographic protections,
 * schema validation, and scope boundaries.
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  VoterCreateSchema,
  VoterUpdateSchema,
  VoterLookupSchema,
  VoterSearchSchema,
} from "@/lib/validation/schemas";
import {
  encryptNik,
  decryptNik,
  hashNikForLookup,
  maskNik,
} from "@/lib/security/nik";
import {
  buildAuthorizedVoterFilter,
  canAccessVoter,
  canPerformVoterAction,
} from "@/lib/authorization";
import { UserRole } from "@/lib/types";
import type { SessionUser } from "@/lib/types";

beforeAll(() => {
  process.env.NIK_ENCRYPTION_KEY = "dev-only-nik-encryption-key-demo";
  process.env.NIK_LOOKUP_SECRET = "dev-only-nik-lookup-secret-demo0";
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const validSyntheticVoter = {
  nik: "9901011505950001",
  fullName: "Budi Santoso",
  placeOfBirth: "Jakarta",
  dateOfBirth: "1995-05-15",
  gender: "LAKI_LAKI" as const,
  address: "Jl. Melati Simpang Demo No. 12",
  religion: "ISLAM" as const,
  maritalStatus: "BELUM_KAWIN" as const,
  occupation: "Karyawan Swasta",
  citizenship: "WNI",
  tps: "001",
  provinceId: "prov-demo-001",
  kabupatenId: "kab-demo-001",
  kecamatanId: "kec-demo-001",
  kelurahanId: "kel-demo-001",
  status: "ACTIVE" as const,
};

const makeUser = (role: UserRole, overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: `user-${role.toLowerCase()}`,
  username: role.toLowerCase(),
  email: `${role.toLowerCase()}@demo.local`,
  fullName: `Demo ${role}`,
  role,
  provinceId: "prov-demo-001",
  kabupatenId: "kab-demo-001",
  kecamatanId: "kec-demo-001",
  kelurahanId: "kel-demo-001",
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Schema Validations
// ─────────────────────────────────────────────────────────────────────────────

describe("VoterCreateSchema Validation", () => {
  it("accepts a completely valid synthetic voter record", () => {
    const result = VoterCreateSchema.safeParse(validSyntheticVoter);
    expect(result.success).toBe(true);
  });

  it("accepts seeded demo territory IDs (non-CUID format)", () => {
    const result = VoterCreateSchema.safeParse({
      ...validSyntheticVoter,
      provinceId: "prov-demo-001",
      kabupatenId: "kab-demo-001",
      kecamatanId: "kec-demo-001",
      kelurahanId: "kel-demo-001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects synthetic NIK with fewer than 16 digits", () => {
    const result = VoterCreateSchema.safeParse({
      ...validSyntheticVoter,
      nik: "99010115059500", // 14 digits
    });
    expect(result.success).toBe(false);
  });

  it("rejects synthetic NIK with non-numeric characters", () => {
    const result = VoterCreateSchema.safeParse({
      ...validSyntheticVoter,
      nik: "990101150595000A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects future date of birth", () => {
    const futureYear = new Date().getFullYear() + 2;
    const result = VoterCreateSchema.safeParse({
      ...validSyntheticVoter,
      dateOfBirth: `${futureYear}-01-01`,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty full name or TPS", () => {
    const resultName = VoterCreateSchema.safeParse({
      ...validSyntheticVoter,
      fullName: "",
    });
    expect(resultName.success).toBe(false);

    const resultTps = VoterCreateSchema.safeParse({
      ...validSyntheticVoter,
      tps: "",
    });
    expect(resultTps.success).toBe(false);
  });
});

describe("VoterUpdateSchema Validation", () => {
  it("allows updating partial fields without requiring NIK", () => {
    const result = VoterUpdateSchema.safeParse({
      fullName: "Budi Santoso Edit",
      occupation: "Wiraswasta",
      tps: "002",
    });
    expect(result.success).toBe(true);
  });

  it("omits nik field so it cannot be altered via update schema", () => {
    const parsed = VoterUpdateSchema.safeParse({
      nik: "9901011505959999",
      fullName: "Budi Santoso Edit",
    });
    expect(parsed.success).toBe(true);
    // @ts-expect-error nik should be stripped/omitted
    expect(parsed.data?.nik).toBeUndefined();
  });
});

describe("VoterLookupSchema Validation", () => {
  it("accepts valid 16-digit synthetic NIK", () => {
    const result = VoterLookupSchema.safeParse({ nik: "9901011505950001" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid length or non-numeric NIK", () => {
    expect(VoterLookupSchema.safeParse({ nik: "123" }).success).toBe(false);
    expect(VoterLookupSchema.safeParse({ nik: "990101150595000X" }).success).toBe(false);
  });
});

describe("VoterSearchSchema Validation", () => {
  it("accepts default search pagination values", () => {
    const result = VoterSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortBy).toBe("createdAt");
      expect(result.data.sortOrder).toBe("desc");
    }
  });

  it("coerces string page and pageSize from query string", () => {
    const result = VoterSearchSchema.safeParse({
      page: "3",
      pageSize: "50",
      gender: "PEREMPUAN",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(50);
      expect(result.data.gender).toBe("PEREMPUAN");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cryptographic Security & Duplicate Detection
// ─────────────────────────────────────────────────────────────────────────────

describe("Voter NIK Encryption & Masking Round-Trip", () => {
  const syntheticNik = "9901011505950001";

  it("encrypts and decrypts accurately", () => {
    const cipher = encryptNik(syntheticNik);
    expect(cipher).not.toBe(syntheticNik);
    const plain = decryptNik(cipher);
    expect(plain).toBe(syntheticNik);
  });

  it("masks NIK leaving first 4 and last 2 digits visible", () => {
    const masked = maskNik(syntheticNik);
    expect(masked).toBe("9901**********01");
    expect(masked.length).toBe(16);
  });

  it("generates deterministic HMAC hash for duplicate detection", () => {
    const hashA = hashNikForLookup(syntheticNik);
    const hashB = hashNikForLookup(syntheticNik);
    expect(hashA).toBe(hashB);

    const hashOther = hashNikForLookup("9901011505950002");
    expect(hashA).not.toBe(hashOther);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Hierarchical Scope Filtering & Anti-IDOR
// ─────────────────────────────────────────────────────────────────────────────

describe("Hierarchical Scope & Anti-IDOR Enforcement", () => {
  const voterInKelurahan1 = {
    provinceId: "prov-demo-001",
    kabupatenId: "kab-demo-001",
    kecamatanId: "kec-demo-001",
    kelurahanId: "kel-demo-001",
  };

  const voterInKelurahan2 = {
    provinceId: "prov-demo-001",
    kabupatenId: "kab-demo-001",
    kecamatanId: "kec-demo-001",
    kelurahanId: "kel-demo-002",
  };

  const voterInKabupaten2 = {
    provinceId: "prov-demo-001",
    kabupatenId: "kab-demo-002",
    kecamatanId: "kec-demo-003",
    kelurahanId: "kel-demo-005",
  };

  it("SUPER_ADMIN can access voters in any territory", () => {
    const superAdmin = makeUser(UserRole.SUPER_ADMIN, {
      provinceId: null,
      kabupatenId: null,
      kecamatanId: null,
      kelurahanId: null,
    });
    expect(canAccessVoter(superAdmin, voterInKelurahan1)).toBe(true);
    expect(canAccessVoter(superAdmin, voterInKelurahan2)).toBe(true);
    expect(canAccessVoter(superAdmin, voterInKabupaten2)).toBe(true);
  });

  it("KELURAHAN_OPERATOR can only access voters in their assigned kelurahan", () => {
    const operator1 = makeUser(UserRole.KELURAHAN_OPERATOR, {
      kelurahanId: "kel-demo-001",
    });
    expect(canAccessVoter(operator1, voterInKelurahan1)).toBe(true);
    // Anti-IDOR: same kecamatan, different kelurahan -> MUST BE BLOCKED
    expect(canAccessVoter(operator1, voterInKelurahan2)).toBe(false);
    // Anti-IDOR: different kabupaten -> MUST BE BLOCKED
    expect(canAccessVoter(operator1, voterInKabupaten2)).toBe(false);
  });

  it("KECAMATAN_ADMIN can access all kelurahans within their kecamatan but not outside", () => {
    const kecAdmin = makeUser(UserRole.KECAMATAN_ADMIN, {
      kecamatanId: "kec-demo-001",
    });
    expect(canAccessVoter(kecAdmin, voterInKelurahan1)).toBe(true);
    expect(canAccessVoter(kecAdmin, voterInKelurahan2)).toBe(true);
    // Outside kecamatan -> BLOCKED
    expect(canAccessVoter(kecAdmin, voterInKabupaten2)).toBe(false);
  });

  it("KABUPATEN_ADMIN can access all kecamatan within their kabupaten but not outside", () => {
    const kabAdmin = makeUser(UserRole.KABUPATEN_ADMIN, {
      kabupatenId: "kab-demo-001",
    });
    expect(canAccessVoter(kabAdmin, voterInKelurahan1)).toBe(true);
    expect(canAccessVoter(kabAdmin, voterInKelurahan2)).toBe(true);
    // Different kabupaten -> BLOCKED
    expect(canAccessVoter(kabAdmin, voterInKabupaten2)).toBe(false);
  });

  it("builds correct Prisma scope filter per role", () => {
    const superAdmin = makeUser(UserRole.SUPER_ADMIN, {
      provinceId: null,
      kabupatenId: null,
      kecamatanId: null,
      kelurahanId: null,
    });
    expect(buildAuthorizedVoterFilter(superAdmin)).toEqual({});

    const operator = makeUser(UserRole.KELURAHAN_OPERATOR, {
      kelurahanId: "kel-demo-001",
    });
    expect(buildAuthorizedVoterFilter(operator)).toEqual({
      kelurahanId: "kel-demo-001",
    });

    const kabAdmin = makeUser(UserRole.KABUPATEN_ADMIN, {
      kabupatenId: "kab-demo-001",
    });
    expect(buildAuthorizedVoterFilter(kabAdmin)).toEqual({
      kabupatenId: "kab-demo-001",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Action Permissions & Auditor Isolation (RBAC)
// ─────────────────────────────────────────────────────────────────────────────

describe("Voter Action Permissions (RBAC)", () => {
  it("AUDITOR has read-only access and cannot create, update, or archive voters", () => {
    const auditor = makeUser(UserRole.AUDITOR);

    expect(canPerformVoterAction(auditor, "read")).toBe(true);
    expect(canPerformVoterAction(auditor, "create")).toBe(false);
    expect(canPerformVoterAction(auditor, "update")).toBe(false);
    expect(canPerformVoterAction(auditor, "archive")).toBe(false);
    expect(canPerformVoterAction(auditor, "nik_lookup")).toBe(false);
  });

  it("KELURAHAN_OPERATOR can create, update, and archive voters within scope", () => {
    const operator = makeUser(UserRole.KELURAHAN_OPERATOR);

    expect(canPerformVoterAction(operator, "read")).toBe(true);
    expect(canPerformVoterAction(operator, "create")).toBe(true);
    expect(canPerformVoterAction(operator, "update")).toBe(true);
    expect(canPerformVoterAction(operator, "archive")).toBe(true);
    expect(canPerformVoterAction(operator, "nik_lookup")).toBe(true);
  });

  it("SUPER_ADMIN has all voter action permissions", () => {
    const superAdmin = makeUser(UserRole.SUPER_ADMIN);

    expect(canPerformVoterAction(superAdmin, "read")).toBe(true);
    expect(canPerformVoterAction(superAdmin, "create")).toBe(true);
    expect(canPerformVoterAction(superAdmin, "update")).toBe(true);
    expect(canPerformVoterAction(superAdmin, "archive")).toBe(true);
    expect(canPerformVoterAction(superAdmin, "nik_lookup")).toBe(true);
  });
});
