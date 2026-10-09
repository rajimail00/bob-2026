import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const postJob = readFileSync(new URL("../features/portal/PostJobPage.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/UserShell.tsx", import.meta.url), "utf8");
const orders = readFileSync(new URL("../features/portal/OrdersPage.tsx", import.meta.url), "utf8");
const profile = readFileSync(new URL("../features/portal/ProfilePage.tsx", import.meta.url), "utf8");
const notifications = readFileSync(new URL("../features/portal/NotificationsPage.tsx", import.meta.url), "utf8");
const jobCard = readFileSync(new URL("../components/portal/JobCard.tsx", import.meta.url), "utf8");
const chat = readFileSync(new URL("../features/portal/ChatPage.tsx", import.meta.url), "utf8");
const jobDetails = readFileSync(new URL("../features/portal/JobDetailsPage.tsx", import.meta.url), "utf8");

describe("user portal phone layout", () => {
  it("keeps the authoritative phone rules at the end of the stylesheet", () => {
    expect(css.lastIndexOf("Authoritative phone overrides")).toBeGreaterThan(css.lastIndexOf("Laptop-first portal refinement"));
  });

  it("prevents job cards and portal containers from overflowing the phone viewport", () => {
    expect(css).toContain(".portal-job-card { width: 100%; min-height: 0;");
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain(".job-facts { width: 100%; grid-template-columns: repeat(2,minmax(0,1fr))");
  });

  it("keeps the mobile navigation visible and permits same-origin geolocation", () => {
    expect(css).toContain(".user-bottom-nav { display: grid;");
    expect(config).toContain('geolocation=(self)');
  });

  it("uses the native five-step post-job workflow on phones", () => {
    expect(postJob).toContain("const STEP_COUNT = 5");
    expect(postJob).toContain('data-post-step="0"');
    expect(postJob).toContain('data-post-step="4"');
    expect(postJob).toContain("function goNext()");
    expect(postJob).toContain("checkValidity()");
    expect(postJob).toContain('mode?: "create" | "edit" | "repost"');
    expect(postJob).toContain('`jobs/${jobId}/repost`');
    expect(css).toContain(".post-step:not(.post-step-active)");
    expect(css).toContain(".mobile-wizard-actions { position: fixed;");
  });

  it("matches the native app navigation and core phone workflows", () => {
    expect(shell).toContain('const mobileItems = items.filter');
    expect(css).toContain("grid-template-columns: repeat(4,minmax(0,1fr))");
    expect(shell).toContain("mobile-notification-link");
    expect(orders).toContain('type Tab = "posted" | "applied"');
    expect(orders).toContain('{ title: "Current"');
    expect(orders).toContain('{ title: "History"');
    expect(profile).toContain("mobile-profile-view");
    expect(profile).toContain("mobile-profile-activity");
    expect(notifications).toContain("async function open(item: AppNotification)");
  });

  it("uses the native compact job card on phones without changing the desktop card", () => {
    expect(jobCard).toContain("job-card-desktop");
    expect(jobCard).toContain("job-card-mobile");
    expect(jobCard).toContain("mobile-job-metadata");
    expect(jobCard).toContain("mobile-job-card-link");
    expect(css).toContain(".job-card-desktop { display: none;");
    expect(css).toContain(".mobile-job-media { width: 100%; height: 140px;");
  });

  it("keeps the mobile chat composer compact and shows participant and job context", () => {
    expect(chat).toContain("chat-participant");
    expect(chat).toContain("chat-job-context");
    expect(css).toContain(".chat-card { min-height: min(420px,calc(100dvh - 180px)); }");
    expect(css).toContain(".chat-compose input { height: 44px; min-height: 44px;");
  });

  it("uses the native compact facts card on mobile job details", () => {
    expect(jobDetails).toContain("desktop-job-detail-facts");
    expect(jobDetails).toContain("mobile-job-detail-facts");
    expect(jobDetails).toContain("mobile-detail-icon-row");
    expect(css).toContain(".desktop-job-detail-facts { display: none;");
    expect(css).toContain("scroll-snap-type: x mandatory");
  });
});
