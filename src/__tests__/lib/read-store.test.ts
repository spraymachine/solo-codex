import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";

describe("read store", () => {
  beforeEach(async () => {
    await Promise.all([
      getDb("mani").readRecords.clear(),
      getDb("harti").readRecords.clear(),
    ]);
    usePersonaStore.setState({ activePersona: "mani" });
    useReadStore.setState({ records: [], loaded: false });
  });

  it("creates records for the active persona", async () => {
    await useReadStore.getState().createRecords([
      {
        word: "thesis",
        definition: "A statement or theory put forward as a premise.",
        partOfSpeech: "noun",
        myDefinition: "",
        synonyms: [],
        allDefinitions: [],
        allSynonyms: [],
        sourceType: "book",
      },
    ]);

    expect(useReadStore.getState().records).toHaveLength(1);
    expect(useReadStore.getState().records[0].word).toBe("thesis");

    const maniRecords = await getDb("mani").readRecords.toArray();
    const hartiRecords = await getDb("harti").readRecords.toArray();
    expect(maniRecords).toHaveLength(1);
    expect(hartiRecords).toHaveLength(0);
  });

  it("does not leak records across personas", async () => {
    await useReadStore.getState().createRecords([
      {
        word: "syntax",
        definition: "The arrangement of words and phrases.",
        partOfSpeech: "noun",
        myDefinition: "",
        synonyms: [],
        allDefinitions: [],
        allSynonyms: [],
        sourceType: "note",
      },
    ]);

    usePersonaStore.setState({ activePersona: "harti" });
    useReadStore.setState({ records: [], loaded: false });
    await useReadStore.getState().load("harti");

    expect(useReadStore.getState().records).toEqual([]);

    await useReadStore.getState().createRecords([
      {
        word: "orbit",
        definition: "A curved path around a star, planet, or moon.",
        partOfSpeech: "noun",
        myDefinition: "",
        synonyms: [],
        allDefinitions: [],
        allSynonyms: [],
        sourceType: "newspaper",
      },
    ]);

    usePersonaStore.setState({ activePersona: "mani" });
    await useReadStore.getState().load("mani");

    expect(useReadStore.getState().records.map((record) => record.word)).toEqual(["syntax"]);
  });

  it("stores and loads myDefinition, synonyms, allDefinitions, allSynonyms", async () => {
    await useReadStore.getState().createRecords([
      {
        word: "ephemeral",
        definition: "Lasting for a very short time.",
        partOfSpeech: "adjective",
        myDefinition: "things that don't last long, like a vibe",
        synonyms: ["fleeting", "transient"],
        allDefinitions: [
          { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "fashions are ephemeral" },
        ],
        allSynonyms: ["fleeting", "transient", "momentary"],
        sourceType: "book",
      },
    ]);

    const record = useReadStore.getState().records[0];
    expect(record.myDefinition).toBe("things that don't last long, like a vibe");
    expect(record.synonyms).toEqual(["fleeting", "transient"]);
    expect(record.allDefinitions).toEqual([
      { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "fashions are ephemeral" },
    ]);
    expect(record.allSynonyms).toEqual(["fleeting", "transient", "momentary"]);
  });

  it("enforces max 2 synonyms on create", async () => {
    await useReadStore.getState().createRecords([
      {
        word: "verbose",
        definition: "Using more words than needed.",
        partOfSpeech: "adjective",
        myDefinition: "",
        synonyms: ["wordy", "long-winded", "prolix"],
        allDefinitions: [],
        allSynonyms: [],
        sourceType: "book",
      },
    ]);

    expect(useReadStore.getState().records[0].synonyms).toHaveLength(2);
  });

  it("updates myDefinition and synonyms via updateRecord", async () => {
    await useReadStore.getState().createRecords([
      {
        word: "lucid",
        definition: "Expressed clearly.",
        partOfSpeech: "adjective",
        myDefinition: "",
        synonyms: [],
        allDefinitions: [],
        allSynonyms: [],
        sourceType: "book",
      },
    ]);

    const id = useReadStore.getState().records[0].id;
    await useReadStore.getState().updateRecord(id, {
      myDefinition: "super clear",
      synonyms: ["clear", "coherent"],
    });

    const updated = useReadStore.getState().records.find((r) => r.id === id);
    expect(updated?.myDefinition).toBe("super clear");
    expect(updated?.synonyms).toEqual(["clear", "coherent"]);
  });

  it("stores and updates bookId on a record", async () => {
    await useReadStore.getState().createRecords([
      {
        word: "umbra",
        definition: "The fully shaded inner region of a shadow.",
        partOfSpeech: "noun",
        myDefinition: "",
        synonyms: [],
        allDefinitions: [],
        allSynonyms: [],
        sourceType: "book",
        bookId: "book-123",
      },
    ]);

    const created = useReadStore.getState().records[0];
    expect(created.bookId).toBe("book-123");

    await useReadStore.getState().updateRecord(created.id, { bookId: "book-456" });
    const updated = useReadStore.getState().records.find((r) => r.id === created.id);
    expect(updated?.bookId).toBe("book-456");
  });
});
