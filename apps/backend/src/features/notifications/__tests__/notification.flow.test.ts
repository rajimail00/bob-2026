import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/mailer.js", () => ({ sendVerificationEmail: vi.fn() }));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../../auth/auth.model.js");
const { CategoryModel } = await import("../../categories/category.model.js");
const { NotificationModel } = await import("../notification.model.js");
const { createNotification } = await import("../notification.service.js");

const app = createApp();

async function createVerifiedUser(email: string) {
  const register = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "correct-horse-1",
  });
  const user = await UserModel.findById(register.body.userId);
  user!.isEmailVerified = true;
  await user!.save();
  const login = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "correct-horse-1",
  });
  return {
    userId: register.body.userId as string,
    accessToken: login.body.accessToken as string,
  };
}

async function createCategory(slug: string) {
  const category = await CategoryModel.create({
    slug,
    icon: "spray",
    name: { en: "Cleaning", de: "Reinigung", es: "Limpieza", fr: "Nettoyage" },
    order: 0,
  });
  return category.id as string;
}

async function setWorkerProfile(accessToken: string, categoryId: string) {
  await request(app)
    .post("/api/v1/auth/worker-profile")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ categories: [categoryId], serviceHours: "standard" });
}

async function createJob(clientToken: string, categoryId: string, title = "Need a cleaner") {
  const response = await request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${clientToken}`)
    .send({
      categoryId,
      title,
      description: "Weekly apartment cleaning needed for two bedrooms.",
      location: { lng: 13.405, lat: 52.52 },
      address: "Schwalbacherstr. 42, Berlin",
      date: new Date().toISOString(),
      budget: 100,
    });
  return response.body.job._id as string;
}

async function applyToJob(jobId: string, workerToken: string) {
  const response = await request(app)
    .post(`/api/v1/jobs/${jobId}/applications`)
    .set("Authorization", `Bearer ${workerToken}`)
    .send({ message: "I can help with this job." });
  return response.body.application._id as string;
}

describe("notifications", () => {
  it("requires authentication for every notification endpoint", async () => {
    expect((await request(app).get("/api/v1/notifications")).status).toBe(401);
    expect((await request(app).patch("/api/v1/notifications/read-all")).status).toBe(401);
    expect(
      (await request(app).patch("/api/v1/notifications/64b64b64b64b64b64b64b64b/read")).status
    ).toBe(401);
  });

  it("persists offline notifications for the correct recipient, newest first, with unreadCount", async () => {
    const recipient = await createVerifiedUser("notification-recipient@example.com");
    const other = await createVerifiedUser("notification-other@example.com");

    await createNotification({
      recipientId: recipient.userId,
      type: "new_application",
      data: { jobId: "job-1", applicationId: "application-1" },
    });
    await createNotification({
      recipientId: recipient.userId,
      type: "offer_accepted",
      data: { jobId: "job-1", applicationId: "application-1" },
    });
    await createNotification({ recipientId: other.userId, type: "job_updated", data: { jobId: "job-2" } });

    const response = await request(app)
      .get("/api/v1/notifications?page=1&pageSize=1")
      .set("Authorization", `Bearer ${recipient.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].recipientId).toBe(recipient.userId);
    expect(response.body.items[0].type).toBe("offer_accepted");
    expect(response.body).toMatchObject({ total: 2, page: 1, pageSize: 1, unreadCount: 2 });
  });

  it("marks one notification as read idempotently and hides other users' notifications", async () => {
    const owner = await createVerifiedUser("notification-owner@example.com");
    const stranger = await createVerifiedUser("notification-stranger@example.com");
    const notification = await createNotification({
      recipientId: owner.userId,
      type: "job_updated",
      data: { jobId: "job-private" },
    });

    const strangerList = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(strangerList.body.items).toHaveLength(0);

    const strangerRead = await request(app)
      .patch(`/api/v1/notifications/${notification._id}/read`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(strangerRead.status).toBe(404);

    const firstRead = await request(app)
      .patch(`/api/v1/notifications/${notification._id}/read`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(firstRead.status).toBe(200);
    expect(firstRead.body.notification.readAt).toBeTruthy();

    const repeatedRead = await request(app)
      .patch(`/api/v1/notifications/${notification._id}/read`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(repeatedRead.status).toBe(200);
    expect(repeatedRead.body.notification.readAt).toBe(firstRead.body.notification.readAt);

    const ownerList = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(ownerList.body.unreadCount).toBe(0);
  });

  it("marks all of only the authenticated user's notifications as read", async () => {
    const owner = await createVerifiedUser("notification-read-all@example.com");
    const other = await createVerifiedUser("notification-read-all-other@example.com");
    await createNotification({ recipientId: owner.userId, type: "job_updated", data: { jobId: "job-1" } });
    await createNotification({ recipientId: owner.userId, type: "job_expired", data: { jobId: "job-2" } });
    await createNotification({ recipientId: other.userId, type: "job_updated", data: { jobId: "job-3" } });

    const markAll = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(markAll.status).toBe(200);
    expect(markAll.body.modifiedCount).toBe(2);

    const ownerList = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    const otherList = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${other.accessToken}`);
    expect(ownerList.body.unreadCount).toBe(0);
    expect(otherList.body.unreadCount).toBe(1);
  });

  it("creates exactly one application/offer/accept notification and notifies rejected applicants", async () => {
    const categoryId = await createCategory("notification-application-flow");
    const client = await createVerifiedUser("notification-client@example.com");
    const worker = await createVerifiedUser("notification-worker@example.com");
    const otherWorker = await createVerifiedUser("notification-other-worker@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    await setWorkerProfile(otherWorker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    const applicationId = await applyToJob(jobId, worker.accessToken);
    const otherApplicationId = await applyToJob(jobId, otherWorker.accessToken);
    expect(await NotificationModel.countDocuments({ recipientId: client.userId, type: "new_application" })).toBe(2);

    const offer = await request(app)
      .patch(`/api/v1/applications/${applicationId}/offer`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(offer.status).toBe(200);
    expect(await NotificationModel.countDocuments({ recipientId: worker.userId, type: "offer_received" })).toBe(1);

    const accept = await request(app)
      .patch(`/api/v1/applications/${applicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: true });
    expect(accept.status).toBe(200);
    expect(await NotificationModel.countDocuments({ recipientId: client.userId, type: "offer_accepted" })).toBe(1);
    expect(
      await NotificationModel.countDocuments({
        recipientId: otherWorker.userId,
        type: "application_rejected",
        "data.applicationId": otherApplicationId,
      })
    ).toBe(1);

    const repeatAccept = await request(app)
      .patch(`/api/v1/applications/${applicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: true });
    expect(repeatAccept.status).toBe(409);
    expect(await NotificationModel.countDocuments({ recipientId: client.userId, type: "offer_accepted" })).toBe(1);
  });

  it("creates a decline notification only after an authorized successful decline", async () => {
    const categoryId = await createCategory("notification-decline-flow");
    const client = await createVerifiedUser("notification-decline-client@example.com");
    const worker = await createVerifiedUser("notification-decline-worker@example.com");
    const stranger = await createVerifiedUser("notification-decline-stranger@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);
    const applicationId = await applyToJob(jobId, worker.accessToken);

    const failedOffer = await request(app)
      .patch(`/api/v1/applications/${applicationId}/offer`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(failedOffer.status).toBe(403);
    expect(await NotificationModel.countDocuments({ recipientId: worker.userId, type: "offer_received" })).toBe(0);

    await request(app)
      .patch(`/api/v1/applications/${applicationId}/offer`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    const decline = await request(app)
      .patch(`/api/v1/applications/${applicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: false });
    expect(decline.status).toBe(200);
    expect(await NotificationModel.countDocuments({ recipientId: client.userId, type: "offer_declined" })).toBe(1);
  });

  it("creates one new-message notification for the other participant and none for failed sends", async () => {
    const categoryId = await createCategory("notification-message-flow");
    const client = await createVerifiedUser("notification-message-client@example.com");
    const worker = await createVerifiedUser("notification-message-worker@example.com");
    const stranger = await createVerifiedUser("notification-message-stranger@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);
    await applyToJob(jobId, worker.accessToken);

    const sent = await request(app)
      .post(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ text: "When can you start?" });
    expect(sent.status).toBe(201);
    expect(
      await NotificationModel.countDocuments({
        recipientId: worker.userId,
        type: "new_message",
        "data.messageId": sent.body.message._id,
      })
    ).toBe(1);

    const failed = await request(app)
      .post(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({ text: "I should not be allowed." });
    expect(failed.status).toBe(403);
    expect(await NotificationModel.countDocuments({ type: "new_message" })).toBe(1);
  });

  it("notifies the affected worker once when an assigned job is cancelled or completed", async () => {
    const categoryId = await createCategory("notification-job-flow");
    const client = await createVerifiedUser("notification-job-client@example.com");
    const worker = await createVerifiedUser("notification-job-worker@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);

    const cancelledJobId = await createJob(client.accessToken, categoryId, "Job to cancel");
    const cancelApplicationId = await applyToJob(cancelledJobId, worker.accessToken);
    await request(app)
      .patch(`/api/v1/applications/${cancelApplicationId}/offer`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    await request(app)
      .patch(`/api/v1/applications/${cancelApplicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: true });

    const cancel = await request(app)
      .post(`/api/v1/jobs/${cancelledJobId}/cancel`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(cancel.status).toBe(200);
    expect(await NotificationModel.countDocuments({ recipientId: worker.userId, type: "job_cancelled" })).toBe(1);

    const failedCancel = await request(app)
      .post(`/api/v1/jobs/${cancelledJobId}/cancel`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(failedCancel.status).toBe(409);
    expect(await NotificationModel.countDocuments({ recipientId: worker.userId, type: "job_cancelled" })).toBe(1);

    const completedJobId = await createJob(client.accessToken, categoryId, "Job to complete");
    const completeApplicationId = await applyToJob(completedJobId, worker.accessToken);
    await request(app)
      .patch(`/api/v1/applications/${completeApplicationId}/offer`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    await request(app)
      .patch(`/api/v1/applications/${completeApplicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: true });

    const complete = await request(app)
      .post(`/api/v1/jobs/${completedJobId}/complete`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(complete.status).toBe(200);
    expect(await NotificationModel.countDocuments({ recipientId: worker.userId, type: "job_completed" })).toBe(1);
  });
});
