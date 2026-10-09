"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    }).catch(() => null);
    const data = response ? await response.json().catch(() => null) as { user?: { role?: string; firstName?: string; lastName?: string }; error?: { message?: string } } | null : null;
    if (!response?.ok) {
      setError(data?.error?.message ?? "Unable to connect. Please try again.");
      setLoading(false);
      return;
    }
    const next = search.get("next");
    const defaultDestination = data?.user?.role === "admin" ? "/dashboard" : data?.user?.firstName && data.user.lastName ? "/portal/home" : "/portal/profile";
    const allowedNext = data?.user?.role === "admin" ? ["/dashboard", "/users", "/jobs", "/categories", "/advertisements", "/support-tickets"] : ["/portal"];
    const safeNext = next?.startsWith("/") && !next.startsWith("//") && allowedNext.some((prefix) => next === prefix || next.startsWith(`${prefix}/`)) ? next : null;
    router.replace(safeNext ?? defaultDestination);
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" placeholder="you@example.com" required autoFocus />
      </label>
      <label>
        <span>Password</span>
        <span className="password-field">
          <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      <div className="auth-form-links"><Link href="/forgot-password">Forgot password?</Link></div>
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <button className="button button-primary button-full" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      <p className="auth-switch">New to BOB? <Link href="/register">Create an account</Link></p>
    </form>
  );
}
