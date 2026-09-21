"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, formatDate, LoadingState, PageIntro, Pagination, SearchField, StatusPill } from "@/components/ui";
import { apiFetch, queryString } from "@/lib/api-client";
import type { Advertisement, AdvertisementMedia, Page } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";

interface AdvertisementDraft { title: string; description: string; destinationUrl: string; audience: "all" | "free"; startsAt: string; endsAt: string; priority: number; media?: AdvertisementMedia }
function localDate(value: Date | string) { const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0,16); }
function initialDraft(): AdvertisementDraft { const start = new Date(); const end = new Date(start); end.setDate(end.getDate() + 7); return { title: "", description: "", destinationUrl: "", audience: "all", startsAt: localDate(start), endsAt: localDate(end), priority: 50 }; }

export function AdvertisementsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Advertisement | "new" | null>(null);
  const [draft, setDraft] = useState<AdvertisementDraft>(initialDraft());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const path = useMemo(() => `admin/advertisements${queryString({ page, pageSize: 20, search, status })}`, [page, search, status]);
  const query = useRemoteData<Page<Advertisement>>(path);

  function open(item?: Advertisement) {
    setEditing(item ?? "new");
    setDraft(item ? { title: item.title, description: item.description ?? "", destinationUrl: item.destinationUrl ?? "", audience: item.audience, startsAt: localDate(item.startsAt ?? new Date()), endsAt: localDate(item.endsAt ?? new Date(Date.now() + 604800000)), priority: item.priority, media: item.media } : initialDraft());
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) { window.alert("Choose an image or video file."); return; }
    setUploading(true);
    try { const form = new FormData(); form.append("file", file); const result = await apiFetch<{ url: string; type: "photo" | "video" }>("media", { method: "POST", body: form }); setDraft((value) => ({ ...value, media: { url: result.url, type: result.type === "photo" ? "image" : "video", mimeType: file.type } })); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Media upload failed."); }
    finally { setUploading(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (new Date(draft.endsAt) <= new Date(draft.startsAt)) { window.alert("The end time must be after the start time."); return; }
    setBusy(true);
    const destinationUrl = draft.destinationUrl.trim();
    const body = { title: draft.title.trim() || "Advertisement", description: draft.description.trim() || undefined, ...(destinationUrl ? { destinationUrl } : editing === "new" ? {} : { destinationUrl: null }), placement: "home_list", audience: draft.audience, startsAt: new Date(draft.startsAt).toISOString(), endsAt: new Date(draft.endsAt).toISOString(), priority: Number(draft.priority), ...(draft.media ? { media: draft.media } : editing === "new" ? {} : { media: null }), ...(editing === "new" ? { status: "draft" } : {}) };
    try { if (editing === "new") await apiFetch("admin/advertisements", { method: "POST", body: JSON.stringify(body) }); else if (editing) await apiFetch(`admin/advertisements/${editing._id}`, { method: "PATCH", body: JSON.stringify(body) }); setEditing(null); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to save this advertisement."); }
    finally { setBusy(false); }
  }
  async function action(item: Advertisement, verb: "publish" | "pause" | "archive" | "delete") {
    if (!window.confirm(`${verb[0].toUpperCase()}${verb.slice(1)} “${item.title}”?`)) return;
    setBusy(true);
    try { await apiFetch(`admin/advertisements/${item._id}${verb === "delete" ? "" : `/${verb}`}`, { method: verb === "delete" ? "DELETE" : "POST" }); await query.reload(); }
    catch (error) { window.alert(error instanceof Error ? error.message : `Unable to ${verb} this advertisement.`); }
    finally { setBusy(false); }
  }

  return <>
    <PageIntro title="Advertisements" description="Create and schedule promotional media shown in the BOB mobile app." action={<button className="button button-primary" onClick={() => open()}><Icon name="plus" size={17} />Create advertisement</button>} />
    <div className="toolbar"><SearchField value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search advertisements" /><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Advertisement status"><option value="">All statuses</option>{["draft","scheduled","active","paused","expired","archived"].map((value) => <option value={value} key={value}>{value}</option>)}</select></div>
    <section className="card">{query.loading ? <LoadingState label="Loading advertisements…" /> : query.error ? <ErrorState message={query.error} retry={query.reload} /> : !query.data?.items.length ? <EmptyState title="No advertisements found" detail="Create the first advertisement or adjust the filters." /> : <><div className="table-wrap"><table className="data-table"><thead><tr><th>Advertisement</th><th>Audience</th><th>Status</th><th>Schedule</th><th>Priority</th><th /></tr></thead><tbody>{query.data.items.map((item) => <tr key={item._id}><td><div className="table-primary"><strong>{item.title}</strong><small>{item.media ? `${item.media.type} media` : "No media"}</small></div></td><td style={{ textTransform: "capitalize" }}>{item.audience}</td><td><StatusPill value={item.effectiveStatus ?? item.status} /></td><td><div className="table-primary"><strong>{formatDate(item.startsAt, true)}</strong><small>to {formatDate(item.endsAt, true)}</small></div></td><td>{item.priority}</td><td><div className="table-actions"><button className="button button-secondary button-small" onClick={() => open(item)}><Icon name="edit" size={14} />Edit</button>{item.status !== "active" && item.status !== "archived" ? <button className="button button-primary button-small" disabled={busy} onClick={() => action(item,"publish")}>Publish</button> : null}{item.status === "active" ? <button className="button button-secondary button-small" disabled={busy} onClick={() => action(item,"pause")}>Pause</button> : null}{item.status !== "archived" ? <button className="button button-secondary button-small" disabled={busy} onClick={() => action(item,"archive")}>Archive</button> : <button className="button button-danger button-small" disabled={busy} onClick={() => action(item,"delete")}><Icon name="trash" size={14} />Delete</button>}</div></td></tr>)}</tbody></table></div><Pagination page={query.data.page} pageSize={query.data.pageSize} total={query.data.total} onPage={setPage} /></>}</section>
    {editing ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><form className="modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="advertisement-modal-title"><div className="modal-header"><h3 id="advertisement-modal-title">{editing === "new" ? "Create advertisement" : "Edit advertisement"}</h3><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Close"><Icon name="close" /></button></div><div className="modal-body form-grid">
      <label className="full"><span>Internal title</span><input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} maxLength={120} required /></label>
      <label className="full"><span>Description (optional)</span><textarea value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} maxLength={500} /></label>
      <label className="full"><span>Destination HTTPS URL (optional)</span><input type="url" value={draft.destinationUrl} onChange={(event) => setDraft((value) => ({ ...value, destinationUrl: event.target.value }))} placeholder="https://" /></label>
      <label><span>Audience</span><select value={draft.audience} onChange={(event) => setDraft((value) => ({ ...value, audience: event.target.value as "all" | "free" }))}><option value="all">All users</option><option value="free">Free users</option></select></label>
      <label><span>Priority (0–100)</span><input type="number" min="0" max="100" value={draft.priority} onChange={(event) => setDraft((value) => ({ ...value, priority: Number(event.target.value) }))} required /></label>
      <label><span>Starts</span><input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft((value) => ({ ...value, startsAt: event.target.value }))} required /></label>
      <label><span>Ends</span><input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft((value) => ({ ...value, endsAt: event.target.value }))} required /></label>
      <label className="full"><span>Image or video</span><input type="file" accept="image/*,video/*" onChange={(event) => upload(event.target.files?.[0])} disabled={uploading} /><p className="form-help">{uploading ? "Uploading…" : "Upload one image or video up to 10 MB."}</p></label>
      {draft.media ? <div className="full inline-message">Media ready: {draft.media.type} · <a href={draft.media.url} target="_blank" rel="noreferrer">Open preview</a> <button type="button" className="text-button" onClick={() => setDraft((value) => ({ ...value, media: undefined }))}>Remove</button></div> : null}
    </div><div className="modal-footer"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" disabled={busy || uploading}>{busy ? "Saving…" : "Save advertisement"}</button></div></form></div> : null}
  </>;
}
