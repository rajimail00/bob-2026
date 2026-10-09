"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { NotificationListResponse, PortalUser } from "@/lib/portal-types";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";
import { LogoutButton } from "./LogoutButton";

const items = [
  { href: "/portal/home", label: "Home", icon: "dashboard" as const },
  { href: "/portal/orders", label: "My jobs", icon: "jobs" as const },
  { href: "/portal/post-job", label: "Post a job", icon: "plus" as const },
  { href: "/portal/notifications", label: "Notifications", icon: "bell" as const },
  { href: "/portal/settings", label: "Settings", icon: "settings" as const },
  { href: "/portal/profile", label: "Profile", icon: "users" as const },
] as const;

const mobileItems = items.filter((item) => ["/portal/home", "/portal/orders", "/portal/post-job", "/portal/profile"].includes(item.href));

function mobileTitle(pathname: string) {
  if (pathname.endsWith("/edit")) return "Edit job";
  if (pathname.endsWith("/repost")) return "Repost job";
  if (pathname.startsWith("/portal/orders")) return "My jobs";
  if (pathname.startsWith("/portal/post-job")) return "Post a job";
  if (pathname.startsWith("/portal/profile")) return "Profile";
  if (pathname.startsWith("/portal/settings")) return "Settings";
  if (pathname.startsWith("/portal/notifications")) return "Notifications";
  if (pathname.startsWith("/portal/messages")) return "Messages";
  if (pathname.startsWith("/portal/jobs")) return "Job details";
  return "Home";
}

export function UserShell({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Complete your profile";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    apiFetch<NotificationListResponse>("notifications?page=1&pageSize=1")
      .then((data) => setUnreadCount(data.unreadCount))
      .catch(() => undefined);
  }, [pathname]);

  return (
    <div className="user-shell">
      <header className="user-header">
        <Link className="user-brand" href="/portal/home" aria-label="BOB home"><BrandLogo /></Link>
        <strong className="mobile-page-title">{mobileTitle(pathname)}</strong>
        <nav className="user-desktop-nav" aria-label="User portal">
          {items.slice(0, 5).map((item) => <Link key={item.href} className={pathname.startsWith(item.href) ? "active" : ""} href={item.href}><Icon name={item.icon} size={17}/><span>{item.label}</span></Link>)}
        </nav>
        <Link className="mobile-notification-link" href="/portal/notifications" aria-label={`${unreadCount} unread notifications`}>
          <Icon name="bell" size={22}/>{unreadCount > 0 ? <span>{Math.min(unreadCount, 99)}</span> : null}
        </Link>
        <details className="user-account-menu">
          <summary className="user-account"><span className="avatar">{user.photoUrl ? <img src={user.photoUrl} alt=""/> : initials}</span><span><strong>{name}</strong><small>{user.workerProfile ? "Customer & worker" : "Customer"}</small></span><span className="account-chevron">⌄</span></summary>
          <div className="account-popover"><div className="account-popover-head"><strong>{name}</strong><small>{user.email}</small></div><Link href="/portal/profile"><Icon name="users" size={17}/>Profile</Link><Link href="/portal/settings"><Icon name="settings" size={17}/>Settings</Link><LogoutButton /></div>
        </details>
      </header>
      <main className="user-content">{children}</main>
      <nav className="user-bottom-nav" aria-label="Mobile navigation">
        {mobileItems.map((item) => <Link key={item.href} className={pathname.startsWith(item.href) ? "active" : ""} href={item.href}><Icon name={item.icon} size={item.href === "/portal/post-job" ? 25 : 21}/><span>{item.label === "My jobs" ? "Orders" : item.label === "Post a job" ? "Post" : item.label}</span></Link>)}
      </nav>
    </div>
  );
}
