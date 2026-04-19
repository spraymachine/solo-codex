"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface InventoryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    notes: string;
    tags: string[];
  }) => void | Promise<void>;
}

export function InventoryForm({ open, onClose, onSubmit }: InventoryFormProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      notes: notes.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    setName("");
    setNotes("");
    setTags("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="ADD INVENTORY ITEM">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          placeholder="What did you start?"
        />
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full resize-none rounded-xl border border-[var(--textarea-border)] bg-[var(--textarea-bg)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] outline-none focus:border-[var(--accent-solid)]"
          rows={3}
          placeholder="Optional notes"
        />
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-solid)]"
          placeholder="Tags, comma separated"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Item</Button>
        </div>
      </form>
    </Modal>
  );
}
