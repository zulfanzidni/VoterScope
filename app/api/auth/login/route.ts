/**
 * VoterScope Demo — Login API Route
 * POST /api/auth/login
 *
 * Verifies credentials with Argon2id, creates iron-session.
 * ALL DATA IS SYNTHETIC DEMO DATA.
 *
 * Audit writes are deferred with `after()` from next/server so they run once the
 * response has been sent. Measured against the live database, an audit INSERT
 * costs ~270 ms (median), and the login response previously waited for it on
 * every path — including failures, where it doubled the cost of a 401.
 *
 * `after()` is used rather than simply not awaiting the promise: on serverless an
 * un-awaited promise can be dropped when the instance freezes, which would lose
 * audit rows silently. `after()` is tracked by the runtime and completes within
 * the route's max duration. The trade-off is deliberate — a failed audit write is
 * already non-fatal (see lib/audit), and losing a few ms of durability on a
 * logging row is worth ~270 ms off every login.
 */

import { NextRequest, NextResponse, after } from "next/server";
import * as argon2 from "argon2";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAuditLog } from "@/lib/audit";
import type { SessionUser } from "@/lib/types";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  // Rate limiting — max 10 login attempts per 15 minutes per IP
  const rateLimit = checkRateLimit(ip, "login");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Terlalu banyak percobaan login. Silakan coba lagi nanti.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Request body tidak valid." } },
      { status: 400 }
    );
  }

  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Username dan password wajib diisi.",
          details: parseResult.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }

  const { username, password } = parseResult.data;

  try {
    // Lookup user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        passwordHash: true,
        provinceId: true,
        kabupatenId: true,
        kecamatanId: true,
        kelurahanId: true,
      },
    });

    // Generic error — don't leak whether username exists
    const GENERIC_ERROR = NextResponse.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Username atau password salah.",
        },
      },
      { status: 401 }
    );

    if (!user || !user.isActive) {
      // Still run hash comparison to prevent timing attacks. This one stays on
      // the response path — it is the defence against enumerating usernames by
      // response latency, so it must not be deferred.
      await argon2.hash("dummy-password-timing-prevention");
      after(() =>
        createAuditLog({
          userId: null,
          action: "LOGIN_FAILED",
          resourceType: "AUTH",
          resourceId: null,
          result: "FAILURE",
          ipAddress: ip,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          metadata: { reason: user ? "ACCOUNT_INACTIVE" : "USER_NOT_FOUND", username },
        })
      );
      return GENERIC_ERROR;
    }

    // Verify password with Argon2id
    let passwordValid: boolean;
    try {
      passwordValid = await argon2.verify(user.passwordHash, password);
    } catch {
      return NextResponse.json(
        { error: { code: "SERVER_ERROR", message: "Terjadi kesalahan pada verifikasi kata sandi." } },
        { status: 500 }
      );
    }

    if (!passwordValid) {
      after(() =>
        createAuditLog({
          userId: user.id,
          action: "LOGIN_FAILED",
          resourceType: "AUTH",
          resourceId: null,
          result: "FAILURE",
          ipAddress: ip,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          metadata: { reason: "WRONG_PASSWORD" },
        })
      );
      return GENERIC_ERROR;
    }

    // Build session user (NO passwordHash)
    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role as SessionUser["role"],
      provinceId: user.provinceId,
      kabupatenId: user.kabupatenId,
      kecamatanId: user.kecamatanId,
      kelurahanId: user.kelurahanId,
    };

    // Create session
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: sessionUser.id,
          username: sessionUser.username,
          fullName: sessionUser.fullName,
          role: sessionUser.role,
        },
      },
      { status: 200 }
    );

    const session = await getSession();
    session.isLoggedIn = true;
    session.user = sessionUser;
    // Awaited deliberately: the Set-Cookie header must be on the response, so
    // this is genuinely on the critical path (unlike the audit write below).
    await session.save();

    // Audit log — SUCCESS. Deferred like the failure paths; `user` is captured
    // from the closure, so nothing is re-read.
    after(() =>
      createAuditLog({
        userId: user.id,
        action: "LOGIN",
        resourceType: "AUTH",
        resourceId: null,
        result: "SUCCESS",
        ipAddress: ip,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        metadata: { role: user.role },
      })
    );

    return response;
  } catch (err) {
    console.error("[LOGIN_ERROR]", err);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message:
            "Terjadi kesalahan pada server atau database. Pastikan konfigurasi environment variables (DATABASE_URL) telah terpasang dengan benar di hosting.",
        },
      },
      { status: 500 }
    );
  }
}
