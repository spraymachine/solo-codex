"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  label: string;
}

export function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[color:color-mix(in_srgb,var(--accent-solid)_14%,white)] text-[var(--accent-soft)]"
          : "text-[var(--text-secondary)] hover:bg-white/70 hover:text-[var(--text-primary)]",
      )}
    >
      <span className="text-base">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
