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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <div className="glow-blue w-full max-w-lg rounded-[2rem] border border-[var(--surface-border)] bg-[rgba(255,248,239,0.86)] p-2">
              <div className="rounded-[calc(2rem-0.5rem)] border border-white/70 bg-[var(--bg-secondary)] p-6">
                <h2 className="mb-4 font-mono text-lg text-[var(--accent-soft)]">{title}</h2>
                {children}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
