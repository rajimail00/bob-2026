"use client";

import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { notificationHref } from "@/lib/navigation";
import type { AdminNotification, Page } from "@/lib/types";
import { useRemoteData } from "@/lib/use-remote-data";
import { EmptyState, ErrorState, formatDate, LoadingState, PageIntro } from "@/components/ui";

const labels: Record<AdminNotification["type"], string> = { new_support_ticket: "New support ticket", urgent_ticket: "Urgent support ticket", reported_job: "Job reported", pending_job_moderation: "Job waiting for moderation", unusual_action: "Unusual administrator action" };
export function AdminNotificationsPage() {
  const query = useRemoteData<Page<AdminNotification>>("admin/notifications?page=1&pageSize=50");
  async function markAll() { await apiFetch("admin/notifications/read-all", { method: "PATCH" }); await query.reload(); }
  async function mark(item: AdminNotification) { if (!item.readAt) { await apiFetch(`admin/notifications/${item._id}/read`, { method: "PATCH" }); void query.reload(); } }
  return <><PageIntro title="Notifications" description="Review recent administrative activity." />{(query.data?.unreadCount ?? 0) > 0 ? <button className="button button-secondary native-mark-all" onClick={markAll}>Mark all as read</button> : null}{query.loading ? <LoadingState /> : query.error ? <ErrorState message={query.error} retry={query.reload} /> : !query.data?.items.length ? <EmptyState title="No notifications yet" /> : <section className="native-notification-list">{query.data.items.map((item) => <Link href={notificationHref(item.targetType, item.targetId)} className={item.readAt ? "" : "unread"} key={item._id} onClick={() => mark(item)}><span /><strong>{labels[item.type]}</strong><small>{formatDate(item.createdAt, true)}</small></Link>)}</section>}</>;
}
