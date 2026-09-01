import { canEditJob, isEditableJobStatus } from "../utils/jobEditing";

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

