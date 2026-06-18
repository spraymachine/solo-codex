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

function RecordEntry({ record, onDelete }: { record: ReadRecord; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-border)] px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={`/word?id=${record.id}`}
            className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--accent-soft)]"
          >
            {record.word}
          </Link>
          {record.partOfSpeech && (
            <span className="font-mono text-[0.65rem] italic text-[var(--text-secondary)]">
              {record.partOfSpeech}
            </span>
          )}
          <span className="ml-auto font-mono text-[0.6rem] tabular-nums text-[var(--text-secondary)]">
            {record.sourceType} · {formatTime(record.createdAt)}
          </span>
        </div>

        {record.myDefinition && (
          <p className="mt-1 text-xs italic leading-5 text-[var(--accent-soft)]">
            {record.myDefinition}
          </p>
        )}

        {record.definition && (
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
            {record.definition}
          </p>
        )}

        {record.synonyms.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {record.synonyms.map((syn) => (
              <span
                key={syn}
                className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 font-mono text-[0.6rem] text-[var(--text-secondary)]"
              >
                {syn}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDelete(record.id)}
        aria-label={`Delete ${record.word}`}
        className="mt-0.5 shrink-0 text-base leading-none text-[var(--text-secondary)] transition-colors hover:text-red-400"
      >
        ×
      </button>
    </div>
  );
}

export function ReadRecordList({ records, onDelete }: ReadRecordListProps) {
  if (records.length === 0) {
    return (
      <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] p-6 text-center">
        <div>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            No saved words
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)] opacity-60">
            Look up a word or scan a page above to start your ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupRecords(records).map(([date, items]) => (
        <div
          key={date}
          className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-5 py-3">
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-soft)]">
              {formatDate(items[0].createdAt)}
            </p>
            <span className="font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
              {items.length}
            </span>
          </div>

          <div>
            {items.map((record) => (
              <RecordEntry key={record.id} record={record} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
