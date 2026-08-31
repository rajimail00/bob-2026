import { isGloballyVisibleJob } from "../hooks/useJobs";

test("the stale-cache safeguard renders only active future jobs", () => {
  const now = new Date("2030-01-01T12:00:00.000Z").getTime();
  expect(
    isGloballyVisibleJob({ status: "active", date: "2030-01-01T13:00:00.000Z" }, now)
  ).toBe(true);
  expect(
    isGloballyVisibleJob({ status: "active", date: "2030-01-01T11:00:00.000Z" }, now)
  ).toBe(false);

  for (const status of [
    "draft",
    "offer_pending",
    "assigned",
    "completed",
    "cancelled",
    "expired",
  ]) {
    expect(
      isGloballyVisibleJob({ status, date: "2030-01-01T13:00:00.000Z" }, now)
    ).toBe(false);
  }
});
