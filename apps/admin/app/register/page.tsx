import { BrandLogo } from "@/components/BrandLogo";
import { RegisterForm } from "@/components/PublicAuthForm";
export const metadata = { title: "Create a BOB account" };
export default function Page() { return <main className="login-page"><section className="login-card"><BrandLogo size="large"/><div className="login-heading"><p className="eyebrow">Join BOB</p><h1>Create your account</h1><p>Use the same account on the website and mobile app.</p></div><RegisterForm/></section></main>; }
