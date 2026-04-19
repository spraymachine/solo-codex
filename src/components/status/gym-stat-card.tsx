"use client";

import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { GymStat } from "@/lib/types";

interface GymStatCardProps {
  stat: GymStat;
  onAddEntry: (id: string, value: number) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  readOnly?: boolean;
}

export function GymStatCard({ stat, onAddEntry, onDelete, readOnly = false }: GymStatCardProps) {
  const [value, setValue] = useState("");
  const latest = stat.entries.at(-1);
  const previous = stat.entries.at(-2);
  const trend =
    latest && previous
      ? latest.value > previous.value
        ? "↑"
        : latest.value < previous.value
          ? "↓"
          : "→"
      : "•";

  return (
    <Panel glow="emerald">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">{stat.name}</h3>
          <p className="mt-1 font-mono text-lg text-[var(--text-primary)]">
            {latest ? `${latest.value}${stat.unit}` : "—"}{" "}
            <span className="text-sm text-emerald-600">{trend}</span>
          </p>
        </div>
        {!readOnly ? (
          <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => onDelete(stat.id)}>
            Delete
          </Button>
        ) : null}
      </div>
      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stat.entries}>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!readOnly ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const numericValue = Number(value);
            if (!numericValue) return;
            await onAddEntry(stat.id, numericValue);
            setValue("");
          }}
        >
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="flex-1 rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
            placeholder={`Add ${stat.unit} entry`}
          />
          <Button type="submit">Save</Button>
        </form>
      ) : null}
    </Panel>
  );
}
