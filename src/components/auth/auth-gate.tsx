"use client";

import { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AuthPanel } from "./auth-panel";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  enabled: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: false,
  enabled: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGate({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const enabled = isSupabaseConfigured();
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!enabled || !supabase) {
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [enabled]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      enabled,
      signOut: async () => {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
      },
    }),
    [enabled, loading, session],
  );

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="rounded-[2rem] border border-[var(--surface-border)] bg-white/80 px-6 py-4 font-mono text-sm text-[var(--text-secondary)] shadow-[0_18px_42px_rgba(122,92,65,0.08)]">
          initializing secure link...
        </div>
      </div>
    );
  }

  if (enabled && !session) {
    return (
      <AuthContext.Provider value={value}>
        <AuthPanel />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
