"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

async function post(action: string, body: object) {
  const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(data?.error?.message ?? "The request could not be completed.");
}

export function RegisterForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget); const email = String(form.get("email")); try { await post("register", { email, password: form.get("password"), locale: form.get("locale") }); router.push(`/verify-email?email=${encodeURIComponent(email)}`); } catch (value) { setError(value instanceof Error ? value.message : "Registration failed."); setLoading(false); } }
  return <form className="login-form" onSubmit={submit}><label><span>Email</span><input name="email" type="email" autoComplete="email" required/></label><label><span>Password</span><input name="password" type="password" autoComplete="new-password" minLength={8} required/></label><label><span>Language</span><select name="locale" defaultValue="en"><option value="en">English</option><option value="de">Deutsch</option><option value="es">Español</option><option value="fr">Français</option></select></label>{error ? <div className="form-error">{error}</div> : null}<button className="button button-primary button-full" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button><p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p></form>;
}

export function VerifyEmailForm() {
  const router = useRouter(); const search = useSearchParams(); const email = search.get("email") ?? ""; const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget); try { await post("verify-email", { email: form.get("email"), code: form.get("code") }); setMessage("Email verified. You can now sign in."); setTimeout(() => router.push("/login"), 700); } catch (value) { setError(value instanceof Error ? value.message : "Verification failed."); setLoading(false); } }
  async function resend() { setError(""); try { await post("resend-code", { email }); setMessage("A new code was sent."); } catch (value) { setError(value instanceof Error ? value.message : "Could not resend the code."); } }
  return <form className="login-form" onSubmit={submit}><label><span>Email</span><input name="email" type="email" defaultValue={email} required/></label><label><span>6-digit verification code</span><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required/></label>{error ? <div className="form-error">{error}</div> : null}{message ? <div className="inline-message">{message}</div> : null}<button className="button button-primary button-full" disabled={loading}>{loading ? "Verifying…" : "Verify email"}</button><button className="text-button" type="button" onClick={resend}>Resend code</button></form>;
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget); try { await post("forgot-password", { email: form.get("email") }); setSent(true); } catch (value) { setError(value instanceof Error ? value.message : "Could not start password reset."); } finally { setLoading(false); } }
  if (sent) return <div className="login-form"><div className="inline-message">If that account exists, a reset code has been sent.</div><Link className="button button-primary button-full" href="/reset-password">Enter reset code</Link></div>;
  return <form className="login-form" onSubmit={submit}><label><span>Email</span><input name="email" type="email" required autoFocus/></label>{error ? <div className="form-error">{error}</div> : null}<button className="button button-primary button-full" disabled={loading}>{loading ? "Sending…" : "Send reset code"}</button><p className="auth-switch"><Link href="/login">Back to sign in</Link></p></form>;
}

export function ResetPasswordForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget); try { await post("reset-password", { email: form.get("email"), code: form.get("code"), password: form.get("password") }); router.push("/login"); } catch (value) { setError(value instanceof Error ? value.message : "Could not reset password."); setLoading(false); } }
  return <form className="login-form" onSubmit={submit}><label><span>Email</span><input name="email" type="email" required/></label><label><span>6-digit reset code</span><input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required/></label><label><span>New password</span><input name="password" type="password" minLength={8} required/></label>{error ? <div className="form-error">{error}</div> : null}<button className="button button-primary button-full" disabled={loading}>{loading ? "Saving…" : "Set new password"}</button></form>;
}
