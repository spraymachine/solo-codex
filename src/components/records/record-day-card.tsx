import { Panel } from "@/components/ui/panel";
import type { HunterRecord } from "@/lib/types";

interface RecordDayCardProps {
  record: HunterRecord;
}

export function RecordDayCard({ record }: RecordDayCardProps) {
  return (
    <Panel glow={record.penaltyApplied ? "red" : "blue"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm text-[var(--text-primary)]">{record.date}</h3>
          <p className="text-xs text-[var(--text-secondary)]">{record.entries.length} entries</p>
        </div>
        {record.penaltyApplied ? (
          <span className="font-mono text-xs text-red-600">PENALTY</span>
        ) : record.reflection ? (
          <span className="font-mono text-xs text-emerald-600">COMPLETE</span>
        ) : (
          <span className="font-mono text-xs text-amber-600">PARTIAL</span>
        )}
      </div>
      {record.entries.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
          {record.entries.slice(0, 3).map((entry) => (
            <li key={entry.timestamp}>• {entry.text}</li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
