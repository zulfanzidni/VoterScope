/**
 * VoterScope Demo — Session Info API Route
 * GET /api/auth/session
 *
 * Returns the current session user (without sensitive fields).
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Tidak ada sesi aktif." } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      provinceId: user.provinceId,
      kabupatenId: user.kabupatenId,
      kecamatanId: user.kecamatanId,
      kelurahanId: user.kelurahanId,
    },
  });
}
