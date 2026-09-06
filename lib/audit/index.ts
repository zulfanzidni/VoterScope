/**
 * VoterScope Demo — Audit Log Utilities
 *
 * Creates structured audit records for all sensitive operations.
 * NEVER records: passwords, session tokens, full NIK, encryption keys.
 */

import prisma from "@/lib/db/prisma";
import type { AuditAction, AuditResourceType, AuditResult } from "@/lib/types";

export type CreateAuditLogInput = {
  userId?: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  result?: AuditResult;
  metadata?: Record<string, unknown> | null;
};

/**
 * Creates an audit log entry.
 * Metadata is serialized as JSON — ensure no secrets are included.
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  try {
    // Sanitize metadata — remove any accidental sensitive fields
    const safeMetadata = sanitizeAuditMetadata(input.metadata);

    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ? input.userAgent.slice(0, 500) : null,
        result: input.result ?? "SUCCESS",
        metadata: safeMetadata ? JSON.stringify(safeMetadata) : null,
      },
    });
  } catch (err) {
    // Audit log failure should not break the main operation
    // Log to stderr only — never expose to client
    console.error("[AUDIT] Failed to write audit log:", err);
  }
}

/** Removes sensitive keys from metadata before storing */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata) return null;

  const FORBIDDEN_KEYS = [
    "password",
    "passwordHash",
    "nik",
    "nikEncrypted",
    "nikPlain",
    "token",
    "sessionSecret",
    "encryptionKey",
    "secret",
    "cookie",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!FORBIDDEN_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Extracts IP address from a Request object.
 */
export function getIpFromRequest(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

/**
 * Extracts User-Agent from a Request object.
 */
export function getUserAgentFromRequest(request: Request): string | null {
  return request.headers.get("user-agent") ?? null;
}
