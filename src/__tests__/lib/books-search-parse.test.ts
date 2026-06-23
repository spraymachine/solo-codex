import { describe, expect, it } from "vitest";
import { parseGoogleBooks } from "@/lib/books/parse";

describe("parseGoogleBooks", () => {
  it("maps volumes to trimmed results", () => {
    const payload = {
      items: [
        {
          id: "vol-1",
          volumeInfo: {
            title: "Deep Work",
            authors: ["Cal Newport"],
            pageCount: 296,
            imageLinks: { thumbnail: "http://books/img?zoom=1" },
          },
        },
        { id: "vol-2", volumeInfo: { title: "No Author Book" } },
      ],
    };
    const out = parseGoogleBooks(payload);
    expect(out).toEqual([
      { volumeId: "vol-1", title: "Deep Work", authors: ["Cal Newport"], coverUrl: "https://books/img?zoom=1", totalPages: 296 },
      { volumeId: "vol-2", title: "No Author Book", authors: [], coverUrl: null, totalPages: null },
    ]);
  });

  it("returns [] for malformed payloads", () => {
    expect(parseGoogleBooks(null)).toEqual([]);
    expect(parseGoogleBooks({})).toEqual([]);
  });
});
