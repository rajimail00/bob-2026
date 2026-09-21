"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { AdminApplication, AdminJob, AuditEntry, ModerationStatus, Ticket } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";
import { ErrorState, formatCurrency, formatDate, formatName, LoadingState, StatusPill } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface JobDetail { job: AdminJob; related: { applications: AdminApplication[]; messageCount: number; tickets: Pick<Ticket, "_id" | "reason" | "status" | "priority" | "createdAt">[]; audits: AuditEntry[] } }

export function JobDetailPage({ id }: { id: string }) {
  const query = useRemoteData<JobDetail>(`admin/jobs/${id}`);
  const [busy, setBusy] = useState(false);
  if (query.loading) return <LoadingState label="Loading job details…" />;
  if (query.error) return <ErrorState message={query.error} retry={query.reload} />;
  if (!query.data) return null;
  const { job, related } = query.data;

  async function moderate(status: ModerationStatus) {
    const reason = ["rejected", "suspended"].includes(status) ? window.prompt(`Reason for ${status}:`) ?? undefined : undefined;
    if (["rejected", "suspended"].includes(status) && !reason) return;
    if (!window.confirm(`Change moderation status to ${status}?`)) return;
    setBusy(true);
    try { await apiFetch(`admin/jobs/${id}/moderation`, { method: "PATCH", body: JSON.stringify({ status, reason }) }); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to moderate this job."); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!window.confirm(`Cancel “${job.title}”? This affects the client and any assigned worker.`)) return;
    setBusy(true);
    try { await apiFetch(`admin/jobs/${id}/cancel`, { method: "POST" }); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to cancel this job."); }
    finally { setBusy(false); }
  }

  const history = [...(job.statusHistory ?? []).map((item) => ({ label: `${item.from} → ${item.to}`, date: item.createdAt })), ...(job.moderationHistory ?? []).map((item) => ({ label: `Moderation: ${item.from} → ${item.to}${item.reason ? ` · ${item.reason}` : ""}`, date: item.createdAt }))].sort((a,b) => +new Date(b.date) - +new Date(a.date));

  return <div className="section-stack">
    <div><Link href="/jobs" className="back-link"><Icon name="chevron" size={16} />Back to jobs</Link><div className="page-intro"><div><h2>{job.title}</h2><p>{job.address}</p></div><div className="toolbar-actions"><button className="button button-primary" disabled={busy} onClick={() => moderate("approved")}>Approve</button><button className="button button-secondary" disabled={busy} onClick={() => moderate("suspended")}>Suspend</button><button className="button button-danger" disabled={busy} onClick={cancel}>Cancel job</button></div></div></div>
    {job.media?.length ? <section className="card"><div className="card-body media-strip">{job.media.filter((item) => item.type === "photo").map((item) => <img key={item.url} src={item.url} alt="Job attachment" />)}</div></section> : null}
    <div className="detail-grid"><section className="card"><div className="card-header"><h3>Job information</h3><div className="toolbar-actions"><StatusPill value={job.status} /><StatusPill value={job.moderationStatus} /></div></div><div className="card-body"><dl className="detail-list"><div className="detail-item"><dt>Client</dt><dd>{formatName(job.clientId)}<br/><small>{job.clientId.email}</small></dd></div><div className="detail-item"><dt>Assigned worker</dt><dd>{formatName(job.assignedWorkerId)}</dd></div><div className="detail-item"><dt>Category</dt><dd>{job.categoryId?.name?.en ?? "—"}</dd></div><div className="detail-item"><dt>Budget</dt><dd>{formatCurrency(job.budget)}</dd></div><div className="detail-item"><dt>Scheduled</dt><dd>{formatDate(job.date, true)}</dd></div><div className="detail-item"><dt>People needed</dt><dd>{job.peopleNeeded}</dd></div><div className="detail-item"><dt>Emergency</dt><dd>{job.isEmergency ? "Yes" : "No"}</dd></div><div className="detail-item"><dt>Created</dt><dd>{formatDate(job.createdAt, true)}</dd></div><div className="detail-item" style={{ gridColumn: "1/-1" }}><dt>Description</dt><dd>{job.description}</dd></div></dl></div></section>
    <section className="card"><div className="card-header"><h3>Related activity</h3></div><div className="card-body"><div className="stat-mini-grid"><div className="stat-mini"><strong>{related.applications.length}</strong><span>Applications</span></div><div className="stat-mini"><strong>{related.messageCount}</strong><span>Messages</span></div><div className="stat-mini"><strong>{related.tickets.length}</strong><span>Reports</span></div></div></div></section></div>
    <section className="card"><div className="card-header"><h3>Moderation actions</h3></div><div className="card-body toolbar-actions" style={{ justifyContent: "flex-start" }}><button className="button button-primary" disabled={busy} onClick={() => moderate("approved")}>Approve / restore</button><button className="button button-danger" disabled={busy} onClick={() => moderate("rejected")}>Reject</button><button className="button button-secondary" disabled={busy} onClick={() => moderate("suspended")}>Suspend</button></div></section>
    <section className="card"><div className="card-header"><h3>Status and moderation history</h3></div><div className="card-body timeline">{history.length ? history.map((item, index) => <div className="timeline-item" key={`${item.date}-${index}`}><strong>{item.label.replaceAll("_", " ")}</strong><small>{formatDate(item.date, true)}</small></div>) : <p className="empty-compact">No history recorded.</p>}</div></section>
    {related.tickets.length ? <section className="card"><div className="card-header"><h3>Related support tickets</h3></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Reason</th><th>Status</th><th>Priority</th><th>Created</th><th /></tr></thead><tbody>{related.tickets.map((ticket) => <tr key={ticket._id}><td>{ticket.reason.replaceAll("_", " ")}</td><td><StatusPill value={ticket.status} /></td><td><StatusPill value={ticket.priority} /></td><td>{formatDate(ticket.createdAt, true)}</td><td><Link className="link-action" href={`/support-tickets/${ticket._id}`}>View <Icon name="chevron" size={15} /></Link></td></tr>)}</tbody></table></div></section> : null}
  </div>;
}
