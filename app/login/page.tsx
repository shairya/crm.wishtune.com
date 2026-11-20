"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ErrorNote, Logo, SandboxBanner } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = params.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  useEffect(() => {
    if (!isLoading && user) router.replace(destination);
  }, [isLoading, user, router, destination]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.replace(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <SandboxBanner />
    <main className="flex min-h-screen items-center justify-center bg-ink p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo light size="lg" />
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">CRM</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-xl2 border-t-4 border-accent bg-surface p-7 shadow-card">
          <h1 className="font-display text-2xl text-ink">Sign in</h1>
          <div className="mt-4">
            <ErrorNote message={error} />
          </div>
          <label className="label mt-4" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <label className="label mt-4" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="btn-primary mt-6 w-full" disabled={busy || isLoading}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
    </>
  );
}
