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
const home = readFileSync(new URL("../features/portal/HomePage.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../features/portal/SettingsPage.tsx", import.meta.url), "utf8");
const postLocationPicker = readFileSync(new URL("../components/portal/PostLocationPickerMap.tsx", import.meta.url), "utf8");
const backendProxy = readFileSync(new URL("../app/api/backend/[...path]/route.ts", import.meta.url), "utf8");

describe("user portal phone layout", () => {
  it("keeps paired settings rows on compact phones", () => {
    const compactPhoneRules = css.slice(css.lastIndexOf("@media (max-width: 380px)"));
    expect(compactPhoneRules).toContain(".settings-action-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }");
    expect(compactPhoneRules).not.toContain(".settings-action-grid { grid-template-columns: minmax(0,1fr); }");
  });

  it("keeps Profile view-only and opens editing from Settings", () => {
    expect(profile).not.toContain("mobile-profile-actions");
    expect(profile).toContain('const editingProfile = editSection === "edit"');
    expect(profile).toContain('editSection === "services"');
    expect(profile).toContain("{editingProfile ? <form");
    expect(profile).toContain("{editingServices ? <form");
    expect(settings).toContain('href="/portal/profile?section=edit"');
    expect(settings).toContain('href="/portal/profile?section=services"');
  });

  it("matches the mobile profile settings workflows", () => {
    expect(profile).toContain('const editingNotifications = editSection === "notifications"');
    expect(profile).toContain('apiFetch<{ url: string }>("media"');
    expect(profile).toContain('(["newApplicant", "newMessage"] as const)');
    expect(settings).toContain('href="/portal/profile?section=notifications"');
    expect(settings).toContain('channel: "whatsapp" | "telegram"');
    expect(settings).toContain("NEXT_PUBLIC_REVIEW_URL");
    expect(settings).toContain('["free", "pro", "unlimited"]');
    expect(settings).toContain("languageOpen");
  });

  it("uses the mobile icon-card category selector", () => {
    expect(profile).toContain("<CategoryIcon slug={category.slug}/>");
    expect(profile).toContain('aria-pressed={isSelected}');
    expect(profile).toContain('profileFlow.selectedCategories');
    expect(profile).not.toContain('name="serviceHours"');
    expect(css).toContain(".category-check-grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr));");
    expect(css).toContain(".category-check-grid { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px;");
  });

  it("keeps the account menu limited to logout and account deletion", () => {
    expect(shell).toContain('apiFetch("auth/account", { method: "DELETE" })');
    const popover = shell.slice(shell.indexOf('<div className="account-popover"'));
    expect(popover).toContain("<LogoutButton");
    expect(popover).toContain("account-delete-button");
    expect(popover).not.toContain('href="/portal/profile"');
    expect(popover).not.toContain('href="/portal/settings"');
  });

  it("keeps the mobile filter icon inside the search row", () => {
    expect(home).toContain('className="discover-search-row"');
    expect(home).toContain('<Icon name="filter"');
    expect(css).toContain(".discover-search-row { width: 100%; display: grid; grid-template-columns: minmax(0,1fr) 44px;");
  });

  it("places the mobile filter button beside the search input", () => {
    expect(home).toContain("discover-filter-button");
    expect(css).toContain("grid-template-columns: minmax(0,1fr) 44px");
    expect(css).toContain(".discover-controls .discover-filter-button { width: 44px");
    expect(css).not.toContain('.discover-controls > .button-secondary::after');
  });

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

  it("matches the native when-and-where controls", () => {
    expect(postJob).toContain("post-day-tabs");
    expect(postJob).toContain("post-time-field");
    expect(postJob).toContain("<PostLocationPickerMap");
    expect(postJob).toContain("post-number-stepper");
    expect(postLocationPicker).toContain('apiFetch<{ place: PlaceResult }>("location/search"');
    expect(postLocationPicker).toContain("draggable: true");
    expect(postLocationPicker).toContain('map.current.addListener("click"');
    expect(backendProxy).toContain("location(?:\\/|$)");
    expect(css).toContain(".post-day-tabs");
    expect(css).toContain(".post-map { height: 255px;");
  });

  it("matches the native options pills and emergency switch", () => {
    expect(postJob).toContain('const recurrenceOptions: JobDraft["recurrence"][]');
    expect(postJob).toContain('const paymentOptions: JobDraft["paymentPreference"][]');
    expect(postJob).toContain('className="post-option-group"');
    expect(postJob).toContain('className="post-emergency-toggle" role="switch"');
    expect(postJob).toContain('aria-checked={draft.isEmergency}');
    expect(css).toContain(".post-option-group button.selected");
    expect(css).toContain(".post-emergency-toggle i.active b");
    expect(css).toContain(".post-details-panel:has(.options-step.post-step-active)");
  });

  it("matches the native app navigation and core phone workflows", () => {
    expect(shell).toContain('const mobileItems = items.filter');
    expect(css).toContain("grid-template-columns: repeat(4,minmax(0,1fr))");
    expect(shell).toContain("mobile-notification-link");
    expect(orders).toContain('type Tab = "posted" | "applied"');
    expect(orders).toContain('{ title: t("orders.current")');
    expect(orders).toContain('{ title: t("orders.history")');
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
