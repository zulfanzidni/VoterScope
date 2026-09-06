/**
 * VoterScope Demo — Unit Tests: Authorization
 *
 * Tests for RBAC role hierarchy, scope resolution, and voter access control.
 */

import { describe, it, expect } from "vitest";
import {
  getUserScope,
  buildAuthorizedVoterFilter,
  canAccessVoter,
  canPerformVoterAction,
  canPerformUserAction,
  canAccessAuditLog,
  isRoleAtLeast,
} from "@/lib/authorization";
import type { SessionUser } from "@/lib/types";
import { UserRole } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<SessionUser>): SessionUser => ({
  id: "user-1",
  username: "testuser",
  email: "test@demo.local",
  fullName: "Test User",
  role: UserRole.KELURAHAN_OPERATOR,
  provinceId: "prov-1",
  kabupatenId: "kab-1",
  kecamatanId: "kec-1",
  kelurahanId: "kel-1",
  ...overrides,
});

const voter = {
  provinceId: "prov-1",
  kabupatenId: "kab-1",
  kecamatanId: "kec-1",
  kelurahanId: "kel-1",
};

const voterDifferentKelurahan = {
  ...voter,
  kelurahanId: "kel-2",
};

// ─────────────────────────────────────────────────────────────────────────────
// Role hierarchy
// ─────────────────────────────────────────────────────────────────────────────

