"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { type PortalLocale, usePortalI18n } from "@/lib/portal-i18n";
import type { PortalUser } from "@/lib/portal-types";

const languages: { code: PortalLocale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];
const planOptions = ["free", "pro", "unlimited"] as const;
type Plan = (typeof planOptions)[number];

export function SettingsPage({ initialUser }: { initialUser: PortalUser }) {
  const router = useRouter();
  const { t, setLocale } = usePortalI18n();
  const [user, setUser] = useState(initialUser);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>((initialUser.subscriptionTier as Plan) ?? "free");
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "BOB";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const currentLanguage = languages.find((language) => language.code === user.locale) ?? languages[0];

  async function refresh() {
    const response = await fetch("/api/session/me", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json() as { user: PortalUser };
      setUser(data.user);
    }
    router.refresh();
  }

  async function updateLocale(locale: PortalLocale) {
    setBusy(true); setError(""); setNotice("");
    try {
      await apiFetch("auth/locale", { method: "PATCH", body: JSON.stringify({ locale }) });
      setLocale(locale);
      setUser((current) => ({ ...current, locale }));
      setLanguageOpen(false);
      await refresh();
      setNotice(t("common.save"));
    } catch (value) {
      setError(value instanceof Error ? value.message : t("language.updateError"));
    } finally { setBusy(false); }
  }

  async function toggleHours() {
    if (!user.workerProfile) { router.push("/portal/profile?section=services"); return; }
    setBusy(true); setError("");
    try {
      await apiFetch("auth/worker-profile", { method: "POST", body: JSON.stringify({ categories: user.workerProfile.categories, serviceHours: user.workerProfile.serviceHours === "24h" ? "standard" : "24h" }) });
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : t("profileFlow.availabilityUpdateError"));
    } finally { setBusy(false); }
  }

  function inviteUrl() { return process.env.NEXT_PUBLIC_INVITE_URL?.trim() || window.location.origin; }

  function shareInvite(channel: "whatsapp" | "telegram") {
    const url = inviteUrl();
    const message = t("profileFlow.inviteMessage");
    const shareUrl = channel === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`
      : `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl());
      setNotice(t("profileFlow.inviteLinkCopied"));
      setInviteOpen(false);
    } catch { setError(t("profileFlow.actionUnavailable")); }
  }

  function openReview() {
    const reviewUrl = process.env.NEXT_PUBLIC_REVIEW_URL?.trim();
    setFeedbackOpen(false);
    if (reviewUrl) window.open(reviewUrl, "_blank", "noopener,noreferrer");
    else window.location.href = `mailto:support@bob-app.com?subject=${encodeURIComponent(t("profileFlow.feedbackSubject"))}`;
  }

  function previewUpgrade() {
    setUpgradeOpen(false);
    setNotice(t("profileFlow.upgradeUnavailableBody", { plan: `BOB-${t(`subscriptionTiers.${selectedPlan}`)}` }));
  }

  return <>
    <section className="portal-title-row"><div><span className="eyebrow">{t("customerHeader.account")}</span><h1>{t("profileFlow.settings")}</h1></div></section>
    {notice ? <div className="portal-success">{notice}</div> : null}{error ? <div className="form-error portal-message">{error}</div> : null}
    <section className="settings-profile"><div className="settings-avatar">{user.photoUrl ? <img src={user.photoUrl} alt=""/> : initials}</div><div><h2>{name}</h2><p>{user.email}</p></div><Link className="settings-edit-profile" href="/portal/profile?section=edit" aria-label={t("profile.edit")}>✎</Link></section>
    <div className="settings-action-grid">
      <Link href="/portal/profile?section=services" className="settings-action"><span>▦</span><div><strong>{t("profileFlow.chooseCategories")}</strong><small>{t("profileFlow.selectedCategories", { selected: user.workerProfile?.categories.length ?? 0, count: 5 })}</small></div></Link>
      <button className="settings-action" onClick={toggleHours} disabled={busy}><span>◷</span><div><strong>{t("profileFlow.serviceHours")}</strong><small>{t(user.workerProfile?.serviceHours === "24h" ? "workerProfile.allDay" : "workerProfile.standard")}</small></div></button>
      <Link className="settings-action" href="/portal/profile?section=notifications"><span>♢</span><div><strong>{t("notificationPreferences.shortTitle")}</strong><small>{t("notificationPreferences.description")}</small></div></Link>
      <button className="settings-action" onClick={() => setInviteOpen(true)}><span>↗</span><div><strong>{t("profile.invite")}</strong><small>{t("profileFlow.inviteMessage")}</small></div></button>
      <button className="settings-action" onClick={() => setFeedbackOpen(true)}><span>♡</span><div><strong>{t("profile.feedback")}</strong><small>{t("profileFlow.feedbackPrompt")}</small></div></button>
      <a className="settings-action" href={`mailto:support@bob-app.com?subject=${encodeURIComponent(t("profileFlow.helpSubject"))}`}><span>?</span><div><strong>{t("profile.help")}</strong><small>{t("profileFlow.contactUnavailableBody")}</small></div></a>
    </div>
    <section className="settings-panel settings-language">
      <button className="settings-language-trigger" type="button" onClick={() => setLanguageOpen((open) => !open)} aria-expanded={languageOpen}><strong>{t("language.select")}</strong><span>{currentLanguage.flag} {currentLanguage.label} <b>{languageOpen ? "⌃" : "⌄"}</b></span></button>
      {languageOpen ? <div className="language-options">{languages.map((language) => <button key={language.code} className={user.locale === language.code ? "selected" : ""} disabled={busy} onClick={() => void updateLocale(language.code)}><span>{language.flag}</span>{language.label}{user.locale === language.code ? <span>✓</span> : null}</button>)}</div> : null}
    </section>
    <section className="subscription-panel"><div><span>{t("profile.subscription")}</span><h2>BOB-{t(`subscriptionTiers.${user.subscriptionTier ?? "free"}`)}</h2><p>{t("profileFlow.planDetailsPending")}</p></div><button className="button button-primary" onClick={() => { setSelectedPlan((user.subscriptionTier as Plan) ?? "free"); setUpgradeOpen(true); }}>{t("profileFlow.upgradePro")}</button></section>

    {inviteOpen ? <div className="portal-modal-backdrop" role="presentation" onMouseDown={() => setInviteOpen(false)}><section className="portal-action-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="portal-modal-close" onClick={() => setInviteOpen(false)} aria-label={t("profileFlow.closeInvite")}>×</button><h2>{t("profile.invite")}</h2><div className="share-action-row"><button className="whatsapp" onClick={() => shareInvite("whatsapp")} aria-label={t("profileFlow.shareWhatsApp")}>W</button><button className="telegram" onClick={() => shareInvite("telegram")} aria-label={t("profileFlow.shareTelegram")}>➤</button><button className="copy" onClick={() => void copyInvite()} aria-label={t("profileFlow.copyInviteLink")}>↗</button></div></section></div> : null}
    {feedbackOpen ? <div className="portal-modal-backdrop" role="presentation" onMouseDown={() => setFeedbackOpen(false)}><section className="portal-action-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="portal-modal-close" onClick={() => setFeedbackOpen(false)} aria-label={t("profileFlow.closeFeedback")}>×</button><h2>{t("profileFlow.feedbackPrompt")}</h2><button className="button button-primary button-full" onClick={openReview}>{t("profileFlow.goToReview")}</button></section></div> : null}
    {upgradeOpen ? <div className="portal-modal-backdrop upgrade-backdrop" role="presentation" onMouseDown={() => setUpgradeOpen(false)}><section className="portal-upgrade-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><h2>{t("profileFlow.upgradePlansTitle")}</h2><button onClick={() => setUpgradeOpen(false)} aria-label={t("profileFlow.closeUpgradePlans")}>×</button></header><div className="plan-options">{planOptions.map((plan) => <button key={plan} className={selectedPlan === plan ? "selected" : ""} onClick={() => setSelectedPlan(plan)} role="radio" aria-checked={selectedPlan === plan}><strong>BOB-{t(`subscriptionTiers.${plan}`)}</strong>{selectedPlan === plan ? <b>✓</b> : null}<small>{t("profileFlow.planDetailsPending")}</small></button>)}</div><button className="button button-primary button-full" onClick={previewUpgrade}>{t("profileFlow.upgradeNow")}</button></section></div> : null}
  </>;
}
