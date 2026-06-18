"use client";

import type { ReadRecord, ReadSourceType } from "@/lib/types";

interface ReadRecordListProps {
  records: ReadRecord[];
  onUpdate: (
    id: string,
    updates: Partial<Pick<ReadRecord, "word" | "definition" | "partOfSpeech" | "sourceType">>,
  ) => void;
  onDelete: (id: string) => void;
}

const sourceOptions: ReadSourceType[] = ["book", "note", "newspaper", "other"];

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

const fieldCls =
  "w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 hover:border-[var(--surface-border)] focus:border-[var(--accent-solid)] focus:bg-[var(--bg-panel)] placeholder:text-[var(--text-secondary)]";

export function ReadRecordList({ records, onUpdate, onDelete }: ReadRecordListProps) {
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
          {/* Group header */}
          <div className="flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-5 py-3">
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-soft)]">
              {formatDate(items[0].createdAt)}
            </p>
            <span className="font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
              {items.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--surface-border)]">
                  {["Word", "Type", "Definition", "Source", "Time", ""].map((col, i) => (
                    <th
                      key={col || i}
                      className="px-3 py-2.5 font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {items.map((record) => (
                  <tr key={record.id} className="group transition-colors duration-150 hover:bg-[var(--surface-highlight)]">
                    <td className="w-[16%] px-2 py-2 align-top">
                      <input
                        value={record.word}
                        onChange={(e) => onUpdate(record.id, { word: e.target.value })}
                        className={`${fieldCls} font-[family-name:var(--font-display)] font-bold`}
                        aria-label={`Word: ${record.word}`}
                      />
                    </td>
                    <td className="w-[11%] px-2 py-2 align-top">
                      <input
                        value={record.partOfSpeech}
                        placeholder="—"
                        onChange={(e) => onUpdate(record.id, { partOfSpeech: e.target.value })}
                        className={`${fieldCls} font-mono text-xs italic`}
                        aria-label={`Type for ${record.word}`}
                      />
                    </td>
                    <td className="w-[42%] px-2 py-2 align-top">
                      <textarea
                        value={record.definition}
                        placeholder="No definition"
                        onChange={(e) => onUpdate(record.id, { definition: e.target.value })}
                        rows={2}
                        className={`${fieldCls} resize-none leading-6`}
                        aria-label={`Definition for ${record.word}`}
                      />
                    </td>
                    <td className="w-[13%] px-2 py-2 align-top">
                      <select
                        value={record.sourceType}
                        onChange={(e) => onUpdate(record.id, { sourceType: e.target.value as ReadSourceType })}
                        className={`${fieldCls} cursor-pointer capitalize`}
                        aria-label={`Source for ${record.word}`}
                      >
                        {sourceOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="w-[10%] px-3 py-2 align-top">
                      <time
                        dateTime={record.createdAt}
                        className="block whitespace-nowrap pt-2 font-mono text-[0.7rem] tabular-nums text-[var(--text-secondary)]"
                      >
                        {formatTime(record.createdAt)}
                      </time>
                    </td>
                    <td className="w-[6%] px-2 py-2 text-right align-top">
                      <button
                        type="button"
                        onClick={() => onDelete(record.id)}
                        className="pt-1.5 text-base leading-none text-[var(--text-secondary)] opacity-0 transition-all duration-200 hover:text-red-400 group-hover:opacity-100"
                        aria-label={`Delete ${record.word}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--surface-border)] px-5 py-2 md:hidden">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-60">
              Scroll sideways to edit all fields
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
