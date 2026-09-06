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

export const SESSION_OPTIONS: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "fallback-dev-only-secret-not-for-production-00",
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
