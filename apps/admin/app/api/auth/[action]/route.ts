import { NextResponse, type NextRequest } from "next/server";
import { backendUrl } from "@/lib/server-api";

export const runtime = "nodejs";
const allowed = new Set(["register", "verify-email", "resend-code", "forgot-password", "reset-password"]);

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!allowed.has(action)) return NextResponse.json({ error: { message: "Route not allowed." } }, { status: 404 });
  const origin = request.headers.get("origin");
  const configured = process.env.ADMIN_APP_URL?.replace(/\/$/, "");
  if (origin && origin !== (configured || request.nextUrl.origin)) return NextResponse.json({ error: { message: "Request origin not allowed." } }, { status: 403 });
  const upstream = await fetch(backendUrl(`auth/${action}`), { method: "POST", headers: { "content-type": "application/json" }, body: await request.text(), cache: "no-store" });
  return new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" } });
}
