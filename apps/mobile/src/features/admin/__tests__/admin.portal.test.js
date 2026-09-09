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
  expect(source).toContain("activeFilterCount={activeFilters.length}");
  expect(source).not.toContain("<AdminActiveFilters");
});

test("advertisement management is reachable from Settings with create and edit routes", () => {
  const settings = fs.readFileSync(path.join(__dirname, "../screens/AdminSettingsScreen.tsx"), "utf8");
  const navigator = fs.readFileSync(path.join(__dirname, "../../../navigation/AdminNavigator.tsx"), "utf8");
  expect(settings).toContain('route: "AdminAdvertisements"');
  expect(settings).toContain('icon: "megaphone-outline"');
  expect(navigator).toContain('name="AdminAdvertisements"');
  expect(navigator).toContain('name="AdminAdvertisementForm"');
});

test("advertisement admin API supports CRUD and controlled lifecycle actions", async () => {
  apiClient.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 10 } });
  await adminApi.advertisements({ page: 1, status: "scheduled" });
  expect(apiClient.get).toHaveBeenCalledWith("/admin/advertisements", { params: { page: 1, status: "scheduled" } });

  apiClient.post.mockResolvedValueOnce({ data: { advertisement: { _id: "ad-1" } } });
  await adminApi.publishAdvertisement("ad-1");
  expect(apiClient.post).toHaveBeenCalledWith("/admin/advertisements/ad-1/publish");

  apiClient.delete.mockResolvedValueOnce({ data: undefined });
  await adminApi.deleteAdvertisement("ad-1");
  expect(apiClient.delete).toHaveBeenCalledWith("/admin/advertisements/ad-1");
});

test("advertisement screens include validation, media preview and confirmed destructive actions", () => {
  const list = fs.readFileSync(path.join(__dirname, "../screens/AdminAdvertisementsScreen.tsx"), "utf8");
  const form = fs.readFileSync(path.join(__dirname, "../screens/AdminAdvertisementFormScreen.tsx"), "utf8");
  const picker = fs.readFileSync(path.join(__dirname, "../components/AdvertisementMediaPicker.tsx"), "utf8");
  expect(list).toContain("<AdvertisementCard advertisement={preview}");
  expect(list).toContain('confirmAction(item, "pause")');
  expect(list).toContain('confirmAction(item, "delete")');
  expect(form).toContain("if (endsAt <= startsAt)");
  expect(form).toContain("startsAt.toISOString()");
  expect(picker).toContain('mediaTypes: ["images", "videos"]');
  expect(picker).toContain("requestMediaLibraryPermissionsAsync");
});

test("manage users excludes administrators and deleted accounts", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/AdminUsersScreen.tsx"), "utf8");
  expect(source).toContain('const types = ["worker", "client"] as const');
  expect(source).toContain('const statuses: Exclude<AccountStatus, "deleted">[] = ["active", "banned"]');
  expect(source).toContain('user.role !== "admin" && user.status !== "deleted"');
});

test("user details renders localized worker category names instead of database ids", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/AdminUserDetailScreen.tsx"), "utf8");
  expect(source).toContain("useAdminCategories()");
  expect(source).toContain("category._id === categoryId || category.slug === categoryId");
  expect(source).toContain("category.name[currentLocale] || category.name.en");
  expect(source).not.toContain('user.workerProfile.categories.join(", ")');
});

test("user details opens separate offered and taken job history without a role action", async () => {
  const detail = fs.readFileSync(path.join(__dirname, "../screens/AdminUserDetailScreen.tsx"), "utf8");
  const jobs = fs.readFileSync(path.join(__dirname, "../screens/AdminUserJobsScreen.tsx"), "utf8");
  const header = fs.readFileSync(path.join(__dirname, "../components/AdminHeader.tsx"), "utf8");
  const navigator = fs.readFileSync(path.join(__dirname, "../../../navigation/AdminNavigator.tsx"), "utf8");
  expect(detail).toContain('navigation.navigate("AdminUserJobs"');
  expect(detail).not.toContain("useSetAdminUserRole");
  expect(detail).not.toContain("changeRole");
  expect(jobs).toContain('useState<AdminUserJobKind>("offered")');
  expect(jobs).toContain('setKind("taken")');
  expect(jobs).toContain('navigation.navigate("AdminJobDetail"');
  expect(jobs).not.toContain('t("admin.userJobs.about")');
  expect(jobs).not.toContain("SummaryCard");
  expect(jobs).not.toContain("<Avatar");
  expect(jobs).not.toContain('t("admin.users.registered")');
  expect(jobs).toContain("summary?.offered ?? stats.jobsPosted");
  expect(jobs.indexOf("<AdminSearchBar")).toBeLessThan(jobs.indexOf('t("admin.userJobs.offeredWithCount"'));
  expect(header).toContain("useAdminNotifications(!showBack)");
  expect(header).toContain("{!showBack ? (");
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

test("support tickets matches the long-press selection and filter-sheet pattern", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/AdminTicketsScreen.tsx"), "utf8");
  expect(source).toContain("onLongPress={() => {");
  expect(source).toContain("toggleSelection(item)");
  expect(source).toContain("selectedIds.has(item._id)");
  expect(source).toContain("<AdminFilterSheet");
  expect(source).not.toContain("<AdminActiveFilters");
  expect(source).toContain("onOpenFilters={() => setFiltersOpen(true)}");
  expect(source).toContain('bulkStatus("in_progress")');
  expect(source).toContain('bulkStatus("resolved")');
  expect(source).not.toContain('t("admin.bulk.selectPage")');

  apiClient.post.mockReset();
  apiClient.post.mockResolvedValue({ data: { tickets: [] } });
  const ticketIds = Array.from({ length: 205 }, (_, index) => `ticket-${index}`);
  await adminApi.bulkUpdateTickets(ticketIds, { status: "resolved" });
  expect(apiClient.post).toHaveBeenCalledTimes(3);
  expect(apiClient.post.mock.calls.map(([, body]) => body.ticketIds.length)).toEqual([100, 100, 5]);
});

test("job management keeps filter state in the sheet without rendering filter chips", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/AdminJobsScreen.tsx"), "utf8");
  expect(source).toContain("<AdminFilterSheet");
  expect(source).toContain("activeFilterCount={activeFilters.length}");
  expect(source).not.toContain("<AdminActiveFilters");
});

test("job management uses compact user-sized cards without a three-dot action", () => {
  const source = fs.readFileSync(path.join(__dirname, "../screens/AdminJobsScreen.tsx"), "utf8");
  expect(source).toContain("width: 54, height: 54, borderRadius: 27");
  expect(source).toContain('<Text variant="h4" numberOfLines={1}>{item.title}</Text>');
  expect(source).not.toContain('name="ellipsis-vertical"');
  expect(source).not.toContain("const action =");
});

test("admin translations have identical key sets in every supported locale", () => {
  const locales = ["en", "de", "es", "fr"].map((locale) => JSON.parse(fs.readFileSync(path.join(__dirname, `../../../locales/${locale}.json`), "utf8")).admin);
  const flatten = (object, prefix = "") => Object.entries(object).flatMap(([key, value]) => value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : `${prefix}${key}`).sort();
  for (const locale of locales.slice(1)) expect(flatten(locale)).toEqual(flatten(locales[0]));
});
