import i18n, { LANGUAGE_OPTIONS, SUPPORTED_LOCALES } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/apiClient";
import de from "../de.json";
import en from "../en.json";
import es from "../es.json";
import fr from "../fr.json";

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const catalogs = { en, de, es, fr };
const notificationTypes = [
  "new_application",
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "application_rejected",
  "job_cancelled",
  "job_completed",
  "new_message",
  "job_updated",
  "job_expired",
  "job_reposted",
];
const jobStatuses = [
  "draft",
  "active",
  "offer_pending",
  "assigned",
  "completed",
  "cancelled",
  "expired",
];

function leafKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? leafKeys(child, path)
      : [path];
  });
}

test("all supported locale files contain exactly the same keys", () => {
  const englishKeys = leafKeys(en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    expect(leafKeys(catalogs[locale]).sort()).toEqual(englishKeys);
  }
});

test("both selectors receive all four correctly named languages", () => {
  expect(LANGUAGE_OPTIONS.map(({ code, label }) => ({ code, label }))).toEqual([
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
  ]);
});

test.each(SUPPORTED_LOCALES)("%s resolves every notification type and job status", async (locale) => {
  await i18n.changeLanguage(locale);

  for (const type of notificationTypes) {
    expect(i18n.exists(`notifications.types.${type}`, { lng: locale })).toBe(true);
    expect(i18n.t(`notifications.types.${type}`, { lng: locale })).not.toContain("notifications.types");
  }
  for (const status of jobStatuses) {
    expect(i18n.exists(`jobs.status.${status}`, { lng: locale })).toBe(true);
    expect(i18n.t(`jobs.status.${status}`, { lng: locale })).not.toContain("jobs.status");
  }
});

test("counted labels select singular and plural translations", async () => {
  await i18n.changeLanguage("en");
  expect(i18n.t("jobDetail.peopleCount", { count: 1 })).toBe("1 person");
  expect(i18n.t("jobDetail.peopleCount", { count: 2 })).toBe("2 people");
  expect(i18n.t("applications.rating", { average: "5.0", count: 1 })).toContain("1 review");
  expect(i18n.t("applications.rating", { average: "5.0", count: 2 })).toContain("2 reviews");
});

test("stable backend error identifiers resolve in the active language", async () => {
  await i18n.changeLanguage("de");
  const error = {
    isAxiosError: true,
    response: {
      data: {
        error: {
          code: "CONFLICT",
          errorId: "JOB_EDIT_LOCKED",
          message: "This job can no longer be edited.",
        },
      },
    },
  };

  expect(getApiErrorMessage(error, "Fallback")).toBe(de.apiErrors.JOB_EDIT_LOCKED);
});

test("unknown backend messages do not leak hard-coded English into the UI", async () => {
  await i18n.changeLanguage("fr");
  const error = {
    isAxiosError: true,
    response: { data: { error: { code: "CONFLICT", message: "English server detail" } } },
  };

  expect(getApiErrorMessage(error, "Erreur traduite")).toBe("Erreur traduite");
});
