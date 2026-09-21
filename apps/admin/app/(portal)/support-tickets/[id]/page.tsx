import { TicketDetailPage } from "@/features/tickets/TicketDetailPage";

export const metadata = { title: "Support Ticket" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <TicketDetailPage id={(await params).id} />; }
