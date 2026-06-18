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
        sourceType: "newspaper",
      },
    ]);

    usePersonaStore.setState({ activePersona: "mani" });
    await useReadStore.getState().load("mani");

    expect(useReadStore.getState().records.map((record) => record.word)).toEqual(["syntax"]);
  });
});
