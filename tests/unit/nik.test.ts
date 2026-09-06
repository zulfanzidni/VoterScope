/**
 * VoterScope Demo — Unit Tests: NIK Security
 *
 * Tests for AES-256-GCM encryption and HMAC-SHA-256 lookup hash.
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { encryptNik, decryptNik, hashNikForLookup, maskNik } from "@/lib/security/nik";

// Set test environment variables
beforeAll(() => {
  process.env.NIK_ENCRYPTION_KEY = "dev-only-nik-encryption-key-demo";
  process.env.NIK_LOOKUP_SECRET = "dev-only-nik-lookup-secret-demo0";
});

describe("NIK Encryption (AES-256-GCM)", () => {
  const syntheticNik = "3201000000000001"; // SYNTHETIC DEMO DATA — not a real NIK

  it("encrypts a synthetic NIK and returns a non-empty string", () => {
    const encrypted = encryptNik(syntheticNik);
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe(syntheticNik);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const e1 = encryptNik(syntheticNik);
    const e2 = encryptNik(syntheticNik);
    expect(e1).not.toBe(e2);
  });

  it("decrypts back to the original synthetic NIK", () => {
    const encrypted = encryptNik(syntheticNik);
    const decrypted = decryptNik(encrypted);
    expect(decrypted).toBe(syntheticNik);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptNik(syntheticNik);
    const tampered = encrypted.slice(0, -5) + "XXXXX";
    expect(() => decryptNik(tampered)).toThrow();
  });

  it("throws on invalid format", () => {
    expect(() => decryptNik("not-valid")).toThrow();
  });
});

describe("NIK HMAC Lookup Hash", () => {
  const nik1 = "3201000000000001"; // SYNTHETIC
  const nik2 = "3201000000000002"; // SYNTHETIC

  it("produces a consistent hash for the same NIK", () => {
    const h1 = hashNikForLookup(nik1);
    const h2 = hashNikForLookup(nik1);
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different NIKs", () => {
    const h1 = hashNikForLookup(nik1);
    const h2 = hashNikForLookup(nik2);
    expect(h1).not.toBe(h2);
  });

  it("returns a 64-character hex string (SHA-256)", () => {
    const hash = hashNikForLookup(nik1);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("NIK Masking", () => {
  it("masks the middle digits of a synthetic NIK", () => {
    const masked = maskNik("3201000000000001");
    expect(masked).toBe("3201**********01");
  });

  it("handles short strings gracefully", () => {
    const masked = maskNik("12");
    expect(masked).toBe("****");
  });
});
