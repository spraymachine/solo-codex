"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/#overview", label: "Home" },
  { href: "/#work", label: "Work" },
  { href: "/#missions", label: "Goals" },
  { href: "/#records", label: "Record" },
  { href: "/#status", label: "Status" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-4 left-4 right-4 z-30 flex justify-between rounded-full border border-[var(--surface-border)] bg-[rgba(255,250,243,0.94)] p-1 shadow-[0_18px_42px_rgba(122,92,65,0.12)] backdrop-blur-xl md:hidden">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-full px-3 py-2 text-xs transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${pathname === "/" ? "bg-[color:color-mix(in_srgb,var(--accent-solid)_16%,white)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
