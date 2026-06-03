"use client";

import { useAuth } from "@/components/auth/auth-gate";
import { useThemeStore } from "@/lib/stores/theme-store";

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <header className="pointer-events-none fixed right-4 top-4 z-40 flex items-center gap-2 md:right-6 md:top-5">
      <button
        type="button"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] shadow-sm transition-all duration-300 hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
      {user ? (
        <button
          type="button"
          onClick={() => void signOut()}
          title="Sign out"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] shadow-sm transition-all duration-300 hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
        >
          <SignOutIcon />
        </button>
      ) : null}
    </header>
  );
}
