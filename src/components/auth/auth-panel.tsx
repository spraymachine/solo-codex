"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !configured) {
      setMessage("Supabase is not configured. Add env vars and restart the server.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--accent-soft)]">
            solo system
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your data loads automatically on sign-in.
          </p>
        </div>

        {/* Form card */}
        <div
          className="section-dots overflow-hidden rounded-xl border border-[var(--surface-border)]"
          style={{
            background: `radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent-solid) 10%, var(--bg-panel)) 0%, var(--bg-panel) 60%)`,
          }}
        >
          <div
            className="border-b border-[var(--surface-border)] px-6 py-3"
            style={{ background: `color-mix(in srgb, var(--accent-solid) 5%, var(--bg-panel-strong))` }}
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent-solid)]">
              Credentials
            </p>
          </div>
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="h-11 w-full rounded-lg border-0 bg-[var(--bg-secondary)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none ring-1 ring-[var(--surface-border)] transition-all duration-200 focus:bg-[var(--bg-panel-strong)] focus:ring-[var(--accent-solid)]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border-0 bg-[var(--bg-secondary)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none ring-1 ring-[var(--surface-border)] transition-all duration-200 focus:bg-[var(--bg-panel-strong)] focus:ring-[var(--accent-solid)]"
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-1 h-11 w-full rounded-lg bg-[var(--accent-solid)] text-sm font-semibold tracking-[0.01em] text-white transition-all duration-200 hover:opacity-85 active:scale-[0.98] disabled:opacity-40"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              {message ? (
                <p className="text-center text-sm text-[var(--danger)]">{message}</p>
              ) : null}
            </form>
          </div>
        </div>

        {/* Persona chips */}
        <div className="mt-5 flex justify-center gap-3">
          <span className="rounded-md border border-[var(--surface-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#60a5fa]">
            mani / blue
          </span>
          <span className="rounded-md border border-[var(--surface-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#86efac]">
            harti / green
          </span>
        </div>
      </div>
    </main>
  );
}
