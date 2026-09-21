import { NextResponse, type NextRequest } from "next/server";
import { backendUrl } from "@/lib/server-api";
import { decryptSession } from "@/lib/session-crypto";
import { SESSION_COOKIE, sessionCookieOptions, sessionSecret } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = cookie ? decryptSession(cookie, sessionSecret()) : null;
  if (session) {
    await fetch(backendUrl("auth/logout"), {
      method: "POST",
      headers: { authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
