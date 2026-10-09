"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Job, JobApplication, MyApplication } from "@/lib/portal-types";
import { formatMoney, localizedName } from "@/lib/portal-types";
import { PortalState } from "@/components/portal/PortalState";

export function JobDetailsPage({ id, userId, canApply }: { id: string; userId: string; canApply: boolean }) {
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [myApplication, setMyApplication] = useState<MyApplication | null>(null);
  const [error, setError] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ job: Job }>(`jobs/${id}`);
      setJob(data.job);
      const clientId = typeof data.job.clientId === "object" ? data.job.clientId._id : data.job.clientId;
      if (clientId === userId) {
        const result = await apiFetch<{ applications: JobApplication[] }>(`jobs/${id}/applications`);
        setApplications(result.applications); setMyApplication(null);
      } else {
        const result = await apiFetch<{ applications: MyApplication[] }>("applications/mine");
        setMyApplication(result.applications.find((item) => item.jobId._id === id) ?? null); setApplications([]);
      }
      setError("");
    } catch (value) { setError(value instanceof Error ? value.message : "Could not load this job."); }
  }, [id, userId]);
  useEffect(() => { void load(); }, [load]);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(""); setSuccess("");
    try { await action(); setSuccess(done); await load(); }
    catch (value) { setError(value instanceof Error ? value.message : "The action could not be completed."); }
    finally { setBusy(false); }
  }
  async function apply(event: FormEvent) { event.preventDefault(); await run(() => apiFetch(`jobs/${id}/applications`, { method: "POST", body: JSON.stringify({ message: applicationMessage }) }), "Your application was sent."); setApplicationMessage(""); }
  async function transition(action: "cancel" | "complete") { if (!confirm(`Are you sure you want to ${action} this job?`)) return; await run(() => apiFetch(`jobs/${id}/${action}`, { method: "POST" }), `Job ${action === "complete" ? "completed" : "cancelled"}.`); }
  async function remove() { if (!job || !confirm(`Delete “${job.title}”? This cannot be undone.`)) return; setBusy(true); try { await apiFetch(`jobs/${id}`, { method: "DELETE" }); window.location.assign("/portal/orders"); } catch (value) { setError(value instanceof Error ? value.message : "Could not delete this job."); setBusy(false); } }
  async function offer(applicationId: string) { await run(() => apiFetch(`applications/${applicationId}/offer`, { method: "PATCH" }), "Offer sent to the worker."); }
  async function respond(accept: boolean) { if (!myApplication) return; await run(() => apiFetch(`applications/${myApplication._id}/respond`, { method: "PATCH", body: JSON.stringify({ accept }) }), accept ? "Offer accepted." : "Offer declined."); }
  async function submitReview(event: FormEvent) { event.preventDefault(); await run(() => apiFetch(`jobs/${id}/reviews`, { method: "POST", body: JSON.stringify({ stars, comment: review || undefined }) }), "Thank you. Your review was submitted."); setReview(""); }

  if (error && !job) return <PortalState error title="Job could not be loaded" message={error}/>;
  if (!job) return <PortalState title="Loading job…"/>;
  const clientId = typeof job.clientId === "object" ? job.clientId._id : job.clientId;
  const isOwner = clientId === userId;
  const isAssignedWorker = job.assignedWorkerId === userId;
  const owner = typeof job.clientId === "object" ? [job.clientId.firstName, job.clientId.lastName].filter(Boolean).join(" ") : "BOB customer";

  return <div className="portal-detail-page">
    <Link className="back-link" href="/portal/home">← Back to jobs</Link>
    {success ? <div className="portal-success">{success}</div> : null}{error ? <div className="form-error portal-message">{error}</div> : null}
    <div className="portal-detail-grid">
      <article className="portal-detail-card">
        {job.media.length ? <div className="portal-media">{job.media.map((media) => media.type === "photo" ? <img key={media.url} src={media.url} alt="Job attachment"/> : <video key={media.url} src={media.url} controls/>)}</div> : null}
        <div className="job-card-top"><span className="job-category">{localizedName(job.categoryId)}</span><span className={`status-pill ${job.status === "active" ? "success" : "neutral"}`}>{job.status.replace("_", " ")}</span></div>
        <h1>{job.title}</h1><p className="portal-lead">{job.description}</p>
        <dl className="portal-detail-facts desktop-job-detail-facts"><div><dt>Budget</dt><dd>{formatMoney(job.budget)}</dd></div><div><dt>Scheduled</dt><dd>{new Date(job.date).toLocaleString()}</dd></div><div><dt>Workers needed</dt><dd>{job.peopleNeeded}</dd></div><div><dt>Payment</dt><dd>{job.paymentPreference}</dd></div><div><dt>Recurrence</dt><dd>{job.recurrence}</dd></div><div><dt>Location</dt><dd>{job.address}</dd></div></dl>
        <section className="mobile-job-detail-facts" aria-label="Job details">
          <div className="mobile-detail-icon-row"><span><i>€</i><b>{formatMoney(job.budget)}</b></span><span><i>▣</i><b>{new Date(job.date).toLocaleDateString()}</b></span><span><i>♙</i><b>{job.peopleNeeded} {job.peopleNeeded === 1 ? "person" : "people"}</b></span></div>
          <p><i>⌖</i><span>{job.address}</span></p>
          <p className="mobile-detail-posted"><i>◷</i><span>Posted {new Date(job.createdAt).toLocaleDateString()}</span></p>
        </section>
        {isOwner && applications.length ? <section className="applicant-section"><h2>Applicants</h2>{applications.map((application) => <div className="applicant-row" key={application._id}><div className="applicant-identity"><span className="avatar">{application.workerId.photoUrl ? <img src={application.workerId.photoUrl} alt=""/> : (application.workerId.firstName?.[0] ?? "W")}</span><div><strong>{[application.workerId.firstName, application.workerId.lastName].filter(Boolean).join(" ") || "Worker"}</strong><p>{application.message}</p><small>{application.status}</small></div></div><div><Link className="button button-secondary button-small" href={`/portal/messages/${job._id}/${application.workerId._id}`}>Message</Link>{application.status === "pending" ? <button className="button button-primary button-small" disabled={busy} onClick={() => void offer(application._id)}>Send offer</button> : null}</div></div>)}</section> : null}
        {job.status === "completed" ? <form className="review-form" onSubmit={submitReview}><h2>Leave a review</h2><label><span>Rating</span><select value={stars} onChange={(event) => setStars(Number(event.target.value))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>)}</select></label><label><span>Comment</span><textarea value={review} onChange={(event) => setReview(event.target.value)} maxLength={1000}/></label><button className="button button-primary" disabled={busy}>Submit review</button></form> : null}
      </article>
      <aside className="portal-action-card"><h2>Posted by {owner || "BOB customer"}</h2>
        {isOwner ? <div className="owner-actions"><p>Manage this job and review applicants from this page.</p>{job.status === "active" ? <Link className="button button-secondary button-full" href={`/portal/jobs/${job._id}/edit`}>Edit job</Link> : null}{job.status === "active" ? <button className="button button-danger button-full" disabled={busy} onClick={() => void remove()}>Delete job</button> : null}{["offer_pending", "assigned"].includes(job.status) ? <button className="button button-danger button-full" disabled={busy} onClick={() => void transition("cancel")}>Cancel job</button> : null}{job.status === "assigned" ? <button className="button button-primary button-full" disabled={busy} onClick={() => void transition("complete")}>Mark completed</button> : null}{["completed", "cancelled", "expired"].includes(job.status) ? <Link className="button button-secondary button-full" href={`/portal/jobs/${job._id}/repost`}>Repost job</Link> : null}{job.assignedWorkerId ? <Link className="button button-secondary button-full" href={`/portal/messages/${job._id}/${job.assignedWorkerId}`}>Messages</Link> : null}</div>
        : job.status === "offer_pending" && myApplication?.status === "offered" ? <div className="offer-response"><h3>You received an offer</h3><p>Accept it to confirm this job, or decline it.</p><div><button className="button button-secondary" disabled={busy} onClick={() => void respond(false)}>Decline</button><button className="button button-primary" disabled={busy} onClick={() => void respond(true)}>Accept</button></div></div>
        : job.status === "active" && myApplication ? <p>Your application has already been sent.</p>
        : canApply && job.status === "active" ? <form onSubmit={apply}><label><span>Application message</span><textarea required minLength={3} value={applicationMessage} onChange={(event) => setApplicationMessage(event.target.value)} placeholder="Introduce yourself and explain how you can help."/></label><button className="button button-primary button-full" disabled={busy}>{busy ? "Sending…" : "Apply for this job"}</button></form>
        : !canApply && job.status === "active" ? <div><p>Create a worker profile before applying.</p><Link className="button button-primary button-full" href="/portal/profile">Set up worker profile</Link></div>
        : isAssignedWorker ? <div><p>This job is assigned to you.</p><Link className="button button-primary button-full" href={`/portal/messages/${job._id}/${userId}`}>Messages</Link></div>
        : <p>This job is not accepting applications.</p>}
      </aside>
    </div>
  </div>;
}
