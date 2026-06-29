import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ReadPage } from "@/components/read/read-page";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";

describe("ReadPage", () => {
  beforeEach(async () => {
    await getDb("mani").readRecords.clear();
    usePersonaStore.setState({ activePersona: "mani" });
    useReadStore.setState({ records: [], loaded: false });
  });

  it("renders capture controls and empty record state", async () => {
    render(<ReadPage />);

    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a word…")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("No saved words")).toBeInTheDocument());
  });

  it("renders saved word with delete button always visible", async () => {
    await getDb("mani").readRecords.add({
      id: "read-1",
      word: "cadence",
      definition: "A rhythm or sequence of sounds.",
      partOfSpeech: "noun",
      myDefinition: "",
      synonyms: [],
      allDefinitions: [],
      allSynonyms: [],
      sourceType: "book",
      favorite: false,
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z",
    });

    render(<ReadPage />);

    await waitFor(() => expect(screen.getByText("cadence")).toBeInTheDocument());
    expect(screen.getByText("A rhythm or sequence of sounds.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete cadence" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders myDefinition above actual definition when set", async () => {
    await getDb("mani").readRecords.add({
      id: "read-2",
      word: "ephemeral",
      definition: "Lasting for a very short time.",
      partOfSpeech: "adjective",
      myDefinition: "things that don't last long, like a vibe",
      synonyms: ["fleeting", "transient"],
      allDefinitions: [],
      allSynonyms: [],
      sourceType: "book",
      favorite: false,
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z",
    });

    render(<ReadPage />);

    await waitFor(() => expect(screen.getByText("ephemeral")).toBeInTheDocument());
    expect(screen.getByText("things that don't last long, like a vibe")).toBeInTheDocument();
    expect(screen.getByText("fleeting")).toBeInTheDocument();
    expect(screen.getByText("transient")).toBeInTheDocument();
  });
});
