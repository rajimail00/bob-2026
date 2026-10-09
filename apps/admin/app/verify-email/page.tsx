import { Suspense } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { VerifyEmailForm } from "@/components/PublicAuthForm";
export const metadata = { title: "Verify email | BOB" };
export default function Page() { return <main className="login-page"><section className="login-card"><BrandLogo size="large"/><div className="login-heading"><p className="eyebrow">One more step</p><h1>Verify your email</h1><p>Enter the code sent to your email address.</p></div><Suspense><VerifyEmailForm/></Suspense></section></main>; }
