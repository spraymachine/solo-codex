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

    expect(screen.getByRole("heading", { name: "Capture the margin." })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Camera/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Book" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("No Read records")).toBeInTheDocument());
  });

  it("renders saved records", async () => {
    await getDb("mani").readRecords.add({
      id: "read-1",
      word: "cadence",
      definition: "A rhythm or sequence of sounds.",
      partOfSpeech: "noun",
      sourceType: "book",
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z",
    });

    render(<ReadPage />);

    expect(await screen.findByDisplayValue("cadence")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A rhythm or sequence of sounds.")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Word" })).toBeInTheDocument();
  });
});
