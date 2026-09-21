import { NextResponse, type NextRequest } from "next/server";
import { backendUrl, refreshSession } from "@/lib/server-api";
import { decryptSession, type AdminSession } from "@/lib/session-crypto";
import { encodedSession, SESSION_COOKIE, sessionCookieOptions, sessionSecret } from "@/lib/session";

export const runtime = "nodejs";
const allowedRoot = /^(admin(?:\/|$)|media$)/;
const mutationMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function originAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = process.env.ADMIN_APP_URL?.replace(/\/$/, "");
  return origin === (configured || request.nextUrl.origin);
}

async function forward(request: NextRequest, path: string, session: AdminSession, body?: ArrayBuffer) {
  const headers = new Headers();
  headers.set("authorization", `Bearer ${session.accessToken}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const query = request.nextUrl.search;
  return fetch(`${backendUrl(path)}${query}`, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : body,
    cache: "no-store",
  });
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!allowedRoot.test(path)) return NextResponse.json({ error: { message: "Route not allowed." } }, { status: 404 });
  if (mutationMethods.has(request.method) && !originAllowed(request)) {
    return NextResponse.json({ error: { message: "Request origin not allowed." } }, { status: 403 });
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  let session = cookie ? decryptSession(cookie, sessionSecret()) : null;
  if (!session || session.user.role !== "admin" || session.user.status !== "active") {
    return NextResponse.json({ error: { message: "Authentication required." } }, { status: 401 });
  }

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  let upstream = await forward(request, path, session, body);
  let refreshed = false;
  if (upstream.status === 401) {
    const nextSession = await refreshSession(session);
    if (nextSession) {
      session = nextSession;
      upstream = await forward(request, path, session, body);
      refreshed = true;
    }
  }

  const responseBody = upstream.status === 204 ? null : await upstream.arrayBuffer();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
  if (refreshed) response.cookies.set(SESSION_COOKIE, encodedSession(session), sessionCookieOptions());
  if (upstream.status === 401 || upstream.status === 403) {
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  }
  return response;
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
