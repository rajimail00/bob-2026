import { BrandLogo } from "@/components/BrandLogo";
import { ForgotPasswordForm } from "@/components/PublicAuthForm";
export const metadata = { title: "Forgot password | BOB" };
export default function Page() { return <main className="login-page"><section className="login-card"><BrandLogo size="large"/><div className="login-heading"><p className="eyebrow">Account recovery</p><h1>Reset your password</h1><p>We will send a reset code to your email.</p></div><ForgotPasswordForm/></section></main>; }
