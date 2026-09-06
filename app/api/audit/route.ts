/**
 * VoterScope Demo — Audit Logs Collection API
 *
 * GET /api/audit — Paginated, filtered audit log viewer
 * Restricted to SUPER_ADMIN and AUDITOR roles.
 *
 * ALL AUDIT LOGS DERIVED FROM SYNTHETIC DEMO SIMULATION.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAuditLog } from "@/lib/authorization";
import { AuditSearchSchema } from "@/lib/validation/schemas";
import { errorResponse, successResponse } from "@/lib/api/errors";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED");
    }

    if (!canAccessAuditLog(user)) {
      return errorResponse(
        "FORBIDDEN",
        "Hanya Super Administrator dan Auditor yang memiliki izin untuk mengakses catatan log audit."
      );
    }

    const { searchParams } = new URL(request.url);
    const queryObj: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (value) queryObj[key] = value;
    }

    const parseResult = AuditSearchSchema.safeParse(queryObj);
    if (!parseResult.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Parameter pencarian audit tidak valid."
      );
    }

    const params = parseResult.data;

    const where: Prisma.AuditLogWhereInput = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.resourceType ? { resourceType: params.resourceType } : {}),
      ...(params.result ? { result: params.result } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            timestamp: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [total, successCount, failureCount, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, result: "SUCCESS" } }),
      prisma.auditLog.count({ where: { ...where, result: "FAILURE" } }),
      prisma.auditLog.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { timestamp: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const sanitizedLogs = logs.map((log) => {
      let parsedMetadata: Record<string, unknown> | null = null;
      if (log.metadata) {
        try {
          parsedMetadata = JSON.parse(log.metadata);
        } catch {
          parsedMetadata = null;
        }
      }

      return {
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        timestamp: log.timestamp.toISOString(),
        ipAddress: log.ipAddress ?? "127.0.0.1",
        userAgent: log.userAgent ?? "Unknown Client",
        result: log.result,
        metadata: parsedMetadata,
        user: log.user,
      };
    });

    return successResponse({
      data: sanitizedLogs,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
      stats: {
        total,
        successCount,
        failureCount,
      },
    });
  } catch (err) {
    console.error("[AUDIT_API] GET error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
