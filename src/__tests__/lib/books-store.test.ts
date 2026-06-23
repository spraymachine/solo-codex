import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useBooksStore } from "@/lib/stores/books-store";

describe("books store", () => {
  beforeEach(async () => {
    await Promise.all([getDb("mani").books.clear(), getDb("harti").books.clear()]);
    usePersonaStore.setState({ activePersona: "mani" });
    useBooksStore.setState({ books: [], loaded: false });
  });

  it("creates a book for the active persona only", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: "v1", title: "Deep Work", authors: ["Cal Newport"],
      coverUrl: null, totalPages: 296, shelf: "want",
    });
    expect(useBooksStore.getState().books).toHaveLength(1);
    expect(await getDb("mani").books.count()).toBe(1);
    expect(await getDb("harti").books.count()).toBe(0);
  });

  it("does not leak books across personas", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "Dune", authors: ["Frank Herbert"],
      coverUrl: null, totalPages: 412, shelf: "reading",
    });
    usePersonaStore.setState({ activePersona: "harti" });
    useBooksStore.setState({ books: [], loaded: false });
    await useBooksStore.getState().load("harti");
    expect(useBooksStore.getState().books).toEqual([]);
  });

  it("setShelf to read stamps finishedAt and keeps rating editable", async () => {
    await useBooksStore.getState().createBook({
      googleVolumeId: null, title: "1984", authors: ["Orwell"],
      coverUrl: null, totalPages: 328, shelf: "reading",
    });
    const id = useBooksStore.getState().books[0].id;
    await useBooksStore.getState().setShelf(id, "read");
    const book = useBooksStore.getState().books.find((b) => b.id === id);
    expect(book?.shelf).toBe("read");
    expect(book?.finishedAt).toBeTruthy();
    await useBooksStore.getState().setRating(id, 4);
    expect(useBooksStore.getState().books.find((b) => b.id === id)?.rating).toBe(4);
  });
});
