import { describe, expect, it } from "vitest";
import { decryptSession, encryptSession, type AdminSession } from "../lib/session-crypto";

const session: AdminSession = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: { id: "admin-id", email: "admin@example.com", role: "admin", status: "active" },
};

describe("admin session encryption", () => {
  it("round-trips an encrypted session", () => {
    const encrypted = encryptSession(session, "a sufficiently long test secret for admin");
    expect(encrypted).not.toContain("access-token");
    expect(decryptSession(encrypted, "a sufficiently long test secret for admin")).toEqual(session);
  });

  it("rejects tampered or wrongly keyed cookies", () => {
    const encrypted = encryptSession(session, "a sufficiently long test secret for admin");
    expect(decryptSession(`${encrypted}x`, "a sufficiently long test secret for admin")).toBeNull();
    expect(decryptSession(encrypted, "a different sufficiently long test secret")).toBeNull();
  });
});
