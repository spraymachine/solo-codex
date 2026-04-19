"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-[rgba(242,233,221,0.7)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:p-4 md:items-center"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.16 }}
          >
            <div className="glow-blue w-full max-w-xl overflow-hidden rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(255,248,239,0.9)] p-1.5 sm:rounded-[1.7rem] sm:p-2">
              <div className="max-h-[88dvh] overflow-y-auto rounded-[calc(1.35rem-0.375rem)] border border-white/70 bg-[var(--bg-secondary)] p-4 sm:rounded-[calc(1.7rem-0.5rem)] sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-mono text-base text-[var(--accent-soft)] sm:text-lg">{title}</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--surface-border)] bg-[var(--bg-panel)] text-lg leading-none text-[var(--text-secondary)] transition-colors duration-300 hover:text-[var(--text-primary)]"
                  >
                    ×
                  </button>
                </div>
                {children}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
