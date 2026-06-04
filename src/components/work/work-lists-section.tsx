"use client";

import { useMemo, useState } from "react";
import { useWorkStore } from "@/lib/stores/work-store";
import type { WorkContact, WorkContactStatus, WorkProject, WorkProjectStatus } from "@/lib/types";

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

const CONTACT_STATUSES: WorkContactStatus[] = ["lead", "prospect", "client", "lost"];
const PROJECT_STATUSES: WorkProjectStatus[] = ["planned", "active", "paused", "completed"];

const inputClass =
  "h-8 w-full rounded-md px-2.5 text-xs outline-none bg-[var(--bg-panel)] border border-[var(--surface-border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-solid)] transition-colors";
const labelClass =
  "mb-1 block font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]";

function ContactEditForm({
  contact,
  contacts,
  onSave,
  onCancel,
}: {
  contact: WorkContact;
  contacts: WorkContact[];
  onSave: (u: Partial<WorkContact>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(contact.name);
  const [status, setStatus] = useState<WorkContactStatus>(contact.status);
  const [phone, setPhone] = useState(contact.phone);
  const [email, setEmail] = useState(contact.email);
  const [source, setSource] = useState(contact.source);
  const [nextStep, setNextStep] = useState(contact.nextStep);
  const [notes, setNotes] = useState(contact.notes);

  return (
    <div className="space-y-2 bg-[var(--bg-panel-strong)] px-5 py-3 border-t border-[var(--surface-border)]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as WorkContactStatus)} className={inputClass}>
            {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555…" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@…" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Source</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Referral" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Next step</label>
          <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Follow up…" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" className={inputClass} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave({ name, status, phone, email, source, nextStep, notes })}
          className="h-7 rounded-md bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-7 rounded-md border border-[var(--surface-border)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ProjectEditForm({
  project,
  contacts,
  onSave,
  onCancel,
}: {
  project: WorkProject;
  contacts: WorkContact[];
  onSave: (u: Partial<WorkProject>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [status, setStatus] = useState<WorkProjectStatus>(project.status);
  const [contactId, setContactId] = useState(project.contactId);
  const [deadline, setDeadline] = useState(project.deadline);
  const [notes, setNotes] = useState(project.notes);
  const [progress, setProgress] = useState(String(project.progress));

  return (
    <div className="space-y-2 bg-[var(--bg-panel-strong)] px-5 py-3 border-t border-[var(--surface-border)]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as WorkProjectStatus)} className={inputClass}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Client</label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Deadline</label>
          <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="YYYY-MM-DD" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Progress %</label>
          <input type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" className={inputClass} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave({ title, status, contactId, deadline, notes, progress: Number(progress) })}
          className="h-7 rounded-md bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-7 rounded-md border border-[var(--surface-border)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function WorkListsSection() {
  const contacts = useWorkStore((s) => s.contacts).filter((c) => !c.archivedAt);
  const projects = useWorkStore((s) => s.projects).filter((p) => !p.archivedAt);
  const createContact = useWorkStore((s) => s.createContact);
  const createProject = useWorkStore((s) => s.createProject);
  const updateContact = useWorkStore((s) => s.updateContact);
  const archiveContact = useWorkStore((s) => s.archiveContact);
  const updateProject = useWorkStore((s) => s.updateProject);
  const archiveProject = useWorkStore((s) => s.archiveProject);

  const [contactName, setContactName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);

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
    <section className="px-4 py-8 sm:px-5 md:px-8">
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
          <div className="border-b border-[var(--surface-border)] px-4 py-4 sm:px-5">
            <p className="font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
              Clients / Leads
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addContact()}
                placeholder="New lead name"
                className="h-9 flex-1 min-w-0 rounded-lg px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void addContact()}
                className="h-9 shrink-0 rounded-lg bg-[var(--accent-solid)] px-3 font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
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
                <div key={contact.id} className={i > 0 ? "border-t border-[var(--surface-border)]/50" : ""}>
                  <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-highlight)] sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{contact.name}</p>
                      <p className="mt-0.5 font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                        {contact.email || contact.phone || "—"}
                      </p>
                      {contact.nextStep && (
                        <p className="mt-0.5 text-[0.625rem] text-[var(--accent-soft)]/70">→ {contact.nextStep}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`rounded-full border px-2 py-0.5 font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.12em] ${CONTACT_STATUS_COLOR[contact.status]}`}>
                        {contact.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingContact(editingContact === contact.id ? null : contact.id)}
                        className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:text-[var(--text-primary)]"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Archive "${contact.name}"?`))
                            void archiveContact(contact.id);
                        }}
                        className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:text-[var(--danger)]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {editingContact === contact.id && (
                    <ContactEditForm
                      contact={contact}
                      contacts={contacts}
                      onSave={async (u) => { await updateContact(contact.id, u); setEditingContact(null); }}
                      onCancel={() => setEditingContact(null)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Projects */}
        <div className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]">
          <div className="border-b border-[var(--surface-border)] px-4 py-4 sm:px-5">
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
                <div key={project.id} className={i > 0 ? "border-t border-[var(--surface-border)]/50" : ""}>
                  <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-highlight)] sm:px-5">
                    <div className="min-w-0 flex-1">
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
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`rounded-full border px-2 py-0.5 font-[family-name:var(--font-display)] text-[0.5rem] font-bold uppercase tracking-[0.12em] ${PROJECT_STATUS_COLOR[project.status]}`}>
                        {project.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingProject(editingProject === project.id ? null : project.id)}
                        className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:text-[var(--text-primary)]"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Archive "${project.title}"?`))
                            void archiveProject(project.id);
                        }}
                        className="rounded p-1 text-[0.625rem] text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:text-[var(--danger)]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {editingProject === project.id && (
                    <ProjectEditForm
                      project={project}
                      contacts={contacts}
                      onSave={async (u) => { await updateProject(project.id, u); setEditingProject(null); }}
                      onCancel={() => setEditingProject(null)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
