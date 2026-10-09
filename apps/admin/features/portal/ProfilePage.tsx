"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { Category, Job, PortalUser } from "@/lib/portal-types";
import { localizedName } from "@/lib/portal-types";

export function ProfilePage({ initialUser }: { initialUser: PortalUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobileEditMode = searchParams.get("section") === "edit" || searchParams.get("section") === "worker";
  const [user, setUser] = useState(initialUser);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>(initialUser.workerProfile?.categories ?? []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>("categories").then((data) => setCategories(data.categories)).catch(() => undefined);
    Promise.all([apiFetch<{ jobs: Job[] }>("jobs/mine/posted"), apiFetch<{ jobs: Job[] }>("jobs/mine/assigned")]).then(([posted, assigned]) => {
      const unique = new Map([...posted.jobs, ...assigned.jobs].map((job) => [job._id, job]));
      setRecentJobs([...unique.values()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 2));
    }).catch(() => undefined);
  }, []);
  async function refreshSession() { const response = await fetch("/api/session/me", { cache: "no-store" }); if (response.ok) { const data = await response.json() as { user: PortalUser }; setUser(data.user); } router.refresh(); }
  async function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); setMessage(""); const form = new FormData(event.currentTarget); try { await apiFetch("auth/profile", { method: "POST", body: JSON.stringify({ firstName: form.get("firstName"), lastName: form.get("lastName"), phone: form.get("phone") || undefined, photoUrl: form.get("photoUrl") || undefined }) }); await refreshSession(); setMessage("Profile updated."); } catch (value) { setError(value instanceof Error ? value.message : "Could not update your profile."); } finally { setSaving(false); } }
  async function saveWorker(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected.length) { setError("Choose at least one category."); return; } setSaving(true); setError(""); setMessage(""); const form = new FormData(event.currentTarget); try { await apiFetch("auth/worker-profile", { method: "POST", body: JSON.stringify({ categories: selected, serviceHours: form.get("serviceHours") }) }); await refreshSession(); setMessage("Worker profile updated. You can now apply for jobs."); } catch (value) { setError(value instanceof Error ? value.message : "Could not update your worker profile."); } finally { setSaving(false); } }
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 5 ? [...current, id] : current); }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Complete your profile";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const selectedCategories = categories.filter((category) => selected.includes(category._id) || selected.includes(category.slug));

  return <>
    <section className="portal-title-row profile-desktop-title"><div><span className="eyebrow">Your account</span><h1>Profile and settings</h1><p>Manage personal details and worker preferences from one place.</p></div></section>
    {mobileEditMode ? <Link className="mobile-profile-edit-back" href="/portal/profile">‹ Back to profile</Link> : null}
    <section className={`mobile-profile-view ${mobileEditMode ? "mobile-profile-view-hidden" : ""}`}>
      <div className="mobile-profile-settings"><Link href="/portal/settings" aria-label="Open settings">⚙</Link></div>
      <div className="mobile-profile-portrait">{user.photoUrl ? <img src={user.photoUrl} alt=""/> : initials}</div>
      <div className="mobile-profile-summary">
        <div><h1>{displayName}</h1><strong>Categories</strong><div className="mobile-profile-categories">{selectedCategories.length ? selectedCategories.map((category) => <span key={category._id} title={localizedName(category, user.locale)}>{category.imageUrl ? <img src={category.imageUrl} alt=""/> : localizedName(category, user.locale).slice(0, 1)}</span>) : <small>No categories selected</small>}</div></div>
        <div><h2>☆ {(user.rating?.average ?? 0).toFixed(1)}/5</h2><p>{user.rating?.count ?? 0} reviews</p><p>{user.workerProfile?.completedJobsCount ?? 0} completed jobs</p><p>BOB member</p></div>
      </div>
      <div className="mobile-profile-divider"/><h2 className="mobile-profile-activity-title">Recent activity</h2>
      <div className="mobile-profile-activity">{recentJobs.length ? recentJobs.map((job) => <Link href={`/portal/jobs/${job._id}`} key={job._id} className="mobile-recent-job">{job.media[0]?.type === "photo" ? <img src={job.media[0].url} alt=""/> : null}<div><strong>{job.title}</strong><small>{localizedName(job.categoryId, user.locale)}</small><small>Scheduled {new Date(job.date).toLocaleDateString()}</small></div><span className="status-pill neutral">{job.status.replace("_", " ")}</span><b>›</b></Link>) : <p className="portal-empty-copy">No recent activity yet.</p>}</div>
      <div className="mobile-profile-actions"><Link className="button button-secondary" href="/portal/profile?section=edit">Edit profile</Link><Link className="button button-primary" href="/portal/profile?section=worker">Worker preferences</Link></div>
    </section>
    <section className="profile-overview profile-desktop-only">
      <div className="profile-photo">{user.photoUrl ? <img src={user.photoUrl} alt=""/> : initials}</div>
      <div className="profile-overview-copy"><h2>{displayName}</h2><p>{user.email}</p><div className="profile-badges"><span>{user.workerProfile ? "Customer & worker" : "Customer"}</span><span>{user.subscriptionTier ?? "free"} plan</span></div></div>
      <dl><div><dt>Rating</dt><dd>{user.rating?.average?.toFixed(1) ?? "—"}</dd></div><div><dt>Completed jobs</dt><dd>{user.workerProfile?.completedJobsCount ?? 0}</dd></div><div><dt>Service hours</dt><dd>{user.workerProfile?.serviceHours === "24h" ? "24 hours" : "Standard"}</dd></div></dl>
    </section>
    <div className={`profile-edit-panels ${mobileEditMode ? "profile-mobile-editing" : ""}`}>{message ? <div className="portal-success">{message}</div> : null}{error ? <div className="form-error portal-message">{error}</div> : null}</div>
    <div className={`profile-grid profile-edit-panels ${mobileEditMode ? "profile-mobile-editing" : ""}`}>
      <form className="portal-form-card" onSubmit={saveProfile}><div className="card-header-plain"><h2>Personal details</h2><p>Used across both the mobile app and website.</p></div><div className="form-grid"><label><span>First name</span><input name="firstName" required defaultValue={user.firstName}/></label><label><span>Last name</span><input name="lastName" required defaultValue={user.lastName}/></label><label><span>Phone</span><input name="phone" defaultValue={user.phone}/></label><label><span>Profile photo URL</span><input name="photoUrl" type="url" defaultValue={user.photoUrl}/></label></div><div className="portal-form-actions"><button className="button button-primary" disabled={saving}>Save profile</button></div></form>
      <form className="portal-form-card" onSubmit={saveWorker}><div className="card-header-plain"><h2>{user.workerProfile ? "Worker preferences" : "Become a worker"}</h2><p>Choose up to five services you can provide.</p></div><div className="category-check-grid">{categories.map((category) => <label key={category._id} className={selected.includes(category._id) ? "selected" : ""}><input type="checkbox" checked={selected.includes(category._id)} onChange={() => toggle(category._id)}/><span>{localizedName(category, user.locale)}</span></label>)}</div><label><span>Service hours</span><select name="serviceHours" defaultValue={user.workerProfile?.serviceHours ?? "standard"}><option value="standard">Standard hours</option><option value="24h">24-hour availability</option></select></label><div className="portal-form-actions"><button className="button button-primary" disabled={saving}>{user.workerProfile ? "Update preferences" : "Create worker profile"}</button></div></form>
    </div>
  </>;
}
