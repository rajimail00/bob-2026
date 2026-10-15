"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PortalState } from "@/components/portal/PortalState";
import { apiFetch } from "@/lib/api-client";
import { usePortalI18n } from "@/lib/portal-i18n";
import type { AppNotification, NotificationListResponse } from "@/lib/portal-types";

const icons: Record<string, string> = { new_application: "♙", offer_received: "◇", offer_accepted: "✓", offer_declined: "×", application_rejected: "−", job_cancelled: "⊘", job_completed: "✓", new_message: "✉", job_updated: "✎", job_expired: "◷", job_reposted: "↻" };

export function NotificationsPage() {
  const router = useRouter();
  const { t, date } = usePortalI18n();
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setData(await apiFetch<NotificationListResponse>("notifications?page=1&pageSize=50")); setError(""); }
    catch { setError(t("notifications.errorBody")); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  function relativeTime(value: string) {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 1) return t("notifications.time.now");
    if (minutes < 60) return t("notifications.time.minutes", { count: minutes });
    if (minutes < 1440) return t("notifications.time.hours", { count: Math.floor(minutes / 60) });
    if (minutes < 10080) return t("notifications.time.days", { count: Math.floor(minutes / 1440) });
    return date(value);
  }
  async function readAll() { await apiFetch("notifications/read-all", { method: "PATCH" }); await load(); }
  async function open(item: AppNotification) {
    if (!item.readAt) { try { await apiFetch(`notifications/${item._id}/read`, { method: "PATCH" }); } catch { /* Navigation is still useful. */ } }
    if (item.type === "new_message" && item.data.jobId && item.data.workerId) router.push(`/portal/messages/${item.data.jobId}/${item.data.workerId}`);
    else if (item.data.jobId) router.push(`/portal/jobs/${item.data.jobId}`);
    else await load();
  }

  return <>
    <section className="portal-title-row notifications-title"><div><span className="eyebrow">{t("notifications.title")}</span><h1>{t("notifications.title")}</h1><p>{t("notifications.emptyBody")}</p></div>{data?.unreadCount ? <button className="button button-secondary" onClick={readAll}>{t("notifications.markAllRead")}</button> : null}</section>
    {error ? <PortalState error title={t("notifications.errorTitle")} message={error}/> : !data ? <PortalState title={t("notifications.loading")}/> : data.items.length === 0 ? <PortalState title={t("notifications.emptyTitle")} message={t("notifications.emptyBody")}/> : <div className="portal-notification-list">{data.items.map((item) => { const message = t(`notifications.types.${item.type}`); return <button type="button" key={item._id} className={item.readAt ? "notification-row" : "notification-row unread"} onClick={() => void open(item)} aria-label={t("notifications.open", { message })}><span className="notification-type-icon">{icons[item.type] ?? "•"}</span><span className="notification-copy"><strong>{message}</strong><small>{relativeTime(item.createdAt)}</small></span>{!item.readAt ? <span className="notification-unread-dot"/> : null}<b>›</b></button>; })}</div>}
  </>;
}
