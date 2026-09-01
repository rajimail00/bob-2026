import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/mailer.js", () => ({ sendVerificationEmail: vi.fn() }));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../../auth/auth.model.js");
const { CategoryModel } = await import("../../categories/category.model.js");
const { JobModel } = await import("../job.model.js");
const { ApplicationModel } = await import("../../applications/application.model.js");
const { NotificationModel } = await import("../../notifications/notification.model.js");
const { runJobExpiration } = await import("../jobExpiration.scheduler.js");
const { jobService } = await import("../job.service.js");

const app = createApp();

async function createVerifiedClient(email: string) {
  const res = await request(app).post("/api/v1/auth/register").send({ email, password: "correct-horse-1" });
  const user = await UserModel.findOne({ email }).select("+emailVerificationCodeHash");
  // Test shortcut: mark verified directly rather than re-deriving the mocked code.
  user!.isEmailVerified = true;
  await user!.save();
  const login = await request(app).post("/api/v1/auth/login").send({ email, password: "correct-horse-1" });
  return { userId: res.body.userId as string, accessToken: login.body.accessToken as string };
}

describe("jobs", () => {
  let categoryId: string;

  beforeEach(async () => {
    const category = await CategoryModel.create({
      slug: "cleaning",
      icon: "spray",
      name: { en: "Cleaning", de: "Reinigung", es: "Limpieza", fr: "Nettoyage" },
      order: 0,
    });
    categoryId = category.id;
  });

  it("requires auth to create a job", async () => {
    const res = await request(app).post("/api/v1/jobs").send({});
    expect(res.status).toBe(401);
  });

  it("creates a job and returns it from list + geo search", async () => {
    const { accessToken } = await createVerifiedClient("client@example.com");

    const createRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId,
        title: "Need a dog sitter",
        description: "Looking for someone to watch our dog for an hour daily.",
        location: { lng: 13.405, lat: 52.52 },
        address: "Schwalbacherstr. 42, Berlin",
        date: new Date(Date.now() + 3_600_000).toISOString(),
        budget: 200,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.job.status).toBe("active");

    const listRes = await request(app).get("/api/v1/jobs").query({ lng: 13.4, lat: 52.5, radiusKm: 18 });
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);
    expect(listRes.body.items[0].title).toBe("Need a dog sitter");

    const farListRes = await request(app).get("/api/v1/jobs").query({ lng: 2.35, lat: 48.85, radiusKm: 18 });
    expect(farListRes.body.total).toBe(0);
  });

  it("rejects job creation with an invalid payload", async () => {
    const { accessToken } = await createVerifiedClient("client2@example.com");
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ categoryId, title: "ab", description: "too short" });
    expect(res.status).toBe(400);
  });

  it("returns 409 for a forbidden active -> completed transition", async () => {
    const { accessToken } = await createVerifiedClient("client-transition@example.com");
    const createRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId,
        title: "Need help packing",
        description: "Help me pack several boxes before moving day.",
        location: { lng: 13.405, lat: 52.52 },
        address: "Schwalbacherstr. 42, Berlin",
        date: new Date(Date.now() + 3_600_000).toISOString(),
        budget: 75,
      });

    const res = await request(app)
      .post(`/api/v1/jobs/${createRes.body.job._id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("allows active -> cancelled, then returns 409 for another cancellation", async () => {
    const { accessToken } = await createVerifiedClient("client-cancel-transition@example.com");
    const createRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId,
        title: "Need help gardening",
        description: "Help trim the garden and collect the branches.",
        location: { lng: 13.405, lat: 52.52 },
        address: "Schwalbacherstr. 42, Berlin",
        date: new Date(Date.now() + 3_600_000).toISOString(),
        budget: 60,
      });
    const jobId = createRes.body.job._id as string;

    const cancelRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.job.status).toBe("cancelled");

    const cancelAgainRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(cancelAgainRes.status).toBe(409);
    expect(cancelAgainRes.body.error.code).toBe("CONFLICT");
  });

  it("returns 404 for an unknown job id", async () => {
    const res = await request(app).get("/api/v1/jobs/64b64b64b64b64b64b64b64b");
    expect(res.status).toBe(404);
  });

  it("lets the owner delete an active job, cascading its applications", async () => {
    const owner = await createVerifiedClient("owner-delete@example.com");
    const applicant = await createVerifiedClient("applicant-delete@example.com");
    await request(app)
      .post("/api/v1/auth/worker-profile")
      .set("Authorization", `Bearer ${applicant.accessToken}`)
      .send({ categories: [categoryId], serviceHours: "standard" });

    const createRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        categoryId,
        title: "Need a plant sitter",
        description: "Water my plants twice a week while I'm away.",
        location: { lng: 13.405, lat: 52.52 },
        address: "Schwalbacherstr. 42, Berlin",
        date: new Date(Date.now() + 3_600_000).toISOString(),
        budget: 50,
      });
    const jobId = createRes.body.job._id as string;

    await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${applicant.accessToken}`)
      .send({ message: "I can help!" });

    const strangerDelete = await request(app)
      .delete(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${applicant.accessToken}`);
    expect(strangerDelete.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(getRes.status).toBe(404);

    const applicantsRes = await request(app)
      .get(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    // The job itself is gone, so the ownership check that gates this list now 404s too.
    expect(applicantsRes.status).toBe(404);
  });

  it("blocks deleting a job once it has an assigned worker", async () => {
    const owner = await createVerifiedClient("owner-delete2@example.com");
    const worker = await createVerifiedClient("worker-delete2@example.com");
    await request(app)
      .post("/api/v1/auth/worker-profile")
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ categories: [categoryId], serviceHours: "standard" });

    const createRes = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        categoryId,
        title: "Need a mover",
        description: "Help moving boxes from the second floor to the truck.",
        location: { lng: 13.405, lat: 52.52 },
        address: "Schwalbacherstr. 42, Berlin",
        date: new Date(Date.now() + 3_600_000).toISOString(),
        budget: 80,
      });
    const jobId = createRes.body.job._id as string;

    const applyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });
    await request(app)
      .patch(`/api/v1/applications/${applyRes.body.application._id}/offer`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    const deleteRes = await request(app)
      .delete(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(409);
  });

  it("requires auth to delete a job", async () => {
    const res = await request(app).delete("/api/v1/jobs/64b64b64b64b64b64b64b64b");
    expect(res.status).toBe(401);
  });

  it("rejects creating a job whose scheduled time is in the past", async () => {
    const owner = await createVerifiedClient("past-create@example.com");
    const response = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        categoryId,
        title: "Past-due cleaning",
        description: "This date has already passed and must be rejected.",
        location: { lng: 13.405, lat: 52.52 },
        address: "Berlin",
        date: new Date(Date.now() - 1_000).toISOString(),
        budget: 50,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists only future active jobs while keeping closed jobs in account history", async () => {
    const owner = await createVerifiedClient("listing-owner@example.com");
    const worker = await createVerifiedClient("listing-worker@example.com");
    const future = new Date(Date.now() + 3_600_000);
    const base = {
      clientId: owner.userId,
      categoryId,
      description: "A sufficiently detailed description for listing rules.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: future,
      budget: 100,
    };

    const statuses = [
      "draft",
      "active",
      "offer_pending",
      "assigned",
      "completed",
      "cancelled",
      "expired",
    ] as const;
    for (const status of statuses) {
      await JobModel.create({
        ...base,
        title: `Status ${status}`,
        status,
        ...(status === "assigned" || status === "completed"
          ? { assignedWorkerId: worker.userId }
          : {}),
      });
    }
    await JobModel.create({
      ...base,
      title: "Past active",
      status: "active",
      date: new Date(Date.now() - 60_000),
    });

    const global = await request(app).get("/api/v1/jobs");
    expect(global.status).toBe(200);
    expect(global.body.total).toBe(1);
    expect(global.body.items.map((job: { title: string }) => job.title)).toEqual(["Status active"]);

    const posted = await request(app)
      .get("/api/v1/jobs/mine/posted")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(posted.body.jobs).toHaveLength(8);
    expect(posted.body.jobs.map((job: { status: string }) => job.status)).toEqual(
      expect.arrayContaining([...statuses])
    );

    const assigned = await request(app)
      .get("/api/v1/jobs/mine/assigned")
      .set("Authorization", `Bearer ${worker.accessToken}`);
    expect(assigned.body.jobs.map((job: { status: string }) => job.status)).toEqual(
      expect.arrayContaining(["assigned", "completed"])
    );
  });

  it("keeps search, filters, geolocation, totals, and pagination scoped to visible jobs", async () => {
    const owner = await createVerifiedClient("listing-filters@example.com");
    const future = new Date(Date.now() + 3_600_000);
    const makeJob = (title: string, budget: number, peopleNeeded: number, coordinates: [number, number]) =>
      JobModel.create({
        clientId: owner.userId,
        categoryId,
        title,
        description: "Special garden help with enough searchable detail.",
        location: { type: "Point", coordinates },
        address: "Berlin",
        date: future,
        budget,
        peopleNeeded,
        status: "active",
      });

    await makeJob("Special garden alpha", 120, 2, [13.405, 52.52]);
    await makeJob("Special garden beta", 180, 3, [13.41, 52.51]);
    await makeJob("Far garden", 150, 2, [2.35, 48.85]);
    await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Closed special garden",
      description: "Special garden help with enough searchable detail.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: future,
      budget: 160,
      peopleNeeded: 2,
      status: "cancelled",
    });

    const response = await request(app).get("/api/v1/jobs").query({
      search: "Special",
      minBudget: 100,
      maxBudget: 200,
      peopleNeeded: 2,
      lng: 13.405,
      lat: 52.52,
      radiusKm: 20,
      page: 1,
      pageSize: 1,
    });
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(1);

    const secondPage = await request(app).get("/api/v1/jobs").query({
      search: "Special",
      lng: 13.405,
      lat: 52.52,
      radiusKm: 20,
      page: 2,
      pageSize: 1,
    });
    expect(secondPage.body.total).toBe(2);
    expect(secondPage.body.items).toHaveLength(1);
  });

  it("expires overdue active jobs once and creates one notification per affected user", async () => {
    const owner = await createVerifiedClient("expiration-owner@example.com");
    const workerOne = await createVerifiedClient("expiration-worker-one@example.com");
    const workerTwo = await createVerifiedClient("expiration-worker-two@example.com");
    const now = new Date("2030-01-01T12:00:00.000Z");
    const base = {
      clientId: owner.userId,
      categoryId,
      description: "A detailed job used to verify automatic expiration.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      budget: 90,
    };
    const past = await JobModel.create({
      ...base,
      title: "Past active job",
      date: new Date("2030-01-01T11:00:00.000Z"),
      status: "active",
    });
    const future = await JobModel.create({
      ...base,
      title: "Future active job",
      date: new Date("2030-01-01T13:00:00.000Z"),
      status: "active",
    });
    const closed = await JobModel.create({
      ...base,
      title: "Already cancelled job",
      date: new Date("2030-01-01T10:00:00.000Z"),
      status: "cancelled",
    });
    await ApplicationModel.create([
      { jobId: past._id, workerId: workerOne.userId, message: "I can help", status: "pending" },
      { jobId: past._id, workerId: workerTwo.userId, message: "I can also help", status: "pending" },
    ]);

    const firstRun = await runJobExpiration(now);
    const secondRun = await runJobExpiration(now);

    expect(firstRun).toEqual({ expiredCount: 1, jobIds: [past.id] });
    expect(secondRun).toEqual({ expiredCount: 0, jobIds: [] });
    expect((await JobModel.findById(past._id))?.status).toBe("expired");
    expect((await JobModel.findById(future._id))?.status).toBe("active");
    expect((await JobModel.findById(closed._id))?.status).toBe("cancelled");

    const notifications = await NotificationModel.find({
      type: "job_expired",
      "data.jobId": past.id,
    });
    expect(notifications).toHaveLength(3);
    expect(new Set(notifications.map((item) => item.recipientId.toString())).size).toBe(3);

    const global = await request(app).get("/api/v1/jobs");
    expect(global.body.items.some((job: { _id: string }) => job._id === past.id)).toBe(false);
  });

  it("allows every legal central lifecycle transition", async () => {
    const owner = await createVerifiedClient("legal-transition-owner@example.com");
    const worker = await createVerifiedClient("legal-transition-worker@example.com");
    const base = {
      clientId: owner.userId,
      categoryId,
      description: "A job used to exercise the central lifecycle transition matrix.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 100,
    };
    let sequence = 0;
    const makeJob = (status: string, assignedWorkerId?: string) =>
      JobModel.create({
        ...base,
        title: `Legal transition ${sequence++}`,
        status,
        ...(assignedWorkerId ? { assignedWorkerId } : {}),
      });

    const cases = [
      { from: "draft", to: "active" },
      { from: "draft", to: "cancelled" },
      { from: "active", to: "offer_pending" },
      { from: "active", to: "cancelled" },
      { from: "active", to: "expired" },
      { from: "offer_pending", to: "active" },
      { from: "offer_pending", to: "assigned", assign: true },
      { from: "offer_pending", to: "cancelled" },
      { from: "assigned", to: "completed", assigned: true },
      { from: "assigned", to: "cancelled", assigned: true },
    ] as const;

    for (const transition of cases) {
      const job = await makeJob(
        transition.from,
        "assigned" in transition && transition.assigned ? worker.userId : undefined
      );
      const updated = await jobService.transitionStatus(
        job.id,
        transition.from,
        transition.to,
        "assign" in transition && transition.assign
          ? { assignedWorkerId: worker.userId }
          : undefined
      );
      expect(updated.status).toBe(transition.to);
      if (transition.to === "assigned") {
        expect(updated.assignedWorkerId?.toString()).toBe(worker.userId);
      }
    }
  });

  it("returns 409 for forbidden and incomplete central lifecycle transitions", async () => {
    const owner = await createVerifiedClient("forbidden-transition-owner@example.com");
    const worker = await createVerifiedClient("forbidden-transition-worker@example.com");
    const base = {
      clientId: owner.userId,
      categoryId,
      description: "A job used to reject forbidden lifecycle transitions.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 100,
    };
    let sequence = 0;
    const makeJob = (status: string) =>
      JobModel.create({
        ...base,
        title: `Forbidden transition ${sequence++}`,
        status,
        ...(status === "assigned" ? { assignedWorkerId: worker.userId } : {}),
      });

    const forbidden = [
      { from: "active", to: "completed" },
      { from: "active", to: "assigned", options: { assignedWorkerId: worker.userId } },
      { from: "offer_pending", to: "completed" },
      { from: "assigned", to: "active" },
    ] as const;

    for (const transition of forbidden) {
      const job = await makeJob(transition.from);
      await expect(
        jobService.transitionStatus(
          job.id,
          transition.from,
          transition.to,
          "options" in transition ? transition.options : undefined
        )
      ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
      expect((await JobModel.findById(job.id))?.status).toBe(transition.from);
    }

    const missingWorker = await makeJob("offer_pending");
    await expect(
      jobService.transitionStatus(missingWorker.id, "offer_pending", "assigned")
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    for (const terminal of ["completed", "cancelled", "expired"] as const) {
      const job = await makeJob(terminal);
      for (const next of [
        "draft",
        "active",
        "offer_pending",
        "assigned",
        "completed",
        "cancelled",
        "expired",
      ] as const) {
        await expect(
          jobService.transitionStatus(job.id, terminal, next, {
            ...(next === "assigned" ? { assignedWorkerId: worker.userId } : {}),
          })
        ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
      }
      expect((await JobModel.findById(job.id))?.status).toBe(terminal);
    }
  });
});
