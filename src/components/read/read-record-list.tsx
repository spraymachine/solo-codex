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

function formatRecordTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRecordDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function groupRecords(records: ReadRecord[]) {
  const groups = new Map<string, ReadRecord[]>();
  for (const record of records) {
    const key = record.createdAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return Array.from(groups.entries());
}

const fieldClass =
  "w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[var(--accent-solid)]";

export function ReadRecordList({ records, onUpdate, onDelete }: ReadRecordListProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-[2rem] border border-[var(--surface-border)] bg-[color:color-mix(in_srgb,var(--bg-panel-strong)_72%,transparent)] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
        <div className="flex min-h-56 items-center justify-center rounded-[calc(2rem-0.375rem)] border border-[var(--surface-highlight)] bg-[var(--bg-panel)] px-6 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
              No Read records
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Saved words will appear as editable table rows.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupRecords(records).map(([date, items]) => (
        <section key={date} className="space-y-2">
          <h2 className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-soft)]">
            {formatRecordDate(items[0].createdAt)}
          </h2>
          <div className="rounded-[2rem] border border-[var(--surface-border)] bg-[color:color-mix(in_srgb,var(--bg-panel-strong)_72%,transparent)] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
            <div className="rounded-[calc(2rem-0.375rem)] border border-[var(--surface-highlight)] bg-[var(--bg-panel)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
                  <thead>
                    <tr className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      <th className="w-[18%] px-3 pb-2 font-medium">Word</th>
                      <th className="w-[14%] px-3 pb-2 font-medium">Type</th>
                      <th className="w-[42%] px-3 pb-2 font-medium">Definition</th>
                      <th className="w-[14%] px-3 pb-2 font-medium">Source</th>
                      <th className="w-[8%] px-3 pb-2 font-medium">Saved</th>
                      <th className="w-[4%] px-3 pb-2 font-medium" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((record) => (
                      <tr
                        key={record.id}
                        className="align-top transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5"
                      >
                        <td className="rounded-l-3xl bg-[var(--bg-secondary)] px-3 py-3">
                          <input
                            value={record.word}
                            onChange={(event) =>
                              onUpdate(record.id, { word: event.target.value })
                            }
                            className={fieldClass}
                            aria-label={`Word for ${record.word}`}
                          />
                        </td>
                        <td className="bg-[var(--bg-secondary)] px-3 py-3">
                          <input
                            value={record.partOfSpeech}
                            onChange={(event) =>
                              onUpdate(record.id, { partOfSpeech: event.target.value })
                            }
                            className={fieldClass}
                            aria-label={`Type for ${record.word}`}
                          />
                        </td>
                        <td className="bg-[var(--bg-secondary)] px-3 py-3">
                          <textarea
                            value={record.definition}
                            onChange={(event) =>
                              onUpdate(record.id, { definition: event.target.value })
                            }
                            rows={2}
                            className={`${fieldClass} resize-y leading-6`}
                            aria-label={`Definition for ${record.word}`}
                          />
                        </td>
                        <td className="bg-[var(--bg-secondary)] px-3 py-3">
                          <select
                            value={record.sourceType}
                            onChange={(event) =>
                              onUpdate(record.id, {
                                sourceType: event.target.value as ReadSourceType,
                              })
                            }
                            className={fieldClass}
                            aria-label={`Source for ${record.word}`}
                          >
                            {sourceOptions.map((source) => (
                              <option key={source} value={source}>
                                {source}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="bg-[var(--bg-secondary)] px-3 py-3">
                          <time
                            dateTime={record.createdAt}
                            className="block whitespace-nowrap pt-3 font-mono text-xs text-[var(--text-secondary)]"
                          >
                            {formatRecordTime(record.createdAt)}
                          </time>
                        </td>
                        <td className="rounded-r-3xl bg-[var(--bg-secondary)] px-3 py-3">
                          <button
                            type="button"
                            onClick={() => onDelete(record.id)}
                            className="mt-2 rounded-full border border-transparent px-3 py-2 text-xs text-[var(--text-secondary)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-[var(--surface-border)] hover:text-red-500"
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
              <div className="mt-3 border-t border-[var(--surface-border)] pt-3 text-xs leading-5 text-[var(--text-secondary)] md:hidden">
                Swipe table sideways to edit every field.
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
