import type { BookSearchResult } from "@/lib/books/types";

export function parseGoogleBooks(payload: unknown): BookSearchResult[] {
  if (!payload || typeof payload !== "object") return [];
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  return items.map((raw) => {
    const item = raw as { id?: unknown; volumeInfo?: Record<string, unknown> };
    const info = item.volumeInfo ?? {};
    const thumb = (info.imageLinks as { thumbnail?: unknown } | undefined)?.thumbnail;
    const coverUrl = typeof thumb === "string" ? thumb.replace(/^http:/, "https:") : null;
    return {
      volumeId: typeof item.id === "string" ? item.id : "",
      title: typeof info.title === "string" ? info.title : "Untitled",
      authors: Array.isArray(info.authors) ? (info.authors as unknown[]).filter((a): a is string => typeof a === "string") : [],
      coverUrl,
      totalPages: typeof info.pageCount === "number" ? info.pageCount : null,
    };
  }).filter((r) => r.volumeId);
}
