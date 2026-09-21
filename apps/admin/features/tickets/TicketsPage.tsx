"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, formatDate, formatName, LoadingState, PageIntro, Pagination, SearchField, StatusPill } from "@/components/ui";
import { apiFetch, queryString } from "@/lib/api-client";
import type { Page, Ticket, TicketStatus } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";

export function TicketsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const path = useMemo(() => `admin/tickets${queryString({ page, pageSize: 20, search, status, priority, sort })}`, [page, search, status, priority, sort]);
  const query = useRemoteData<Page<Ticket>>(path);
  function filter(change: () => void) { setPage(1); setSelected([]); change(); }
  function toggle(id: string) { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }
  async function bulk(next: TicketStatus) {
    if (!selected.length || !window.confirm(`Set ${selected.length} selected tickets to ${next.replaceAll("_"," ")}?`)) return;
    setBusy(true);
    try { await apiFetch("admin/tickets/bulk-update", { method: "POST", body: JSON.stringify({ ticketIds: selected, status: next }) }); setSelected([]); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Bulk ticket update failed."); }
    finally { setBusy(false); }
  }
  return <>
    <PageIntro title="Support Tickets" description="Respond to reports, prioritize urgent cases, and track resolutions." />
    <div className="toolbar"><SearchField value={search} onChange={(value) => filter(() => setSearch(value))} placeholder="Search support tickets" /><select value={status} onChange={(event) => filter(() => setStatus(event.target.value))} aria-label="Ticket status"><option value="">All statuses</option>{["open","in_progress","resolved","closed"].map((value) => <option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select><select value={priority} onChange={(event) => filter(() => setPriority(event.target.value))} aria-label="Ticket priority"><option value="">All priorities</option>{["urgent","high","normal","low"].map((value) => <option key={value} value={value}>{value}</option>)}</select><select value={sort} onChange={(event) => filter(() => setSort(event.target.value))} aria-label="Sort tickets"><option value="newest">Newest first</option><option value="updated">Recently updated</option><option value="priority">Highest priority</option><option value="oldest">Oldest first</option></select>{selected.length ? <div className="toolbar-actions"><button className="button button-secondary button-small" disabled={busy} onClick={() => bulk("in_progress")}>Start ({selected.length})</button><button className="button button-primary button-small" disabled={busy} onClick={() => bulk("resolved")}>Resolve</button><button className="button button-secondary button-small" disabled={busy} onClick={() => bulk("closed")}>Close</button></div> : null}</div>
    <section className="card">{query.loading ? <LoadingState label="Loading support tickets…" /> : query.error ? <ErrorState message={query.error} retry={query.reload} /> : !query.data?.items.length ? <EmptyState title="No support tickets found" /> : <><div className="card-header"><div><h3>Tickets</h3><p>{query.data.unresolvedCount ?? 0} unresolved</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th className="check-cell"><input className="row-checkbox" type="checkbox" aria-label="Select this page" checked={query.data.items.every((item) => selected.includes(item._id))} onChange={(event) => setSelected(event.target.checked ? query.data!.items.map((item) => item._id) : [])} /></th><th>Reporter</th><th>Reason</th><th>Related job</th><th>Status</th><th>Priority</th><th>Updated</th><th /></tr></thead><tbody>{query.data.items.map((item) => <tr key={item._id}><td><input className="row-checkbox" type="checkbox" checked={selected.includes(item._id)} onChange={() => toggle(item._id)} aria-label={`Select ticket from ${formatName(item.reporterId)}`} /></td><td><div className="table-primary"><strong>{formatName(item.reporterId)}</strong><small>{item.reporterId?.email}</small></div></td><td style={{ textTransform: "capitalize" }}>{item.reason.replaceAll("_"," ")}</td><td className="truncate">{item.jobId?.title ?? "—"}</td><td><StatusPill value={item.status} /></td><td><StatusPill value={item.priority} /></td><td>{formatDate(item.updatedAt, true)}</td><td><Link className="link-action" href={`/support-tickets/${item._id}`}>View <Icon name="chevron" size={15} /></Link></td></tr>)}</tbody></table></div><Pagination page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(value) => { setPage(value); setSelected([]); }} /></>}</section>
  </>;
}
