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

export const SESSION_OPTIONS: SessionOptions = {
  password: getSessionSecret(),
  cookieName: "voterscope_session",
  ttl: 60 * 60 * 8, // 8 hours in seconds
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
