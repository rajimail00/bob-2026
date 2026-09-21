import { NextResponse, type NextRequest } from "next/server";
import { currentAdmin, refreshSession } from "@/lib/server-api";
import { decryptSession } from "@/lib/session-crypto";
import { encodedSession, SESSION_COOKIE, sessionCookieOptions, sessionSecret } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  let session = cookie ? decryptSession(cookie, sessionSecret()) : null;
  if (!session) return NextResponse.json({ error: { message: "Authentication required." } }, { status: 401 });

  let user = await currentAdmin(session);
  let refreshed = false;
  if (!user) {
    const nextSession = await refreshSession(session);
    if (nextSession) {
      session = nextSession;
      user = await currentAdmin(session);
      refreshed = Boolean(user);
    }
  }
  if (!user) {
    const denied = NextResponse.json({ error: { message: "Your administrator session has expired." } }, { status: 401 });
    denied.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return denied;
  }
  session.user = user;
  const response = NextResponse.json({ user });
  if (refreshed) response.cookies.set(SESSION_COOKIE, encodedSession(session), sessionCookieOptions());
  return response;
}
