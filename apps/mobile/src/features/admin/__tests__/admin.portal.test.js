import fs from "node:fs";
import path from "node:path";
import { adminApi } from "../api/admin.api";
import { apiClient } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));

test("admin API requests real protected dashboard and moderation data", async () => {
  apiClient.get.mockResolvedValueOnce({ data: { metrics: {} } });
  await adminApi.dashboard("week");
  expect(apiClient.get).toHaveBeenCalledWith("/admin/dashboard", { params: { period: "week" } });

  apiClient.patch.mockResolvedValueOnce({ data: {} });
  await adminApi.moderateJob("job-1", "suspended", "review");
  expect(apiClient.patch).toHaveBeenCalledWith("/admin/jobs/job-1/moderation", { status: "suspended", reason: "review" });
});

test("root routing selects the portal from the backend role before profile setup", () => {
  const root = fs.readFileSync(path.join(__dirname, "../../../navigation/RootNavigator.tsx"), "utf8");
  expect(root.indexOf('user?.role === "admin"')).toBeGreaterThan(-1);
  expect(root.indexOf('user?.role === "admin"')).toBeLessThan(root.indexOf("!hasCompletedProfile"));
  expect(root).toContain('name="Admin"');
  expect(root).toContain('name="Main"');
  expect(root).toContain('name="Auth"');
});

test("the admin navigator exposes the five required mobile tabs", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../../navigation/AdminNavigator.tsx"), "utf8");
  for (const route of ["AdminDashboard", "AdminUsers", "AdminJobs", "AdminTickets", "AdminSettings"]) {
    expect(source).toContain(`name="${route}"`);
  }
});

test("admin translations have identical key sets in every supported locale", () => {
  const locales = ["en", "de", "es", "fr"].map((locale) => JSON.parse(fs.readFileSync(path.join(__dirname, `../../../locales/${locale}.json`), "utf8")).admin);
  const flatten = (object, prefix = "") => Object.entries(object).flatMap(([key, value]) => value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : `${prefix}${key}`).sort();
  for (const locale of locales.slice(1)) expect(flatten(locale)).toEqual(flatten(locales[0]));
});
