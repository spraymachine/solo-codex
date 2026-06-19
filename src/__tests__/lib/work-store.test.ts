import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { getLegacyWorkDb, resetWorkDbForTests } from "@/lib/db/work-database";
import { useWorkStore } from "@/lib/stores/work-store";

function resetWorkStoreState() {
  useWorkStore.setState({
    contacts: [],
    projects: [],
    courses: [],
    chapters: [],
    milestones: [],
    loaded: false,
  });
}

describe("work store", () => {
  beforeEach(async () => {
    await resetWorkDbForTests();
    await getDb("mani").leads.clear();
    await getDb("harti").leads.clear();
    resetWorkStoreState();
  });

  afterEach(async () => {
    await resetWorkDbForTests();
    await getDb("mani").leads.clear();
    await getDb("harti").leads.clear();
  });

  it("creates and archives contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "+91 93469 07002",
      email: "founder@studio.in",
      notes: "Final quote sent.",
      phoneLabel: "",
      phone2: "", phone2Label: "",
    });

    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(contact.status).toBe("client");

    await useWorkStore.getState().archiveContact(contact.id);
    expect(useWorkStore.getState().contacts[0].archivedAt).not.toBeNull();
  });

  it("rejects project creation without contactId", async () => {
    await expect(
      useWorkStore.getState().createProject({
        contactId: "",
        title: "Lite booking system",
        status: "active",
        deadline: "2026-06-18",
        notes: "Launch scope",
        progress: 62,
      }),
    ).rejects.toThrow("Project requires a client or lead.");
  });

  it("creates projects attached to contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "",
      email: "",
      notes: "",
      phoneLabel: "",
      phone2: "", phone2Label: "",
    });

    const project = await useWorkStore.getState().createProject({
      contactId: contact.id,
      title: "Lite booking system",
      status: "active",
      deadline: "2026-06-18",
      notes: "Launch scope",
      progress: 62,
    });

    expect(project.contactId).toBe(contact.id);
    expect(useWorkStore.getState().projects).toHaveLength(1);
  });

  it("rejects project contact updates to missing contacts", async () => {
    const contact = await useWorkStore.getState().createContact({
      name: "Studio Set Go",
      status: "client",
      phone: "",
      email: "",
      notes: "",
      phoneLabel: "",
      phone2: "", phone2Label: "",
    });
    const project = await useWorkStore.getState().createProject({
      contactId: contact.id,
      title: "Lite booking system",
      status: "active",
      deadline: "2026-06-18",
      notes: "Launch scope",
      progress: 62,
    });

    await expect(
      useWorkStore.getState().updateProject(project.id, { contactId: "" }),
    ).rejects.toThrow("Project requires a client or lead.");
    await expect(
      useWorkStore.getState().updateProject(project.id, { contactId: "missing-contact" }),
    ).rejects.toThrow("Project requires an existing client or lead.");
  });

  it("saves parsed courses with chapters and milestones", async () => {
    await useWorkStore.getState().saveParsedCourse({
      course: {
        title: "Advanced Next.js",
        url: "https://course.com",
        goal: "Ship better SaaS work",
        deadline: "2026-07-30",
        source: "Udemy",
        status: "active",
      },
      chapters: [
        {
          title: "Routing",
          deadline: "2026-06-12",
          estimate: "3h",
          milestones: [
            {
              title: "Watch routing lessons",
              deadline: "2026-06-10",
              estimate: "45m",
              link: "https://lesson.com",
              notes: "Focus on behavior changes.",
            },
          ],
        },
      ],
      errors: [],
      warnings: [],
    });

    expect(useWorkStore.getState().courses).toHaveLength(1);
    expect(useWorkStore.getState().chapters).toHaveLength(1);
    expect(useWorkStore.getState().milestones).toHaveLength(1);
    expect(useWorkStore.getState().milestones[0].completed).toBe(false);
  });

  it("migrates old persona leads into shared contacts once when contacts are empty", async () => {
    await getDb("mani").leads.add({
      id: "lead-1",
      name: "Apex Fitness",
      phone: "",
      email: "apex@example.com",
      notes: "WhatsApp inquiry",
      createdAt: "2026-06-04T00:00:00.000Z",
    });

    await useWorkStore.getState().load("mani");

    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(useWorkStore.getState().contacts[0].name).toBe("Apex Fitness");
    expect(useWorkStore.getState().contacts[0].email).toBe("apex@example.com");

    await useWorkStore.getState().load("mani");
    expect(useWorkStore.getState().contacts).toHaveLength(1);
  });

  it("migrates leads from both personas and deduplicates matches", async () => {
    await getDb("mani").leads.add({
      id: "lead-1",
      name: "Apex Fitness",
      phone: "+91 90000 00000",
      email: "apex@example.com",
      notes: "First note",
      createdAt: "2026-06-04T00:00:00.000Z",
    });
    await getDb("harti").leads.add({
      id: "lead-2",
      name: " apex fitness ",
      phone: "+91 90000 00000",
      email: "APEX@example.com",
      notes: "Duplicate note",
      createdAt: "2026-06-05T00:00:00.000Z",
    });
    await getDb("harti").leads.add({
      id: "lead-3",
      name: "Studio Set Go",
      phone: "",
      email: "studio@example.com",
      notes: "Harti lead",
      createdAt: "2026-06-06T00:00:00.000Z",
    });

    await useWorkStore.getState().load("mani");

    expect(useWorkStore.getState().contacts.map((contact) => contact.name)).toEqual([
      "Studio Set Go",
      "Apex Fitness",
    ]);
  });

  it("does not duplicate migrated leads during concurrent loads", async () => {
    await getDb("mani").leads.add({
      id: "lead-1",
      name: "Apex Fitness",
      phone: "",
      email: "apex@example.com",
      notes: "WhatsApp inquiry",
      createdAt: "2026-06-04T00:00:00.000Z",
    });

    await Promise.all([useWorkStore.getState().load("mani"), useWorkStore.getState().load("mani")]);

    expect(useWorkStore.getState().contacts).toHaveLength(1);
  });

  it("migrates existing combined work data to Mani only, leaving Harti empty", async () => {
    const legacyDb = getLegacyWorkDb();
    await legacyDb.contacts.add({
      id: "legacy-contact-1",
      name: "Old Shared Client",
      status: "client",
      phone: "",
      phoneLabel: "",
      phone2: "",
      phone2Label: "",
      email: "old@example.com",
      notes: "",
      archivedAt: null,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });

    await useWorkStore.getState().load("mani");
    expect(useWorkStore.getState().contacts.map((c) => c.name)).toEqual(["Old Shared Client"]);

    resetWorkStoreState();
    await useWorkStore.getState().load("harti");
    expect(useWorkStore.getState().contacts).toEqual([]);
  });

  it("keeps Mani and Harti work data isolated", async () => {
    await useWorkStore.getState().load("mani");
    const maniContact = await useWorkStore.getState().createContact({
      name: "Mani's Client",
      status: "client",
      phone: "", email: "", notes: "",
      phoneLabel: "", phone2: "", phone2Label: "",
    });
    expect(useWorkStore.getState().contacts).toHaveLength(1);

    resetWorkStoreState();
    await useWorkStore.getState().load("harti");
    expect(useWorkStore.getState().contacts).toHaveLength(0);

    const hartiContact = await useWorkStore.getState().createContact({
      name: "Harti's Client",
      status: "lead",
      phone: "", email: "", notes: "",
      phoneLabel: "", phone2: "", phone2Label: "",
    });
    expect(useWorkStore.getState().contacts).toHaveLength(1);
    expect(hartiContact.id).not.toBe(maniContact.id);

    resetWorkStoreState();
    await useWorkStore.getState().load("mani");
    expect(useWorkStore.getState().contacts.map((c) => c.id)).toEqual([maniContact.id]);
  });
});
