"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { useLeadsStore } from "@/lib/stores/leads-store";
import { Modal } from "@/components/ui/modal";
import type { Lead } from "@/lib/types";

function ActionButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-[var(--accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-solid)]/40 hover:text-[var(--text-primary)] active:scale-[0.98] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function LeadFormModal({
  open,
  initial,
  onClose,
  onSubmit,
  title,
}: {
  open: boolean;
  initial?: Partial<Lead>;
  onClose: () => void;
  onSubmit: (data: { name: string; phone: string; email: string; notes: string }) => Promise<void>;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    await onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim() });
    setSubmitting(false);
    onClose();
  }

  const fieldClass =
    "w-full rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--accent-solid)] transition-colors duration-150";
  const labelClass = "text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <label className={labelClass}>Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            autoFocus
            className={fieldClass}
          />
        </div>
        <div className="grid gap-1.5">
          <label className={labelClass}>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            type="tel"
            className={fieldClass}
          />
        </div>
        <div className="grid gap-1.5">
          <label className={labelClass}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            type="email"
            className={fieldClass}
          />
        </div>
        <div className="grid gap-1.5">
          <label className={labelClass}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context, next steps, source…"
            rows={3}
            className={`${fieldClass} resize-none`}
          />
        </div>
        <ActionButton
          onClick={() => void handleSubmit()}
          disabled={submitting || !name.trim()}
          className="w-full"
        >
          {submitting ? "Saving…" : title}
        </ActionButton>
      </div>
    </Modal>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const deleteLead = useLeadsStore((s) => s.deleteLead);
  const updateLead = useLeadsStore((s) => s.updateLead);
  const [editOpen, setEditOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)] transition-all duration-200 hover:bg-[var(--bg-panel-strong)]">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[0.02em] text-[var(--text-primary)] leading-snug truncate">
                {lead.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-solid)] transition-colors duration-150"
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 2.5c0-.28.22-.5.5-.5h2a.5.5 0 0 1 .49.4l.5 2.5a.5.5 0 0 1-.28.54L4.9 6.2a8 8 0 0 0 3.9 3.9l.76-1.31a.5.5 0 0 1 .54-.28l2.5.5c.23.05.4.25.4.49v2c0 .28-.22.5-.5.5C6.94 12 2 7.06 2 3c0-.28.22-.5.5-.5Z" />
                    </svg>
                    {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-solid)] transition-colors duration-150"
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
                      <path d="m1.5 5 6.5 4.5L14.5 5" />
                    </svg>
                    {lead.email}
                  </a>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 -mt-0.5 -mr-1">
              {lead.notes && (
                <button
                  type="button"
                  aria-label="Toggle notes"
                  onClick={() => setNotesOpen((v) => !v)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ${
                    notesOpen
                      ? "bg-[var(--accent-solid)]/10 text-[var(--accent-solid)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 3h11M2.5 6h11M2.5 9h7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                aria-label="Edit lead"
                onClick={() => setEditOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Delete lead"
                onClick={() => void deleteLead(lead.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-panel)] hover:text-[var(--text-primary)]"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h10M6 4V2.5h4V4M5.5 4l.5 9h4l.5-9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {notesOpen && lead.notes && (
          <div className="border-t border-[var(--surface-border)] px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-2">Notes</p>
            <p className="text-sm leading-6 text-[var(--text-primary)] whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </div>

      <LeadFormModal
        open={editOpen}
        initial={lead}
        onClose={() => setEditOpen(false)}
        onSubmit={async (data) => {
          await updateLead(lead.id, data);
        }}
        title="Edit Lead"
      />
    </>
  );
}

export function LeadsSection() {
  const leads = useLeadsStore((s) => s.leads);
  const createLead = useLeadsStore((s) => s.createLead);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section
      className="section-dots overflow-hidden rounded-xl border border-[var(--surface-border)]"
      style={{
        background: `radial-gradient(ellipse at bottom right, color-mix(in srgb, var(--accent-solid) 9%, var(--bg-panel)) 0%, var(--bg-panel) 55%)`,
      }}
    >
      <div
        className="border-b border-[var(--surface-border)] px-5 py-4 md:px-6"
        style={{
          background: `color-mix(in srgb, var(--accent-solid) 5%, var(--bg-panel-strong))`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-solid)]">
              Leads
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-[0.02em] text-[var(--text-primary)] md:text-2xl">
              Lead Tracker
            </p>
          </div>
          <ActionButton onClick={() => setAddOpen(true)}>
            New lead
          </ActionButton>
        </div>
      </div>

      <div className="px-5 py-5 md:px-6 md:py-6">
        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No leads yet.</p>
            <p className="mt-1 text-[0.625rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] opacity-50">Add your first contact</p>
            <GhostButton onClick={() => setAddOpen(true)} className="mt-4">
              Add lead
            </GhostButton>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>

      <LeadFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={createLead}
        title="Add Lead"
      />
    </section>
  );
}
