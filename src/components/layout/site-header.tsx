"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-gate";
import { getAllowedPersonas } from "@/lib/persona-access";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useContinuationStore } from "@/lib/stores/continuation-store";

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

const NAV = [
  { href: "/", label: "Dashboard", glyph: "⬡" },
  { href: "/books", label: "Books", glyph: "▥" },
  { href: "/words", label: "Words", glyph: "▣" },
  { href: "/work", label: "Work", glyph: "▦" },
  { href: "/gym", label: "Gym", glyph: "▤" },
];

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const pathname = usePathname() ?? "";
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const activePersona = usePersonaStore((s) => s.activePersona);
  const setActivePersona = usePersonaStore((s) => s.setActivePersona);
  const selectCurrentDate = useContinuationStore((s) => s.selectCurrentDate);
  const allowed = getAllowedPersonas(user?.email);

  return (
    <header className="sticky top-0 z-40 mb-6 flex items-center justify-between gap-3 border-b border-[var(--surface-border)] bg-[var(--bg-secondary)]/85 px-4 py-2.5 backdrop-blur-xl md:px-6">
      {/* Left: persona avatars */}
      <div className="flex items-center gap-2">
        {allowed.map((persona) => {
          const meta = personaMeta[persona];
          const active = persona === activePersona;
          return (
            <button
              key={persona}
              type="button"
              aria-label={`Switch to ${meta.label}`}
              onClick={() => setActivePersona(persona)}
              onDoubleClick={() => selectCurrentDate()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300"
              style={{
                color: meta.accent,
                background: active ? `color-mix(in srgb, ${meta.accent} 18%, transparent)` : "transparent",
                boxShadow: active ? `0 0 0 2px var(--bg-secondary), 0 0 0 3px ${meta.accent}` : "none",
              }}
            >
              {meta.label.charAt(0)}
            </button>
          );
        })}
      </div>

      {/* Center: nav */}
      <nav className="flex items-center gap-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ${
                active ? "bg-[var(--bg-panel-strong)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span aria-hidden className="text-base leading-none">{item.glyph}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: theme + logout */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-all duration-300 hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        {user ? (
          <button
            type="button"
            onClick={() => void signOut()}
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] transition-all duration-300 hover:border-[var(--accent-solid)] hover:text-[var(--text-primary)]"
          >
            <SignOutIcon />
          </button>
        ) : null}
      </div>
    </header>
  );
}
