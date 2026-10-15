"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { Category, Job, PortalUser } from "@/lib/portal-types";
import { localizedName } from "@/lib/portal-types";
import { usePortalI18n } from "@/lib/portal-i18n";
import { CategoryIcon } from "@/components/portal/CategoryIcon";

export function ProfilePage({ initialUser }: { initialUser: PortalUser }) {
  const { t, date, locale } = usePortalI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSection = searchParams.get("section");
  const editingProfile = editSection === "edit";
  const editingServices = editSection === "services";
  const editingNotifications = editSection === "notifications";
  const editMode = editingProfile || editingServices || editingNotifications;
  const [user, setUser] = useState(initialUser);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>(initialUser.workerProfile?.categories ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(initialUser.photoUrl ?? "");
  const [photoPreview, setPhotoPreview] = useState(initialUser.photoUrl ?? "");
  const [notificationDraft, setNotificationDraft] = useState({
    newApplicant: initialUser.notificationPrefs?.newApplicant ?? true,
    newMessage: initialUser.notificationPrefs?.newMessage ?? true,
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [activityJobCount, setActivityJobCount] = useState(0);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>("categories").then((data) => {
      setCategories(data.categories);
      const saved = initialUser.workerProfile?.categories ?? [];
      setSelected(data.categories.filter((category) => saved.includes(category._id) || saved.includes(category.slug)).map((category) => category._id));
    }).catch(() => undefined);
    Promise.all([apiFetch<{ jobs: Job[] }>("jobs/mine/posted"), apiFetch<{ jobs: Job[] }>("jobs/mine/assigned")]).then(([posted, assigned]) => {
      const unique = new Map([...posted.jobs, ...assigned.jobs].map((job) => [job._id, job]));
      setActivityJobCount(unique.size);
      setRecentJobs([...unique.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 2));
    }).catch(() => undefined);
  }, []);
  async function refreshSession() { const response = await fetch("/api/session/me", { cache: "no-store" }); if (response.ok) { const data = await response.json() as { user: PortalUser }; setUser(data.user); } router.refresh(); }
  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setError(""); setPhotoPreview(URL.createObjectURL(file)); setUploadingPhoto(true);
    try { const body = new FormData(); body.append("file", file); const uploaded = await apiFetch<{ url: string }>("media", { method: "POST", body }); setPhotoUrl(uploaded.url); setPhotoPreview(uploaded.url); }
    catch (value) { setPhotoPreview(photoUrl); setError(value instanceof Error ? value.message : t("profile.photoUploadError")); }
    finally { setUploadingPhoto(false); }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); try { await apiFetch("auth/profile", { method: "POST", body: JSON.stringify({ firstName: form.get("firstName"), lastName: form.get("lastName"), phone: form.get("phone") || undefined, photoUrl: photoUrl || undefined }) }); await refreshSession(); router.push("/portal/settings"); } catch (value) { setError(value instanceof Error ? value.message : t("profile.saveError")); } finally { setSaving(false); } }
  async function saveWorker(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected.length) { setError(t("profileFlow.categoryRequired")); return; } setSaving(true); setError(""); try { await apiFetch("auth/worker-profile", { method: "POST", body: JSON.stringify({ categories: selected, serviceHours: user.workerProfile?.serviceHours ?? "standard" }) }); await refreshSession(); router.push("/portal/settings"); } catch (value) { setError(value instanceof Error ? value.message : t("profileFlow.categorySaveError")); } finally { setSaving(false); } }
  async function saveNotifications(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); try { await apiFetch("auth/notification-preferences", { method: "PATCH", body: JSON.stringify(notificationDraft) }); await refreshSession(); router.push("/portal/settings"); } catch (value) { setError(value instanceof Error ? value.message : t("notificationPreferences.updateError")); } finally { setSaving(false); } }
  function toggle(id: string) { setError(""); setSelected((current) => { if (current.includes(id)) return current.filter((value) => value !== id); if (current.length >= 5) { setError(t("profileFlow.categoryLimit", { count: 5 })); return current; } return [...current, id]; }); }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0] || "BOB";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const selectedCategories = categories.filter((category) => selected.includes(category._id) || selected.includes(category.slug));

  return <>
    <section className="portal-title-row profile-desktop-title"><div><span className="eyebrow">{t("customerHeader.account")}</span><h1>{t("navigation.profile")}</h1><p>{t("profileFlow.settings")}</p></div></section>
    {editMode ? <Link className="profile-edit-back" href="/portal/settings">‹ {t("common.back")}</Link> : null}
    {!editMode ? <section className="mobile-profile-view">
      <div className="mobile-profile-settings"><Link href="/portal/settings" aria-label={t("accessibility.profileSettings")}>⚙</Link></div>
      <div className="mobile-profile-portrait">{user.photoUrl ? <img src={user.photoUrl} alt=""/> : initials}</div>
      <div className="mobile-profile-summary">
        <div><h1>{displayName}</h1><strong>{t("profileFlow.categories")}</strong><div className="mobile-profile-categories">{selectedCategories.length ? selectedCategories.map((category) => <span key={category._id} title={localizedName(category, locale)}>{category.imageUrl ? <img src={category.imageUrl} alt=""/> : localizedName(category, locale).slice(0, 1)}</span>) : <small>{t("profileFlow.noCategories")}</small>}</div></div>
        <div><h2>☆ {(user.rating?.average ?? 0).toFixed(1)}/5</h2><p>{t("profile.reviewCount", { count: user.rating?.count ?? 0 })}</p><p>{t("profileFlow.jobCount", { count: activityJobCount })}</p></div>
      </div>
      <div className="mobile-profile-divider"/><h2 className="mobile-profile-activity-title">{t("profileFlow.recentActivity")}</h2>
      <div className="mobile-profile-activity">{recentJobs.length ? recentJobs.map((job) => <Link href={`/portal/jobs/${job._id}`} key={job._id} className="mobile-recent-job">{job.media[0]?.type === "photo" ? <img src={job.media[0].url} alt=""/> : null}<div><strong>{job.title}</strong><small>{localizedName(job.categoryId, locale)}</small><small>{t("profileFlow.scheduled", { date: date(job.date) })}</small></div><span className="status-pill neutral">{t(`jobs.status.${job.status}`)}</span><b>›</b></Link>) : <p className="portal-empty-copy">{t("profileFlow.noActivity")}</p>}</div>
    </section> : null}
    {!editMode ? <section className="profile-overview profile-desktop-only">
      <div className="profile-photo">{user.photoUrl ? <img src={user.photoUrl} alt=""/> : initials}</div>
      <div className="profile-overview-copy"><h2>{displayName}</h2><p>{user.email}</p><div className="profile-badges"><span>{user.subscriptionTier ?? "free"} plan</span></div></div>
      <dl><div><dt>{t("profile.rating")}</dt><dd>{user.rating?.average?.toFixed(1) ?? "—"}</dd></div><div><dt>{t("profileFlow.jobCount", { count: activityJobCount })}</dt><dd>{activityJobCount}</dd></div><div><dt>{t("profileFlow.serviceHours")}</dt><dd>{user.workerProfile?.serviceHours === "24h" ? t("workerProfile.allDay") : t("workerProfile.standard")}</dd></div></dl>
    </section> : null}
    {editMode ? <>
      <div className="profile-edit-panels profile-mobile-editing">{error ? <div className="form-error portal-message">{error}</div> : null}</div>
      <div className="profile-grid profile-edit-panels profile-mobile-editing profile-edit-single">
        {editingProfile ? <form className="portal-form-card" onSubmit={saveProfile}><div className="card-header-plain"><h2>{t("profile.edit")}</h2></div><label className="profile-photo-picker"><span className="profile-photo-preview">{photoPreview ? <img src={photoPreview} alt=""/> : initials}</span><input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploadingPhoto || saving}/><strong>{uploadingPhoto ? t("common.loading") : t("profile.changePhoto")}</strong></label><div className="form-grid"><label><span>{t("profileFlow.firstName")}</span><input name="firstName" required defaultValue={user.firstName}/></label><label><span>{t("profileFlow.lastName")}</span><input name="lastName" required defaultValue={user.lastName}/></label><label><span>{t("profile.phoneLabel")}</span><input name="phone" defaultValue={user.phone}/></label><label><span>{t("profileFlow.email")}</span><input value={user.email} readOnly disabled/></label></div><div className="portal-form-actions"><button className="button button-primary" disabled={saving || uploadingPhoto}>{t("profile.saveProfile")}</button></div></form> : null}
        {editingServices ? <form className="portal-form-card category-picker-form" onSubmit={saveWorker}><div className="card-header-plain"><h2>{t("profileFlow.chooseUpToCategories", { count: 5 })}</h2><p>{t("profileFlow.selectedCategories", { selected: selected.length, count: 5 })}</p></div><div className="category-check-grid">{categories.map((category) => { const isSelected = selected.includes(category._id); return <button type="button" key={category._id} className={isSelected ? "selected" : ""} aria-pressed={isSelected} onClick={() => toggle(category._id)}><CategoryIcon slug={category.slug}/><strong>{localizedName(category, locale)}</strong></button>; })}</div><div className="portal-form-actions"><button className="button button-primary" disabled={saving}>{t("common.save")}</button></div></form> : null}
        {editingNotifications ? <form className="portal-form-card profile-notification-form" onSubmit={saveNotifications}><div className="card-header-plain"><h2>{t("notificationPreferences.pushTitle")}</h2></div>{(["newApplicant", "newMessage"] as const).map((field) => <fieldset key={field} className="notification-choice-row"><legend>{t(`notificationPreferences.fields.${field}`)}</legend><label><input type="radio" name={field} checked={notificationDraft[field]} onChange={() => setNotificationDraft((current) => ({ ...current, [field]: true }))}/><span>{t("notificationPreferences.on")}</span></label><label><input type="radio" name={field} checked={!notificationDraft[field]} onChange={() => setNotificationDraft((current) => ({ ...current, [field]: false }))}/><span>{t("notificationPreferences.off")}</span></label></fieldset>)}<div className="portal-form-actions"><button className="button button-primary" disabled={saving}>{t("common.save")}</button></div></form> : null}
      </div>
    </> : null}
  </>;
}
