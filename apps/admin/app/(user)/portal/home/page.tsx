import { getServerSession } from "@/lib/session";
import { HomePage } from "@/features/portal/HomePage";

export const metadata = { title: "Discover jobs | BOB" };
export default async function Page() { const session = await getServerSession(); return <HomePage locale={session?.user.locale}/>; }
