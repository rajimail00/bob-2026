import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const sentCodes: Record<string, string> = {};
vi.mock("../../../lib/mailer.js", () => ({
  sendVerificationEmail: vi.fn(async (to: string, code: string) => {
    sentCodes[to] = code;
  }),
}));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../auth.model.js");

const app = createApp();

async function registerAndGetCode(email: string) {
  await request(app).post("/api/v1/auth/register").send({ email, password: "correct-horse-1" });
  return sentCodes[email];
}

describe("auth flow", () => {
  it("requires authentication to delete an account", async () => {
    const response = await request(app).delete("/api/v1/auth/account");

    expect(response.status).toBe(401);
  });
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

  it("persists authenticated notification preference updates with safe defaults", async () => {
    const email = "notification-preferences@example.com";
    const code = await registerAndGetCode(email);
    const verified = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ email, code });
    const accessToken = verified.body.accessToken as string;

    expect(verified.body.user.notificationPrefs).toMatchObject({
      newApplicant: true,
      newMessage: true,
      offers: true,
      applicationUpdates: true,
      jobStatusChanges: true,
      jobEdits: true,
      cancellations: true,
      completions: true,
      jobWon: true,
    });

    const unauthenticated = await request(app)
      .patch("/api/v1/auth/notification-preferences")
      .send({ newMessage: false });
    expect(unauthenticated.status).toBe(401);

    const updated = await request(app)
      .patch("/api/v1/auth/notification-preferences")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ newMessage: false, cancellations: false });
    expect(updated.status).toBe(200);
    expect(updated.body.user.notificationPrefs.newMessage).toBe(false);
    expect(updated.body.user.notificationPrefs.cancellations).toBe(false);
    expect(updated.body.user.notificationPrefs.offers).toBe(true);

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "correct-horse-1" });
    expect(login.body.user.notificationPrefs.newMessage).toBe(false);
    expect(login.body.user.notificationPrefs.cancellations).toBe(false);
  });
  it("anonymizes an account and releases its original email", async () => {
    const email = "delete-account@example.com";
    const password = "correct-horse-1";

    const code = await registerAndGetCode(email);

    const verifyResponse = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ email, code });

    expect(verifyResponse.status).toBe(200);

    const {
      accessToken,
      refreshToken,
      user,
    } = verifyResponse.body;

    await UserModel.findByIdAndUpdate(user.id, {
      firstName: "Personal",
      lastName: "Name",
      phone: "123456789",
      bio: "Private biography",
      photoUrl: "https://example.com/private-photo.jpg",
      rating: {
        average: 4.5,
        count: 10,
      },
      workerProfile: {
        categories: ["cleaning"],
        serviceHours: "standard",
        completedJobsCount: 5,
      },
    });

    const deleteResponse = await request(app)
      .delete("/api/v1/auth/account")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(204);

    const deletedAccount = await UserModel.findById(user.id).select(
      "+passwordHash +emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    expect(deletedAccount).toBeTruthy();
    expect(deletedAccount?.status).toBe("deleted");
    expect(deletedAccount?.deletedAt).toBeTruthy();

    expect(deletedAccount?.email).toBe(
      `deleted+${user.id}@deleted.invalid`
    );

    expect(deletedAccount?.firstName).toBe("Deleted");
    expect(deletedAccount?.lastName).toBe("user");
    expect(deletedAccount?.photoUrl).toBeUndefined();
    expect(deletedAccount?.phone).toBeUndefined();
    expect(deletedAccount?.bio).toBeUndefined();
    expect(deletedAccount?.workerProfile).toBeUndefined();
    expect(deletedAccount?.rating?.average).toBe(0);
    expect(deletedAccount?.rating?.count).toBe(0);
    expect(deletedAccount?.isEmailVerified).toBe(false);

    // The old access token must stop working.
    const meResponse = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(401);

    // The old refresh token must stop working.
    const refreshResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });

    expect(refreshResponse.status).toBe(401);

    // The old login credentials must stop working.
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    expect(loginResponse.status).toBe(401);

    // The original email can now be registered again.
    const registerAgainResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email,
        password: "new-correct-horse-1",
        locale: "en",
      });

    expect(registerAgainResponse.status).toBe(201);
  });

  it("prevents a banned account from deleting itself or reusing its email", async () => {
    const email = "banned-account@example.com";
    const password = "correct-horse-1";

    const code = await registerAndGetCode(email);

    const verifyResponse = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ email, code });

    expect(verifyResponse.status).toBe(200);

    const { accessToken, user } = verifyResponse.body;

    await UserModel.findByIdAndUpdate(user.id, {
      status: "banned",
    });

    const deleteResponse = await request(app)
      .delete("/api/v1/auth/account")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(401);

    const registerAgainResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email,
        password: "another-correct-password",
        locale: "en",
      });

    expect(registerAgainResponse.status).toBe(409);

    const bannedAccount = await UserModel.findById(user.id);

    expect(bannedAccount?.status).toBe("banned");
    expect(bannedAccount?.email).toBe(email);
  });
});
