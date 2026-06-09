"use client";

import { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clearSupabaseAuthStorage, isInvalidRefreshTokenError } from "@/lib/supabase/auth-storage";
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

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            clearSupabaseAuthStorage();
            setSession(null);
            setLoading(false);
            return;
          }

          throw error;
        }

        setSession(data.session);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (isInvalidRefreshTokenError(error)) {
          clearSupabaseAuthStorage();
          setSession(null);
          setLoading(false);
          return;
        }

        console.error(error);
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT" && !nextSession) {
        clearSupabaseAuthStorage();
      }
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
        <p className="font-[family-name:var(--font-display)] text-[0.625rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          loading...
        </p>
      </div>
    );
  }

  // Always require sign-in — no session means auth panel, full stop
  if (!session) {
    return (
      <AuthContext.Provider value={value}>
        <AuthPanel />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
