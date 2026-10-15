"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function LogoutButton({ label = "Logout", loadingLabel = "Signing out…" }: { label?: string; loadingLabel?: string } = {}) {
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/login");
  }
  return <button className="sidebar-logout" onClick={logout} disabled={loading}><Icon name="logout" />{loading ? loadingLabel : label}</button>;
}
