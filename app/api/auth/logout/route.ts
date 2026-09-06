/**
 * VoterScope Demo — Logout API Route
 * POST /api/auth/logout
 *
 * Destroys the iron-session cookie and logs the event.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  try {
    const session = await getSession();
    const userId = session.user?.id ?? null;
    const role = session.user?.role ?? null;

    // Destroy the session (clears cookie)
    session.destroy();

    await createAuditLog({
      userId,
      action: "LOGOUT",
      resourceType: "AUTH",
      resourceId: null,
      result: "SUCCESS",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      metadata: { role },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Terjadi kesalahan server." } },
      { status: 500 }
    );
  }
}
