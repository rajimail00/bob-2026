import { describe, expect, it } from "vitest";
import { notificationHref, pageTitle, sidebarItems } from "../lib/navigation";

describe("admin navigation", () => {
  it("keeps the approved sidebar order", () => {
    expect(sidebarItems.map((item) => item.label)).toEqual([
      "Dashboard", "Manage Users", "Job Management", "Categories", "Advertisements", "Support Tickets",
    ]);
  });

  it("resolves nested page titles and notification destinations", () => {
    expect(pageTitle("/users/123")).toBe("Manage Users");
    expect(notificationHref("job", "abc")).toBe("/jobs/abc");
    expect(notificationHref("support_ticket", "xyz")).toBe("/support-tickets/xyz");
  });
});
