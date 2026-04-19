"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Add Supabase keys to enable secure sign-in.");
      return;
    }

    const action =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;
    setMessage(
      error
        ? error.message
        : mode === "signin"
          ? "Signed in."
          : "Account created. Check your email if confirmation is enabled.",
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,162,255,0.14),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(97,199,140,0.1),transparent_28%)]" />
      <section className="relative w-full max-w-5xl">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2.5rem] border border-[var(--surface-border)] bg-[rgba(255,248,239,0.78)] p-2 shadow-[0_24px_64px_rgba(122,92,65,0.08)]">
            <div className="rounded-[calc(2.5rem-0.5rem)] border border-white/70 bg-[rgba(255,251,245,0.96)] p-8 md:p-12">
              <p className="inline-flex rounded-full border border-[var(--surface-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                dual persona system
              </p>
              <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-[var(--text-primary)] md:text-7xl">
                One workspace. Two modes.
              </h1>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/72 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
                    mani / blue
                  </p>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Strategy and execution.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-white/72 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9fe0b7]">
                    harti / green
                  </p>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Reflection and consistency.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-[var(--surface-border)] bg-[rgba(255,248,239,0.78)] p-2">
            <div className="rounded-[calc(2.5rem-0.5rem)] border border-white/70 bg-[rgba(255,251,245,0.96)] p-8">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">
                  secure entry
                </p>
                <button
                  type="button"
                  className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                >
                  {mode === "signin" ? "Create account" : "Use existing account"}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-[1.4rem] border border-[var(--surface-border)] bg-white/78 px-4 py-4 text-sm text-[var(--text-primary)] outline-none transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[var(--accent-solid)]"
                  placeholder="Email"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-[1.4rem] border border-[var(--surface-border)] bg-white/78 px-4 py-4 text-sm text-[var(--text-primary)] outline-none transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[var(--accent-solid)]"
                  placeholder="Password"
                  required
                />
                <Button type="submit" className="w-full justify-center py-4">
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
                <p className="min-h-6 text-sm text-[var(--text-secondary)]">{message}</p>
                {!configured ? (
                  <p className="rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Supabase env vars are missing, so auth is currently disabled in this workspace preview.
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
