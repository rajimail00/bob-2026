import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/mailer.js", () => ({ sendVerificationEmail: vi.fn() }));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../../auth/auth.model.js");
const { CategoryModel } = await import("../../categories/category.model.js");
const { JobModel } = await import("../../jobs/job.model.js");
const { ApplicationModel } = await import("../application.model.js");
const { NotificationModel } = await import("../../notifications/notification.model.js");

const app = createApp();

async function createVerifiedUser(email: string) {
  const registerRes = await request(app).post("/api/v1/auth/register").send({ email, password: "correct-horse-1" });
  const user = await UserModel.findById(registerRes.body.userId);
  user!.isEmailVerified = true;
  await user!.save();
  const login = await request(app).post("/api/v1/auth/login").send({ email, password: "correct-horse-1" });
  return { userId: registerRes.body.userId as string, accessToken: login.body.accessToken as string };
}

async function createCategory() {
  const category = await CategoryModel.create({
    slug: "cleaning",
    icon: "spray",
    name: { en: "Cleaning", de: "Reinigung", es: "Limpieza", fr: "Nettoyage" },
    order: 0,
  });
  return category.id as string;
}

async function createJob(clientToken: string, categoryId: string) {
  const res = await request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${clientToken}`)
    .send({
      categoryId,
      title: "Need a dog sitter",
      description: "Looking for someone to watch our dog for an hour daily.",
      location: { lng: 13.405, lat: 52.52 },
      address: "Schwalbacherstr. 42, Berlin",
      date: new Date(Date.now() + 3_600_000).toISOString(),
      budget: 200,
    });
  return res.body.job._id as string;
}

async function setWorkerProfile(accessToken: string, categoryId: string) {
  await request(app)
    .post("/api/v1/auth/worker-profile")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ categories: [categoryId], serviceHours: "standard" });
}

describe("applications + job lifecycle", () => {
  it("rejects applying without a worker profile", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("client1@example.com");
    const worker = await createVerifiedUser("worker1@example.com");
    const jobId = await createJob(client.accessToken, categoryId);

    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });

    expect(res.status).toBe(403);
  });

  it("rejects applying to your own job", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("client2@example.com");
    await setWorkerProfile(client.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ message: "I can help!" });

    expect(res.status).toBe(400);
  });

  it("rejects a duplicate application from the same worker", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("client3@example.com");
    const worker = await createVerifiedUser("worker3@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    const first = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "Still interested!" });
    expect(second.status).toBe(409);
  });

  it("prevents a non-owner from listing or selecting applicants", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("client4@example.com");
    const worker = await createVerifiedUser("worker4@example.com");
    const stranger = await createVerifiedUser("stranger4@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });

    const listRes = await request(app)
      .get(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(listRes.status).toBe(403);
  });

  it("runs the full happy path: apply -> offer -> accept -> complete -> review, and updates the worker's rating", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("client5@example.com");
    const worker = await createVerifiedUser("worker5@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    const applyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });
    expect(applyRes.status).toBe(201);
    const applicationId = applyRes.body.application._id as string;

    const listRes = await request(app)
      .get(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.applications).toHaveLength(1);

    // A second worker also applies, to prove they get auto-rejected once the first is accepted.
    const worker2 = await createVerifiedUser("worker5b@example.com");
    await setWorkerProfile(worker2.accessToken, categoryId);
    const secondApplyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker2.accessToken}`)
      .send({ message: "Me too!" });
    const secondApplicationId = secondApplyRes.body.application._id as string;

    const offerRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/offer`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(offerRes.status).toBe(200);
    expect(offerRes.body.application.status).toBe("offered");

    const jobAfterOffer = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(jobAfterOffer.body.job.status).toBe("offer_pending");

    // Only the offered worker can respond.
    const respondAsStranger = await request(app)
      .patch(`/api/v1/applications/${applicationId}/respond`)
      .set("Authorization", `Bearer ${worker2.accessToken}`)
      .send({ accept: true });
    expect(respondAsStranger.status).toBe(403);

    const respondRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: true });
    expect(respondRes.status).toBe(200);
    expect(respondRes.body.application.status).toBe("accepted");

    const jobAfterAccept = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(jobAfterAccept.body.job.status).toBe("assigned");
    expect(jobAfterAccept.body.job.assignedWorkerId).toBe(worker.userId);

    const secondApplicantList = await request(app)
      .get(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    const rejected = secondApplicantList.body.applications.find(
      (a: { _id: string; status: string }) => a._id === secondApplicationId
    );
    expect(rejected.status).toBe("rejected");

    // A third worker can no longer apply once the job is assigned.
    const worker3 = await createVerifiedUser("worker5c@example.com");
    await setWorkerProfile(worker3.accessToken, categoryId);
    const lateApply = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker3.accessToken}`)
      .send({ message: "Too late?" });
    expect(lateApply.status).toBe(409);

    // Only the client can complete the job.
    const completeAsWorker = await request(app)
      .post(`/api/v1/jobs/${jobId}/complete`)
      .set("Authorization", `Bearer ${worker.accessToken}`);
    expect(completeAsWorker.status).toBe(403);

    const completeRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/complete`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.job.status).toBe("completed");

    const cancelCompleted = await request(app)
      .post(`/api/v1/jobs/${jobId}/cancel`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(cancelCompleted.status).toBe(409);
    expect(cancelCompleted.body.error.code).toBe("CONFLICT");

    const reviewRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/reviews`)
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ stars: 5, comment: "Great work!" });
    expect(reviewRes.status).toBe(201);

    const workerAfter = await UserModel.findById(worker.userId).select("rating");
    expect(workerAfter?.rating?.average).toBe(5);
    expect(workerAfter?.rating?.count).toBe(1);

    // Can't review the same job twice from the same side.
    const duplicateReview = await request(app)
      .post(`/api/v1/jobs/${jobId}/reviews`)
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ stars: 3 });
    expect(duplicateReview.status).toBe(409);
  });

  it("reopens the job when the worker declines an offer", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("client6@example.com");
    const worker = await createVerifiedUser("worker6@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    const applyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });
    const applicationId = applyRes.body.application._id as string;

    await request(app)
      .patch(`/api/v1/applications/${applicationId}/offer`)
      .set("Authorization", `Bearer ${client.accessToken}`);

    const declineRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: false });
    expect(declineRes.status).toBe(200);
    expect(declineRes.body.application.status).toBe("declined");

    const jobAfterDecline = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(jobAfterDecline.body.job.status).toBe("active");
  });

  it("lets either side cancel an assigned job, and reports a problem", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("client7@example.com");
    const worker = await createVerifiedUser("worker7@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    const applyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });
    const applicationId = applyRes.body.application._id as string;

    await request(app)
      .patch(`/api/v1/applications/${applicationId}/offer`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    await request(app)
      .patch(`/api/v1/applications/${applicationId}/respond`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ accept: true });

    const reportRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/problems`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ reason: "cancel", note: "Can't make it anymore" });
    expect(reportRes.status).toBe(201);

    const jobAfterCancel = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(jobAfterCancel.body.job.status).toBe("cancelled");
  });

  it("allows only one of multiple concurrent duplicate applications", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("concurrent-client@example.com");
    const worker = await createVerifiedUser("concurrent-worker@example.com");
    await setWorkerProfile(worker.accessToken, categoryId);
    const jobId = await createJob(client.accessToken, categoryId);

    const submit = (message: string) =>
      request(app)
        .post(`/api/v1/jobs/${jobId}/applications`)
        .set("Authorization", `Bearer ${worker.accessToken}`)
        .send({ message });
    const responses = await Promise.all([submit("First concurrent request"), submit("Second concurrent request")]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await ApplicationModel.countDocuments({ jobId, workerId: worker.userId })).toBe(1);
    expect(
      await NotificationModel.countDocuments({
        recipientId: client.userId,
        type: "new_application",
        "data.jobId": jobId,
      })
    ).toBe(1);
  });

  it.each(["offer_pending", "assigned", "completed", "cancelled", "expired"] as const)(
    "rejects applications and notifications when the job is %s",
    async (status) => {
      const categoryId = await createCategory();
      const client = await createVerifiedUser(`locked-client-${status}@example.com`);
      const worker = await createVerifiedUser(`locked-worker-${status}@example.com`);
      await setWorkerProfile(worker.accessToken, categoryId);
      const jobId = await createJob(client.accessToken, categoryId);
      await JobModel.updateOne({ _id: jobId }, { $set: { status } });

      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/applications`)
        .set("Authorization", `Bearer ${worker.accessToken}`)
        .send({ message: "This application should be rejected" });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
      expect(await ApplicationModel.countDocuments({ jobId, workerId: worker.userId })).toBe(0);
      expect(
        await NotificationModel.countDocuments({ type: "new_application", "data.jobId": jobId })
      ).toBe(0);
    }
  );

  it("serializes a concurrent application against an offer_pending transition", async () => {
    const categoryId = await createCategory();
    const client = await createVerifiedUser("stage-race-client@example.com");
    const selectedWorker = await createVerifiedUser("stage-race-selected@example.com");
    const racingWorker = await createVerifiedUser("stage-race-worker@example.com");
    const lateWorker = await createVerifiedUser("stage-race-late@example.com");
    await Promise.all([
      setWorkerProfile(selectedWorker.accessToken, categoryId),
      setWorkerProfile(racingWorker.accessToken, categoryId),
      setWorkerProfile(lateWorker.accessToken, categoryId),
    ]);
    const jobId = await createJob(client.accessToken, categoryId);
    const selectedApplication = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${selectedWorker.accessToken}`)
      .send({ message: "Select me" });

    const [offerResponse, racingApplication] = await Promise.all([
      request(app)
        .patch(`/api/v1/applications/${selectedApplication.body.application._id}/offer`)
        .set("Authorization", `Bearer ${client.accessToken}`),
      request(app)
        .post(`/api/v1/jobs/${jobId}/applications`)
        .set("Authorization", `Bearer ${racingWorker.accessToken}`)
        .send({ message: "Concurrent application" }),
    ]);

    expect(offerResponse.status).toBe(200);
    expect([201, 409]).toContain(racingApplication.status);
    const job = await JobModel.findById(jobId).select("+applicationRevision");
    expect(job?.status).toBe("offer_pending");
    expect(job?.applicationRevision).toBe(racingApplication.status === 201 ? 3 : 2);

    const lateApplication = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${lateWorker.accessToken}`)
      .send({ message: "Definitely too late" });
    expect(lateApplication.status).toBe(409);
    expect(await ApplicationModel.countDocuments({ jobId, workerId: lateWorker.userId })).toBe(0);
  });
});
