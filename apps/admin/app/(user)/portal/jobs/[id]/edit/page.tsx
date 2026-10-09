import { PostJobPage } from "@/features/portal/PostJobPage";

export const metadata = { title: "Edit job | BOB" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostJobPage jobId={id} mode="edit"/>;
}
