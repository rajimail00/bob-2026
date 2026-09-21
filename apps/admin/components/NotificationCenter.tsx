"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { notificationHref } from "@/lib/navigation";
import type { AdminNotification, Page } from "@/lib/types";
import { Icon } from "./Icon";

const labels: Record<AdminNotification["type"], string> = {
  new_support_ticket: "New support ticket",
  urgent_ticket: "Urgent support ticket",
  reported_job: "Job reported",
  pending_job_moderation: "Job waiting for moderation",
  unusual_action: "Unusual administrator action",
};

export function NotificationCenter() {
  const [data, setData] = useState<Page<AdminNotification> | null>(null);
  const [open, setOpen] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const load = useCallback(() => apiFetch<Page<AdminNotification>>("admin/notifications?page=1&pageSize=8").then(setData).catch(() => undefined), []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    function close(event: MouseEvent) { if (!area.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function markAll() {
    await apiFetch("admin/notifications/read-all", { method: "PATCH" });
    await load();
  }
  async function openNotification(item: AdminNotification) {
    if (!item.readAt) {
      await apiFetch(`admin/notifications/${item._id}/read`, { method: "PATCH" }).catch(() => undefined);
      void load();
    }
    setOpen(false);
  }

  const unread = data?.unreadCount ?? 0;
  return (
    <div className="notification-area" ref={area}>
      <button className="icon-button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}>
        <Icon name="bell" />{unread ? <span className="notification-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="notification-popover">
          <div className="popover-header"><div><strong>Notifications</strong><span>{unread} unread</span></div>{unread ? <button className="text-button" onClick={markAll}>Mark all read</button> : null}</div>
          <div className="notification-list">
            {data?.items.length ? data.items.map((item) => (
              <Link key={item._id} href={notificationHref(item.targetType, item.targetId)} className={`notification-item ${item.readAt ? "" : "unread"}`} onClick={() => openNotification(item)}>
                <span className="notification-dot" /><span><strong>{labels[item.type]}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span>
              </Link>
            )) : <p className="empty-compact">No notifications yet.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
