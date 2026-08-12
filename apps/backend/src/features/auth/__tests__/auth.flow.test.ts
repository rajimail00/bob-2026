import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const sentCodes: Record<string, string> = {};
vi.mock("../../../lib/mailer.js", () => ({
  sendVerificationEmail: vi.fn(async (to: string, code: string) => {
    sentCodes[to] = code;
  }),
}));

const { createApp } = await import("../../../app.js");

const app = createApp();

async function registerAndGetCode(email: string) {
  await request(app).post("/api/v1/auth/register").send({ email, password: "correct-horse-1" });
  return sentCodes[email];
}

describe("auth flow", () => {
  it("rejects login before the email is verified", async () => {
    const email = "worker@example.com";
    const registerRes = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: "correct-horse-1", locale: "de" });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.email).toBe(email);

    const earlyLogin = await request(app).post("/api/v1/auth/login").send({ email, password: "correct-horse-1" });
    expect(earlyLogin.status).toBe(403);
  });

  it("completes register -> verify -> login -> me -> refresh -> logout", async () => {
    const email = "full-flow@example.com";
    const code = await registerAndGetCode(email);
    expect(code).toMatch(/^\d{6}$/);

    const verifyRes = await request(app).post("/api/v1/auth/verify-email").send({ email, code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toBeTruthy();
    expect(verifyRes.body.user.isEmailVerified).toBe(true);

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "correct-horse-1" });
    expect(loginRes.status).toBe(200);
    const { accessToken, refreshToken } = loginRes.body;

    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(email);

    const refreshRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(204);

    // The old refresh token was invalidated by logout (tokenVersion bump).
    const staleRefresh = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(staleRefresh.status).toBe(401);
  });

  it("rejects an incorrect verification code", async () => {
    const email = "bad-code@example.com";
    await registerAndGetCode(email);
    const res = await request(app).post("/api/v1/auth/verify-email").send({ email, code: "000000" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate registration", async () => {
    const email = "dup@example.com";
    await request(app).post("/api/v1/auth/register").send({ email, password: "correct-horse-1" });
    const second = await request(app).post("/api/v1/auth/register").send({ email, password: "another-pass-1" });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
  });

  it("rejects invalid email format at the validation boundary", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "not-an-email", password: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects login with wrong password", async () => {
    await registerAndGetCode("wrongpass@example.com");
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "wrongpass@example.com", password: "totally-wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for /auth/me without a token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});
