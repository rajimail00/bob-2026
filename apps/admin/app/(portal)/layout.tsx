import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session || session.user.role !== "admin" || session.user.status !== "active") redirect("/login");
  return <AppShell user={session.user}>{children}</AppShell>;
}
