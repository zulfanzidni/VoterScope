/**
 * VoterScope Demo — Audit Log Compliance Export API
 *
 * GET /api/audit/export — Stream simulated CSV / JSON file of audit logs
 * Restricted to SUPER_ADMIN and AUDITOR roles.
 *
 * ALL AUDIT LOGS DERIVED FROM SYNTHETIC DEMO SIMULATION.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAuditLog } from "@/lib/authorization";
import { errorResponse } from "@/lib/api/errors";
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
        "Hanya Super Administrator dan Auditor yang diizinkan mengekspor log audit."
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resourceType");
    const result = searchParams.get("result");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(result ? { result } : {}),
      ...(dateFrom || dateTo
        ? {
            timestamp: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 1000,
      include: {
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "json") {
      const jsonContent = JSON.stringify(logs, null, 2);
      return new NextResponse(jsonContent, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="audit_logs_${timestamp}.json"`,
        },
      });
    }

    // Default: CSV format
    const headers = [
      "ID",
      "Timestamp",
      "Username",
      "Role",
      "Action",
      "ResourceType",
      "ResourceId",
      "Result",
      "IPAddress",
      "UserAgent",
    ];

    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.user?.username ?? "SYSTEM",
      log.user?.role ?? "SYSTEM",
      log.action,
      log.resourceType,
      log.resourceId ?? "-",
      log.result,
      log.ipAddress ?? "127.0.0.1",
      `"${(log.userAgent ?? "Unknown").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit_logs_${timestamp}.csv"`,
      },
    });
  } catch (err) {
    console.error("[AUDIT_EXPORT_API] Error:", err);
    return errorResponse("INTERNAL_ERROR");
  }
}
