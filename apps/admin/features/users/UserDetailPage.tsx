"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch, queryString } from "@/lib/api-client";
import type { AdminJob, AdminUser, Page, UserStats } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";
import { EmptyState, ErrorState, formatDate, formatName, LoadingState, Pagination, StatusPill } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function UserDetailPage({ id }: { id: string }) {
  const detail = useRemoteData<{ user: AdminUser; stats: UserStats }>(`admin/users/${id}`);
  const [kind, setKind] = useState<"offered" | "taken">("offered");
  const [page, setPage] = useState(1);
  const jobs = useRemoteData<Page<AdminJob> & { summary: { offered: number; taken: number; active: number; completed: number } }>(`admin/users/${id}/jobs${queryString({ page, pageSize: 10, kind, sort: "newest" })}`);
  const [busy, setBusy] = useState(false);

  if (detail.loading) return <LoadingState label="Loading user details…" />;
  if (detail.error) return <ErrorState message={detail.error} retry={detail.reload} />;
  if (!detail.data) return null;
  const { user, stats } = detail.data;
  const name = formatName(user);

  async function changeStatus() {
    const status = user.status === "active" ? "banned" : "active";
    if (!window.confirm(`${status === "banned" ? "Ban" : "Reactivate"} ${name}?`)) return;
    setBusy(true);
    try { await apiFetch(`admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await detail.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to update this user."); }
    finally { setBusy(false); }
  }

  return (
    <div className="section-stack">
      <div><Link href="/users" className="back-link"><Icon name="chevron" size={16} />Back to users</Link><div className="page-intro"><div><h2>{name}</h2><p>{user.email}</p></div><button className={user.status === "active" ? "button button-danger" : "button button-primary"} disabled={busy || user.role === "admin"} onClick={changeStatus}>{user.status === "active" ? "Ban account" : "Reactivate account"}</button></div></div>
      <div className="detail-grid">
        <section className="card"><div className="card-header"><h3>Account details</h3><StatusPill value={user.status} /></div><div className="card-body"><dl className="detail-list"><div className="detail-item"><dt>Account type</dt><dd><StatusPill value={user.role} /></dd></div><div className="detail-item"><dt>Subscription</dt><dd style={{ textTransform: "capitalize" }}>{user.subscriptionTier}</dd></div><div className="detail-item"><dt>Phone</dt><dd>{user.phone || "—"}</dd></div><div className="detail-item"><dt>Language</dt><dd>{user.locale.toUpperCase()}</dd></div><div className="detail-item"><dt>Email verified</dt><dd>{user.isEmailVerified ? "Yes" : "No"}</dd></div><div className="detail-item"><dt>Registered</dt><dd>{formatDate(user.createdAt, true)}</dd></div><div className="detail-item"><dt>Rating</dt><dd>{user.rating?.average?.toFixed(1) ?? "0.0"} ({user.rating?.count ?? 0} reviews)</dd></div><div className="detail-item"><dt>Service hours</dt><dd>{user.workerProfile?.serviceHours ?? "Not a worker"}</dd></div><div className="detail-item" style={{ gridColumn: "1/-1" }}><dt>About</dt><dd>{user.bio || "No profile description provided."}</dd></div></dl></div></section>
        <section className="card"><div className="card-header"><h3>Account activity</h3></div><div className="card-body"><div className="stat-mini-grid"><div className="stat-mini"><strong>{stats.jobsPosted}</strong><span>Jobs posted</span></div><div className="stat-mini"><strong>{stats.jobsAssigned}</strong><span>Jobs assigned</span></div><div className="stat-mini"><strong>{stats.jobsCompleted}</strong><span>Completed</span></div><div className="stat-mini"><strong>{stats.applications}</strong><span>Applications</span></div><div className="stat-mini"><strong>{stats.reviews}</strong><span>Reviews</span></div><div className="stat-mini"><strong>{stats.tickets}</strong><span>Tickets</span></div></div></div></section>
      </div>
      <section className="card"><div className="card-header"><div><h3>User jobs</h3><p>Review jobs this user has offered or taken.</p></div><select value={kind} onChange={(event) => { setKind(event.target.value as "offered" | "taken"); setPage(1); }} aria-label="User job kind"><option value="offered">Jobs offered</option><option value="taken">Jobs taken</option></select></div>{jobs.loading ? <LoadingState /> : jobs.error ? <ErrorState message={jobs.error} retry={jobs.reload} /> : !jobs.data?.items.length ? <EmptyState title={`No ${kind} jobs`} /> : <><div className="table-wrap"><table className="data-table"><thead><tr><th>Job</th><th>Status</th><th>Moderation</th><th>Scheduled</th><th /></tr></thead><tbody>{jobs.data.items.map((job) => <tr key={job._id}><td><div className="table-primary"><strong>{job.title}</strong><small>{job.address}</small></div></td><td><StatusPill value={job.status} /></td><td><StatusPill value={job.moderationStatus} /></td><td>{formatDate(job.date, true)}</td><td><Link className="link-action" href={`/jobs/${job._id}`}>View <Icon name="chevron" size={15} /></Link></td></tr>)}</tbody></table></div><Pagination page={jobs.data.page} pageSize={jobs.data.pageSize} total={jobs.data.total} onPage={setPage} /></>}</section>
      <section className="card"><div className="card-header"><h3>Audit trail</h3></div><div className="card-body timeline">{stats.audits.length ? stats.audits.map((audit) => <div className="timeline-item" key={audit._id}><strong>{audit.action.replaceAll("_", " ")}</strong><small>{formatDate(audit.createdAt, true)}</small></div>) : <p className="empty-compact">No audit activity recorded for this account.</p>}</div></section>
    </div>
  );
}
