import { jobsApi } from "@/features/home/api/jobs.api";
import { apiClient } from "@/lib/apiClient";
import { buildJobMutationInput, getEditJobFormState } from "../utils/jobForm";

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

