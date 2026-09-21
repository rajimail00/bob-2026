import { UserDetailPage } from "@/features/users/UserDetailPage";

export const metadata = { title: "User Details" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <UserDetailPage id={(await params).id} />; }
