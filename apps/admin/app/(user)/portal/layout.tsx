import { redirect } from "next/navigation";
import { UserShell } from "@/components/UserShell";
import { getServerSession } from "@/lib/session";
import { PortalI18nProvider } from "@/lib/portal-i18n";

export const dynamic = "force-dynamic";

export default async function UserPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session || session.user.status !== "active") redirect("/login");
  if (session.user.role === "admin") redirect("/dashboard");
  return <PortalI18nProvider initialLocale={session.user.locale}><UserShell user={session.user}>{children}</UserShell></PortalI18nProvider>;
}
