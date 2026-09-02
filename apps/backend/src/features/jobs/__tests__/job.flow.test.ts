import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/mailer.js", () => ({ sendVerificationEmail: vi.fn() }));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../../auth/auth.model.js");
const { CategoryModel } = await import("../../categories/category.model.js");
const { JobModel } = await import("../job.model.js");
const { ApplicationModel } = await import("../../applications/application.model.js");
const { MessageModel } = await import("../../messages/message.model.js");
const { ReviewModel } = await import("../../reviews/review.model.js");
const { ProblemReportModel } = await import("../../problems/problem.model.js");
const { NotificationModel } = await import("../../notifications/notification.model.js");
const { runJobExpiration } = await import("../jobExpiration.scheduler.js");
const { jobService } = await import("../job.service.js");
const { jobRepository } = await import("../job.repository.js");
const { notificationRepository } = await import("../../notifications/notification.repository.js");

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

  it("lets the owner partially edit an active job and returns the populated update in detail and listing", async () => {
    const owner = await createVerifiedClient("edit-active-owner@example.com");
    const createResponse = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        categoryId,
        title: "Original active title",
        description: "This description must survive a partial job update.",
        media: [{ url: "https://example.com/original.jpg", type: "photo" }],
        location: { lng: 13.405, lat: 52.52 },
        address: "Original address, Berlin",
        date: new Date(Date.now() + 3_600_000).toISOString(),
        peopleNeeded: 2,
        budget: 100,
      });
    const jobId = createResponse.body.job._id as string;

    const updateResponse = await request(app)
      .patch(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        title: "Updated active title",
        budget: 140,
        location: { lng: 13.41, lat: 52.51 },
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.job.title).toBe("Updated active title");
    expect(updateResponse.body.job.description).toBe(
      "This description must survive a partial job update."
    );
    expect(updateResponse.body.job.media).toHaveLength(1);
    expect(updateResponse.body.job.location).toEqual({
      type: "Point",
      coordinates: [13.41, 52.51],
    });
    expect(updateResponse.body.job.categoryId.slug).toBe("cleaning");
    expect(updateResponse.body.job.clientId._id).toBe(owner.userId);

    const detailResponse = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(detailResponse.body.job.title).toBe("Updated active title");
    expect(detailResponse.body.job.address).toBe("Original address, Berlin");

    const listingResponse = await request(app).get("/api/v1/jobs").query({
      lng: 13.41,
      lat: 52.51,
      radiusKm: 1,
      search: "Updated active",
    });
    expect(listingResponse.body.total).toBe(1);
    expect(listingResponse.body.items[0]._id).toBe(jobId);
  });

  it("lets the owner edit a draft job", async () => {
    const owner = await createVerifiedClient("edit-draft-owner@example.com");
    const draft = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Draft job title",
      description: "This draft has a valid and detailed description.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 80,
      status: "draft",
    });

    const response = await request(app)
      .patch(`/api/v1/jobs/${draft.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ description: "The owner updated this detailed draft description." });

    expect(response.status).toBe(200);
    expect(response.body.job.status).toBe("draft");
    expect(response.body.job.description).toBe(
      "The owner updated this detailed draft description."
    );
    expect(response.body.job.title).toBe("Draft job title");
  });

  it("strictly rejects empty, past-date, unexpected, and protected-field updates", async () => {
    const owner = await createVerifiedClient("edit-validation-owner@example.com");
    const stranger = await createVerifiedClient("edit-validation-stranger@example.com");
    const job = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Protected update job",
      description: "Protected fields on this job must never be changed.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 80,
      status: "active",
    });

    const invalidBodies = [
      {},
      { date: new Date(Date.now() - 60_000).toISOString() },
      { unexpected: true },
      { clientId: stranger.userId },
      { status: "completed" },
      { assignedWorkerId: stranger.userId },
      { applicationRevision: 999 },
      { repostedFromJobId: job.id },
      { createdAt: new Date().toISOString() },
      { updatedAt: new Date().toISOString() },
      { __v: 99 },
      { _id: stranger.userId },
    ];

    for (const body of invalidBodies) {
      const response = await request(app)
        .patch(`/api/v1/jobs/${job.id}`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send(body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    }

    const unchanged = await JobModel.findById(job.id).select("+applicationRevision");
    expect(unchanged?.clientId.toString()).toBe(owner.userId);
    expect(unchanged?.status).toBe("active");
    expect(unchanged?.assignedWorkerId).toBeUndefined();
    expect(unchanged?.applicationRevision).toBe(0);
  });

  it("returns 403 for a stranger, 404 for an unknown job, and 409 for every locked status", async () => {
    const owner = await createVerifiedClient("edit-policy-owner@example.com");
    const stranger = await createVerifiedClient("edit-policy-stranger@example.com");
    const worker = await createVerifiedClient("edit-policy-worker@example.com");
    const base = {
      clientId: owner.userId,
      categoryId,
      description: "A detailed job used to verify the job editing policy.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 100,
    };
    const active = await JobModel.create({ ...base, title: "Owned active job", status: "active" });

    const strangerResponse = await request(app)
      .patch(`/api/v1/jobs/${active.id}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({ title: "A stranger must not update this" });
    expect(strangerResponse.status).toBe(403);

    const missingResponse = await request(app)
      .patch("/api/v1/jobs/64b64b64b64b64b64b64b64b")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Unknown valid title" });
    expect(missingResponse.status).toBe(404);

    for (const status of [
      "offer_pending",
      "assigned",
      "completed",
      "cancelled",
      "expired",
    ] as const) {
      const locked = await JobModel.create({
        ...base,
        title: `Locked ${status} job`,
        status,
        ...(status === "assigned" || status === "completed"
          ? { assignedWorkerId: worker.userId }
          : {}),
      });
      const response = await request(app)
        .patch(`/api/v1/jobs/${locked.id}`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send({ title: `Updated locked ${status}` });
      expect(response.status, status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
      expect((await JobModel.findById(locked.id))?.title).toBe(`Locked ${status} job`);
    }
  });

  it("notifies each affected applicant once and creates no notification for a no-op edit", async () => {
    const owner = await createVerifiedClient("edit-notify-owner@example.com");
    const pending = await createVerifiedClient("edit-notify-pending@example.com");
    const offered = await createVerifiedClient("edit-notify-offered@example.com");
    const accepted = await createVerifiedClient("edit-notify-accepted@example.com");
    const declined = await createVerifiedClient("edit-notify-declined@example.com");
    const rejected = await createVerifiedClient("edit-notify-rejected@example.com");
    const job = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Applicant notification job",
      description: "Applicants should hear about meaningful changes to this job.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 100,
      status: "active",
    });
    await ApplicationModel.create([
      { jobId: job.id, workerId: pending.userId, message: "Pending", status: "pending" },
      { jobId: job.id, workerId: offered.userId, message: "Offered", status: "offered" },
      { jobId: job.id, workerId: accepted.userId, message: "Accepted", status: "accepted" },
      { jobId: job.id, workerId: declined.userId, message: "Declined", status: "declined" },
      { jobId: job.id, workerId: rejected.userId, message: "Rejected", status: "rejected" },
    ]);

    const response = await request(app)
      .patch(`/api/v1/jobs/${job.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ budget: 125 });
    expect(response.status).toBe(200);

    const notifications = await NotificationModel.find({
      type: "job_updated",
      "data.jobId": job.id,
    });
    expect(notifications).toHaveLength(3);
    expect(new Set(notifications.map((item) => item.recipientId.toString()))).toEqual(
      new Set([pending.userId, offered.userId, accepted.userId])
    );

    const repeatResponse = await request(app)
      .patch(`/api/v1/jobs/${job.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ budget: 125 });
    expect(repeatResponse.status).toBe(200);
    expect(
      await NotificationModel.countDocuments({ type: "job_updated", "data.jobId": job.id })
    ).toBe(3);
  });

  it("rolls back the job edit when a transactional notification cannot be persisted", async () => {
    const owner = await createVerifiedClient("edit-rollback-owner@example.com");
    const worker = await createVerifiedClient("edit-rollback-worker@example.com");
    const job = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Original transactional title",
      description: "The edit must roll back if its notification cannot be stored.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 100,
      status: "active",
    });
    await ApplicationModel.create({
      jobId: job.id,
      workerId: worker.userId,
      message: "I am interested",
      status: "pending",
    });
    const notificationSpy = vi
      .spyOn(notificationRepository, "create")
      .mockRejectedValueOnce(new Error("notification insert failed"));

    try {
      const response = await request(app)
        .patch(`/api/v1/jobs/${job.id}`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send({ title: "This title must be rolled back" });
      expect(response.status).toBe(500);
    } finally {
      notificationSpy.mockRestore();
    }

    expect((await JobModel.findById(job.id))?.title).toBe("Original transactional title");
    expect(
      await NotificationModel.countDocuments({ type: "job_updated", "data.jobId": job.id })
    ).toBe(0);
  });

  it("returns 409 when a lifecycle transition wins a concurrent race with an edit", async () => {
    const owner = await createVerifiedClient("edit-race-owner@example.com");
    const job = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Concurrent edit title",
      description: "A lifecycle transition must be able to lock out a stale edit.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 3_600_000),
      budget: 100,
      status: "active",
    });

    const originalUpdate = jobRepository.updateEditable.bind(jobRepository);
    let releaseUpdate!: () => void;
    let reachedUpdate!: () => void;
    const releasePromise = new Promise<void>((resolve) => {
      releaseUpdate = resolve;
    });
    const reachedPromise = new Promise<void>((resolve) => {
      reachedUpdate = resolve;
    });
    const updateSpy = vi.spyOn(jobRepository, "updateEditable").mockImplementation(
      ((...args: Parameters<typeof jobRepository.updateEditable>) => {
        reachedUpdate();
        return releasePromise.then(() => originalUpdate(...args)) as never;
      }) as typeof jobRepository.updateEditable
    );

    try {
      const editPromise = request(app)
        .patch(`/api/v1/jobs/${job.id}`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send({ title: "Stale concurrent title" })
        .then((response) => response);
      await reachedPromise;
      await jobService.transitionStatus(job.id, "active", "cancelled");
      releaseUpdate();

      const editResponse = await editPromise;
      expect(editResponse.status).toBe(409);
      expect(editResponse.body.error.code).toBe("CONFLICT");
    } finally {
      releaseUpdate();
      updateSpy.mockRestore();
    }

    const stored = await JobModel.findById(job.id);
    expect(stored?.status).toBe("cancelled");
    expect(stored?.title).toBe("Concurrent edit title");
    expect(
      await NotificationModel.countDocuments({ type: "job_updated", "data.jobId": job.id })
    ).toBe(0);
  });

  it("reposts a completed job as a new active job while preserving all source history", async () => {
    const owner = await createVerifiedClient("repost-completed-owner@example.com");
    const worker = await createVerifiedClient("repost-completed-worker@example.com");
    const original = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Historical completed job",
      description: "This completed job has related history that must remain attached.",
      media: [{ url: "https://example.com/history.jpg", type: "photo" }],
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Historical address, Berlin",
      date: new Date(Date.now() - 86_400_000),
      peopleNeeded: 2,
      budget: 180,
      recurrence: "weekly",
      isEmergency: true,
      paymentPreference: "both",
      status: "completed",
      assignedWorkerId: worker.userId,
    });
    await ApplicationModel.create({
      jobId: original.id,
      workerId: worker.userId,
      message: "Original accepted application",
      status: "accepted",
    });
    await MessageModel.create({
      jobId: original.id,
      workerId: worker.userId,
      senderId: owner.userId,
      text: "Original conversation",
    });
    await ReviewModel.create({
      jobId: original.id,
      fromUserId: owner.userId,
      toUserId: worker.userId,
      stars: 5,
      comment: "Original review",
    });
    await ProblemReportModel.create({
      jobId: original.id,
      reporterId: owner.userId,
      reason: "other",
      note: "Original problem report",
    });
    const originalBefore = (await JobModel.findById(original.id))!;
    const newDate = new Date(Date.now() + 7 * 86_400_000);

    const response = await request(app)
      .post(`/api/v1/jobs/${original.id}/repost`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ date: newDate.toISOString() });

    expect(response.status).toBe(201);
    const reposted = response.body.job;
    expect(reposted._id).not.toBe(original.id);
    expect(reposted.status).toBe("active");
    expect(reposted.assignedWorkerId).toBeUndefined();
    expect(reposted.repostedFromJobId).toBe(original.id);
    expect(reposted.date).toBe(newDate.toISOString());
    expect(reposted.title).toBe(original.title);
    expect(reposted.description).toBe(original.description);
    expect(reposted.media).toEqual([{ url: "https://example.com/history.jpg", type: "photo" }]);
    expect(reposted.location).toEqual({ type: "Point", coordinates: [13.405, 52.52] });
    expect(reposted.address).toBe(original.address);
    expect(reposted.peopleNeeded).toBe(2);
    expect(reposted.budget).toBe(180);
    expect(reposted.recurrence).toBe("weekly");
    expect(reposted.isEmergency).toBe(true);
    expect(reposted.paymentPreference).toBe("both");
    expect(reposted.categoryId.slug).toBe("cleaning");
    expect(reposted.clientId._id).toBe(owner.userId);

    const originalAfter = (await JobModel.findById(original.id))!;
    expect(originalAfter.status).toBe("completed");
    expect(originalAfter.assignedWorkerId?.toString()).toBe(worker.userId);
    expect(originalAfter.updatedAt.getTime()).toBe(originalBefore.updatedAt.getTime());

    for (const model of [ApplicationModel, MessageModel, ReviewModel, ProblemReportModel]) {
      expect(await model.countDocuments({ jobId: original.id })).toBe(1);
      expect(await model.countDocuments({ jobId: reposted._id })).toBe(0);
    }

    const global = await request(app).get("/api/v1/jobs");
    expect(global.body.items.map((job: { _id: string }) => job._id)).toContain(reposted._id);
    expect(global.body.items.map((job: { _id: string }) => job._id)).not.toContain(original.id);

    const posted = await request(app)
      .get("/api/v1/jobs/mine/posted")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(posted.body.jobs).toHaveLength(2);
    expect(posted.body.jobs.map((job: { status: string }) => job.status)).toEqual(
      expect.arrayContaining(["completed", "active"])
    );

    const notifications = await NotificationModel.find({
      recipientId: owner.userId,
      type: "job_reposted",
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.data.jobId).toBe(reposted._id);
    expect(notifications[0]?.data.originalJobId).toBe(original.id);
  });

  it("allows cancelled and expired jobs to be reposted with safe overrides", async () => {
    const owner = await createVerifiedClient("repost-terminal-owner@example.com");
    const replacementCategory = await CategoryModel.create({
      slug: "gardening",
      icon: "leaf",
      name: { en: "Gardening", de: "Garten", es: "Jardinería", fr: "Jardinage" },
      order: 1,
    });
    const base = {
      clientId: owner.userId,
      categoryId,
      description: "A historical job with values that can be safely overridden.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Old address",
      date: new Date(Date.now() - 86_400_000),
      budget: 50,
    };

    for (const status of ["cancelled", "expired"] as const) {
      const original = await JobModel.create({
        ...base,
        title: `Original ${status} job`,
        status,
      });
      const response = await request(app)
        .post(`/api/v1/jobs/${original.id}/repost`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send({
          date: new Date(Date.now() + 3_600_000).toISOString(),
          categoryId: replacementCategory.id,
          title: `Overridden ${status} job`,
          description: "Every safe repost field in this request is intentionally overridden.",
          media: [{ url: "https://example.com/new.jpg", type: "photo" }],
          location: { lng: 13.41, lat: 52.51 },
          address: "New address",
          peopleNeeded: 3,
          budget: 225,
          recurrence: "monthly",
          isEmergency: true,
          paymentPreference: "paypal",
        });

      expect(response.status, status).toBe(201);
      expect(response.body.job).toMatchObject({
        title: `Overridden ${status} job`,
        description: "Every safe repost field in this request is intentionally overridden.",
        media: [{ url: "https://example.com/new.jpg", type: "photo" }],
        location: { type: "Point", coordinates: [13.41, 52.51] },
        address: "New address",
        peopleNeeded: 3,
        budget: 225,
        recurrence: "monthly",
        isEmergency: true,
        paymentPreference: "paypal",
        status: "active",
        repostedFromJobId: original.id,
      });
      expect(response.body.job.categoryId._id).toBe(replacementCategory.id);
      expect((await JobModel.findById(original.id))?.status).toBe(status);
    }
  });

  it("enforces repost ownership, existence, and source-status policy", async () => {
    const owner = await createVerifiedClient("repost-policy-owner@example.com");
    const stranger = await createVerifiedClient("repost-policy-stranger@example.com");
    const worker = await createVerifiedClient("repost-policy-worker@example.com");
    const base = {
      clientId: owner.userId,
      categoryId,
      description: "A source job used to verify the repost policy.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() + 86_400_000),
      budget: 100,
    };
    const closed = await JobModel.create({ ...base, title: "Owned closed job", status: "cancelled" });
    const validPayload = { date: new Date(Date.now() + 172_800_000).toISOString() };

    const unauthenticated = await request(app)
      .post(`/api/v1/jobs/${closed.id}/repost`)
      .send(validPayload);
    expect(unauthenticated.status).toBe(401);

    const strangerResponse = await request(app)
      .post(`/api/v1/jobs/${closed.id}/repost`)
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send(validPayload);
    expect(strangerResponse.status).toBe(403);

    const missingResponse = await request(app)
      .post("/api/v1/jobs/64b64b64b64b64b64b64b64b/repost")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send(validPayload);
    expect(missingResponse.status).toBe(404);

    for (const status of ["draft", "active", "offer_pending", "assigned"] as const) {
      const source = await JobModel.create({
        ...base,
        title: `Ineligible ${status} job`,
        status,
        ...(status === "assigned" ? { assignedWorkerId: worker.userId } : {}),
      });
      const response = await request(app)
        .post(`/api/v1/jobs/${source.id}/repost`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send(validPayload);
      expect(response.status, status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    }

    expect(await NotificationModel.countDocuments({ type: "job_reposted" })).toBe(0);
  });

  it("requires a future date and rejects protected repost fields", async () => {
    const owner = await createVerifiedClient("repost-validation-owner@example.com");
    const source = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Protected repost source",
      description: "Protected and invalid repost fields must be rejected strictly.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() - 86_400_000),
      budget: 100,
      status: "cancelled",
    });
    const protectedFields = [
      "_id",
      "clientId",
      "status",
      "assignedWorkerId",
      "applicationRevision",
      "repostedFromJobId",
      "createdAt",
      "updatedAt",
      "__v",
    ];
    const invalidBodies: Record<string, unknown>[] = [
      {},
      { date: new Date(Date.now() - 60_000).toISOString() },
      { date: new Date(Date.now() + 86_400_000).toISOString(), unexpected: true },
      ...protectedFields.map((field) => ({
        date: new Date(Date.now() + 86_400_000).toISOString(),
        [field]: field === "status" ? "active" : source.id,
      })),
    ];

    for (const body of invalidBodies) {
      const response = await request(app)
        .post(`/api/v1/jobs/${source.id}/repost`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send(body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    }

    expect(await JobModel.countDocuments({ clientId: owner.userId })).toBe(1);
    expect(await NotificationModel.countDocuments({ type: "job_reposted" })).toBe(0);
  });

  it("rolls back a repost when its notification cannot be persisted", async () => {
    const owner = await createVerifiedClient("repost-rollback-owner@example.com");
    const source = await JobModel.create({
      clientId: owner.userId,
      categoryId,
      title: "Transactional repost source",
      description: "The new job must roll back when its notification cannot be stored.",
      location: { type: "Point", coordinates: [13.405, 52.52] },
      address: "Berlin",
      date: new Date(Date.now() - 86_400_000),
      budget: 100,
      status: "expired",
    });
    const notificationSpy = vi
      .spyOn(notificationRepository, "create")
      .mockRejectedValueOnce(new Error("repost notification insert failed"));

    try {
      const response = await request(app)
        .post(`/api/v1/jobs/${source.id}/repost`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send({ date: new Date(Date.now() + 86_400_000).toISOString() });
      expect(response.status).toBe(500);
    } finally {
      notificationSpy.mockRestore();
    }

    expect(await JobModel.countDocuments({ clientId: owner.userId })).toBe(1);
    expect((await JobModel.findById(source.id))?.status).toBe("expired");
    expect(await NotificationModel.countDocuments({ type: "job_reposted" })).toBe(0);
  });
});
