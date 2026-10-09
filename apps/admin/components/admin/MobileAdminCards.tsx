"use client";

import Link from "next/link";
import type { AdminJob, AdminUser, Advertisement, Category, Page, Ticket } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { formatCurrency, formatDate, formatName, Pagination, StatusPill } from "@/components/ui";

function Avatar({ name, url }: { name: string; url?: string }) {
  return <span className="native-admin-avatar">{url ? <img src={url} alt="" /> : name.slice(0, 1).toUpperCase()}</span>;
}

export function MobileUsersCards({ data, selected, onToggle, onPage }: { data?: Page<AdminUser> | null; selected: string[]; onToggle: (id: string) => void; onPage: (page: number) => void }) {
  if (!data?.items.length) return null;
  return <section className="native-admin-list admin-mobile-only" aria-label="Users">
    {data.items.filter((user) => user.role !== "admin" && user.status !== "deleted").map((user) => { const id = user._id || user.id; const name = formatName(user); return <Link href={`/users/${id}`} className={`native-admin-card native-user-card ${selected.includes(id) ? "selected" : ""}`} key={id} onContextMenu={(event) => { event.preventDefault(); onToggle(id); }} title="Open user. Press and hold to select.">
      <Avatar name={name} url={user.photoUrl} />
      <span className="native-admin-copy"><strong>{name}</strong><small>{user.email}</small><small>{formatDate(user.createdAt)} · {user.workerProfile ? "Worker" : "Client"}</small></span>
      <StatusPill value={user.status} />
    </Link>; })}
    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={onPage} />
  </section>;
}

export function MobileJobsCards({ data, selected, onToggle, onPage }: { data?: Page<AdminJob> | null; selected: string[]; onToggle: (id: string) => void; onPage: (page: number) => void }) {
  if (!data?.items.length) return null;
  return <section className="native-admin-list admin-mobile-only" aria-label="Jobs">
    {data.items.map((job) => <Link href={`/jobs/${job._id}`} className={`native-admin-card native-job-card ${selected.includes(job._id) ? "selected" : ""}`} key={job._id} onContextMenu={(event) => { event.preventDefault(); onToggle(job._id); }} title="Open job. Press and hold to select.">
      <span className="native-admin-avatar">{job.media[0]?.type === "photo" ? <img src={job.media[0].url} alt="" /> : <Icon name="jobs" />}</span>
      <span className="native-admin-copy"><strong>{job.title}</strong><small>Created: {formatDate(job.createdAt)}</small><small>{job.categoryId?.name?.en ?? "Uncategorised"}</small></span>
      <span className="native-status-stack"><StatusPill value={job.status} /><StatusPill value={job.moderationStatus} /></span>
    </Link>)}
    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={onPage} />
  </section>;
}

export function MobileTicketsCards({ data, selected, onToggle, onPage }: { data?: Page<Ticket> | null; selected: string[]; onToggle: (id: string) => void; onPage: (page: number) => void }) {
  if (!data?.items.length) return null;
  return <section className="native-admin-list admin-mobile-only" aria-label="Support tickets">
    {data.items.map((ticket) => <Link href={`/support-tickets/${ticket._id}`} className={`native-admin-card native-ticket-card ${selected.includes(ticket._id) ? "selected" : ""}`} key={ticket._id} onContextMenu={(event) => { event.preventDefault(); onToggle(ticket._id); }} title="Open ticket. Press and hold to select.">
      <span className="native-admin-avatar"><Icon name="tickets" /></span>
      <span className="native-admin-copy"><strong>{ticket.reason.replaceAll("_", " ")}</strong><small>{formatName(ticket.reporterId)}</small><small>{ticket.note || ticket.jobId?.title || "No additional note"}</small><small>{formatDate(ticket.updatedAt, true)}</small></span>
      <span className="native-status-stack"><StatusPill value={ticket.status} /><StatusPill value={ticket.priority} /></span>
    </Link>)}
    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={onPage} />
  </section>;
}

export function MobileCategoryCards({ items, onCreate, onEdit, onDelete }: { items: Category[]; onCreate: () => void; onEdit: (item: Category) => void; onDelete: (item: Category) => void }) {
  return <section className="native-category-grid admin-mobile-only" aria-label="Existing categories"><button className="button button-primary native-mobile-create" onClick={onCreate}><Icon name="plus" />Add category</button>{items.map((item) => <article className="native-category-card" key={item._id}>
    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="native-category-placeholder"><Icon name="categories" size={34} /></span>}
    <strong>{item.name.en}</strong>
    <div><button onClick={() => onEdit(item)} aria-label={`Edit ${item.name.en}`}><Icon name="edit" /></button><button className="danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.name.en}`}><Icon name="trash" /></button></div>
  </article>)}</section>;
}

export function MobileAdvertisementCards({ data, busy, onCreate, onEdit, onAction, onPage }: { data?: Page<Advertisement> | null; busy: boolean; onCreate: () => void; onEdit: (item: Advertisement) => void; onAction: (item: Advertisement, verb: "publish" | "pause" | "archive" | "delete") => void; onPage: (page: number) => void }) {
  if (!data?.items.length) return null;
  return <section className="native-admin-list admin-mobile-only" aria-label="Advertisements"><button className="button button-primary native-mobile-create" onClick={onCreate}><Icon name="plus" />Create advertisement</button>{data.items.map((item) => <article className="native-ad-card" key={item._id}>
    <div className="native-ad-heading"><span className="native-ad-media">{item.media?.type === "image" ? <img src={item.media.url} alt="" /> : <Icon name="advertisements" size={28} />}</span><span className="native-admin-copy"><strong>{item.title}</strong><small>{item.media?.type ?? "No media"} · {item.audience} users</small><StatusPill value={item.effectiveStatus ?? item.status} /></span></div>
    <div className="native-ad-facts"><small>Starts: {formatDate(item.startsAt, true)}</small><small>Ends: {formatDate(item.endsAt, true)}</small><small>Home list · Priority {item.priority}</small></div>
    <div className="native-ad-actions"><button className="button button-secondary button-small" onClick={() => onEdit(item)}>Edit</button>{item.status !== "active" && item.status !== "archived" ? <button className="button button-primary button-small" disabled={busy} onClick={() => onAction(item, "publish")}>Publish</button> : null}{item.status === "active" ? <button className="button button-secondary button-small" disabled={busy} onClick={() => onAction(item, "pause")}>Pause</button> : null}<button className="button button-secondary button-small" disabled={busy} onClick={() => onAction(item, item.status === "archived" ? "delete" : "archive")}>{item.status === "archived" ? "Delete" : "Archive"}</button></div>
  </article>)}<Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={onPage} /></section>;
}
