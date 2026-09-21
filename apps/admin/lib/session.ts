import "server-only";
import { cookies } from "next/headers";
import { decryptSession, encryptSession, type AdminSession } from "./session-crypto";
import { SESSION_COOKIE } from "./session-constants";

export { SESSION_COOKIE } from "./session-constants";

export function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return "bob-admin-local-development-secret-change-me";
  throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters in production.");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function getServerSession() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? decryptSession(value, sessionSecret()) : null;
}

export function encodedSession(session: AdminSession) {
  return encryptSession(session, sessionSecret());
}
