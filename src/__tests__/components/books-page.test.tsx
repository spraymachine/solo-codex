import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";
import { BooksPage } from "@/components/books/books-page";

describe("BooksPage", () => {
  beforeEach(async () => {
    await getDb("mani").books.clear();
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: false });
  });

  it("renders shelf headings and a created book", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Dune", authors: ["Frank Herbert"],
      coverUrl: null, totalPages: 412, shelf: "reading",
    });
    render(<BooksPage />);
    expect(await screen.findByText("Currently reading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Dune").length).toBeGreaterThan(0));
  });
});
