/**
 * VoterScope Demo — NIK Encryption & HMAC Utilities
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 * This module demonstrates security architecture for protecting sensitive identifiers.
 *
 * Encryption: AES-256-GCM (authenticated encryption via Node.js crypto)
 * Lookup:     HMAC-SHA-256 for deterministic duplicate detection
 *
 * Keys are loaded from environment variables — NEVER hardcoded.
 * See docs/security.md for architecture documentation.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM

function getEncryptionKey(): Buffer {
  const keyEnv = process.env.NIK_ENCRYPTION_KEY;
  if (!keyEnv) throw new Error("NIK_ENCRYPTION_KEY environment variable is not set");
  // Pad/truncate key string to exactly 64 hex chars (32 bytes) for AES-256
  // We use the raw string padded/truncated rather than hex decoding,
  // because dev keys may not be valid hex.
  const keyBuf = Buffer.alloc(32);
  Buffer.from(keyEnv, "utf8").copy(keyBuf);
  return keyBuf;
}

function getLookupSecret(): string {
  const secret = process.env.NIK_LOOKUP_SECRET;
  if (!secret) throw new Error("NIK_LOOKUP_SECRET environment variable is not set");
  return secret;
}

/**
 * Encrypts a synthetic NIK using AES-256-GCM.
 * Returns a base64-encoded string: iv:authTag:ciphertext
 */
export function encryptNik(syntheticNik: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(syntheticNik, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts an encrypted NIK string.
 * Returns the original synthetic NIK, or throws on failure.
 */
export function decryptNik(encryptedNik: string): string {
  const key = getEncryptionKey();
  const parts = encryptedNik.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted NIK format");
  }

  const ivB64 = parts[0];
  const authTagB64 = parts[1];
  const ciphertextB64 = parts[2];

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Invalid encrypted NIK format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generates a deterministic HMAC-SHA-256 hash of a synthetic NIK.
 * Used for duplicate detection without storing the plaintext NIK.
 */
export function hashNikForLookup(syntheticNik: string): string {
  const secret = getLookupSecret();
  return createHmac("sha256", secret)
    .update(syntheticNik.trim())
    .digest("hex");
}

/**
 * Masks a NIK for display: shows first 4 and last 2 digits.
 * Example: "3201****1234**" → masked display
 */
export function maskNik(nik: string): string {
  if (nik.length < 6) return "****";
  return nik.slice(0, 4) + "*".repeat(nik.length - 6) + nik.slice(-2);
}
