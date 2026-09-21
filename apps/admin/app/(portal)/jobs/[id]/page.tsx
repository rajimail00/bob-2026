import { JobDetailPage } from "@/features/jobs/JobDetailPage";

export const metadata = { title: "Job Details" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <JobDetailPage id={(await params).id} />; }
