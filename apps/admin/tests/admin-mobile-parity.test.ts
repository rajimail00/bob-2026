import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mobileAdminItems } from "../lib/navigation";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("native admin mobile parity", () => {
  it("uses the same five primary tabs as the app", () => {
    expect(mobileAdminItems.map((item) => item.label)).toEqual(["Dashboard", "Users", "Jobs", "Tickets", "Settings"]);
  });

  it("provides native-style record cards for every admin list", () => {
    const cards = read("components/admin/MobileAdminCards.tsx");
    for (const name of ["MobileUsersCards", "MobileJobsCards", "MobileTicketsCards", "MobileCategoryCards", "MobileAdvertisementCards"]) expect(cards).toContain(`function ${name}`);
  });

  it("provides all four settings destinations from the app", () => {
    const settings = read("features/settings/AdminSettingsPage.tsx");
    for (const destination of ["/categories", "/settings/faqs", "/advertisements", "/settings/configuration"]) expect(settings).toContain(destination);
  });

  it("uses a mobile stack back action for detail and settings screens", () => {
    const shell = read("components/AppShell.tsx");
    expect(shell).toContain("mobileBackHref");
    expect(shell).toContain("admin-mobile-back");
  });
});
