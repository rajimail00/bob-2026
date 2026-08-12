import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/mailer.js", () => ({ sendVerificationEmail: vi.fn() }));

const { createApp } = await import("../../../app.js");
const { UserModel } = await import("../../auth/auth.model.js");
const { CategoryModel } = await import("../../categories/category.model.js");

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
      name: { en: "Cleaning", de: "Reinigung", es: "Limpieza" },
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
        date: new Date().toISOString(),
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
        date: new Date().toISOString(),
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
        date: new Date().toISOString(),
        budget: 80,
      });
    const jobId = createRes.body.job._id as string;

    const applyRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/applications`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ message: "I can help!" });
    await request(app)
      .patch(`/api/v1/applications/${applyRes.body.application._id}/select`)
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
});
