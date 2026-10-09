import { getServerSession } from "@/lib/session";
import { OrdersPage } from "@/features/portal/OrdersPage";
export const metadata = { title: "My jobs | BOB" };
export default async function Page() { const session = await getServerSession(); return <OrdersPage hasWorkerProfile={Boolean(session?.user.workerProfile)} userId={session?.user.id ?? ""}/>; }
