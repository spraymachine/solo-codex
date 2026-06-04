"use client";

import { useMemo, useState } from "react";
import { useWorkStore } from "@/lib/stores/work-store";
import type { WorkContactStatus, WorkProjectStatus } from "@/lib/types";

const CONTACT_STATUS_COLOR: Record<WorkContactStatus, string> = {
  client: "text-[var(--accent-soft)] bg-[var(--surface-soft)] border-[var(--accent-solid)]/30",
  lead: "text-[var(--text-secondary)] bg-[var(--surface-highlight)] border-[var(--surface-border)]",
  prospect: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  lost: "text-[var(--text-secondary)] opacity-50 bg-transparent border-[var(--surface-border)]",
  archived: "text-[var(--text-secondary)] opacity-40 bg-transparent border-[var(--surface-border)]",
};

const PROJECT_STATUS_COLOR: Record<WorkProjectStatus, string> = {
  active: "text-[var(--accent-soft)] bg-[var(--surface-soft)] border-[var(--accent-solid)]/30",
  planned: "text-[var(--text-secondary)] bg-[var(--surface-highlight)] border-[var(--surface-border)]",
  paused: "text-yellow-400/80 bg-yellow-400/10 border-yellow-400/20",
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  archived: "text-[var(--text-secondary)] opacity-40 bg-transparent border-[var(--surface-border)]",
};

export function WorkListsSection() {
  const contacts = useWorkStore((s) => s.contacts).filter((c) => !c.archivedAt);
  const projects = useWorkStore((s) => s.projects).filter((p) => !p.archivedAt);
  const createContact = useWorkStore((s) => s.createContact);
  const createProject = useWorkStore((s) => s.createProject);

  const [contactName, setContactName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");

  const contactById = useMemo(
    () => new Map(contacts.map((c) => [c.id, c])),
    [contacts],
  );

  async function addContact() {
    if (!contactName.trim()) return;
    await createContact({
      name: contactName.trim(),
      status: "lead" as WorkContactStatus,
      phone: "",
      email: "",
      notes: "",
      source: "",
      nextStep: "",
    });
    setContactName("");
  }

  async function addProject() {
    if (!projectTitle.trim() || !selectedContactId) return;
    await createProject({
      contactId: selectedContactId,
      title: projectTitle.trim(),
      status: "planned" as WorkProjectStatus,
      deadline: "",
      notes: "",
      progress: 0,
    });
    setProjectTitle("");
  }

  return (
    <section className="px-5 py-8 md:px-8">
      <div className="mb-7">
        <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
          02 / Freelance
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.03em] text-[var(--text-primary)] md:text-4xl">
          Clients &amp; Projects
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Contacts */}
        <div className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]">
          <div className="border-b border-[var(--surface-border)] px-5 py-4">
            <p className="font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Clients / Leads
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addContact()}
                placeholder="New lead name"
                className="h-9 flex-1 rounded-lg px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void addContact()}
                className="h-9 rounded-lg bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            {contacts.length === 0 ? (
              <p className="px-5 py-6 text-xs text-[var(--text-secondary)] opacity-60">No clients or leads yet.</p>
            ) : (
              contacts.map((contact, i) => (
                <div
                  key={contact.id}
                  className={`flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--surface-highlight)] ${i > 0 ? "border-t border-[var(--surface-border)]/50" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{contact.name}</p>
                    <p className="mt-0.5 font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                      {contact.email || contact.phone || "—"}
                    </p>
                    {contact.nextStep && (
                      <p className="mt-0.5 text-[0.625rem] text-[var(--accent-soft)]/70">→ {contact.nextStep}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.12em] ${CONTACT_STATUS_COLOR[contact.status]}`}>
                    {contact.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Projects */}
        <div className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]">
          <div className="border-b border-[var(--surface-border)] px-5 py-4">
            <p className="font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Projects
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="New project title"
                className="h-9 rounded-lg px-3 text-sm outline-none"
              />
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="h-9 rounded-lg px-3 text-sm outline-none"
              >
                <option value="">Select client</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedContactId}
                onClick={() => void addProject()}
                className="h-9 rounded-lg bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            {projects.length === 0 ? (
              <p className="px-5 py-6 text-xs text-[var(--text-secondary)] opacity-60">No projects yet.</p>
            ) : (
              projects.map((project, i) => (
                <div
                  key={project.id}
                  className={`flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--surface-highlight)] ${i > 0 ? "border-t border-[var(--surface-border)]/50" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{project.title}</p>
                    <p className="mt-0.5 text-[0.625rem] text-[var(--text-secondary)]">
                      {contactById.get(project.contactId)?.name ?? "Unknown client"}
                    </p>
                    {project.deadline && (
                      <p className="mt-0.5 font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                        due {project.deadline}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.12em] ${PROJECT_STATUS_COLOR[project.status]}`}>
                    {project.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
