import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";

export const SUPPORTED_LOCALES = ["en", "de", "es", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  code: SupportedLocale;
  label: string;
  flag: string;
}> = [
  { code: "en", label: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "de", label: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "es", label: "Español", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "fr", label: "Français", flag: "\u{1F1EB}\u{1F1F7}" },
];

const resources = { en: { translation: en }, de: { translation: de }, es: { translation: es }, fr: { translation: fr } };

export function resolveDeviceLocale(): SupportedLocale {
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
  compatibilityJSON: "v4",
});

export function setAppLocale(locale: SupportedLocale) {
  return i18n.changeLanguage(locale);
}

export default i18n;
