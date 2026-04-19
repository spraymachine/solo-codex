"use client";

import { useAuth } from "@/components/auth/auth-gate";
import { useSystemStore } from "@/lib/stores/system-store";

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function SiteHeader() {
  const { user, enabled, signOut } = useAuth();
  const themeMode = useSystemStore((state) => state.themeMode);
  const toggleThemeMode = useSystemStore((state) => state.toggleThemeMode);

  return (
    <header className="pointer-events-none fixed right-4 top-4 z-40 flex items-center gap-2 md:right-6 md:top-6">
      <button
        type="button"
        onClick={() => toggleThemeMode()}
        title={themeMode === "light" ? "Switch to dark mode" : "Switch to light mode"}
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)]"
      >
        {themeMode === "light" ? <MoonIcon /> : <SunIcon />}
      </button>
      {enabled && user ? (
        <button
          type="button"
          onClick={() => void signOut()}
          title="Sign out"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)]"
        >
          <SignOutIcon />
        </button>
      ) : null}
    </header>
  );
}
