"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AdminSessionUser } from "@/lib/types";
import { pageTitle, sidebarItems } from "@/lib/navigation";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";
import { LogoutButton } from "./LogoutButton";
import { NotificationCenter } from "./NotificationCenter";

export function AppShell({ user, children }: { user: AdminSessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Administrator";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="admin-shell">
      {mobileOpen ? <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand"><BrandLogo /><button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><Icon name="close" /></button></div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {sidebarItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setMobileOpen(false)}><Icon name={item.icon} /><span>{item.label}</span></Link>;
          })}
        </nav>
        <div className="sidebar-account">
          <div className="account-summary"><span className="avatar">{initials}</span><span><strong>{name}</strong><small>{user.email}</small></span></div>
          <LogoutButton />
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-title"><button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button><div><span>BOB Administration</span><h1>{pageTitle(pathname)}</h1></div></div>
          <div className="topbar-actions"><NotificationCenter /><div className="header-user"><span className="avatar avatar-small">{initials}</span><span><strong>{name}</strong><small>Administrator</small></span></div></div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
