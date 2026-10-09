import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "@/lib/session";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in to BOB" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect(session.user.role === "admin" ? "/dashboard" : session.user.firstName && session.user.lastName ? "/portal/home" : "/portal/profile");
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <BrandLogo size="large" />
        <div className="login-heading">
          <p className="eyebrow">BOB User Portal</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Manage jobs, applications and your BOB account. Administrators are taken to the admin portal.</p>
        </div>
        <Suspense fallback={<div className="state-card"><span className="spinner" /></div>}><LoginForm /></Suspense>
        <p className="login-security">Secure access for customers, workers and administrators</p>
      </section>
    </main>
  );
}
