import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

export const SUPPORTED_LOCALES = ["en", "de", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const resources = { en: { translation: en }, de: { translation: de }, es: { translation: es } };

function resolveDeviceLocale(): SupportedLocale {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? "en";
  return (SUPPORTED_LOCALES as readonly string[]).includes(deviceLanguage)
    ? (deviceLanguage as SupportedLocale)
    : "en";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveDeviceLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  // This app doesn't use i18next's plural key suffixes (e.g. "_one"/"_other"), and several
  // Hermes/Android builds ship without Intl.PluralRules — pin v3 so it never tries to use it.
  compatibilityJSON: "v3",
});

export function setAppLocale(locale: SupportedLocale) {
  void i18n.changeLanguage(locale);
}

export default i18n;
