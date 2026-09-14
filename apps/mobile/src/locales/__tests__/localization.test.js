import i18n, { LANGUAGE_OPTIONS, SUPPORTED_LOCALES } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/apiClient";
import de from "../de.json";
import en from "../en.json";
import es from "../es.json";
import fr from "../fr.json";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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

function leafValues(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? leafValues(child, path)
      : [[path, child]];
  });
}

function interpolationTokens(value) {
  return [...String(value).matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map((match) => match[1]).sort();
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return entry.isFile() && fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

function applicationCodeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : applicationCodeFiles(fullPath);
    return entry.isFile() && /\.tsx?$/.test(fullPath) && !fullPath.endsWith(".d.ts") ? [fullPath] : [];
  });
}

function staticTranslationKeys(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const kind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, kind);
  const keys = [];

  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const callee = node.expression;
      const isTranslationCall = ts.isIdentifier(callee) && callee.text === "t"
        || ts.isPropertyAccessExpression(callee) && callee.name.text === "t";
      const key = node.arguments[0];
      if (isTranslationCall && key && ts.isStringLiteral(key)) keys.push(key.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  return keys;
}

function findHardCodedInterfaceText(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const file = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];
  const visibleStringAttributes = new Set([
    "accessibilityLabel",
    "aria-label",
    "label",
    "message",
    "placeholder",
    "retryLabel",
    "title",
  ]);
  const visibleObjectProperties = new Set(["label", "message", "placeholder", "text", "title"]);
  const allowedInterfaceTokens = new Set(["B", "BOB", "BOB-", "km"]);

  function record(node, value) {
    const text = value.trim().replace(/\s+/g, " ");
    if (!/[A-Za-zÀ-ÿ]/.test(text) || allowedInterfaceTokens.has(text) || /^https?:\/\/$/.test(text)) return;
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
    findings.push(`${path.relative(path.join(__dirname, "../.."), filePath)}:${line + 1}: ${text}`);
  }

  function visit(node) {
    if (ts.isJsxText(node)) record(node, node.getText(file));

    if (
      ts.isJsxAttribute(node)
      && visibleStringAttributes.has(node.name.getText(file))
      && node.initializer
      && ts.isStringLiteral(node.initializer)
    ) {
      record(node, node.initializer.text);
    }

    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(file) === "Alert"
      && node.expression.name.text === "alert"
    ) {
      node.arguments.slice(0, 2).forEach((argument) => {
        if (ts.isStringLiteral(argument)) record(argument, argument.text);
      });
    }

    if (
      ts.isPropertyAssignment(node)
      && visibleObjectProperties.has(node.name.getText(file).replace(/["']/g, ""))
      && ts.isStringLiteral(node.initializer)
    ) {
      record(node, node.initializer.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(file);
  return findings;
}

test("all supported locale files contain exactly the same keys", () => {
  const englishKeys = leafKeys(en).sort();

  for (const locale of SUPPORTED_LOCALES) {
    expect(leafKeys(catalogs[locale]).sort()).toEqual(englishKeys);
  }
});

test("translations are non-empty and preserve interpolation variables", () => {
  const englishValues = Object.fromEntries(leafValues(en));

  for (const locale of SUPPORTED_LOCALES) {
    for (const [key, value] of leafValues(catalogs[locale])) {
      expect(String(value).trim()).not.toBe("");
      expect(interpolationTokens(value)).toEqual(interpolationTokens(englishValues[key]));
    }
  }
});

test("screens do not contain hard-coded interface text", () => {
  const sourceRoot = path.join(__dirname, "../..");
  const findings = sourceFiles(sourceRoot).flatMap(findHardCodedInterfaceText);
  expect(findings).toEqual([]);
});

test("every static translation key used by the app exists", () => {
  const sourceRoot = path.join(__dirname, "../..");
  const availableKeys = new Set(leafKeys(en));
  const missing = applicationCodeFiles(sourceRoot)
    .flatMap(staticTranslationKeys)
    .filter((key) => !availableKeys.has(key) && !availableKeys.has(`${key}_one`));

  expect([...new Set(missing)].sort()).toEqual([]);
});

test("the German client-facing terminology stays localized", () => {
  expect(de.auth.noAccount).toBe("Noch kein Konto?");
  expect(de.profile.feedback).toBe("DEIN FEEDBACK");
  expect(de.profileFlow.settings).toBe("Einstellungen");
  expect(de.navigation.orders).toBe("Aufträge");
  expect(de.admin.navigation.users).toBe("Benutzer verwalten");
  expect(de.admin.navigation.jobs).toBe("Auftragsverwaltung");
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

test.each(SUPPORTED_LOCALES)("%s resolves every displayed admin audit action", async (locale) => {
  const actions = [
    "user.banned", "user.activated", "user.role_changed",
    "job.pending", "job.approved", "job.rejected", "job.suspended", "job.cancelled",
    "ticket.updated", "ticket.replied", "ticket.note_added",
    "category.created", "category.updated", "category.deleted", "category.reordered",
    "faq.created", "faq.updated", "faq.deleted", "faq.reordered",
    "configuration.updated",
    "advertisement.created", "advertisement.updated", "advertisement.publish",
    "advertisement.pause", "advertisement.archive", "advertisement.deleted",
  ];

  await i18n.changeLanguage(locale);
  for (const action of actions) expect(i18n.exists(`admin.auditActions.${action}`, { lng: locale })).toBe(true);
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
