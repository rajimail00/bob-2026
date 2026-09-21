import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  redirect((await getServerSession()) ? "/dashboard" : "/login");
}
