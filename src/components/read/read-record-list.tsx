"use client";

import Link from "next/link";
import type { ReadRecord } from "@/lib/types";

interface ReadRecordListProps {
  records: ReadRecord[];
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
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

function RecordCard({
  record,
  onDelete,
  onToggleFavorite,
}: {
  record: ReadRecord;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
}) {
  return (
    <div
      className={[
        "relative flex flex-col overflow-hidden rounded-xl border bg-[var(--bg-panel)] p-3 sm:p-4",
        record.favorite ? "border-[var(--accent-solid)] shadow-[0_0_0_1px_var(--accent-solid)]" : "border-[var(--surface-border)]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onToggleFavorite(record.id, !record.favorite)}
        aria-label={record.favorite ? `Unstar ${record.word}` : `Star ${record.word}`}
        className={[
          "absolute right-9 top-3 text-base leading-none transition-colors",
          record.favorite ? "text-[var(--accent-solid)]" : "text-[var(--text-secondary)] hover:text-[var(--accent-solid)]",
        ].join(" ")}
      >
        {record.favorite ? "★" : "☆"}
      </button>
      <button
        type="button"
        onClick={() => onDelete(record.id)}
        aria-label={`Delete ${record.word}`}
        className="absolute right-3 top-3 text-sm leading-none text-[var(--text-secondary)] transition-colors hover:text-red-400"
      >
        ×
      </button>

      <div className="mb-4 flex flex-wrap items-baseline gap-x-2 sm:mb-1">
        <Link
          href={`/word?id=${record.id}`}
          className="block text-2xl font-bold leading-none text-[var(--accent-soft)] transition-colors hover:text-[var(--accent-solid)] sm:text-3xl md:text-4xl"
        >
          {record.word}
        </Link>

        {record.partOfSpeech && (
          <span className="text-sm italic text-[var(--text-secondary)]">({record.partOfSpeech})</span>
        )}
      </div>

      <p className={`mb-1 text-sm italic leading-snug text-[var(--accent-soft)] sm:text-[15px] ${record.myDefinition ? "" : "hidden sm:block sm:invisible"}`}>
        {record.myDefinition || " "}
      </p>

      {record.definition && (
        <p className="text-sm leading-snug text-[var(--text-primary)] sm:text-[15px]">{record.definition}</p>
      )}

      {record.synonyms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {record.synonyms.map((syn) => (
            <span
              key={syn}
              className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-[0.96rem] font-semibold text-[var(--accent-solid)]"
            >
              {syn}
            </span>
          ))}
        </div>
      )}

      <p className="mt-auto pt-3 font-mono text-[0.55rem] tabular-nums text-[var(--text-secondary)] opacity-60">
        {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(record.createdAt))} · {formatTime(record.createdAt)} · {record.sourceType}
      </p>
    </div>
  );
}

export function ReadRecordList({ records, onDelete, onToggleFavorite }: ReadRecordListProps) {
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {items.map((record) => (
              <RecordCard key={record.id} record={record} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
