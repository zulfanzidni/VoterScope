/**
 * VoterScope Demo — Session Management
 * Uses iron-session v8 for secure, HTTP-only, encrypted cookie sessions.
 *
 * DEMO ONLY — not production-grade.
 * Session secret must be at least 32 characters.
 */

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/types";

export type SessionData = {
  user?: SessionUser;
  isLoggedIn: boolean;
};

/**
 * Resolves the session encryption secret.
 *
 * iron-session requires >= 32 characters. There is deliberately NO hardcoded
 * fallback: a built-in default would silently produce cookies sealed with a
 * publicly known key in any deployment that forgot to set SESSION_SECRET.
 * Failing loudly is the safe behaviour.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. " +
        "Set it to a random value (e.g. `openssl rand -hex 32`) before starting the server."
    );
  }

  return secret;
}

/**
 * Decides whether the session cookie carries the `Secure` flag.
 *
 * Defaults to the previous behaviour (Secure in production). The COOKIE_SECURE
 * override exists because `NODE_ENV=production` is the right setting for a
 * production build, but a production build served over plain HTTP on localhost
 * — e.g. a local Docker container — would have its cookie rejected by the
 * browser, silently breaking login. Set COOKIE_SECURE=false for that case only.
 */
function isCookieSecure(): boolean {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();

  if (override === "false" || override === "0") return false;
  if (override === "true" || override === "1") return true;

  return process.env.NODE_ENV === "production";
}

export const SESSION_OPTIONS: SessionOptions = {
  // Deliberately a getter, not a plain value. Next.js evaluates route modules
  // during build-time page-data collection, so reading the secret eagerly here
  // would make `next build` fail unless SESSION_SECRET happens to be set in the
  // build environment. Deferring to first use keeps the build independent of
  // runtime secrets while still failing loudly on a missing secret at runtime.
  get password() {
    return getSessionSecret();
  },
  cookieName: "voterscope_session",
  ttl: 60 * 60 * 8, // 8 hours in seconds
  cookieOptions: {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
  return session;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) return null;
  return session.user;
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
