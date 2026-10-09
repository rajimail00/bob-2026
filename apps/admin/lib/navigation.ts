export const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/users", label: "Manage Users", icon: "users" },
  { href: "/jobs", label: "Job Management", icon: "jobs" },
  { href: "/categories", label: "Categories", icon: "categories" },
  { href: "/advertisements", label: "Advertisements", icon: "advertisements" },
  { href: "/support-tickets", label: "Support Tickets", icon: "tickets" },
] as const;

export const mobileAdminItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/users", label: "Users", icon: "users" },
  { href: "/jobs", label: "Jobs", icon: "jobs" },
  { href: "/support-tickets", label: "Tickets", icon: "tickets" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function pageTitle(pathname: string) {
  if (pathname === "/notifications") return "Notifications";
  if (pathname.startsWith("/settings/faqs")) return "FAQs";
  if (pathname.startsWith("/settings/configuration")) return "Configuration";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "Settings";
  return sidebarItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "Admin Portal";
}

export function mobilePageTitle(pathname: string) {
  if (pathname.startsWith("/users/")) return "User details";
  if (pathname.startsWith("/jobs/")) return "Job details";
  if (pathname.startsWith("/support-tickets/")) return "Ticket details";
  return pageTitle(pathname);
}

export function notificationHref(targetType: string, targetId: string) {
  if (targetType === "job") return `/jobs/${targetId}`;
  if (targetType === "support_ticket") return `/support-tickets/${targetId}`;
  if (targetType === "user") return `/users/${targetId}`;
  if (targetType === "advertisement") return "/advertisements";
  return "/dashboard";
}
