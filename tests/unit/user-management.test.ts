/**
 * VoterScope Demo — Unit Tests: User Management & Hierarchical Authorization
 *
 * Tests for role escalation prevention, self-deactivation boundaries,
 * Argon2id password hashing, and user schema validations.
 *
 * ALL USER DATA REPRESENTS SYNTHETIC DEMO CREDENTIALS.
 */

import { describe, it, expect } from "vitest";
import * as argon2 from "argon2";
import { canPerformUserAction, isRoleAtLeast, normalizeUserTerritoryByRole } from "@/lib/authorization";
import { UserCreateSchema, UserUpdateSchema } from "@/lib/validation/schemas";
import { UserRole } from "@/lib/types";
import type { SessionUser } from "@/lib/types";

const makeUser = (role: UserRole, id = `user-${role.toLowerCase()}`): SessionUser => ({
  id,
  username: role.toLowerCase(),
  email: `${role.toLowerCase()}@demo.local`,
  fullName: `Demo ${role}`,
  role,
});

describe("canPerformUserAction (Hierarchical Role Creation Limits)", () => {
  const superAdmin = makeUser(UserRole.SUPER_ADMIN);
  const provinceAdmin = makeUser(UserRole.PROVINCE_ADMIN);
  const kabupatenAdmin = makeUser(UserRole.KABUPATEN_ADMIN);
  const kecamatanAdmin = makeUser(UserRole.KECAMATAN_ADMIN);
  const operator = makeUser(UserRole.KELURAHAN_OPERATOR);
  const auditor = makeUser(UserRole.AUDITOR);

  it("SUPER_ADMIN can create subordinate roles", () => {
    expect(canPerformUserAction(superAdmin, "create", UserRole.PROVINCE_ADMIN)).toBe(true);
    expect(canPerformUserAction(superAdmin, "create", UserRole.KABUPATEN_ADMIN)).toBe(true);
    expect(canPerformUserAction(superAdmin, "create", UserRole.KECAMATAN_ADMIN)).toBe(true);
    expect(canPerformUserAction(superAdmin, "create", UserRole.KELURAHAN_OPERATOR)).toBe(true);
  });

  it("PROVINCE_ADMIN can create Kabupaten Admin and below, but NOT Super Admin or Province Admin", () => {
    expect(canPerformUserAction(provinceAdmin, "create", UserRole.SUPER_ADMIN)).toBe(false);
    expect(canPerformUserAction(provinceAdmin, "create", UserRole.PROVINCE_ADMIN)).toBe(false);
    expect(canPerformUserAction(provinceAdmin, "create", UserRole.KABUPATEN_ADMIN)).toBe(true);
    expect(canPerformUserAction(provinceAdmin, "create", UserRole.KECAMATAN_ADMIN)).toBe(true);
    expect(canPerformUserAction(provinceAdmin, "create", UserRole.KELURAHAN_OPERATOR)).toBe(true);
  });

  it("KABUPATEN_ADMIN can create Kecamatan Admin and Operator, but NOT Kabupaten Admin or above", () => {
    expect(canPerformUserAction(kabupatenAdmin, "create", UserRole.SUPER_ADMIN)).toBe(false);
    expect(canPerformUserAction(kabupatenAdmin, "create", UserRole.PROVINCE_ADMIN)).toBe(false);
    expect(canPerformUserAction(kabupatenAdmin, "create", UserRole.KABUPATEN_ADMIN)).toBe(false);
    expect(canPerformUserAction(kabupatenAdmin, "create", UserRole.KECAMATAN_ADMIN)).toBe(true);
    expect(canPerformUserAction(kabupatenAdmin, "create", UserRole.KELURAHAN_OPERATOR)).toBe(true);
  });

  it("KECAMATAN_ADMIN can only create Kelurahan Operator", () => {
    expect(canPerformUserAction(kecamatanAdmin, "create", UserRole.KECAMATAN_ADMIN)).toBe(false);
    expect(canPerformUserAction(kecamatanAdmin, "create", UserRole.KABUPATEN_ADMIN)).toBe(false);
    expect(canPerformUserAction(kecamatanAdmin, "create", UserRole.KELURAHAN_OPERATOR)).toBe(true);
  });

  it("KELURAHAN_OPERATOR and AUDITOR are denied user creation access", () => {
    expect(canPerformUserAction(operator, "create", UserRole.KELURAHAN_OPERATOR)).toBe(false);
    expect(canPerformUserAction(auditor, "create", UserRole.KELURAHAN_OPERATOR)).toBe(false);
    expect(canPerformUserAction(operator, "read")).toBe(false);
    expect(canPerformUserAction(auditor, "read")).toBe(false);
  });
});

describe("isRoleAtLeast Check", () => {
  it("determines correct minimum role boundary", () => {
    expect(isRoleAtLeast(UserRole.SUPER_ADMIN, UserRole.KECAMATAN_ADMIN)).toBe(true);
    expect(isRoleAtLeast(UserRole.PROVINCE_ADMIN, UserRole.KECAMATAN_ADMIN)).toBe(true);
    expect(isRoleAtLeast(UserRole.KABUPATEN_ADMIN, UserRole.KECAMATAN_ADMIN)).toBe(true);
    expect(isRoleAtLeast(UserRole.KECAMATAN_ADMIN, UserRole.KECAMATAN_ADMIN)).toBe(true);
    expect(isRoleAtLeast(UserRole.KELURAHAN_OPERATOR, UserRole.KECAMATAN_ADMIN)).toBe(false);
    expect(isRoleAtLeast(UserRole.AUDITOR, UserRole.KECAMATAN_ADMIN)).toBe(false);
  });
});

