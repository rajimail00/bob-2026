import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { AdminSessionUser } from "./types";

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  user: AdminSessionUser;
}

function keyFromSecret(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptSession(session: AdminSession, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptSession(value: string, secret: string): AdminSession | null {
  try {
    const payload = Buffer.from(value, "base64url");
    if (payload.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    const decrypted = Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted) as AdminSession;
  } catch {
    return null;
  }
}
