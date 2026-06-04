"use client";

import { useMemo, useState } from "react";
import { useWorkStore } from "@/lib/stores/work-store";
import type { WorkContactStatus, WorkProjectStatus } from "@/lib/types";

export function WorkListsSection() {
  const contacts = useWorkStore((state) => state.contacts).filter(
    (contact) => !contact.archivedAt,
  );
  const projects = useWorkStore((state) => state.projects).filter(
    (project) => !project.archivedAt,
  );
  const createContact = useWorkStore((state) => state.createContact);
  const createProject = useWorkStore((state) => state.createProject);
  const [contactName, setContactName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const contactById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
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
      <div className="mb-5">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#787774]">
          02 · Freelance work
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1f1b17]">
          Clients / Leads and Projects
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#EAEAEA] bg-white">
          <div className="border-b border-[#EAEAEA] p-5">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#1f1b17]">
              Clients / Leads
            </h3>
            <div className="mt-3 flex gap-2">
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="New lead name"
                className="h-10 flex-1 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void addContact()}
                className="h-10 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white"
              >
                New client
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#EAEAEA] px-5">
            {contacts.length === 0 ? (
              <p className="py-6 text-sm text-[#787774]">No clients or leads yet.</p>
            ) : (
              contacts.map((contact) => (
                <article
                  key={contact.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-[#1f1b17]">{contact.name}</p>
                    <p className="mt-1 text-sm text-[#787774]">
                      {contact.email || contact.phone || "No contact details yet"}
                    </p>
                    {contact.nextStep ? (
                      <p className="mt-1 text-xs text-[#956400]">Next: {contact.nextStep}</p>
                    ) : null}
                  </div>
                  <span className="h-fit rounded-full bg-[#EDF3EC] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#346538]">
                    {contact.status}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#EAEAEA] bg-white">
          <div className="border-b border-[#EAEAEA] p-5">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#1f1b17]">Projects</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
              <input
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
                placeholder="New project title"
                className="h-10 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm outline-none"
              />
              <select
                value={selectedContactId}
                onChange={(event) => setSelectedContactId(event.target.value)}
                className="h-10 rounded-lg border border-[#EAEAEA] bg-[#F7F6F3] px-3 text-sm outline-none"
              >
                <option value="">Select client</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedContactId}
                onClick={() => void addProject()}
                className="h-10 rounded-md bg-[#111111] px-3 text-xs font-semibold text-white disabled:opacity-40"
              >
                New project
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#EAEAEA] px-5">
            {projects.length === 0 ? (
              <p className="py-6 text-sm text-[#787774]">No projects yet.</p>
            ) : (
              projects.map((project) => (
                <article
                  key={project.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-[#1f1b17]">{project.title}</p>
                    <p className="mt-1 text-sm text-[#787774]">
                      Attached to{" "}
                      {contactById.get(project.contactId)?.name ?? "Unknown contact"}
                    </p>
                    {project.deadline ? (
                      <p className="mt-1 text-xs text-[#956400]">Deadline: {project.deadline}</p>
                    ) : null}
                  </div>
                  <span className="h-fit rounded-full bg-[#E1F3FE] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#1F6C9F]">
                    {project.status}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
