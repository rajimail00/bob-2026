"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "../../mobile/src/locales/en.json";
import de from "../../mobile/src/locales/de.json";
import es from "../../mobile/src/locales/es.json";
import fr from "../../mobile/src/locales/fr.json";

export const PORTAL_LOCALES = ["en", "de", "es", "fr"] as const;
export type PortalLocale = (typeof PORTAL_LOCALES)[number];
type Params = Record<string, string | number | undefined>;
type Dictionary = Record<string, unknown>;

const resources: Record<PortalLocale, Dictionary> = { en, de, es, fr };

function lookup(dictionary: Dictionary, key: string) {
  return key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Dictionary)[part] : undefined, dictionary);
}

function translate(locale: PortalLocale, key: string, params: Params = {}) {
  const count = typeof params.count === "number" ? params.count : undefined;
  const pluralKey = count === undefined ? key : `${key}_${count === 1 ? "one" : "other"}`;
  const candidate = lookup(resources[locale], pluralKey) ?? lookup(resources[locale], key) ?? lookup(resources.en, pluralKey) ?? lookup(resources.en, key);
  if (typeof candidate !== "string") return key;
  return candidate.replace(/{{\s*([^}]+)\s*}}/g, (_match, name: string) => String(params[name.trim()] ?? ""));
}

interface PortalI18nValue {
  locale: PortalLocale;
  setLocale: (locale: PortalLocale) => void;
  t: (key: string, params?: Params) => string;
  date: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  money: (value: number) => string;
}

const PortalI18nContext = createContext<PortalI18nValue | null>(null);

export function PortalI18nProvider({ initialLocale, children }: { initialLocale?: string; children: React.ReactNode }) {
  const validInitial = PORTAL_LOCALES.includes(initialLocale as PortalLocale) ? initialLocale as PortalLocale : "en";
  const [locale, setLocale] = useState<PortalLocale>(validInitial);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const value = useMemo<PortalI18nValue>(() => ({
    locale,
    setLocale,
    t: (key, params) => translate(locale, key, params),
    date: (input, options = { dateStyle: "medium" }) => new Intl.DateTimeFormat(locale, options).format(new Date(input)),
    money: (amount) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount),
  }), [locale]);
  return <PortalI18nContext.Provider value={value}>{children}</PortalI18nContext.Provider>;
}

export function usePortalI18n() {
  const value = useContext(PortalI18nContext);
  if (!value) throw new Error("usePortalI18n must be used inside PortalI18nProvider");
  return value;
}
