import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "@/lib/session";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Administrator Login" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getServerSession()) redirect("/dashboard");
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <BrandLogo size="large" />
        <div className="login-heading">
          <p className="eyebrow">BOB Administration</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in with your authorized administrator account.</p>
        </div>
        <Suspense fallback={<div className="state-card"><span className="spinner" /></div>}><LoginForm /></Suspense>
        <p className="login-security">Protected access · Administrators only</p>
      </section>
    </main>
  );
}
