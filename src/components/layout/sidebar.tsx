"use client";

import { NavItem } from "./nav-item";

const navItems = [
  { href: "/", icon: "⬡", label: "Dashboard" },
  { href: "/gates", icon: "◈", label: "Gates" },
  { href: "/missions", icon: "◎", label: "Missions" },
  { href: "/inventory", icon: "▤", label: "Inventory" },
  { href: "/records", icon: "☰", label: "Hunter's Record" },
  { href: "/status", icon: "⬢", label: "Player Status" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-16 flex-col gap-1 border-r border-[var(--surface-border)] bg-[var(--bg-secondary)]/90 p-3 backdrop-blur-xl md:flex lg:w-56">
      <div className="mb-6 px-3 py-4">
        <h1 className="font-mono text-xs tracking-[0.3em] text-[var(--accent-soft)] lg:text-sm">
          <span className="lg:hidden">SYS</span>
          <span className="hidden lg:inline">SYSTEM</span>
        </h1>
      </div>
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </aside>
  );
}
