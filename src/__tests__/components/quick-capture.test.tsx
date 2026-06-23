import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import { QuickCapture } from "@/components/dashboard/quick-capture";

vi.mock("@/lib/read/dictionary", () => ({
  fetchDictionaryDefinition: vi.fn(async (word: string) => ({
    word, definition: "a test definition", partOfSpeech: "noun", allDefinitions: [], allSynonyms: [],
  })),
}));

describe("QuickCapture", () => {
  beforeEach(async () => {
    await Promise.all([getDb("mani").books.clear(), getDb("mani").readRecords.clear()]);
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: true });
    useReadStore.setState({ records: [], loaded: true });
  });

  it("saves a word tagged to the selected reading book on Enter", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Meta", authors: ["X"], coverUrl: null, totalPages: 100, shelf: "reading",
    });
    const bookId = useBooksStore.getState().books[0].id;

    render(<QuickCapture />);
    fireEvent.click(screen.getByRole("button", { name: "Meta" }));

    const input = screen.getByPlaceholderText(/quick word/i);
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      const records = useReadStore.getState().records;
      expect(records).toHaveLength(1);
      expect(records[0].word).toBe("hello");
      expect(records[0].bookId).toBe(bookId);
    });
    expect(await screen.findByText("a test definition")).toBeInTheDocument();
  });
});
