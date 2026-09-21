"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch, queryString } from "@/lib/api-client";
import type { AdminUser, Page } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";
import { EmptyState, ErrorState, formatDate, formatName, LoadingState, PageIntro, Pagination, SearchField, StatusPill } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const path = useMemo(() => `admin/users${queryString({ page, pageSize: 20, search, type, status, sort })}`, [page, search, type, status, sort]);
  const query = useRemoteData<Page<AdminUser>>(path);
  const eligibleOnPage = query.data?.items.filter((item) => item.role !== "admin").map(idFor) ?? [];

  function setFilter(update: () => void) { setPage(1); setSelected([]); update(); }
  function idFor(user: AdminUser) { return user._id || user.id; }
  function toggle(id: string) { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }

  async function updateStatus(id: string, nextStatus: "active" | "banned", name: string) {
    if (!window.confirm(`${nextStatus === "banned" ? "Ban" : "Reactivate"} ${name}?`)) return;
    setBusy(true);
    try { await apiFetch(`admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to update this user."); }
    finally { setBusy(false); }
  }

  async function bulkStatus(nextStatus: "active" | "banned") {
    if (!selected.length || !window.confirm(`${nextStatus === "banned" ? "Ban" : "Reactivate"} ${selected.length} selected users?`)) return;
    setBusy(true);
    try { await apiFetch("admin/users/bulk-status", { method: "POST", body: JSON.stringify({ userIds: selected, status: nextStatus }) }); setSelected([]); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Bulk action failed."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageIntro title="Manage Users" description="Search accounts, inspect activity, and control account access." />
      <div className="toolbar">
        <SearchField value={search} onChange={(value) => setFilter(() => setSearch(value))} placeholder="Search by name or email" />
        <select value={type} onChange={(event) => setFilter(() => setType(event.target.value))} aria-label="User type"><option value="">All user types</option><option value="client">Clients</option><option value="worker">Workers</option><option value="admin">Administrators</option></select>
        <select value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))} aria-label="Account status"><option value="">All statuses</option><option value="active">Active</option><option value="banned">Banned</option></select>
        <select value={sort} onChange={(event) => setFilter(() => setSort(event.target.value))} aria-label="Sort users"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option><option value="recent_activity">Recent activity</option></select>
        {selected.length ? <div className="toolbar-actions"><button className="button button-secondary button-small" disabled={busy} onClick={() => bulkStatus("active")}>Reactivate ({selected.length})</button><button className="button button-danger button-small" disabled={busy} onClick={() => bulkStatus("banned")}>Ban ({selected.length})</button></div> : null}
      </div>
      <section className="card">
        {query.loading ? <LoadingState label="Loading users…" /> : query.error ? <ErrorState message={query.error} retry={query.reload} /> : !query.data?.items.length ? <EmptyState title="No users found" detail="Try changing the current search or filters." /> : (
          <><div className="table-wrap"><table className="data-table"><thead><tr><th className="check-cell"><input className="row-checkbox" type="checkbox" aria-label="Select this page" checked={eligibleOnPage.length > 0 && eligibleOnPage.every((id) => selected.includes(id))} onChange={(event) => setSelected(event.target.checked ? eligibleOnPage : [])} /></th><th>User</th><th>Type</th><th>Status</th><th>Subscription</th><th>Registered</th><th aria-label="Actions" /></tr></thead><tbody>{query.data.items.map((user) => { const id = idFor(user); const name = formatName(user); return <tr key={id}><td><input className="row-checkbox" type="checkbox" aria-label={`Select ${name}`} checked={selected.includes(id)} disabled={user.role === "admin"} onChange={() => toggle(id)} /></td><td><div className="table-primary"><strong>{name}</strong><small>{user.email}</small></div></td><td><StatusPill value={user.role} /></td><td><StatusPill value={user.status} /></td><td style={{ textTransform: "capitalize" }}>{user.subscriptionTier}</td><td>{formatDate(user.createdAt)}</td><td><div className="table-actions"><button className={user.status === "active" ? "button button-danger button-small" : "button button-secondary button-small"} disabled={busy || user.role === "admin"} onClick={() => updateStatus(id, user.status === "active" ? "banned" : "active", name)}>{user.status === "active" ? "Ban" : "Reactivate"}</button><Link className="link-action" href={`/users/${id}`}>View <Icon name="chevron" size={15} /></Link></div></td></tr>; })}</tbody></table></div><Pagination page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={(value) => { setPage(value); setSelected([]); }} /></>
        )}
      </section>
    </>
  );
}
