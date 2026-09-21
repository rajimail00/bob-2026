"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch, queryString } from "@/lib/api-client";
import type { AdminJob, ModerationStatus, Page } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";
import { EmptyState, ErrorState, formatCurrency, formatDate, formatName, LoadingState, PageIntro, Pagination, SearchField, StatusPill } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function JobsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [moderation, setModeration] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const path = useMemo(() => `admin/jobs${queryString({ page, pageSize: 20, search, status, moderationStatus: moderation, sort })}`, [page, search, status, moderation, sort]);
  const query = useRemoteData<Page<AdminJob>>(path);
  function filter(change: () => void) { setPage(1); setSelected([]); change(); }
  function toggle(id: string) { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }

  async function bulkModerate(next: ModerationStatus) {
    if (!selected.length) return;
    const reason = ["rejected", "suspended"].includes(next) ? window.prompt(`Reason for marking ${selected.length} jobs as ${next}:`) ?? undefined : undefined;
    if (["rejected", "suspended"].includes(next) && !reason) return;
    if (!window.confirm(`Set ${selected.length} selected jobs to ${next}?`)) return;
    setBusy(true);
    try { await apiFetch("admin/jobs/bulk-moderation", { method: "POST", body: JSON.stringify({ jobIds: selected, status: next, reason }) }); setSelected([]); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Bulk moderation failed."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageIntro title="Job Management" description="Review listings, moderate content, and inspect job activity." />
      <div className="toolbar">
        <SearchField value={search} onChange={(value) => filter(() => setSearch(value))} placeholder="Search jobs" />
        <select value={status} onChange={(event) => filter(() => setStatus(event.target.value))} aria-label="Job status"><option value="">All job statuses</option>{["draft","active","offer_pending","assigned","completed","cancelled","expired"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
        <select value={moderation} onChange={(event) => filter(() => setModeration(event.target.value))} aria-label="Moderation status"><option value="">All moderation</option>{["pending","approved","rejected","suspended"].map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={sort} onChange={(event) => filter(() => setSort(event.target.value))} aria-label="Sort jobs"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="scheduled_asc">Schedule ascending</option><option value="scheduled_desc">Schedule descending</option></select>
        {selected.length ? <div className="toolbar-actions"><button className="button button-primary button-small" disabled={busy} onClick={() => bulkModerate("approved")}>Approve ({selected.length})</button><button className="button button-danger button-small" disabled={busy} onClick={() => bulkModerate("rejected")}>Reject</button><button className="button button-secondary button-small" disabled={busy} onClick={() => bulkModerate("suspended")}>Suspend</button></div> : null}
      </div>
      <section className="card">
        {query.loading ? <LoadingState label="Loading jobs…" /> : query.error ? <ErrorState message={query.error} retry={query.reload} /> : !query.data?.items.length ? <EmptyState title="No jobs found" detail="Try changing the current search or filters." /> : <><div className="table-wrap"><table className="data-table"><thead><tr><th className="check-cell"><input className="row-checkbox" type="checkbox" aria-label="Select this page" checked={query.data.items.every((job) => selected.includes(job._id))} onChange={(event) => setSelected(event.target.checked ? query.data!.items.map((job) => job._id) : [])} /></th><th>Job</th><th>Client</th><th>Status</th><th>Moderation</th><th>Budget</th><th>Scheduled</th><th /></tr></thead><tbody>{query.data.items.map((job) => <tr key={job._id}><td><input className="row-checkbox" type="checkbox" aria-label={`Select ${job.title}`} checked={selected.includes(job._id)} onChange={() => toggle(job._id)} /></td><td><div className="table-primary"><strong>{job.title}{job.isEmergency ? " · Emergency" : ""}</strong><small className="truncate">{job.address}</small></div></td><td>{formatName(job.clientId)}</td><td><StatusPill value={job.status} /></td><td><StatusPill value={job.moderationStatus} /></td><td>{formatCurrency(job.budget)}</td><td>{formatDate(job.date, true)}</td><td><Link className="link-action" href={`/jobs/${job._id}`}>View <Icon name="chevron" size={15} /></Link></td></tr>)}</tbody></table></div><Pagination page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(value) => { setPage(value); setSelected([]); }} /></>}
      </section>
    </>
  );
}
