"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/lib/types";
import { getNoteColors, NOTE_CAP } from "@/lib/stores/sticky-notes-store";

interface StickyComposerProps {
  persona: Persona;
  atCap: boolean;
  onAdd: (text: string, color: string) => Promise<void>;
}

export function StickyComposer({ persona, atCap, onAdd }: StickyComposerProps) {
  const colors = getNoteColors(persona);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [submitting, setSubmitting] = useState(false);
  const remaining = 80 - text.length;

  function close() {
    setExpanded(false);
    setText("");
    setColor(colors[0]);
  }

  async function handleAdd() {
    if (!text.trim() || submitting || remaining < 0) return;
    setSubmitting(true);
    await onAdd(text.trim(), color);
    setText("");
    setColor(colors[0]);
    setExpanded(false);
    setSubmitting(false);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!expanded ? (
        /* ── "+" tile ─────────────────────────────────────── */
        <motion.button
          key="tile"
          type="button"
          onClick={() => setExpanded(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="group flex w-full flex-col items-center justify-center gap-2 border border-dashed border-[var(--surface-border)] bg-[var(--bg-secondary)] transition-colors duration-200 hover:border-[var(--accent-solid)]/40 hover:bg-[var(--bg-panel)]"
          style={{ minHeight: 80 }}
        >
          <span className="text-2xl leading-none text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
            +
          </span>
          <span className="px-3 text-center text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
            {atCap ? `${NOTE_CAP + 1}th note archives oldest` : "pin a note"}
          </span>
        </motion.button>
      ) : (
        /* ── Composer (looks like a blank note) ────────────── */
        <motion.div
          key="composer"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="relative flex flex-col"
          style={{
            backgroundColor: color,
            minHeight: 80,
            filter: "drop-shadow(2px 4px 10px rgba(0,0,0,0.18)) drop-shadow(0 1px 2px rgba(0,0,0,0.08))",
          }}
        >
          {/* Pin placeholder */}
          <div
            aria-hidden
            className="absolute left-1/2 top-[-6px] z-10 h-4 w-4 -translate-x-1/2 rounded-full"
            style={{
              background: "rgba(0,0,0,0.20)",
              boxShadow: "0 2px 5px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.18)",
            }}
          />

          {/*
            Override the global textarea CSS vars for this surface.
            Globals use !important on background/border/box-shadow via CSS vars,
            so we scope new values here that the textarea's var() calls will pick up.
          */}
          <div
            className="flex flex-1 flex-col"
            style={
              {
                "--textarea-bg": "transparent",
                "--textarea-border": "transparent",
                "--textarea-shadow": "none",
                "--bg-panel-strong": "transparent",
                padding: "28px 16px 12px",
              } as React.CSSProperties
            }
          >
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 80))}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleAdd();
              }}
              placeholder="write something…"
              rows={3}
              className="w-full flex-1 resize-none font-[family-name:var(--font-handwriting)] text-[1.15rem] leading-[1.55] outline-none"
              style={{
                color: "#1a1107",
                caretColor: "#1a1107",
              }}
            />

            {/* Bottom section — swatches above actions */}
            <div className="mt-2 flex flex-col gap-2">
              {/* Color swatches */}
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <motion.button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    whileTap={{ scale: 0.82 }}
                    animate={{ scale: color === c ? 1.3 : 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor: c,
                      boxShadow: color === c ? `0 0 0 1.5px rgba(0,0,0,0.35)` : "0 0 0 1px rgba(0,0,0,0.12)",
                    }}
                  />
                ))}
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-end gap-2">
                <span
                  className="font-mono text-[9px] tabular-nums"
                  style={{ color: remaining <= 15 ? "#c43000" : "rgba(0,0,0,0.38)" }}
                >
                  {remaining}
                </span>
                <button
                  type="button"
                  onClick={close}
                  className="text-[10px] font-medium"
                  style={{ color: "rgba(0,0,0,0.45)" }}
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={!text.trim() || submitting}
                  className="rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white disabled:opacity-40"
                  style={{ backgroundColor: "rgba(0,0,0,0.48)" }}
                >
                  Pin
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
