import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/mailer.js", () => ({ sendVerificationEmail: vi.fn() }));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../../auth/auth.model.js");
const { CategoryModel } = await import("../../categories/category.model.js");
const { JobModel } = await import("../../jobs/job.model.js");
const { ProblemReportModel } = await import("../../problems/problem.model.js");
const { AdminAuditModel } = await import("../adminAudit.model.js");
const { signAccessToken } = await import("../../../lib/jwt.js");

const app = createApp();
let adminId: string;
let adminToken: string;
let clientId: string;
let clientToken: string;

async function makeUser(email: string, role: "admin" | "client" | "worker") {
  const user = await UserModel.create({ email, passwordHash: await bcrypt.hash("correct-horse-1", 4), role, status: "active", isEmailVerified: true, locale: "en", firstName: role, lastName: "Tester" });
  return { user, token: signAccessToken({ sub: user.id, role }) };
}

describe("mobile admin portal API", () => {
  beforeEach(async () => {
    const admin = await makeUser("admin@example.com", "admin");
    const client = await makeUser("client@example.com", "client");
    adminId = admin.user.id; adminToken = admin.token; clientId = client.user.id; clientToken = client.token;
  });

  it("requires authentication and the current database admin role", async () => {
    expect((await request(app).get("/api/v1/admin/dashboard")).status).toBe(401);
    expect((await request(app).get("/api/v1/admin/dashboard").set("Authorization", `Bearer ${clientToken}`)).status).toBe(403);

    await UserModel.findByIdAndUpdate(adminId, { role: "client" });
    expect((await request(app).get("/api/v1/admin/dashboard").set("Authorization", `Bearer ${adminToken}`)).status).toBe(403);
    await UserModel.findByIdAndUpdate(adminId, { role: "admin", status: "banned" });
    expect((await request(app).get("/api/v1/admin/dashboard").set("Authorization", `Bearer ${adminToken}`)).status).toBe(401);
  });

  it("returns real dashboard values and definitions", async () => {
    const category = await CategoryModel.create({ slug: "cleaning", icon: "brush", order: 0, name: { en: "Cleaning", de: "Reinigung", es: "Limpieza", fr: "Nettoyage" } });
    await JobModel.create({ clientId, categoryId: category.id, title: "Real job", description: "A real dashboard aggregation job", location: { type: "Point", coordinates: [13.4, 52.5] }, address: "Berlin", date: new Date(Date.now() + 86_400_000), budget: 100, status: "active" });
    const response = await request(app).get("/api/v1/admin/dashboard?period=week").set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.metrics.allUsers.value).toBe(2);
    expect(response.body.metrics.jobPosts.value).toBe(1);
    expect(response.body.metrics.activeJobs.value).toBe(1);
    expect(response.body.timezone).toBe("UTC");
  });

  it("searches users without returning authentication secrets and audits status changes", async () => {
    const list = await request(app).get("/api/v1/admin/users?search=client").set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).not.toHaveProperty("passwordHash");
    expect(list.body.items[0]).not.toHaveProperty("refreshTokenVersion");

    const banned = await request(app).patch(`/api/v1/admin/users/${clientId}/status`).set("Authorization", `Bearer ${adminToken}`).send({ status: "banned" });
    expect(banned.status).toBe(200);
    expect(banned.body.user.status).toBe("banned");
    expect(await AdminAuditModel.countDocuments({ action: "user.banned", targetId: clientId })).toBe(1);
    expect((await request(app).patch(`/api/v1/admin/users/${adminId}/status`).set("Authorization", `Bearer ${adminToken}`).send({ status: "banned" })).status).toBe(409);
  });

  it("lists only manageable non-deleted clients and workers", async () => {
    await makeUser("worker@example.com", "worker");
    const banned = await makeUser("banned@example.com", "client");
    await UserModel.findByIdAndUpdate(banned.user.id, { status: "banned" });
    const deleted = await makeUser("deleted@example.com", "worker");
    await UserModel.findByIdAndUpdate(deleted.user.id, { status: "deleted", deletedAt: new Date() });
    await makeUser("second-admin@example.com", "admin");

    const response = await request(app)
      .get("/api/v1/admin/users?page=1&pageSize=2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.every((user: { role: string; status: string }) => user.role !== "admin" && user.status !== "deleted")).toBe(true);
    expect((await request(app).get("/api/v1/admin/users?status=deleted").set("Authorization", `Bearer ${adminToken}`)).status).toBe(400);
  });

  it("keeps operational status separate from moderation", async () => {
    const category = await CategoryModel.create({ slug: "moving", icon: "car", order: 0, name: { en: "Moving", de: "Umzug", es: "Mudanza", fr: "Déménagement" } });
    const job = await JobModel.create({ clientId, categoryId: category.id, title: "Moderate me", description: "Moderation must not replace lifecycle", location: { type: "Point", coordinates: [13.4, 52.5] }, address: "Berlin", date: new Date(Date.now() + 86_400_000), budget: 50, status: "active" });
    const response = await request(app).patch(`/api/v1/admin/jobs/${job.id}/moderation`).set("Authorization", `Bearer ${adminToken}`).send({ status: "suspended", reason: "Review" });
    expect(response.status).toBe(200);
    const stored = await JobModel.findById(job.id);
    expect(stored?.status).toBe("active");
    expect(stored?.moderationStatus).toBe("suspended");
    expect(await AdminAuditModel.countDocuments({ action: "job.suspended" })).toBe(1);
  });

  it("manages tickets and records replies, notes and audit history", async () => {
    const category = await CategoryModel.create({ slug: "support", icon: "help", order: 0, name: { en: "Support", de: "Support", es: "Soporte", fr: "Assistance" } });
    const job = await JobModel.create({ clientId, categoryId: category.id, title: "Reported job", description: "Job related to support ticket", location: { type: "Point", coordinates: [13.4, 52.5] }, address: "Berlin", date: new Date(Date.now() + 86_400_000), budget: 30, status: "active" });
    const ticket = await ProblemReportModel.create({ jobId: job.id, reporterId: clientId, reason: "other", note: "Please help" });
    expect((await request(app).patch(`/api/v1/admin/tickets/${ticket.id}`).set("Authorization", `Bearer ${adminToken}`).send({ status: "in_progress", priority: "urgent", assignedAdminId: adminId })).status).toBe(200);
    expect((await request(app).post(`/api/v1/admin/tickets/${ticket.id}/replies`).set("Authorization", `Bearer ${adminToken}`).send({ message: "We are checking this." })).status).toBe(201);
    expect((await request(app).post(`/api/v1/admin/tickets/${ticket.id}/notes`).set("Authorization", `Bearer ${adminToken}`).send({ note: "Internal follow-up" })).status).toBe(201);
    const stored = await ProblemReportModel.findById(ticket.id);
    expect(stored?.priority).toBe("urgent");
    expect(stored?.replies).toHaveLength(1);
    expect(stored?.internalNotes).toHaveLength(1);
    expect(await AdminAuditModel.countDocuments({ targetId: ticket.id })).toBe(3);
  });

  it("creates multilingual categories and prevents deletion while in use", async () => {
    const input = { slug: "garden", icon: "leaf", imageUrl: "https://res.cloudinary.com/example/image/upload/garden.jpg", order: 4, name: { en: "Garden", de: "Garten", es: "Jardín", fr: "Jardin" } };
    const created = await request(app).post("/api/v1/admin/categories").set("Authorization", `Bearer ${adminToken}`).send(input);
    expect(created.status).toBe(201);
    expect(created.body.category.imageUrl).toBe(input.imageUrl);
    const categoryId = created.body.category._id;
    const updatedImageUrl = "https://res.cloudinary.com/example/image/upload/garden-new.jpg";
    const updated = await request(app).patch(`/api/v1/admin/categories/${categoryId}`).set("Authorization", `Bearer ${adminToken}`).send({ imageUrl: updatedImageUrl });
    expect(updated.status).toBe(200);
    expect(updated.body.category.imageUrl).toBe(updatedImageUrl);
    expect((await request(app).patch(`/api/v1/admin/categories/${categoryId}`).set("Authorization", `Bearer ${adminToken}`).send({ imageUrl: "not-a-url" })).status).toBe(400);
    await JobModel.create({ clientId, categoryId, title: "Garden job", description: "Category is now referenced", location: { type: "Point", coordinates: [13.4, 52.5] }, address: "Berlin", date: new Date(Date.now() + 86_400_000), budget: 20, status: "active" });
    expect((await request(app).delete(`/api/v1/admin/categories/${categoryId}`).set("Authorization", `Bearer ${adminToken}`)).status).toBe(409);
  });
});
