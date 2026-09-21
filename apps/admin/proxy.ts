import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-constants";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/users/:path*", "/jobs/:path*", "/categories/:path*", "/advertisements/:path*", "/support-tickets/:path*"],
};
