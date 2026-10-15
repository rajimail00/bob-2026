import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("user portal localization", () => {
  it("shares all four mobile app dictionaries", () => {
    const i18n = read("lib/portal-i18n.tsx");
    for (const locale of ["en", "de", "es", "fr"]) {
      expect(i18n).toContain(`../../mobile/src/locales/${locale}.json`);
    }
    expect(i18n).toContain('PORTAL_LOCALES = ["en", "de", "es", "fr"]');
  });

  it("initializes from the signed-in user's saved locale", () => {
    const layout = read("app/(user)/portal/layout.tsx");
    expect(layout).toContain("PortalI18nProvider");
    expect(layout).toContain("session.user.locale");
  });

  it("updates the live locale after saving the setting", () => {
    const settings = read("features/portal/SettingsPage.tsx");
    expect(settings).toContain('apiFetch("auth/locale"');
    expect(settings).toContain("setLocale(locale)");
  });

  it("connects primary portal workflows to the shared translator", () => {
    for (const file of ["HomePage.tsx", "OrdersPage.tsx", "PostJobPage.tsx", "ProfilePage.tsx", "NotificationsPage.tsx", "ChatPage.tsx", "JobDetailsPage.tsx", "SettingsPage.tsx"]) {
      expect(read(`features/portal/${file}`), file).toContain("usePortalI18n");
    }
  });
});
