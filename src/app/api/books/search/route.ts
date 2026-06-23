import { NextResponse } from "next/server";
import { parseGoogleBooks } from "./parse";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });

  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "10");
  if (key) url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 200 });
    const results = parseGoogleBooks(await res.json());
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
