/**
 * VoterScope Demo — Unit Tests: User Profile & Self-Service Settings
 *
 * Tests for profile update validation, password change validation (OWASP rules),
 * password match refinement, and Argon2id verification.
 *
 * ALL USER DATA REPRESENTS SYNTHETIC DEMO CREDENTIALS.
 */

import { describe, it, expect } from "vitest";
import * as argon2 from "argon2";
import { ProfileUpdateSchema, ChangePasswordSchema } from "@/lib/validation/schemas";

describe("ProfileUpdateSchema", () => {
  it("validates valid profile update payload", () => {
    const valid = {
      fullName: "Raden Mas Suryo",
      email: "raden.suryo@voterscope.demo",
    };
    const result = ProfileUpdateSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Raden Mas Suryo");
      expect(result.data.email).toBe("raden.suryo@voterscope.demo");
    }
  });

  it("rejects fullName with less than 3 characters", () => {
    const invalid = {
      fullName: "Al",
      email: "valid@demo.local",
    };
    const result = ProfileUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.issues[0]?.message).toContain("minimal 3 karakter");
    }
  });

  it("rejects fullName exceeding 100 characters", () => {
    const invalid = {
      fullName: "A".repeat(101),
      email: "valid@demo.local",
    };
    const result = ProfileUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.issues[0]?.message).toContain("maksimal 100 karakter");
    }
  });

  it("rejects invalid email formats", () => {
    const invalidEmails = [
      "not-an-email",
      "@nodomain.com",
      "no-at-sign.demo",
      "spaces in@email.com",
    ];

    for (const email of invalidEmails) {
      const res = ProfileUpdateSchema.safeParse({
        fullName: "Testing Email",
        email,
      });
      expect(res.success).toBe(false);
    }
  });
});

describe("ChangePasswordSchema (OWASP Complexity Rules)", () => {
  const validPayload = {
    currentPassword: "OldPassword123!",
    newPassword: "NewSecretPassword2026@",
    confirmPassword: "NewSecretPassword2026@",
  };

  it("accepts strong password meeting all criteria", () => {
    const res = ChangePasswordSchema.safeParse(validPayload);
    expect(res.success).toBe(true);
  });

  it("rejects when new password is fewer than 8 characters", () => {
    const res = ChangePasswordSchema.safeParse({
      ...validPayload,
      newPassword: "Short1!",
      confirmPassword: "Short1!",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(" ");
      expect(msg).toContain("minimal 8 karakter");
    }
  });

  it("rejects when new password lacks uppercase letter", () => {
    const res = ChangePasswordSchema.safeParse({
      ...validPayload,
      newPassword: "nouppercase123!",
      confirmPassword: "nouppercase123!",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(" ");
      expect(msg).toContain("huruf besar");
    }
  });

  it("rejects when new password lacks lowercase letter", () => {
    const res = ChangePasswordSchema.safeParse({
      ...validPayload,
      newPassword: "NOLOWERCASE123!",
      confirmPassword: "NOLOWERCASE123!",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(" ");
      expect(msg).toContain("huruf kecil");
    }
  });

  it("rejects when new password lacks numbers", () => {
    const res = ChangePasswordSchema.safeParse({
      ...validPayload,
      newPassword: "NoNumbersHere!@",
      confirmPassword: "NoNumbersHere!@",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(" ");
      expect(msg).toContain("angka");
    }
  });

  it("rejects when new password lacks special characters", () => {
    const res = ChangePasswordSchema.safeParse({
      ...validPayload,
      newPassword: "NoSpecialCharacter123",
      confirmPassword: "NoSpecialCharacter123",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(" ");
      expect(msg).toContain("karakter khusus");
    }
  });

  it("rejects when new password does not match confirmation", () => {
    const res = ChangePasswordSchema.safeParse({
      ...validPayload,
      confirmPassword: "DifferentPassword2026@",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(" ");
      expect(msg).toContain("tidak cocok");
    }
  });

  it("rejects empty current password", () => {
    const res = ChangePasswordSchema.safeParse({
      ...validPayload,
      currentPassword: "",
    });
    expect(res.success).toBe(false);
  });
});

describe("Argon2id Password Verification & Hashing", () => {
  it("correctly verifies matching current password and rejects invalid password", async () => {
    const currentPass = "AdminDemo2026!";
    const wrongPass = "WrongPass123!";
    const hash = await argon2.hash(currentPass, { type: argon2.argon2id });

    expect(await argon2.verify(hash, currentPass)).toBe(true);
    expect(await argon2.verify(hash, wrongPass)).toBe(false);
  });

  it("hashes new password securely with argon2id algorithm identifier", async () => {
    const newPass = "NewSecurePassword#2026";
    const hash = await argon2.hash(newPass, { type: argon2.argon2id });

    expect(hash).toContain("$argon2id$");
    expect(await argon2.verify(hash, newPass)).toBe(true);
  });
});
