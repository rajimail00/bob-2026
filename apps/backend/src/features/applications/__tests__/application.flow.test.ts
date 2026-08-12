import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/mailer.js", () => ({ sendVerificationEmail: vi.fn() }));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../../auth/auth.model.js");
const { CategoryModel } = await import("../../categories/category.model.js");

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
    name: { en: "Cleaning", de: "Reinigung", es: "Limpieza" },
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
      date: new Date().toISOString(),
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

  it("runs the full happy path: apply -> select -> complete -> review, and updates the worker's rating", async () => {
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

    // A second worker also applies, to prove they get auto-rejected once the first is selected.
    const worker2 = await createVerifiedUser("worker5b@example.com");
    await setWorkerProfile(worker2.accessToken, categoryId);
    const secondApplyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker2.accessToken}`)
      .send({ message: "Me too!" });
    const secondApplicationId = secondApplyRes.body.application._id as string;

    const selectRes = await request(app)
      .patch(`/api/v1/applications/${applicationId}/select`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(selectRes.status).toBe(200);
    expect(selectRes.body.application.status).toBe("selected");

    const jobAfterSelect = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(jobAfterSelect.body.job.status).toBe("assigned");
    expect(jobAfterSelect.body.job.assignedWorkerId).toBe(worker.userId);

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
});
