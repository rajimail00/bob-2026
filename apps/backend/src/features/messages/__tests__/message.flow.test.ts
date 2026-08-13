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

async function createJobWithApplicant() {
  const category = await CategoryModel.create({
    slug: "cleaning",
    icon: "spray",
    name: { en: "Cleaning", de: "Reinigung", es: "Limpieza" },
    order: 0,
  });
  const client = await createVerifiedUser("msg-client@example.com");
  const worker = await createVerifiedUser("msg-worker@example.com");

  await request(app)
    .post("/api/v1/auth/worker-profile")
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({ categories: [category.id], serviceHours: "standard" });

  const jobRes = await request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${client.accessToken}`)
    .send({
      categoryId: category.id,
      title: "Need a cleaner",
      description: "Weekly apartment cleaning needed, two bedrooms.",
      location: { lng: 13.405, lat: 52.52 },
      address: "Schwalbacherstr. 42, Berlin",
      date: new Date().toISOString(),
      budget: 100,
    });
  const jobId = jobRes.body.job._id as string;

  await request(app)
    .post(`/api/v1/jobs/${jobId}/applications`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({ message: "I can help!" });

  return { jobId, client, worker };
}

describe("job messages", () => {
  it("blocks a stranger from reading or sending messages", async () => {
    const { jobId, worker } = await createJobWithApplicant();
    const stranger = await createVerifiedUser("msg-stranger@example.com");

    const listRes = await request(app)
      .get(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(listRes.status).toBe(403);

    const sendRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({ text: "Hi" });
    expect(sendRes.status).toBe(403);
  });

  it("rejects an empty message with neither text nor attachment", async () => {
    const { jobId, client, worker } = await createJobWithApplicant();
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("lets the client and an applicant exchange messages before selection", async () => {
    const { jobId, client, worker } = await createJobWithApplicant();

    const fromClient = await request(app)
      .post(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${client.accessToken}`)
      .send({ text: "Hello, when can you start?" });
    expect(fromClient.status).toBe(201);

    const fromWorker = await request(app)
      .post(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ text: "Tomorrow morning works for me." });
    expect(fromWorker.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.messages).toHaveLength(2);
    expect(listRes.body.messages[0].text).toBe("Hello, when can you start?");
    expect(listRes.body.messages[1].text).toBe("Tomorrow morning works for me.");
  });

  it("lists conversations for the job owner with unread counts", async () => {
    const { jobId, client, worker } = await createJobWithApplicant();

    const sendRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${worker.accessToken}`)
      .send({ text: "Hallo ich kann den Job übernehmen." });
    expect(sendRes.status).toBe(201);

    const conversationsRes = await request(app)
      .get(`/api/v1/jobs/${jobId}/conversations`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(conversationsRes.status).toBe(200);
    expect(conversationsRes.body.conversations).toHaveLength(1);
    expect(conversationsRes.body.conversations[0].workerId).toBe(worker.userId);
    expect(conversationsRes.body.conversations[0].unreadCount).toBe(1);

    // Reading marks the worker's messages as seen.
    await request(app)
      .get(`/api/v1/jobs/${jobId}/messages/${worker.userId}`)
      .set("Authorization", `Bearer ${client.accessToken}`);

    const afterRead = await request(app)
      .get(`/api/v1/jobs/${jobId}/conversations`)
      .set("Authorization", `Bearer ${client.accessToken}`);
    expect(afterRead.body.conversations[0].unreadCount).toBe(0);
  });
});
