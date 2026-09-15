import fs from "node:fs";
import path from "node:path";

const sourceRoot = path.join(__dirname, "..", "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");
}

test("customer and admin tabs render complete responsive translated labels", () => {
  const label = read("components/navigation/ResponsiveTabLabel.tsx");
  const customerTabs = read("navigation/MainTabNavigator.tsx");
  const adminTabs = read("navigation/AdminNavigator.tsx");

  expect(label).toContain("numberOfLines={2}");
  expect(label).toContain("adjustsFontSizeToFit");
  expect(label).toContain("minimumFontScale={0.65}");
  expect(customerTabs).toContain("<ResponsiveTabLabel");
  expect(adminTabs).toContain("<ResponsiveTabLabel");
});

test("header notification bells use a high-contrast white symbol", () => {
  const bell = read("features/notifications/components/NotificationBell.tsx");
  const customerHeader = read("components/layout/CustomerHeader.tsx");
  const adminHeader = read("features/admin/components/AdminHeader.tsx");

  expect(customerHeader).toContain("onBrand");
  expect(bell).toContain('color={onBrand ? "white" : "#4F8266"}');
  expect(adminHeader).toContain('name="notifications-outline" size={22} color="white"');
});

test("Home map and list fill the area above the tab bar without duplicate bottom spacing", () => {
  const home = read("features/home/screens/HomeScreen.tsx");

  expect(home).toContain('contentGap="$0"');
  expect(home).toContain('safeAreaEdges={["top", "left", "right"]}');
  expect(home).toContain('style={{ flex: 1 }}');
  expect(home).toContain('contentContainerStyle={{ paddingBottom: 8 }}');
});

test("map jobs show full category information and marker artwork is not cropped", () => {
  const card = read("features/home/components/JobCard.tsx");
  const map = read("features/home/components/JobMapView.tsx");
  const markerImages = read("features/home/constants/categoryMarkerImages.ts");

  expect(card).toContain("job.categoryId.name[locale] || job.categoryId.name.en");
  expect(map).toContain("image={getCategoryMarkerImage(job.categoryId.slug, isSelected)}");
  expect(map).toContain('anchor={{ x: 0.5, y: 0.92 }}');
  expect(markerImages).toContain("assets/map-markers/repair-default.png");
  expect(markerImages).toContain("assets/map-markers/repair-selected.png");
  expect(map).not.toContain("title={job.categoryId.name");
  expect(map).not.toContain("description={job.title}");
  expect(map).not.toContain("function CategoryPin");
  expect(map).not.toContain("pinColor=");
  expect(map).not.toContain("collapsable={false}");
});

test("My Orders keeps the applicant count clear of the card heading", () => {
  const card = read("features/home/components/JobCard.tsx");
  const postedJob = read("features/orders/components/PostedJobRow.tsx");

  expect(postedJob).toContain('placement: "footer-bottom-right"');
  expect(card).toContain('badge?.placement === "footer-bottom-right"');
  expect(card).toContain('alignSelf={floating ? undefined : "flex-end"}');
  expect(card).toContain('<XStack alignItems="flex-end" gap="$2">');
  expect(card).toContain('<Text variant="body" muted numberOfLines={2} flex={1}>');
});

test("customer tab screens do not add a second bottom safe-area gap", () => {
  const orders = read("features/orders/screens/OrdersScreen.tsx");
  const post = read("features/orders/screens/PostJobScreen.tsx");
  const profile = read("features/profile/screens/ProfileScreen.tsx");
  const settings = read("features/profile/screens/ProfileSettingsScreen.tsx");
  const categories = read("features/profile/screens/ProfileCategoriesScreen.tsx");
  const editProfile = read("features/profile/screens/EditProfileScreen.tsx");
  const notificationPreferences = read("features/profile/screens/ProfileNotificationPreferencesScreen.tsx");
  const customerTabEdges = 'safeAreaEdges={["top", "left", "right"]}';

  expect(orders).toContain(customerTabEdges);
  expect(post).toContain('edges={["top", "left", "right"]}');
  expect(post).not.toContain('edges={["top", "bottom"]}');
  expect(profile).toContain(customerTabEdges);
  expect(settings).toContain(customerTabEdges);
  expect(categories).toContain(customerTabEdges);
  expect(editProfile).toContain(customerTabEdges);
  expect(notificationPreferences).toContain(customerTabEdges);
});

test("job card titles have a clear hierarchy and room for longer names", () => {
  const card = read("features/home/components/JobCard.tsx");
  const orders = read("features/orders/screens/OrdersScreen.tsx");
  const postedJob = read("features/orders/components/PostedJobRow.tsx");

  expect(card).toContain('color={softTitle ? "$neutral700" : "$color"}');
  expect(card).toContain('numberOfLines={2}');
  expect(orders).toContain("softTitle");
  expect(postedJob).toContain("softTitle");
});

test("profile overview keeps its portrait close to the header", () => {
  const profile = read("features/profile/screens/ProfileScreen.tsx");

  expect(profile).toContain("paddingTop: 8");
  expect(profile).toContain('<YStack alignItems="center" gap="$1">');
  expect(profile).toContain('<XStack width="100%" height={44} justifyContent="flex-end" alignItems="center">');
  expect(profile.indexOf('name="settings-outline"')).toBeLessThan(profile.indexOf("<ProfilePortrait"));
  expect(profile).toContain('size={112}');
  expect(profile).not.toContain('position: "absolute", top: 0, right: 0');
});
