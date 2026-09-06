/**
 * VoterScope Demo — Unit Tests: Authentication & Session Helpers
 *
 * Tests for role hierarchy, login schema validation, password policy.
 * ALL DATA IS SYNTHETIC DEMO DATA.
 */

import { describe, it, expect } from "vitest";
import { UserRole, getRoleLevel, isRoleAtLeast, ROLE_HIERARCHY } from "@/lib/types";

// -----------------------------------------------------------------------------
// Role Hierarchy integrity
// -----------------------------------------------------------------------------

describe("Role Hierarchy — getRoleLevel", () => {
  it("SUPER_ADMIN has the highest level", () => {
    const level = getRoleLevel(UserRole.SUPER_ADMIN);
    for (const role of ROLE_HIERARCHY) {
      expect(level).toBeGreaterThanOrEqual(getRoleLevel(role));
    }
  });

  it("AUDITOR has the lowest level (0)", () => {
    expect(getRoleLevel(UserRole.AUDITOR)).toBe(0);
  });

  it("All roles are present in hierarchy (no unknown roles)", () => {
    const allRoles: UserRole[] = [
      UserRole.AUDITOR,
      UserRole.KELURAHAN_OPERATOR,
      UserRole.KECAMATAN_ADMIN,
      UserRole.KABUPATEN_ADMIN,
      UserRole.PROVINCE_ADMIN,
      UserRole.SUPER_ADMIN,
    ];
    for (const role of allRoles) {
      expect(getRoleLevel(role)).toBeGreaterThanOrEqual(0);
    }
  });

  it("Hierarchy is strictly ascending", () => {
    expect(getRoleLevel(UserRole.KELURAHAN_OPERATOR)).toBeGreaterThan(getRoleLevel(UserRole.AUDITOR));
    expect(getRoleLevel(UserRole.KECAMATAN_ADMIN)).toBeGreaterThan(getRoleLevel(UserRole.KELURAHAN_OPERATOR));
    expect(getRoleLevel(UserRole.KABUPATEN_ADMIN)).toBeGreaterThan(getRoleLevel(UserRole.KECAMATAN_ADMIN));
    expect(getRoleLevel(UserRole.PROVINCE_ADMIN)).toBeGreaterThan(getRoleLevel(UserRole.KABUPATEN_ADMIN));
    expect(getRoleLevel(UserRole.SUPER_ADMIN)).toBeGreaterThan(getRoleLevel(UserRole.PROVINCE_ADMIN));
  });
});

// -----------------------------------------------------------------------------
// isRoleAtLeast
// -----------------------------------------------------------------------------

describe("isRoleAtLeast", () => {
  it("SUPER_ADMIN satisfies any minimum", () => {
    expect(isRoleAtLeast(UserRole.SUPER_ADMIN, UserRole.AUDITOR)).toBe(true);
    expect(isRoleAtLeast(UserRole.SUPER_ADMIN, UserRole.PROVINCE_ADMIN)).toBe(true);
    expect(isRoleAtLeast(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)).toBe(true);
  });

  it("AUDITOR only satisfies AUDITOR minimum", () => {
    expect(isRoleAtLeast(UserRole.AUDITOR, UserRole.AUDITOR)).toBe(true);
    expect(isRoleAtLeast(UserRole.AUDITOR, UserRole.KELURAHAN_OPERATOR)).toBe(false);
    expect(isRoleAtLeast(UserRole.AUDITOR, UserRole.SUPER_ADMIN)).toBe(false);
  });

  it("KELURAHAN_OPERATOR satisfies AUDITOR and KELURAHAN but not above", () => {
    expect(isRoleAtLeast(UserRole.KELURAHAN_OPERATOR, UserRole.AUDITOR)).toBe(true);
    expect(isRoleAtLeast(UserRole.KELURAHAN_OPERATOR, UserRole.KELURAHAN_OPERATOR)).toBe(true);
    expect(isRoleAtLeast(UserRole.KELURAHAN_OPERATOR, UserRole.KECAMATAN_ADMIN)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Login schema validation
// -----------------------------------------------------------------------------

describe("Login schema validation", async () => {
  const { loginSchema } = await import("@/lib/validation/schemas");

  it("rejects empty username", () => {
    expect(loginSchema.safeParse({ username: "", password: "Demo@12345" }).success).toBe(false);
  });

  it("rejects username shorter than 3 chars", () => {
    expect(loginSchema.safeParse({ username: "ab", password: "Demo@12345" }).success).toBe(false);
  });

  it("rejects username with spaces/special chars", () => {
    expect(loginSchema.safeParse({ username: "user name!", password: "Demo@12345" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ username: "validuser", password: "" }).success).toBe(false);
  });

  it("accepts valid demo credentials", () => {
    expect(loginSchema.safeParse({ username: "superadmin", password: "Demo@12345" }).success).toBe(true);
  });

  it("accepts underscore-separated demo usernames", () => {
    expect(loginSchema.safeParse({ username: "kelurahan_operator", password: "Demo@12345" }).success).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Password policy (UserCreateSchema)
// -----------------------------------------------------------------------------

describe("Password policy (UserCreateSchema)", async () => {
  const { UserCreateSchema } = await import("@/lib/validation/schemas");
  const passwordField = UserCreateSchema.shape.password;

  it("rejects password shorter than 8 chars", () => {
    expect(passwordField.safeParse("Ab1").success).toBe(false);
  });

  it("rejects all-lowercase password (no uppercase)", () => {
    expect(passwordField.safeParse("lowercase123").success).toBe(false);
  });

  it("rejects all-uppercase password (no lowercase)", () => {
    expect(passwordField.safeParse("UPPERCASE123").success).toBe(false);
  });

  it("rejects password with no digit", () => {
    expect(passwordField.safeParse("NoDigitPass").success).toBe(false);
  });

  it("accepts Demo@12345 as valid", () => {
    expect(passwordField.safeParse("Demo@12345").success).toBe(true);
  });

  it("accepts a complex strong password", () => {
    expect(passwordField.safeParse("S3cur3P@ssw0rd!").success).toBe(true);
  });
});
