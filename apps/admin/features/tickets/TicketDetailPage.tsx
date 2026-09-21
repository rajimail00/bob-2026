"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ErrorState, formatDate, formatName, LoadingState, StatusPill } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import type { AdminUser, AuditEntry, Page, Ticket, TicketPriority, TicketStatus } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";

export function TicketDetailPage({ id }: { id: string }) {
  const query = useRemoteData<{ ticket: Ticket; audits: AuditEntry[] }>(`admin/tickets/${id}`);
  const admins = useRemoteData<Page<AdminUser>>("admin/users?page=1&pageSize=50&type=admin&status=active&sort=name_asc");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  useEffect(() => { setResolutionNote(query.data?.ticket.resolutionNote ?? ""); }, [query.data?.ticket.resolutionNote]);
  if (query.loading) return <LoadingState label="Loading ticket…" />;
  if (query.error) return <ErrorState message={query.error} retry={query.reload} />;
  if (!query.data) return null;
  const { ticket, audits } = query.data;

  async function update(input: { status?: TicketStatus; priority?: TicketPriority; assignedAdminId?: string | null; resolutionNote?: string }) {
    setBusy(true);
    try { await apiFetch(`admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify(input) }); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to update this ticket."); }
    finally { setBusy(false); }
  }
  async function send(event: FormEvent, kind: "reply" | "note") {
    event.preventDefault();
    const text = kind === "reply" ? reply.trim() : note.trim();
    if (!text) return;
    setBusy(true);
    try { await apiFetch(`admin/tickets/${id}/${kind === "reply" ? "replies" : "notes"}`, { method: "POST", body: JSON.stringify(kind === "reply" ? { message: text } : { note: text }) }); kind === "reply" ? setReply("") : setNote(""); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : `Unable to add this ${kind}.`); }
    finally { setBusy(false); }
  }

  return <div className="section-stack">
    <div><Link href="/support-tickets" className="back-link"><Icon name="chevron" size={16} />Back to support tickets</Link><div className="page-intro"><div><h2>{ticket.reason.replaceAll("_"," ")}</h2><p>Reported by {formatName(ticket.reporterId)} · {formatDate(ticket.createdAt, true)}</p></div><div className="toolbar-actions"><StatusPill value={ticket.status} /><StatusPill value={ticket.priority} /></div></div></div>
    <div className="detail-grid"><section className="card"><div className="card-header"><h3>Ticket details</h3></div><div className="card-body"><dl className="detail-list"><div className="detail-item"><dt>Reporter</dt><dd>{formatName(ticket.reporterId)}<br/><small>{ticket.reporterId?.email}</small></dd></div><div className="detail-item"><dt>Related job</dt><dd>{ticket.jobId ? <Link className="link-action" href={`/jobs/${ticket.jobId._id}`}>{ticket.jobId.title}</Link> : "—"}</dd></div><div className="detail-item"><dt>Assigned admin</dt><dd>{formatName(ticket.assignedAdminId)}</dd></div><div className="detail-item"><dt>Last updated</dt><dd>{formatDate(ticket.updatedAt, true)}</dd></div><div className="detail-item" style={{ gridColumn: "1/-1" }}><dt>Description</dt><dd>{ticket.note || "No description supplied."}</dd></div>{ticket.resolutionNote ? <div className="detail-item" style={{ gridColumn: "1/-1" }}><dt>Resolution note</dt><dd>{ticket.resolutionNote}</dd></div> : null}</dl></div></section>
    <section className="card"><div className="card-header"><h3>Update ticket</h3></div><div className="card-body form-grid"><label><span>Status</span><select value={ticket.status} disabled={busy} onChange={(event) => update({ status: event.target.value as TicketStatus })}>{["open","in_progress","resolved","closed"].map((value) => <option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label><label><span>Priority</span><select value={ticket.priority} disabled={busy} onChange={(event) => update({ priority: event.target.value as TicketPriority })}>{["low","normal","high","urgent"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="full"><span>Assigned administrator</span><select value={ticket.assignedAdminId?._id ?? ""} disabled={busy || admins.loading} onChange={(event) => update({ assignedAdminId: event.target.value || null })}><option value="">Unassigned</option>{admins.data?.items.map((admin) => <option key={admin._id || admin.id} value={admin._id || admin.id}>{formatName(admin)} · {admin.email}</option>)}</select></label><label className="full"><span>Resolution note</span><textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} maxLength={2000} placeholder="Explain how the issue was resolved…" /></label><div className="full"><button className="button button-primary" disabled={busy || resolutionNote === (ticket.resolutionNote ?? "")} onClick={() => update({ resolutionNote })}>Save resolution note</button></div></div></section></div>
    <div className="detail-grid"><section className="card"><div className="card-header"><h3>Conversation</h3></div><div className="card-body conversation">{ticket.replies.length ? ticket.replies.map((item) => <div className={`message ${item.authorRole === "admin" ? "admin" : ""}`} key={item._id}><p>{item.message}</p><small>{item.authorRole === "admin" ? "Administrator" : formatName(item.authorId)} · {formatDate(item.createdAt, true)}</small></div>) : <p className="empty-compact">No replies yet.</p>}<form onSubmit={(event) => send(event,"reply")}><label><span>Reply to user</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} placeholder="Write a helpful response…" /></label><button className="button button-primary" disabled={busy || !reply.trim()}>Send reply</button></form></div></section>
    <section className="card"><div className="card-header"><h3>Internal notes</h3></div><div className="card-body conversation">{ticket.internalNotes.length ? ticket.internalNotes.map((item) => <div className="message" key={item._id}><p>{item.note}</p><small>{formatName(item.adminId)} · {formatDate(item.createdAt, true)}</small></div>) : <p className="empty-compact">No internal notes yet.</p>}<form onSubmit={(event) => send(event,"note")}><label><span>Private note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Visible to administrators only…" /></label><button className="button button-secondary" disabled={busy || !note.trim()}>Add note</button></form></div></section></div>
    <section className="card"><div className="card-header"><h3>Audit trail</h3></div><div className="card-body timeline">{audits.length ? audits.map((audit) => <div className="timeline-item" key={audit._id}><strong>{audit.action.replaceAll("_"," ")}</strong><small>{formatDate(audit.createdAt, true)}</small></div>) : <p className="empty-compact">No audit activity recorded.</p>}</div></section>
  </div>;
}
