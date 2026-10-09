import { getServerSession } from "@/lib/session";
import { JobDetailsPage } from "@/features/portal/JobDetailsPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { const [{ id }, session] = await Promise.all([params, getServerSession()]); return <JobDetailsPage id={id} userId={session?.user.id ?? ""} canApply={Boolean(session?.user.workerProfile)}/>; }
