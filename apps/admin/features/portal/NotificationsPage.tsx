"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { AppNotification, NotificationListResponse } from "@/lib/portal-types";
import { PortalState } from "@/components/portal/PortalState";

const icons: Record<string, string> = { new_application: "♙", offer_received: "◇", offer_accepted: "✓", offer_declined: "×", application_rejected: "−", job_cancelled: "⊘", job_completed: "✓", new_message: "✉", job_updated: "✎", job_expired: "◷", job_reposted: "↻" };
function label(type: string) { return type.split("_").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" "); }
function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;
  return new Date(value).toLocaleDateString();
}

export function NotificationsPage() {
  const router = useRouter();
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [error, setError] = useState("");
  async function load() { try { setData(await apiFetch<NotificationListResponse>("notifications?page=1&pageSize=50")); setError(""); } catch (value) { setError(value instanceof Error ? value.message : "Could not load notifications."); } }
  useEffect(() => { void load(); }, []);
  async function readAll() { await apiFetch("notifications/read-all", { method: "PATCH" }); await load(); }
  async function open(item: AppNotification) {
    if (!item.readAt) { try { await apiFetch(`notifications/${item._id}/read`, { method: "PATCH" }); } catch { /* navigation is still useful */ } }
    if (item.type === "new_message" && item.data.jobId && item.data.workerId) router.push(`/portal/messages/${item.data.jobId}/${item.data.workerId}`);
    else if (item.data.jobId) router.push(`/portal/jobs/${item.data.jobId}`);
    else await load();
  }
  return <>
    <section className="portal-title-row notifications-title"><div><span className="eyebrow">Updates</span><h1>Notifications</h1><p>Offers, applications, messages and job updates.</p></div>{data?.unreadCount ? <button className="button button-secondary" onClick={readAll}>Mark all as read</button> : null}</section>
    {error ? <PortalState error title="Notifications could not be loaded" message={error}/> : !data ? <PortalState title="Loading notifications…"/> : data.items.length === 0 ? <PortalState title="You are all caught up" message="New activity will appear here."/> : <div className="portal-notification-list">{data.items.map((item) => <button type="button" key={item._id} className={item.readAt ? "notification-row" : "notification-row unread"} onClick={() => void open(item)}><span className="notification-type-icon">{icons[item.type] ?? "•"}</span><span className="notification-copy"><strong>{label(item.type)}</strong><small>{relativeTime(item.createdAt)}</small></span>{!item.readAt ? <span className="notification-unread-dot"/> : null}<b>›</b></button>)}</div>}
  </>;
}
