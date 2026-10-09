import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession();
  redirect(!session ? "/login" : session.user.role === "admin" ? "/dashboard" : session.user.firstName && session.user.lastName ? "/portal/home" : "/portal/profile");
}
