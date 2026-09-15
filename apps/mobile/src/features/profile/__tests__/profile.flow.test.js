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
  expect(stack).not.toContain('name="ProfileAccount"');
  expect(types).toContain("Profile: NavigatorScreenParams<ProfileStackParamList>");
});

test("customer main screens share the branded header and account actions are independent from the Profile tab", () => {
  const header = read("components/layout/CustomerHeader.tsx");
  const root = read("navigation/RootNavigator.tsx");
  const adminNavigator = read("navigation/AdminNavigator.tsx");
  const types = read("navigation/types.ts");
  const accountMenu = read("components/layout/HeaderAccountMenu.tsx");
  const logo = read("components/brand/BobLogo.tsx");
  const home = read("features/home/screens/HomeScreen.tsx");
  const orders = read("features/orders/screens/OrdersScreen.tsx");
  const post = read("features/orders/screens/PostJobScreen.tsx");
  const profile = fs.readFileSync(path.join(profileScreens, "ProfileScreen.tsx"), "utf8");
  const settings = fs.readFileSync(path.join(profileScreens, "ProfileSettingsScreen.tsx"), "utf8");
  const adminHeader = read("features/admin/components/AdminHeader.tsx");

  expect(logo).toContain('require("../../../assets/splash-icon.png")');
  expect(header).toContain("<BobLogo");
  expect(header).toContain('screen: "Notifications"');
  expect(header).toContain("<HeaderAccountMenu");
  expect(header).toContain('mode="customer"');
  expect(header).toContain("setAccountMenuOpen((open) => !open)");
  expect(header).not.toContain('navigation.navigate("CustomerAccount")');
  expect(root).not.toContain('name="CustomerAccount"');
  expect(types).not.toContain("CustomerAccount: undefined");
  expect(adminHeader).toContain("<BobLogo");
  expect(adminHeader).toContain("<HeaderAccountMenu");
  expect(adminHeader).toContain('mode="admin"');
  expect(adminHeader).not.toContain('navigation.navigate("AdminAccount")');
  expect(adminNavigator).not.toContain('name="AdminAccount"');
  expect(types).not.toContain("AdminAccount: undefined");
  expect(adminHeader).not.toContain(">β<");
  for (const screen of [home, orders, post, profile]) {
    expect(screen).toContain("<CustomerHeader");
  }
  expect(accountMenu).toContain("useLogout");
  expect(accountMenu).toContain('t("common.logout")');
  expect(accountMenu).toContain("useDeleteAccount");
  expect(accountMenu).toContain('mode === "customer"');
  expect(accountMenu).toContain('t("profile.deactivateTitle")');
  expect(accountMenu).toContain("onRequestClose={onClose}");
  expect(accountMenu).toContain('testID="account-menu-backdrop"');
  expect(accountMenu.indexOf('t("common.logout")')).toBeLessThan(accountMenu.lastIndexOf('t("profile.deactivateTitle")'));
  expect(settings).not.toContain("useLogout");
  expect(settings).not.toContain('t("common.logout")');
  expect(settings).not.toContain("useDeleteAccount");
  expect(settings).not.toContain('t("profile.deactivateTitle")');
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
  expect(settings).toContain("setInviteModalOpen(true)");
  expect(settings).toContain("setFeedbackModalOpen(true)");
});

test("notification settings use explicit On and Off choices and persist both fields when Save is pressed", () => {
  const notifications = fs.readFileSync(path.join(profileScreens, "ProfileNotificationPreferencesScreen.tsx"), "utf8");

  expect(notifications).toContain('const FIELDS = ["newApplicant", "newMessage"]');
  expect(notifications).toContain('t("notificationPreferences.on")');
  expect(notifications).toContain('t("notificationPreferences.off")');
  expect(notifications).toContain('label={t("common.save")}');
  expect(notifications).toContain("updatePreferences.mutate(draft");
  expect(notifications).toContain("onSuccess: () => navigation.goBack()");
  expect(notifications).not.toContain("<Switch");
});

test("invite and feedback settings actions open localized functional modals", () => {
  const settings = fs.readFileSync(path.join(profileScreens, "ProfileSettingsScreen.tsx"), "utf8");
  const modals = read("features/profile/components/ProfileActionModals.tsx");

  expect(settings).toContain("<InviteFriendsModal");
  expect(settings).toContain("<FeedbackModal");
  expect(settings).toContain("EXPO_PUBLIC_REVIEW_URL");
  expect(modals).toContain("EXPO_PUBLIC_INVITE_URL");
  expect(modals).toContain('https://wa.me/?text=');
  expect(modals).toContain('https://t.me/share/url?url=');
  expect(modals).toContain("Clipboard.setStringAsync(INVITE_URL)");
  expect(modals).toContain("Share.share({ message: inviteMessage })");
  expect(modals).toContain('t("profileFlow.feedbackPrompt")');
  expect(modals).toContain('t("profileFlow.goToReview")');
  expect(modals).toContain("onRequestClose={onClose}");
});

test("subscription upgrade control lives inside its card and opens a localized selectable-plan modal", () => {
  const settings = fs.readFileSync(path.join(profileScreens, "ProfileSettingsScreen.tsx"), "utf8");
  const modal = read("features/profile/components/SubscriptionUpgradeModal.tsx");

  const subscriptionCard = settings.indexOf('<Card gap="$3">');
  const upgradeButton = settings.indexOf('onPress={() => setUpgradeModalOpen(true)}');
  expect(subscriptionCard).toBeGreaterThan(-1);
  expect(upgradeButton).toBeGreaterThan(subscriptionCard);
  expect(settings).toContain("<SubscriptionUpgradeModal");
  expect(settings).toContain("requestSubscriptionUpgrade");
  expect(settings).toContain('t("profileFlow.upgradeUnavailableBody"');
  expect(modal).toContain('const PLAN_OPTIONS: SubscriptionTier[] = ["free", "pro", "unlimited"]');
  expect(modal).toContain("<Modal");
  expect(modal).toContain('accessibilityRole="radio"');
  expect(modal).toContain("setSelectedTier(tier)");
  expect(modal).toContain('t("profileFlow.upgradeNow")');
  expect(modal).toContain("onRequestClose={onClose}");
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
