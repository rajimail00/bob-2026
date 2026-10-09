import { redirect } from "next/navigation";
import { SettingsPage } from "@/features/portal/SettingsPage";
import { getServerSession } from "@/lib/session";
export const metadata = { title: "Settings | BOB" };
export default async function Page() { const session = await getServerSession(); if (!session) redirect("/login"); return <SettingsPage initialUser={session.user}/>; }
