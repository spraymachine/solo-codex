import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

const variants = {
  primary:
    "border-[color:color-mix(in_srgb,var(--accent-solid)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-solid)_14%,var(--bg-panel))] text-[var(--text-primary)] hover:bg-[color:color-mix(in_srgb,var(--accent-solid)_20%,var(--bg-panel))]",
  secondary:
    "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-strong)]",
  danger: "border-red-300/40 bg-red-50 text-red-700 hover:bg-red-100",
  ghost: "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-white/60 hover:text-[var(--text-primary)]",
} as const;

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-[0_10px_26px_rgba(140,110,82,0.08)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
