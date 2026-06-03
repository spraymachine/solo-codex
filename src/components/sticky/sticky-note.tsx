"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StickyNote } from "@/lib/types";

function noteRotation(id: string): number {
  const n = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return ((n % 25) - 12) / 10; // –1.2° to +1.2°, warm only
}

interface StickyNoteCardProps {
  note: StickyNote;
  isOwn: boolean;
  onDelete?: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDrop?: () => void;
}

export function StickyNoteCard({
  note,
  isOwn,
  onDelete,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: StickyNoteCardProps) {
  const [hovered, setHovered] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const rotation = noteRotation(note.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.93, rotate: rotation }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: rotation }}
      exit={{ opacity: 0, y: 8, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
      whileHover={{ y: -5, rotate: 0 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => {
        setHovered(false);
        setConfirming(false);
      }}
      draggable={draggable}
      onDragStart={(e) => {
        (e as unknown as React.DragEvent).dataTransfer.effectAllowed = "move";
        onDragStart?.(note.id);
      }}
      onDragOver={(e) => {
        (e as unknown as React.DragEvent).preventDefault();
        onDragOver?.(note.id);
      }}
      onDrop={(e) => {
        (e as unknown as React.DragEvent).preventDefault();
        onDrop?.();
      }}
      onDragEnd={() => onDrop?.()}
      className="relative min-w-0"
      style={{
        cursor: draggable ? (hovered ? "grab" : "default") : "default",
        filter: "drop-shadow(2px 4px 10px rgba(0,0,0,0.18)) drop-shadow(0 1px 2px rgba(0,0,0,0.08))",
      }}
    >
      {/* Pin */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[-6px] z-10 h-4 w-4 -translate-x-1/2 rounded-full"
        style={{
          background: "rgba(0,0,0,0.28)",
          boxShadow: "0 2px 5px rgba(0,0,0,0.30), inset 0 1px 2px rgba(255,255,255,0.20)",
        }}
      />

      {/* Card surface */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          backgroundColor: note.color,
          minHeight: 148,
          padding: "28px 14px 16px",
        }}
      >
        {/* Note text */}
        <p
          className="relative min-w-0 break-words font-[family-name:var(--font-handwriting)] text-[1.05rem] leading-[1.5]"
          style={{ color: "#1a1107", overflowWrap: "break-word", wordBreak: "break-word" }}
        >
          {note.text}
        </p>

        {/* Delete button — shows on hover, owner only */}
        {isOwn && onDelete && (
          <AnimatePresence>
            {confirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 flex items-center justify-center gap-2"
                style={{ backgroundColor: `${note.color}ee` }}
              >
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  className="rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white"
                  style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-60 hover:opacity-100"
                  style={{ color: "#1a1107" }}
                >
                  Keep
                </button>
              </motion.div>
            ) : (
              <button
                key="x"
                type="button"
                aria-label="Remove note"
                onClick={() => setConfirming(true)}
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center text-[13px] font-semibold leading-none"
                style={{
                  color: "rgba(0,0,0,0.45)",
                  opacity: hovered ? 1 : 0,
                  transition: "opacity 0.15s ease",
                }}
              >
                ×
              </button>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
