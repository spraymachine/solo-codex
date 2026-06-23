import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";

describe("books storage", () => {
  beforeEach(async () => {
    await getDb("mani").books.clear();
    usePersonaStore.setState({ activePersona: "mani" });
  });

  it("creates and reads a book with defaults", async () => {
    const book = await storage.createBook({
      googleVolumeId: "vol-1",
      title: "Deep Work",
      authors: ["Cal Newport"],
      coverUrl: "http://x/cover.jpg",
      totalPages: 296,
      shelf: "want",
    });

    expect(book.id).toBeTruthy();
    expect(book.currentPage).toBe(0);
    expect(book.rating).toBeNull();
    expect(book.notes).toBe("");
    expect(book.startedAt).toBeNull();

    const all = await storage.getBooks();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Deep Work");
  });

  it("updates and deletes a book", async () => {
    const book = await storage.createBook({
      googleVolumeId: null, title: "Dune", authors: ["Frank Herbert"],
      coverUrl: null, totalPages: 412, shelf: "reading",
    });
    await storage.updateBook(book.id, { currentPage: 100, shelf: "reading" });
    expect((await storage.getBooks())[0].currentPage).toBe(100);

    await storage.deleteBook(book.id);
    expect(await storage.getBooks()).toHaveLength(0);
  });
});
