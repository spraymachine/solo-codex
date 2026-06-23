import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import type { Book, Persona } from "@/lib/types";

function sb() {
  const client = getSupabaseBrowserClient();
  if (!client || !isSupabaseConfigured()) return null;
  return client;
}

export async function getBooksUserId(): Promise<string | null> {
  const client = sb();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

export function rowToBook(r: any): Book {
  return {
    id: r.id,
    googleVolumeId: r.google_volume_id ?? null,
    title: r.title,
    authors: r.authors ?? [],
    coverUrl: r.cover_url ?? null,
    totalPages: r.total_pages ?? null,
    shelf: r.shelf,
    currentPage: r.current_page ?? 0,
    rating: r.rating ?? null,
    notes: r.notes ?? "",
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function fetchBooks(userId: string, persona: Persona): Promise<Book[] | null> {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .eq("persona", persona)
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []).map(rowToBook);
}

export async function sbCreateBook(userId: string, persona: Persona, book: Book) {
  const client = sb();
  if (!client) return;
  await client.from("books").upsert({
    id: book.id,
    user_id: userId,
    persona,
    google_volume_id: book.googleVolumeId,
    title: book.title,
    authors: book.authors,
    cover_url: book.coverUrl,
    total_pages: book.totalPages,
    shelf: book.shelf,
    current_page: book.currentPage,
    rating: book.rating,
    notes: book.notes,
    started_at: book.startedAt,
    finished_at: book.finishedAt,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
  });
}

export async function sbUpdateBook(
  userId: string,
  persona: Persona,
  id: string,
  updates: Partial<Book>,
) {
  const client = sb();
  if (!client) return;
  const patch: Record<string, unknown> = { updated_at: updates.updatedAt };
  if ("shelf" in updates) patch.shelf = updates.shelf;
  if ("currentPage" in updates) patch.current_page = updates.currentPage;
  if ("rating" in updates) patch.rating = updates.rating;
  if ("notes" in updates) patch.notes = updates.notes;
  if ("startedAt" in updates) patch.started_at = updates.startedAt;
  if ("finishedAt" in updates) patch.finished_at = updates.finishedAt;
  await client.from("books").update(patch).eq("user_id", userId).eq("persona", persona).eq("id", id);
}

export async function sbDeleteBook(userId: string, persona: Persona, id: string) {
  const client = sb();
  if (!client) return;
  await client.from("books").delete().eq("user_id", userId).eq("persona", persona).eq("id", id);
}
