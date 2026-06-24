import type { BookSearchResult } from "@/lib/books/types";
import { parseGoogleBooks } from "@/lib/books/parse";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limiter";

export async function searchGoogleBooks(query: string, userId?: string): Promise<BookSearchResult[]> {
  // Rate limit check (skip if userId not provided)
  if (userId) {
    const { allowed, resetMs } = checkRateLimit("googleBooks", userId);
    if (!allowed) {
      throw new RateLimitError("googleBooks", resetMs);
    }
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "10");
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  return parseGoogleBooks(await res.json());
}
