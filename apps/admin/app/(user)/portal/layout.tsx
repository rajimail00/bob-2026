import { redirect } from "next/navigation";
import { UserShell } from "@/components/UserShell";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UserPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session || session.user.status !== "active") redirect("/login");
  if (session.user.role === "admin") redirect("/dashboard");
  return <UserShell user={session.user}>{children}</UserShell>;
}
