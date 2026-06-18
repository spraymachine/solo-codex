"use client";

import Link from "next/link";
import type { ReadRecord } from "@/lib/types";

interface ReadRecordListProps {
  records: ReadRecord[];
  onDelete: (id: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(value));
}

function groupRecords(records: ReadRecord[]) {
  const groups = new Map<string, ReadRecord[]>();
  for (const record of records) {
    const key = record.createdAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return Array.from(groups.entries());
}

function RecordCard({ record, onDelete }: { record: ReadRecord; onDelete: (id: string) => void }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] p-4">
      <button
        type="button"
        onClick={() => onDelete(record.id)}
        aria-label={`Delete ${record.word}`}
        className="absolute right-3 top-3 text-sm leading-none text-[var(--text-secondary)] transition-colors hover:text-red-400"
      >
        ×
      </button>

      <Link
        href={`/word?id=${record.id}`}
        className="mb-1 block text-4xl font-bold leading-none text-[var(--accent-soft)] transition-colors hover:text-[var(--accent-solid)]"
      >
        {record.word}
      </Link>

      {record.partOfSpeech && (
        <p className="mb-2 text-xs italic text-[var(--text-secondary)]">{record.partOfSpeech}</p>
      )}

      <p className={`mb-1 text-[13px] italic leading-snug text-[var(--accent-soft)] ${record.myDefinition ? "" : "invisible"}`}>
        {record.myDefinition || " "}
      </p>

      {record.definition && (
        <p className="text-[13px] leading-snug text-[var(--text-primary)]">{record.definition}</p>
      )}

      {record.synonyms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {record.synonyms.map((syn) => (
            <span
              key={syn}
              className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-[0.6rem] text-[var(--text-secondary)]"
            >
              {syn}
            </span>
          ))}
        </div>
      )}

      <p className="mt-auto pt-3 font-mono text-[0.55rem] tabular-nums text-[var(--text-secondary)] opacity-60">
        {record.sourceType} · {formatTime(record.createdAt)}
      </p>
    </div>
  );
}

export function ReadRecordList({ records, onDelete }: ReadRecordListProps) {
  if (records.length === 0) {
    return (
      <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] p-6 text-center">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">No saved words</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)] opacity-60">
            Look up a word or scan a page above to start your ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupRecords(records).map(([date, items]) => (
        <div key={date}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--accent-soft)]">
              {formatDate(items[0].createdAt)}
            </p>
            <span className="font-mono text-[0.6rem] tabular-nums text-[var(--text-secondary)]">
              {items.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {items.map((record) => (
              <RecordCard key={record.id} record={record} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
