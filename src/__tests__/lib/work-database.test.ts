import { afterEach, describe, expect, it } from "vitest";
import { getWorkDatabaseName, getWorkDb, resetWorkDbForTests } from "@/lib/db/work-database";
import type { WorkContact } from "@/lib/types";

describe("work database", () => {
  afterEach(async () => {
    await resetWorkDbForTests();
  });

  it("uses one shared database name independent of persona", () => {
    expect(getWorkDatabaseName()).toBe("SoloWorkDB");
  });

  it("stores work contacts in the shared work database", async () => {
    const db = getWorkDb();
    const contact: WorkContact = {
      id: "contact-1",
      name: "Studio Set Go",
      status: "client",
      phone: "+91 93469 07002",
      email: "founder@studio.in",
      notes: "Final quote sent.",
      phoneLabel: "",
      phone2: "", phone2Label: "",
      archivedAt: null,
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    };

    await db.contacts.add(contact);

    const contacts = await db.contacts.toArray();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("Studio Set Go");
  });
});
