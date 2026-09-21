import "server-only";
import type { AdminSession } from "./session-crypto";
import type { AdminSessionUser } from "./types";

export function backendUrl(path: string) {
  const base = (process.env.BACKEND_API_URL ?? "https://bobbk-api.cifarsystems.com/api/v1").replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}

export async function refreshSession(session: AdminSession): Promise<AdminSession | null> {
  const response = await fetch(backendUrl("auth/refresh"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json() as { accessToken: string; refreshToken: string };
  return { ...session, accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export async function currentAdmin(session: AdminSession): Promise<AdminSessionUser | null> {
  const response = await fetch(backendUrl("auth/me"), {
    headers: { authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json() as { user: AdminSessionUser };
  return data.user.role === "admin" && data.user.status === "active" ? data.user : null;
}
