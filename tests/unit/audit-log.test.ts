/**
 * VoterScope Demo — Unit Tests: Audit Logging & Security Boundaries
 *
 * Tests for audit access authorization (RBAC), metadata sanitization,
 * and search filter validation.
 *
 * ALL AUDIT LOGS ARE DERIVED FROM SYNTHETIC DEMO SIMULATION.
 */

import { describe, it, expect } from "vitest";
import { canAccessAuditLog } from "@/lib/authorization";
import { sanitizeAuditMetadata } from "@/lib/audit";
import { AuditSearchSchema } from "@/lib/validation/schemas";
import { UserRole } from "@/lib/types";
import type { SessionUser } from "@/lib/types";

const makeUser = (role: UserRole): SessionUser => ({
  id: `user-${role.toLowerCase()}`,
  username: role.toLowerCase(),
  email: `${role.toLowerCase()}@demo.local`,
  fullName: `Demo ${role}`,
  role,
});

describe("canAccessAuditLog (RBAC Boundaries)", () => {
  it("permits SUPER_ADMIN to access audit logs", () => {
    const user = makeUser(UserRole.SUPER_ADMIN);
    expect(canAccessAuditLog(user)).toBe(true);
  });

  it("permits AUDITOR to access audit logs", () => {
    const user = makeUser(UserRole.AUDITOR);
    expect(canAccessAuditLog(user)).toBe(true);
  });

  it("denies PROVINCE_ADMIN access to audit logs", () => {
    const user = makeUser(UserRole.PROVINCE_ADMIN);
    expect(canAccessAuditLog(user)).toBe(false);
  });

  it("denies KABUPATEN_ADMIN access to audit logs", () => {
    const user = makeUser(UserRole.KABUPATEN_ADMIN);
    expect(canAccessAuditLog(user)).toBe(false);
  });

  it("denies KECAMATAN_ADMIN access to audit logs", () => {
    const user = makeUser(UserRole.KECAMATAN_ADMIN);
    expect(canAccessAuditLog(user)).toBe(false);
  });

  it("denies KELURAHAN_OPERATOR access to audit logs", () => {
    const user = makeUser(UserRole.KELURAHAN_OPERATOR);
    expect(canAccessAuditLog(user)).toBe(false);
  });
});

describe("sanitizeAuditMetadata (Data Privacy)", () => {
  it("strips password and passwordHash from metadata", () => {
    const input = {
      username: "budi",
      password: "SecretPassword123!",
      passwordHash: "$argon2id$...",
      action: "USER_LOGIN",
    };
    const sanitized = sanitizeAuditMetadata(input);
    expect(sanitized).toBeDefined();
    expect(sanitized?.password).toBeUndefined();
    expect(sanitized?.passwordHash).toBeUndefined();
    expect(sanitized?.username).toBe("budi");
    expect(sanitized?.action).toBe("USER_LOGIN");
  });

  it("strips plaintext and encrypted NIK keys from audit payload", () => {
    const input = {
      nik: "9901011505950001",
      nikPlain: "9901011505950001",
      nikEncrypted: "iv:tag:cipher",
      fullName: "Budi Santoso",
      tps: "001",
    };
    const sanitized = sanitizeAuditMetadata(input);
    expect(sanitized?.nik).toBeUndefined();
    expect(sanitized?.nikPlain).toBeUndefined();
    expect(sanitized?.nikEncrypted).toBeUndefined();
    expect(sanitized?.fullName).toBe("Budi Santoso");
    expect(sanitized?.tps).toBe("001");
  });

  it("strips tokens, secrets, and cookies", () => {
    const input = {
      sessionSecret: "ultra-secret-key",
      token: "jwt.token.string",
      cookie: "session=xyz",
      event: "SESSION_CHECK",
    };
    const sanitized = sanitizeAuditMetadata(input);
    expect(sanitized?.sessionSecret).toBeUndefined();
    expect(sanitized?.token).toBeUndefined();
    expect(sanitized?.cookie).toBeUndefined();
    expect(sanitized?.event).toBe("SESSION_CHECK");
  });

  it("returns null for null or undefined input", () => {
    expect(sanitizeAuditMetadata(null)).toBeNull();
    expect(sanitizeAuditMetadata(undefined)).toBeNull();
  });
});

describe("AuditSearchSchema Validation", () => {
  it("parses valid search filters and coerces page numbers", () => {
    const result = AuditSearchSchema.safeParse({
      action: "VOTER_CREATE",
      resourceType: "VOTER",
      result: "SUCCESS",
      page: "2",
      pageSize: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
      expect(result.data.action).toBe("VOTER_CREATE");
      expect(result.data.result).toBe("SUCCESS");
    }
  });

  it("rejects invalid result values", () => {
    const result = AuditSearchSchema.safeParse({
      result: "PENDING",
    });
    expect(result.success).toBe(false);
  });
});
