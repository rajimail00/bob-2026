import { redirect } from "next/navigation";
import { ChatPage } from "@/features/portal/ChatPage";
import { getServerSession } from "@/lib/session";
export default async function Page({ params }: { params: Promise<{ jobId: string; workerId: string }> }) { const [values, session] = await Promise.all([params, getServerSession()]); if (!session) redirect("/login"); return <ChatPage {...values} userId={session.user.id}/>; }
