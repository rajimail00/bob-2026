export const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/users", label: "Manage Users", icon: "users" },
  { href: "/jobs", label: "Job Management", icon: "jobs" },
  { href: "/categories", label: "Categories", icon: "categories" },
  { href: "/advertisements", label: "Advertisements", icon: "advertisements" },
  { href: "/support-tickets", label: "Support Tickets", icon: "tickets" },
] as const;

export function pageTitle(pathname: string) {
  return sidebarItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "Admin Portal";
}

export function notificationHref(targetType: string, targetId: string) {
  if (targetType === "job") return `/jobs/${targetId}`;
  if (targetType === "support_ticket") return `/support-tickets/${targetId}`;
  if (targetType === "user") return `/users/${targetId}`;
  if (targetType === "advertisement") return "/advertisements";
  return "/dashboard";
}
