import fs from "node:fs";
import path from "node:path";

const sourceRoot = path.join(__dirname, "..", "..", "..");
const profileScreens = path.join(__dirname, "..", "screens");

function read(relativePath) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");
}

test("the Profile tab uses a typed nested stack for the complete customer profile flow", () => {
  const tabs = read("navigation/MainTabNavigator.tsx");
  const stack = read("navigation/ProfileStackNavigator.tsx");
  const types = read("navigation/types.ts");

  expect(tabs).toContain('component={ProfileStackNavigator}');
  expect(stack).toContain('name="ProfileOverview"');
  expect(stack).toContain('name="ProfileSettings"');
  expect(stack).toContain('name="ProfileCategories"');
  expect(stack).toContain('name="ProfileEdit"');
  expect(stack).toContain('name="ProfileNotifications"');
  expect(stack).toContain('name="ProfileAccount"');
  expect(types).toContain("Profile: NavigatorScreenParams<ProfileStackParamList>");
});

test("customer main screens share the branded header and account owns logout", () => {
  const header = read("components/layout/CustomerHeader.tsx");
  const logo = read("components/brand/BobLogo.tsx");
  const home = read("features/home/screens/HomeScreen.tsx");
  const orders = read("features/orders/screens/OrdersScreen.tsx");
  const post = read("features/orders/screens/PostJobScreen.tsx");
  const profile = fs.readFileSync(path.join(profileScreens, "ProfileScreen.tsx"), "utf8");
  const settings = fs.readFileSync(path.join(profileScreens, "ProfileSettingsScreen.tsx"), "utf8");
  const account = fs.readFileSync(path.join(profileScreens, "ProfileAccountScreen.tsx"), "utf8");
  const adminHeader = read("features/admin/components/AdminHeader.tsx");

  expect(logo).toContain('require("../../../assets/splash-icon.png")');
  expect(header).toContain("<BobLogo");
  expect(header).toContain('screen: "Notifications"');
  expect(header).toContain('screen: "ProfileAccount"');
  expect(adminHeader).toContain("<BobLogo");
  expect(adminHeader).not.toContain(">β<");
  for (const screen of [home, orders, post, profile]) {
    expect(screen).toContain("<CustomerHeader");
  }
  expect(account).toContain("useLogout");
  expect(account).toContain('t("common.logout")');
  expect(settings).not.toContain("useLogout");
  expect(settings).not.toContain('t("common.logout")');
});

test("profile overview uses authenticated categories and real posted and assigned jobs", () => {
  const overview = fs.readFileSync(path.join(profileScreens, "ProfileScreen.tsx"), "utf8");

  expect(overview).toContain("useAuthStore");
  expect(overview).toContain("useCategories");
  expect(overview).toContain("useMyPostedJobs");
  expect(overview).toContain("useMyAssignedJobs");
  expect(overview).toContain('navigation.navigate("ProfileSettings")');
});

test("settings opens edit, categories, and notification screens and persists locale", () => {
  const settings = fs.readFileSync(path.join(profileScreens, "ProfileSettingsScreen.tsx"), "utf8");

  expect(settings).toContain('navigation.navigate("ProfileEdit")');
  expect(settings).toContain('navigation.navigate("ProfileCategories")');
  expect(settings).toContain('navigation.navigate("ProfileNotifications")');
  expect(settings).toContain("LANGUAGE_OPTIONS.map");
  expect(settings).toContain("updateLocale.mutateAsync(locale)");
  expect(settings).toContain("Share.share");
});

test("category choices are prefilled, limited to five, localized, and saved to the backend", () => {
  const categories = fs.readFileSync(path.join(profileScreens, "ProfileCategoriesScreen.tsx"), "utf8");

  expect(categories).toContain("const MAX_CATEGORIES = 5");
  expect(categories).toContain("user?.workerProfile?.categories");
  expect(categories).toContain("category.name[locale] || category.name.en");
  expect(categories).toContain("completeWorkerProfile.mutateAsync");
  expect(categories).toContain('serviceHours: user?.workerProfile?.serviceHours ?? "standard"');
});

test("edit profile supports editable names, phone, cropped photos, and authenticated saving", () => {
  const edit = fs.readFileSync(path.join(profileScreens, "EditProfileScreen.tsx"), "utf8");

  expect(edit).toContain("onChangeText={setFirstName}");
  expect(edit).toContain("onChangeText={setLastName}");
  expect(edit).toContain("onChangeText={setPhone}");
  expect(edit).toContain("allowsEditing: true");
  expect(edit).toContain("aspect: [1, 1]");
  expect(edit).toContain('uploadMedia(asset.uri, "photo")');
  expect(edit).toContain("completeProfile.mutateAsync");
});

test("reference-only green footer is not embedded in the profile screens", () => {
  const files = [
    "ProfileScreen.tsx",
    "ProfileSettingsScreen.tsx",
    "ProfileCategoriesScreen.tsx",
    "EditProfileScreen.tsx",
  ];

  for (const file of files) {
    const source = fs.readFileSync(path.join(profileScreens, file), "utf8");
    expect(source).not.toContain("createBottomTabNavigator");
  }
});
