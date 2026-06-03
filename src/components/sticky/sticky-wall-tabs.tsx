"use client";

import { motion } from "framer-motion";

interface StickyWallTabsProps {
  activeTab: "own" | "partner";
  ownLabel: string;
  partnerLabel: string;
  onTabChange: (tab: "own" | "partner") => void;
}

export function StickyWallTabs({
  activeTab,
  ownLabel,
  partnerLabel,
  onTabChange,
}: StickyWallTabsProps) {
  const tabs = [
    { id: "own" as const, label: ownLabel },
    { id: "partner" as const, label: partnerLabel },
  ];

  return (
    <div
      className="relative flex"
      style={{ border: "1px solid var(--surface-border)", background: "var(--bg-secondary)" }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="relative z-10 px-3 py-1.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-150"
            style={{
              color: isActive ? "var(--bg-panel)" : "var(--text-secondary)",
            }}
          >
            {isActive && (
              <motion.div
                layoutId="sticky-tab-bg"
                className="absolute inset-0"
                style={{ background: "var(--text-primary)" }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
