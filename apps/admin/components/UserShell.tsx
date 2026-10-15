"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { NotificationListResponse, PortalUser } from "@/lib/portal-types";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";
import { LogoutButton } from "./LogoutButton";
import { usePortalI18n } from "@/lib/portal-i18n";

const items = [
  { href: "/portal/home", key: "navigation.home", icon: "dashboard" as const },
  { href: "/portal/orders", key: "navigation.orders", icon: "jobs" as const },
  { href: "/portal/post-job", key: "navigation.post", icon: "plus" as const },
  { href: "/portal/notifications", key: "notifications.title", icon: "bell" as const },
  { href: "/portal/settings", key: "profileFlow.settings", icon: "settings" as const },
  { href: "/portal/profile", key: "navigation.profile", icon: "users" as const },
] as const;

const mobileItems = items.filter((item) => ["/portal/home", "/portal/orders", "/portal/post-job", "/portal/profile"].includes(item.href));

function mobileTitle(pathname: string, t: (key: string) => string) {
  if (pathname.endsWith("/edit")) return t("jobEditing.title");
  if (pathname.endsWith("/repost")) return t("jobReposting.action");
  if (pathname.startsWith("/portal/orders")) return t("navigation.orders");
  if (pathname.startsWith("/portal/post-job")) return t("navigation.post");
  if (pathname.startsWith("/portal/profile")) return t("navigation.profile");
  if (pathname.startsWith("/portal/settings")) return t("profileFlow.settings");
  if (pathname.startsWith("/portal/notifications")) return t("notifications.title");
  if (pathname.startsWith("/portal/messages")) return t("chat.title");
  if (pathname.startsWith("/portal/jobs")) return t("admin.jobs.details");
  return t("navigation.home");
}

export function UserShell({ user, children }: { user: PortalUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = usePortalI18n();
  const [unreadCount, setUnreadCount] = useState(0);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Complete your profile";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    apiFetch<NotificationListResponse>("notifications?page=1&pageSize=1")
      .then((data) => setUnreadCount(data.unreadCount))
      .catch(() => undefined);
  }, [pathname]);

  async function deleteAccount() {
    if (!window.confirm(`${t("profile.deactivateTitle")}\n\n${t("profile.deactivateBody")}`)) return;
    setDeletingAccount(true);
    try {
      await apiFetch("auth/account", { method: "DELETE" });
      await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
      window.location.replace("/login");
    } catch (value) {
      window.alert(value instanceof Error ? value.message : t("profile.deleteError"));
      setDeletingAccount(false);
    }
  }

  return (
    <div className="user-shell">
      <header className="user-header">
        <Link className="user-brand" href="/portal/home" aria-label="BOB home"><BrandLogo /></Link>
        <strong className="mobile-page-title">{mobileTitle(pathname, t)}</strong>
        <nav className="user-desktop-nav" aria-label="User portal">
          {items.slice(0, 5).map((item) => <Link key={item.href} className={pathname.startsWith(item.href) ? "active" : ""} href={item.href}><Icon name={item.icon} size={17}/><span>{t(item.key)}</span></Link>)}
        </nav>
        <Link className="mobile-notification-link" href="/portal/notifications" aria-label={`${unreadCount} unread notifications`}>
          <Icon name="bell" size={22}/>{unreadCount > 0 ? <span>{Math.min(unreadCount, 99)}</span> : null}
        </Link>
        <details className="user-account-menu">
          <summary className="user-account"><span className="avatar">{user.photoUrl ? <img src={user.photoUrl} alt=""/> : initials}</span><span><strong>{name}</strong><small>{user.email}</small></span><span className="account-chevron">⌄</span></summary>
          <div className="account-popover"><div className="account-popover-head"><strong>{name}</strong><small>{user.email}</small></div><LogoutButton label={t("common.logout")} loadingLabel={t("common.loading")} /><div className="account-menu-divider"/><button className="account-delete-button" type="button" onClick={() => void deleteAccount()} disabled={deletingAccount}><span aria-hidden="true">⊘</span>{deletingAccount ? t("common.loading") : t("profile.deactivateTitle")}</button></div>
        </details>
      </header>
      <main className="user-content">{children}</main>
      <nav className="user-bottom-nav" aria-label="Mobile navigation">
        {mobileItems.map((item) => <Link key={item.href} className={pathname.startsWith(item.href) ? "active" : ""} href={item.href}><Icon name={item.icon} size={item.href === "/portal/post-job" ? 25 : 21}/><span>{t(item.key)}</span></Link>)}
      </nav>
    </div>
  );
}
