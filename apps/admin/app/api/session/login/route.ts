import { NextResponse, type NextRequest } from "next/server";
import { backendUrl } from "@/lib/server-api";
import { encodedSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import type { AdminSessionUser } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = input?.email?.trim().toLowerCase();
  if (!email || !input?.password) {
    return NextResponse.json({ error: { message: "Enter your admin email and password." } }, { status: 400 });
  }

  const response = await fetch(backendUrl("auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: input.password }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null) as ({ user: AdminSessionUser; accessToken: string; refreshToken: string } & { error?: { message?: string } }) | null;

  if (!response.ok || !data?.user || !data.accessToken || !data.refreshToken) {
    return NextResponse.json({ error: { message: data?.error?.message ?? "Invalid email or password." } }, { status: response.status || 401 });
  }
  if (data.user.role !== "admin") {
    return NextResponse.json({ error: { message: "This account does not have administrator access." } }, { status: 403 });
  }
  if (data.user.status !== "active") {
    return NextResponse.json({ error: { message: "This administrator account is not active." } }, { status: 403 });
  }

  const result = NextResponse.json({ user: data.user });
  result.cookies.set(SESSION_COOKIE, encodedSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user }), sessionCookieOptions());
  return result;
}
