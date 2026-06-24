"use client";

import type { ChessArchiveMonth } from "@/lib/chess/types";

function key(m: { year: number; month: number }): string {
  return `${m.year}-${String(m.month).padStart(2, "0")}`;
}

export function ChessArchiveBrowser({
  months,
  selected,
  onSelect,
}: {
  months: ChessArchiveMonth[];
  selected: { year: number; month: number };
  onSelect: (month: { year: number; month: number }) => void;
}) {
  const sorted = [...months].sort((a, b) => key(b).localeCompare(key(a)));

  return (
    <select
      className="rounded-md border border-[var(--surface-border)] bg-[var(--bg-panel)] px-2 py-1 text-sm text-[var(--text-primary)]"
      value={key(selected)}
      onChange={(e) => {
        const [year, month] = e.target.value.split("-").map(Number);
        onSelect({ year, month });
      }}
    >
      {sorted.map((m) => (
        <option key={key(m)} value={key(m)}>
          {key(m)}
        </option>
      ))}
    </select>
  );
}
