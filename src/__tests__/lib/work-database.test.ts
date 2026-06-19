import { afterEach, describe, expect, it } from "vitest";
import { getLegacyWorkDatabaseName, getWorkDatabaseName, getWorkDb, resetWorkDbForTests } from "@/lib/db/work-database";
import type { WorkContact } from "@/lib/types";

describe("work database", () => {
  afterEach(async () => {
    await resetWorkDbForTests();
  });

  it("names the database by user and persona", () => {
    expect(getWorkDatabaseName()).toBe("SoloWorkDB-local-mani");
    expect(getWorkDatabaseName(undefined, "harti")).toBe("SoloWorkDB-local-harti");
    expect(getWorkDatabaseName("user-1", "mani")).toBe("SoloWorkDB-user-1-mani");
    expect(getWorkDatabaseName("user-1", "harti")).toBe("SoloWorkDB-user-1-harti");
  });

  it("keeps the pre-persona legacy database name stable", () => {
    expect(getLegacyWorkDatabaseName()).toBe("SoloWorkDB-local");
    expect(getLegacyWorkDatabaseName("user-1")).toBe("SoloWorkDB-user-1");
  });

  it("gives mani and harti separate physical databases", async () => {
    const maniDb = getWorkDb(undefined, "mani");
    const hartiDb = getWorkDb(undefined, "harti");
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

    await maniDb.contacts.add(contact);

    expect(await maniDb.contacts.toArray()).toHaveLength(1);
    expect(await hartiDb.contacts.toArray()).toHaveLength(0);
  });
});
