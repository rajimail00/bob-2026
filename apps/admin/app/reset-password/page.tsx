import { BrandLogo } from "@/components/BrandLogo";
import { ResetPasswordForm } from "@/components/PublicAuthForm";
export const metadata = { title: "Set a new password | BOB" };
export default function Page() { return <main className="login-page"><section className="login-card"><BrandLogo size="large"/><div className="login-heading"><p className="eyebrow">Account recovery</p><h1>Choose a new password</h1><p>Enter the code and a secure new password.</p></div><ResetPasswordForm/></section></main>; }
