"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface GymStatFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; unit: string }) => void | Promise<void>;
}

export function GymStatForm({ open, onClose, onSubmit }: GymStatFormProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("kg");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), unit: unit.trim() || "kg" });
    setName("");
    setUnit("kg");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="ADD GYM STAT">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          placeholder="Bench, Squat, Deadlift..."
        />
        <input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          placeholder="kg"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Modal>
  );
}
