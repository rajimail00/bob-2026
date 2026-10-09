import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { ProfilePage } from "@/features/portal/ProfilePage";
export const metadata = { title: "Profile | BOB" };
export default async function Page() { const session = await getServerSession(); if (!session) redirect("/login"); return <ProfilePage initialUser={session.user}/>; }