describe("isRoleAtLeast", () => {
  it("SUPER_ADMIN is at least PROVINCE_ADMIN", () => {
    expect(isRoleAtLeast(UserRole.SUPER_ADMIN, UserRole.PROVINCE_ADMIN)).toBe(true);
  });

  it("KELURAHAN_OPERATOR is NOT at least KECAMATAN_ADMIN", () => {
    expect(isRoleAtLeast(UserRole.KELURAHAN_OPERATOR, UserRole.KECAMATAN_ADMIN)).toBe(false);
  });

  it("Same role satisfies isRoleAtLeast", () => {
    expect(isRoleAtLeast(UserRole.KABUPATEN_ADMIN, UserRole.KABUPATEN_ADMIN)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scope resolution
// ─────────────────────────────────────────────────────────────────────────────

describe("getUserScope", () => {
  it("SUPER_ADMIN → NATIONAL scope", () => {
    const user = makeUser({ role: UserRole.SUPER_ADMIN });
    expect(getUserScope(user).level).toBe("NATIONAL");
  });

  it("PROVINCE_ADMIN → PROVINCE scope with provinceId", () => {
    const user = makeUser({ role: UserRole.PROVINCE_ADMIN });
    const scope = getUserScope(user);
    expect(scope.level).toBe("PROVINCE");
    expect(scope.provinceId).toBe("prov-1");
  });

  it("KELURAHAN_OPERATOR → KELURAHAN scope with kelurahanId", () => {
    const user = makeUser({ role: UserRole.KELURAHAN_OPERATOR });
    const scope = getUserScope(user);
    expect(scope.level).toBe("KELURAHAN");
    expect(scope.kelurahanId).toBe("kel-1");
  });

  it("AUDITOR with no scope → NATIONAL scope", () => {
    const user = makeUser({
      role: UserRole.AUDITOR,
      provinceId: null,
      kabupatenId: null,
      kecamatanId: null,
      kelurahanId: null,
    });
    expect(getUserScope(user).level).toBe("NATIONAL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Voter access control (IDOR prevention)
// ─────────────────────────────────────────────────────────────────────────────

describe("canAccessVoter", () => {
  it("SUPER_ADMIN can access any voter", () => {
    const user = makeUser({ role: UserRole.SUPER_ADMIN });
    expect(canAccessVoter(user, voterDifferentKelurahan)).toBe(true);
  });

  it("KELURAHAN_OPERATOR can access voter in same kelurahan", () => {
    const user = makeUser({ role: UserRole.KELURAHAN_OPERATOR });
    expect(canAccessVoter(user, voter)).toBe(true);
  });

  it("KELURAHAN_OPERATOR CANNOT access voter in different kelurahan", () => {
    const user = makeUser({ role: UserRole.KELURAHAN_OPERATOR });
    expect(canAccessVoter(user, voterDifferentKelurahan)).toBe(false);
  });

  it("KECAMATAN_ADMIN can access voter in same kecamatan, different kelurahan", () => {
    const user = makeUser({ role: UserRole.KECAMATAN_ADMIN });
    expect(canAccessVoter(user, voterDifferentKelurahan)).toBe(true);
  });

  it("KABUPATEN_ADMIN CANNOT access voter in different kabupaten", () => {
    const user = makeUser({ role: UserRole.KABUPATEN_ADMIN });
    const voterOtherKab = { ...voter, kabupatenId: "kab-99", kecamatanId: "kec-99", kelurahanId: "kel-99" };
    expect(canAccessVoter(user, voterOtherKab)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Action permissions
// ─────────────────────────────────────────────────────────────────────────────

describe("canPerformVoterAction", () => {
  it("AUDITOR can only read", () => {
    const user = makeUser({ role: UserRole.AUDITOR });
    expect(canPerformVoterAction(user, "read")).toBe(true);
    expect(canPerformVoterAction(user, "create")).toBe(false);
    expect(canPerformVoterAction(user, "update")).toBe(false);
    expect(canPerformVoterAction(user, "archive")).toBe(false);
  });

  it("KELURAHAN_OPERATOR can create, update, archive", () => {
    const user = makeUser({ role: UserRole.KELURAHAN_OPERATOR });
    expect(canPerformVoterAction(user, "create")).toBe(true);
    expect(canPerformVoterAction(user, "update")).toBe(true);
    expect(canPerformVoterAction(user, "archive")).toBe(true);
  });

  it("SUPER_ADMIN can perform all voter actions", () => {
    const user = makeUser({ role: UserRole.SUPER_ADMIN });
    expect(canPerformVoterAction(user, "create")).toBe(true);
    expect(canPerformVoterAction(user, "read")).toBe(true);
    expect(canPerformVoterAction(user, "update")).toBe(true);
    expect(canPerformVoterAction(user, "archive")).toBe(true);
    expect(canPerformVoterAction(user, "nik_lookup")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit log access
// ─────────────────────────────────────────────────────────────────────────────

describe("canAccessAuditLog", () => {
  it("SUPER_ADMIN can access audit log", () => {
    expect(canAccessAuditLog(makeUser({ role: UserRole.SUPER_ADMIN }))).toBe(true);
  });

  it("AUDITOR can access audit log", () => {
    expect(canAccessAuditLog(makeUser({ role: UserRole.AUDITOR }))).toBe(true);
  });

  it("KELURAHAN_OPERATOR cannot access audit log", () => {
    expect(canAccessAuditLog(makeUser({ role: UserRole.KELURAHAN_OPERATOR }))).toBe(false);
  });

  it("PROVINCE_ADMIN cannot access audit log", () => {
    expect(canAccessAuditLog(makeUser({ role: UserRole.PROVINCE_ADMIN }))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Role escalation prevention
// ─────────────────────────────────────────────────────────────────────────────

describe("canPerformUserAction — role escalation prevention", () => {
  it("KECAMATAN_ADMIN cannot create a PROVINCE_ADMIN", () => {
    const actor = makeUser({ role: UserRole.KECAMATAN_ADMIN });
    expect(canPerformUserAction(actor, "create", UserRole.PROVINCE_ADMIN)).toBe(false);
  });

  it("KABUPATEN_ADMIN cannot create a SUPER_ADMIN", () => {
    const actor = makeUser({ role: UserRole.KABUPATEN_ADMIN });
    expect(canPerformUserAction(actor, "create", UserRole.SUPER_ADMIN)).toBe(false);
  });

  it("SUPER_ADMIN can create any role", () => {
    const actor = makeUser({ role: UserRole.SUPER_ADMIN });
    expect(canPerformUserAction(actor, "create", UserRole.KELURAHAN_OPERATOR)).toBe(true);
    expect(canPerformUserAction(actor, "create", UserRole.PROVINCE_ADMIN)).toBe(true);
  });

  it("AUDITOR cannot manage users", () => {
    const actor = makeUser({ role: UserRole.AUDITOR });
    expect(canPerformUserAction(actor, "create")).toBe(false);
    expect(canPerformUserAction(actor, "update")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Voter filter builder
// ─────────────────────────────────────────────────────────────────────────────

describe("buildAuthorizedVoterFilter", () => {
  it("SUPER_ADMIN produces empty filter (no restriction)", () => {
    const user = makeUser({ role: UserRole.SUPER_ADMIN });
    expect(buildAuthorizedVoterFilter(user)).toEqual({});
  });

  it("PROVINCE_ADMIN produces { provinceId } filter", () => {
    const user = makeUser({ role: UserRole.PROVINCE_ADMIN });
    const filter = buildAuthorizedVoterFilter(user);
    expect(filter).toHaveProperty("provinceId", "prov-1");
    expect(filter).not.toHaveProperty("kabupatenId");
  });

  it("KELURAHAN_OPERATOR produces { kelurahanId } filter", () => {
    const user = makeUser({ role: UserRole.KELURAHAN_OPERATOR });
    const filter = buildAuthorizedVoterFilter(user);
    expect(filter).toHaveProperty("kelurahanId", "kel-1");
  });
});
