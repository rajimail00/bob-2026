import {
  canEditJob,
  canRepostJob,
  isEditableJobStatus,
  isRepostableJobStatus,
} from "../utils/jobEditing";

const ownedJob = {
  clientId: { _id: "owner-1" },
  status: "active",
};

test("the Edit action is available only to the owner of a draft or active job", () => {
  expect(canEditJob(ownedJob, "owner-1")).toBe(true);
  expect(canEditJob({ ...ownedJob, status: "draft" }, "owner-1")).toBe(true);
  expect(canEditJob(ownedJob, "stranger-1")).toBe(false);
  expect(canEditJob(ownedJob, undefined)).toBe(false);
});

test.each(["offer_pending", "assigned", "completed", "cancelled", "expired"])(
  "the Edit action is hidden for the locked %s status",
  (status) => {
    expect(isEditableJobStatus(status)).toBe(false);
    expect(canEditJob({ ...ownedJob, status }, "owner-1")).toBe(false);
  }
);

test.each(["completed", "cancelled", "expired"])(
  "the Repost action is available to the owner of a %s job",
  (status) => {
    expect(isRepostableJobStatus(status)).toBe(true);
    expect(canRepostJob({ ...ownedJob, status }, "owner-1")).toBe(true);
    expect(canRepostJob({ ...ownedJob, status }, "stranger-1")).toBe(false);
  }
);

test.each(["draft", "active", "offer_pending", "assigned"])(
  "the Repost action is hidden for the %s status",
  (status) => {
    expect(isRepostableJobStatus(status)).toBe(false);
    expect(canRepostJob({ ...ownedJob, status }, "owner-1")).toBe(false);
  }
);

