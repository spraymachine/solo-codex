"use client";

import { shiftDate, todayDate } from "@/lib/utils";
import type { HunterRecord } from "@/lib/types";

interface RecordCalendarProps {
  records: HunterRecord[];
}

export function RecordCalendar({ records }: RecordCalendarProps) {
  const map = new Map(records.map((record) => [record.date, record]));
  const days = Array.from({ length: 21 }, (_, index) => shiftDate(todayDate(), index - 20));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((date) => {
        const record = map.get(date);
        const isToday = date === todayDate();
        const statusClass = record?.penaltyApplied
          ? "border-red-400/30 bg-red-500/10 text-red-200"
          : record?.entries.length
            ? record.reflection
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-400/30 bg-amber-500/10 text-amber-200"
            : "border-[var(--surface-border)] bg-white/80 text-[var(--text-secondary)]";

        return (
          <div
            key={date}
            className={`rounded-xl border px-2 py-3 text-center text-xs ${statusClass} ${isToday ? "ring-1 ring-[color:color-mix(in_srgb,var(--accent-solid)_35%,transparent)]" : ""}`}
          >
            <p className="font-mono">{date.slice(5)}</p>
          </div>
        );
      })}
    </div>
  );
}
