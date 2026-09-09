import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../../app.js";
import { signAccessToken } from "../../../lib/jwt.js";
import { AdminAuditModel } from "../../admin/adminAudit.model.js";
import { UserModel } from "../../auth/auth.model.js";
import { AdvertisementModel } from "../advertisement.model.js";

const app = createApp();

async function makeUser(email: string, role: "admin" | "client" | "worker", subscriptionTier: "free" | "pro" | "unlimited" = "free") {
  const user = await UserModel.create({
    email,
    passwordHash: await bcrypt.hash("correct-horse-1", 4),
    role,
    status: "active",
    isEmailVerified: true,
    locale: "en",
    subscriptionTier,
  });
  return { user, token: signAccessToken({ sub: user.id, role }) };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    title: "Local business campaign",
    description: "A real advertisement",
    media: { type: "image", url: "https://res.cloudinary.com/example/image/upload/advertisement.jpg", mimeType: "image/jpeg" },
    destinationUrl: "https://example.com/offer",
    placement: "home_list",
    audience: "all",
    status: "active",
    startsAt: new Date(Date.now() - 60_000).toISOString(),
    endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    priority: 25,
    ...overrides,
  };
}

describe("advertisement management", () => {
  it("protects admin CRUD and validates dates, media and destination URLs", async () => {
    const admin = await makeUser("ads-admin@example.com", "admin");
    const client = await makeUser("ads-client@example.com", "client");

    expect((await request(app).post("/api/v1/admin/advertisements").send(input())).status).toBe(401);
    expect((await request(app).post("/api/v1/admin/advertisements").set("Authorization", `Bearer ${client.token}`).send(input())).status).toBe(403);
    expect((await request(app).post("/api/v1/admin/advertisements").set("Authorization", `Bearer ${admin.token}`).send(input({ endsAt: new Date(Date.now() - 120_000).toISOString() }))).status).toBe(400);
    expect((await request(app).post("/api/v1/admin/advertisements").set("Authorization", `Bearer ${admin.token}`).send(input({ destinationUrl: "http://example.com" }))).status).toBe(400);
    expect((await request(app).post("/api/v1/admin/advertisements").set("Authorization", `Bearer ${admin.token}`).send(input({ media: { type: "image", url: "http://example.com/ad.jpg" } }))).status).toBe(400);
    expect((await request(app).post("/api/v1/admin/advertisements").set("Authorization", `Bearer ${admin.token}`).send(input({ media: { type: "video", url: "https://example.com/ad.mp4", mimeType: "image/jpeg" } }))).status).toBe(400);
    expect((await request(app).post("/api/v1/admin/advertisements").set("Authorization", `Bearer ${admin.token}`).send(input({ clientId: client.user.id }))).status).toBe(400);
  });

  it("lets an admin create, read, update, pause and soft-delete an advertisement with audits", async () => {
    const admin = await makeUser("crud-admin@example.com", "admin");
    const authorization = { Authorization: `Bearer ${admin.token}` };
    const created = await request(app).post("/api/v1/admin/advertisements").set(authorization).send(input({ status: "draft" }));
    expect(created.status).toBe(201);
    expect(created.body.advertisement.effectiveStatus).toBe("draft");
    expect(created.body.advertisement.createdBy).toBe(admin.user.id);
    const id = created.body.advertisement._id as string;

    const listed = await request(app).get("/api/v1/admin/advertisements?search=business&status=draft").set(authorization);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toHaveLength(1);
    expect((await request(app).get(`/api/v1/admin/advertisements/${id}`).set(authorization)).status).toBe(200);

    const updated = await request(app).patch(`/api/v1/admin/advertisements/${id}`).set(authorization).send({ title: "Updated campaign", priority: 50 });
    expect(updated.status).toBe(200);
    expect(updated.body.advertisement.title).toBe("Updated campaign");
    expect(updated.body.advertisement.priority).toBe(50);

    const published = await request(app).post(`/api/v1/admin/advertisements/${id}/publish`).set(authorization);
    expect(published.status).toBe(200);
    expect(published.body.advertisement.effectiveStatus).toBe("active");

    const paused = await request(app).post(`/api/v1/admin/advertisements/${id}/pause`).set(authorization);
    expect(paused.status).toBe(200);
    expect(paused.body.advertisement.status).toBe("paused");
    expect((await request(app).get("/api/v1/advertisements/active?placement=home_list").set(authorization)).body.advertisements).toHaveLength(0);

    const archived = await request(app).post(`/api/v1/admin/advertisements/${id}/archive`).set(authorization);
    expect(archived.status).toBe(200);
    expect(archived.body.advertisement.status).toBe("archived");

    expect((await request(app).delete(`/api/v1/admin/advertisements/${id}`).set(authorization)).status).toBe(204);
    const stored = await AdvertisementModel.findById(id).lean();
    expect(stored?.deletedAt).toBeInstanceOf(Date);
    expect((await request(app).get(`/api/v1/admin/advertisements/${id}`).set(authorization)).status).toBe(404);
    expect(await AdminAuditModel.countDocuments({ targetType: "advertisement", targetId: id })).toBe(6);
  });

  it("returns only eligible advertisements for each subscription audience", async () => {
    const admin = await makeUser("audience-admin@example.com", "admin");
    const free = await makeUser("free-viewer@example.com", "client", "free");
    const pro = await makeUser("pro-viewer@example.com", "client", "pro");
    const now = Date.now();
    const base = {
      description: "Eligibility test",
      media: { type: "image", url: "https://example.com/ad.jpg" },
      placement: "home_list",
      status: "active",
      priority: 1,
      createdBy: admin.user.id,
    } as const;
    await AdvertisementModel.create([
      { ...base, title: "Everyone", audience: "all", priority: 2, startsAt: new Date(now - 10_000), endsAt: new Date(now + 100_000) },
      { ...base, title: "Free only", audience: "free", priority: 1, startsAt: new Date(now - 10_000), endsAt: new Date(now + 100_000) },
      { ...base, title: "Future", audience: "all", startsAt: new Date(now + 10_000), endsAt: new Date(now + 100_000) },
      { ...base, title: "Expired", audience: "all", startsAt: new Date(now - 100_000), endsAt: new Date(now - 10_000) },
      { ...base, title: "Paused", audience: "all", status: "paused", startsAt: new Date(now - 10_000), endsAt: new Date(now + 100_000) },
      { ...base, title: "Archived", audience: "all", status: "archived", startsAt: new Date(now - 10_000), endsAt: new Date(now + 100_000) },
      { ...base, title: "Deleted", audience: "all", startsAt: new Date(now - 10_000), endsAt: new Date(now + 100_000), deletedAt: new Date() },
    ]);

    const freeResponse = await request(app).get("/api/v1/advertisements/active?placement=home_list").set("Authorization", `Bearer ${free.token}`);
    expect(freeResponse.status).toBe(200);
    expect(freeResponse.body.advertisements.map((advertisement: { title: string }) => advertisement.title)).toEqual(["Everyone", "Free only"]);
    expect(freeResponse.body.advertisements[0]).not.toHaveProperty("createdBy");
    expect(freeResponse.body.advertisements[0].media).not.toHaveProperty("publicId");

    const proResponse = await request(app).get("/api/v1/advertisements/active?placement=home_list").set("Authorization", `Bearer ${pro.token}`);
    expect(proResponse.body.advertisements.map((advertisement: { title: string }) => advertisement.title)).toEqual(["Everyone"]);

    const expiredAdmin = await request(app).get("/api/v1/admin/advertisements?status=expired").set("Authorization", `Bearer ${admin.token}`);
    expect(expiredAdmin.body.items.map((advertisement: { title: string }) => advertisement.title)).toEqual(["Expired"]);
    expect(expiredAdmin.body.items[0].effectiveStatus).toBe("expired");
    const scheduledAdmin = await request(app).get("/api/v1/admin/advertisements?status=scheduled").set("Authorization", `Bearer ${admin.token}`);
    expect(scheduledAdmin.body.items.map((advertisement: { title: string }) => advertisement.title)).toEqual(["Future"]);
    expect(scheduledAdmin.body.items[0].effectiveStatus).toBe("scheduled");
  });
});
