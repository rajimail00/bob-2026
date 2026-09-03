import { jobsApi } from "@/features/home/api/jobs.api";
import { apiClient } from "@/lib/apiClient";
import {
  buildJobMutationInput,
  canSubmitRepost,
  getEditJobFormState,
  getRepostJobDetailParams,
  getRepostJobFormState,
} from "../utils/jobForm";

jest.mock("@/lib/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const job = {
  _id: "job-1",
  clientId: { _id: "owner-1" },
  categoryId: { _id: "category-1" },
  title: "Existing title",
  description: "Existing detailed job description",
  media: [
    { url: "https://example.com/photo.jpg", type: "photo" },
    { url: "https://example.com/video.mp4", type: "video" },
  ],
  location: { type: "Point", coordinates: [13.405, 52.52] },
  address: "Existing address",
  date: "2030-01-02T14:30:00.000Z",
  peopleNeeded: 2,
  budget: 200,
  recurrence: "weekly",
  isEmergency: true,
  paymentPreference: "both",
  status: "active",
};

test("edit mode prefills every job field and converts the saved date", () => {
  const state = getEditJobFormState(job);

  expect(state.values).toMatchObject({
    categoryId: "category-1",
    title: "Existing title",
    description: "Existing detailed job description",
    address: "Existing address",
    peopleNeeded: 2,
    budget: 200,
    recurrence: "weekly",
    isEmergency: true,
    paymentPreference: "both",
  });
  expect(state.values.date).toBeInstanceOf(Date);
  expect(state.values.date.toISOString()).toBe(job.date);
  expect(state.location).toEqual({ lng: 13.405, lat: 52.52 });
  expect(state.media).toEqual(job.media);
  expect(state.media).not.toBe(job.media);
});

test("building an unchanged edit preserves the existing media and saved location", () => {
  const state = getEditJobFormState(job);
  const input = buildJobMutationInput(state.values, state.media, state.location);

  expect(input.media).toEqual(job.media);
  expect(input.location).toEqual({ lng: 13.405, lat: 52.52 });
  expect(input.date).toBe(job.date);
});

test("the update API sends PATCH to the selected job and never POST", async () => {
  apiClient.patch.mockResolvedValueOnce({ data: { job } });
  const state = getEditJobFormState(job);
  const input = buildJobMutationInput(state.values, state.media, state.location);

  const result = await jobsApi.update(job._id, input);

  expect(apiClient.patch).toHaveBeenCalledWith(`/jobs/${job._id}`, input);
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(result).toBe(job);
});

test("repost mode copies safe values but never reuses the historical date", () => {
  const now = new Date("2031-04-01T10:00:00.000Z");
  const state = getRepostJobFormState(job, now);

  expect(state.values).toMatchObject({
    categoryId: "category-1",
    title: "Existing title",
    description: "Existing detailed job description",
    address: "Existing address",
    peopleNeeded: 2,
    budget: 200,
    recurrence: "weekly",
    isEmergency: true,
    paymentPreference: "both",
  });
  expect(state.media).toEqual(job.media);
  expect(state.location).toEqual({ lng: 13.405, lat: 52.52 });
  expect(state.values.date.toISOString()).not.toBe(job.date);
  expect(state.values.date.getTime()).toBeGreaterThan(now.getTime());
});

test("edit and repost modes both retain the saved address and coordinates", () => {
  const editState = getEditJobFormState(job);
  const repostState = getRepostJobFormState(job, new Date("2031-04-01T10:00:00.000Z"));

  expect(editState.values.address).toBe(job.address);
  expect(repostState.values.address).toBe(job.address);
  expect(editState.location).toEqual({ lng: 13.405, lat: 52.52 });
  expect(repostState.location).toEqual({ lng: 13.405, lat: 52.52 });
});

test("repost submission requires a selected new date and blocks while pending", () => {
  expect(canSubmitRepost(false, false)).toBe(false);
  expect(canSubmitRepost(true, true)).toBe(false);
  expect(canSubmitRepost(true, false)).toBe(true);
});

test("the repost API uses POST and navigation targets the newly created job", async () => {
  const repostedJob = { ...job, _id: "new-job-2", repostedFromJobId: job._id };
  apiClient.post.mockResolvedValueOnce({ data: { job: repostedJob } });
  const state = getRepostJobFormState(job, new Date("2031-04-01T10:00:00.000Z"));
  const input = buildJobMutationInput(state.values, state.media, state.location);

  const result = await jobsApi.repost(job._id, input);

  expect(apiClient.post).toHaveBeenCalledWith(`/jobs/${job._id}/repost`, input);
  expect(apiClient.patch).not.toHaveBeenCalledWith(`/jobs/${job._id}/repost`, input);
  expect(getRepostJobDetailParams(result)).toEqual({ jobId: "new-job-2" });
  expect(getRepostJobDetailParams(result).jobId).not.toBe(job._id);
});