describe("Argon2id Password Hashing", () => {
  const plainPassword = "DemoPassword@12345";

  it("hashes password into valid argon2id format", async () => {
    const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });
    expect(hash).toContain("$argon2id$");
    expect(hash).not.toBe(plainPassword);
  });

  it("successfully verifies correct password against hash", async () => {
    const hash = await argon2.hash(plainPassword, { type: argon2.argon2id });
    const match = await argon2.verify(hash, plainPassword);
    expect(match).toBe(true);

    const wrongMatch = await argon2.verify(hash, "WrongPassword@999");
    expect(wrongMatch).toBe(false);
  });
});

describe("User Validation Schemas", () => {
  it("accepts a completely valid user creation input", () => {
    const result = UserCreateSchema.safeParse({
      username: "operator_baru",
      email: "operator_baru@demo.local",
      fullName: "Operator Baru Demo",
      password: "DemoPassword@123",
      role: "KELURAHAN_OPERATOR",
      provinceId: "prov-demo-001",
      kabupatenId: "kab-demo-001",
      kecamatanId: "kec-demo-001",
      kelurahanId: "kel-demo-001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects weak passwords missing uppercase or numbers", () => {
    const result = UserCreateSchema.safeParse({
      username: "user_test",
      email: "user@demo.local",
      fullName: "User Test",
      password: "weakpassword", // missing uppercase and numbers
      role: "KELURAHAN_OPERATOR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email formats", () => {
    const result = UserCreateSchema.safeParse({
      username: "user_test",
      email: "invalid-email-string",
      fullName: "User Test",
      password: "Password123!",
      role: "KELURAHAN_OPERATOR",
    });
    expect(result.success).toBe(false);
  });

  it("UserUpdateSchema accepts partial updates with optional password and isActive", () => {
    const result = UserUpdateSchema.safeParse({
      fullName: "Updated Name",
      isActive: false,
    });
    expect(result.success).toBe(true);
  });

  it("converts empty string territory fields to null via preprocessing", () => {
    const result = UserCreateSchema.safeParse({
      username: "admin_super",
      email: "admin_super@demo.local",
      fullName: "Admin Super Demo",
      password: "DemoPassword@123",
      role: "SUPER_ADMIN",
      provinceId: "",
      kabupatenId: "",
      kecamatanId: "",
      kelurahanId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provinceId).toBeNull();
      expect(result.data.kabupatenId).toBeNull();
      expect(result.data.kecamatanId).toBeNull();
      expect(result.data.kelurahanId).toBeNull();
    }
  });
});

describe("normalizeUserTerritoryByRole", () => {
  const fullTerritory = {
    provinceId: "32",
    kabupatenId: "3201",
    kecamatanId: "3201210",
    kelurahanId: "3201210005",
  };

  it("strips all territories for SUPER_ADMIN and AUDITOR", () => {
    const superAdminTerritory = normalizeUserTerritoryByRole(UserRole.SUPER_ADMIN, fullTerritory);
    expect(superAdminTerritory).toEqual({
      provinceId: null,
      kabupatenId: null,
      kecamatanId: null,
      kelurahanId: null,
    });

    const auditorTerritory = normalizeUserTerritoryByRole(UserRole.AUDITOR, fullTerritory);
    expect(auditorTerritory).toEqual({
      provinceId: null,
      kabupatenId: null,
      kecamatanId: null,
      kelurahanId: null,
    });
  });

  it("retains only provinceId for PROVINCE_ADMIN", () => {
    const provTerritory = normalizeUserTerritoryByRole(UserRole.PROVINCE_ADMIN, fullTerritory);
    expect(provTerritory).toEqual({
      provinceId: "32",
      kabupatenId: null,
      kecamatanId: null,
      kelurahanId: null,
    });
  });

  it("retains provinceId and kabupatenId for KABUPATEN_ADMIN", () => {
    const kabTerritory = normalizeUserTerritoryByRole(UserRole.KABUPATEN_ADMIN, fullTerritory);
    expect(kabTerritory).toEqual({
      provinceId: "32",
      kabupatenId: "3201",
      kecamatanId: null,
      kelurahanId: null,
    });
  });

  it("retains up to kecamatanId for KECAMATAN_ADMIN", () => {
    const kecTerritory = normalizeUserTerritoryByRole(UserRole.KECAMATAN_ADMIN, fullTerritory);
    expect(kecTerritory).toEqual({
      provinceId: "32",
      kabupatenId: "3201",
      kecamatanId: "3201210",
      kelurahanId: null,
    });
  });

  it("retains all 4 territory levels for KELURAHAN_OPERATOR", () => {
    const opTerritory = normalizeUserTerritoryByRole(UserRole.KELURAHAN_OPERATOR, fullTerritory);
    expect(opTerritory).toEqual({
      provinceId: "32",
      kabupatenId: "3201",
      kecamatanId: "3201210",
      kelurahanId: "3201210005",
    });
  });
});
