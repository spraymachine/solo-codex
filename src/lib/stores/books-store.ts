"use client";

import { create } from "zustand";
import { getDb } from "@/lib/db/database";
import { storage } from "@/lib/db/storage";
import { usePersonaStore } from "@/lib/stores/persona-store";
import {
  fetchBooks,
  getBooksUserId,
  sbCreateBook,
  sbDeleteBook,
  sbUpdateBook,
} from "@/lib/supabase/books";
import { nowISO } from "@/lib/utils";
import type { Book, BookShelf, Persona } from "@/lib/types";

interface BookInput {
  googleVolumeId: string | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalPages: number | null;
  shelf: BookShelf;
}

type BookUpdates = Partial<Pick<Book, "shelf" | "currentPage" | "rating" | "notes" | "startedAt" | "finishedAt">>;

interface BooksState {
  books: Book[];
  loaded: boolean;
  load: (persona?: Persona) => Promise<void>;
  createBook: (input: BookInput) => Promise<void>;
  updateBook: (id: string, updates: BookUpdates) => Promise<void>;
  setShelf: (id: string, shelf: BookShelf) => Promise<void>;
  setProgress: (id: string, currentPage: number) => Promise<void>;
  setRating: (id: string, rating: number | null) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
}

async function syncBooksToSupabase(fn: (userId: string) => Promise<void>) {
  try {
    const userId = await getBooksUserId();
    if (!userId) return;
    await fn(userId);
  } catch {
    // swallow — local state is source of truth
  }
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  loaded: false,

  async load(persona) {
    if (persona && usePersonaStore.getState().activePersona !== persona) return;

    if (persona) {
      try {
        const userId = await getBooksUserId();
        if (userId) {
          const cloud = await fetchBooks(userId, persona);
          if (cloud) {
            const db = getDb(persona);
            await db.transaction("rw", db.books, async () => {
              await db.books.clear();
              if (cloud.length > 0) await db.books.bulkAdd(cloud);
            });
            if (usePersonaStore.getState().activePersona !== persona) return;
            set({ books: cloud, loaded: true });
            return;
          }
        }
      } catch {
        // fall through to local
      }
    }

    const books = await storage.getBooks({ persona });
    if (persona && usePersonaStore.getState().activePersona !== persona) return;
    set({ books, loaded: true });
  },

  async createBook(input) {
    if (!input.title.trim()) return;
    const book = await storage.createBook(input);
    set((state) => ({
      books: [book, ...state.books].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
    const persona = usePersonaStore.getState().activePersona;
    void syncBooksToSupabase((uid) => sbCreateBook(uid, persona, book));
  },

  async updateBook(id, updates) {
    await storage.updateBook(id, updates);
    const updatedAt = nowISO();
    set((state) => ({
      books: state.books.map((b) => (b.id === id ? { ...b, ...updates, updatedAt } : b)),
    }));
    const persona = usePersonaStore.getState().activePersona;
    void syncBooksToSupabase((uid) => sbUpdateBook(uid, persona, id, { ...updates, updatedAt }));
  },

  async setShelf(id, shelf) {
    const book = get().books.find((b) => b.id === id);
    const updates: BookUpdates = { shelf };
    if (shelf === "reading" && !book?.startedAt) updates.startedAt = nowISO();
    if (shelf === "read" && !book?.finishedAt) updates.finishedAt = nowISO();
    await get().updateBook(id, updates);
  },

  async setProgress(id, currentPage) {
    await get().updateBook(id, { currentPage: Math.max(0, currentPage) });
  },

  async setRating(id, rating) {
    await get().updateBook(id, { rating });
  },

  async deleteBook(id) {
    await storage.deleteBook(id);
    set((state) => ({ books: state.books.filter((b) => b.id !== id) }));
    const persona = usePersonaStore.getState().activePersona;
    void syncBooksToSupabase((uid) => sbDeleteBook(uid, persona, id));
  },
}));
