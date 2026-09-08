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

test("category management supports persistent image upload with an icon fallback", () => {
  const screen = fs.readFileSync(path.join(__dirname, "../screens/AdminCategoriesScreen.tsx"), "utf8");
  const picker = fs.readFileSync(path.join(__dirname, "../components/CategoryImagePicker.tsx"), "utf8");
  const categoryType = fs.readFileSync(path.join(__dirname, "../types/admin.types.ts"), "utf8");

  expect(screen).toContain("<CategoryImagePicker");
  expect(screen).toContain("item.imageUrl");
  expect(screen).toContain('width="47.5%"');
  expect(picker).toContain('uploadMedia(asset.uri, "photo")');
  expect(picker).toContain("requestMediaLibraryPermissionsAsync");
  expect(categoryType).toContain("imageUrl?: string | null");
});

test("manage users supports individual long-press selection and selected-only bulk actions", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/AdminUsersScreen.tsx"), "utf8");
  expect(source).toContain("onLongPress={() => {");
  expect(source).toContain("toggleSelection(item)");
  expect(source).toContain("selectedIds.has(item._id)");
  expect(source).toContain("const userIds = Array.from(selectedIds)");
  expect(source).toContain('bulkStatus("active")');
  expect(source).toContain('bulkStatus("banned")');
  expect(source).not.toContain('t("admin.bulk.selectPage")');
  expect(source).not.toContain('t("admin.bulk.selectUsers")');
});

test("manage users excludes administrators and deleted accounts", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/AdminUsersScreen.tsx"), "utf8");
  expect(source).toContain('const types = ["worker", "client"] as const');
  expect(source).toContain('const statuses: Exclude<AccountStatus, "deleted">[] = ["active", "banned"]');
  expect(source).toContain('user.role !== "admin" && user.status !== "deleted"');
});

test("user details opens separate offered and taken job history without a role action", async () => {
  const detail = fs.readFileSync(path.join(__dirname, "../screens/AdminUserDetailScreen.tsx"), "utf8");
  const jobs = fs.readFileSync(path.join(__dirname, "../screens/AdminUserJobsScreen.tsx"), "utf8");
  const navigator = fs.readFileSync(path.join(__dirname, "../../../navigation/AdminNavigator.tsx"), "utf8");
  expect(detail).toContain('navigation.navigate("AdminUserJobs"');
  expect(detail).not.toContain("useSetAdminUserRole");
  expect(detail).not.toContain("changeRole");
  expect(jobs).toContain('useState<AdminUserJobKind>("offered")');
  expect(jobs).toContain('setKind("taken")');
  expect(jobs).toContain('navigation.navigate("AdminJobDetail"');
  expect(navigator).toContain('name="AdminUserJobs"');

  apiClient.get.mockReset();
  apiClient.get.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 20, summary: { offered: 0, taken: 0, active: 0, completed: 0 } } });
  await adminApi.userJobs("user-1", { kind: "taken", page: 1, pageSize: 20 });
  expect(apiClient.get).toHaveBeenCalledWith("/admin/users/user-1/jobs", { params: { kind: "taken", page: 1, pageSize: 20 } });
});

test("manage users keeps large selections by batching bulk API requests", async () => {
  apiClient.post.mockReset();
  apiClient.post.mockResolvedValue({ data: { users: [] } });
  const userIds = Array.from({ length: 205 }, (_, index) => `user-${index}`);

  await adminApi.bulkUserStatus(userIds, "banned");

  expect(apiClient.post).toHaveBeenCalledTimes(3);
  expect(apiClient.post.mock.calls.map(([, body]) => body.userIds.length)).toEqual([100, 100, 5]);
});

test("admin translations have identical key sets in every supported locale", () => {
  const locales = ["en", "de", "es", "fr"].map((locale) => JSON.parse(fs.readFileSync(path.join(__dirname, `../../../locales/${locale}.json`), "utf8")).admin);
  const flatten = (object, prefix = "") => Object.entries(object).flatMap(([key, value]) => value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : `${prefix}${key}`).sort();
  for (const locale of locales.slice(1)) expect(flatten(locale)).toEqual(flatten(locales[0]));
});
