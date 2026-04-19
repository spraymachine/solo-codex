"use client";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { InventoryItem } from "@/lib/types";

interface InventoryItemCardProps {
  item: InventoryItem;
  onPromote: (item: InventoryItem, type: "gate" | "mission") => void;
  onDelete: (id: string) => void | Promise<void>;
  readOnly?: boolean;
}

export function InventoryItemCard({
  item,
  onPromote,
  onDelete,
  readOnly = false,
}: InventoryItemCardProps) {
  return (
    <Panel glow="amber">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">{item.name}</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.notes || "No notes yet."}</p>
          {item.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--surface-border)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {item.promotedTo ? (
            <p className="mt-2 font-mono text-xs text-emerald-600">
              Promoted to {item.promotedTo.type}: {item.promotedTo.id}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          {!item.promotedTo && !readOnly ? (
            <>
              <Button
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() => onPromote(item, "gate")}
              >
                Promote to Gate
              </Button>
              <Button
                variant="secondary"
                className="px-2 py-1 text-xs"
                onClick={() => onPromote(item, "mission")}
              >
                Promote to Mission
              </Button>
            </>
          ) : null}
          {!readOnly ? (
            <Button
              variant="danger"
              className="px-2 py-1 text-xs"
              onClick={() => onDelete(item.id)}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
