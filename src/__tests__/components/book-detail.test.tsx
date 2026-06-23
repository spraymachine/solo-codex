import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import { useReadStore } from "@/lib/stores/read-store";
import { BookDetail } from "@/components/books/book-detail";

describe("BookDetail", () => {
  beforeEach(async () => {
    await Promise.all([getDb("mani").books.clear(), getDb("mani").readRecords.clear()]);
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: true });
    useReadStore.setState({ records: [], loaded: true });
  });

  it("moves a book to Read and sets a rating", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "1984", authors: ["Orwell"], coverUrl: null, totalPages: 328, shelf: "reading",
    });
    const book = useBooksStore.getState().books[0];

    render(<BookDetail book={book} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /^read$/i }));
    await waitFor(() => expect(useBooksStore.getState().books[0].shelf).toBe("read"));

    fireEvent.click(screen.getByRole("button", { name: /rate 4/i }));
    await waitFor(() => expect(useBooksStore.getState().books[0].rating).toBe(4));
  });

  it("lists words tagged to this book", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Dune", authors: ["Herbert"], coverUrl: null, totalPages: 412, shelf: "reading",
    });
    const book = useBooksStore.getState().books[0];
    await useReadStore.getState().createRecords([
      { word: "fremen", definition: "desert people", partOfSpeech: "noun", myDefinition: "", synonyms: [], allDefinitions: [], allSynonyms: [], sourceType: "book", bookId: book.id },
    ]);
    render(<BookDetail book={book} onClose={() => {}} />);
    expect(screen.getByText("fremen")).toBeInTheDocument();
  });
});
