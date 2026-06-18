import { describe, expect, it } from "vitest";
import { parseDictionaryDefinition } from "@/lib/read/dictionary";
import { cleanReadWord, parseOcrSpaceWords } from "@/lib/read/ocr-space";

describe("Read parsers", () => {
  it("extracts OCR.space word boxes", () => {
    const words = parseOcrSpaceWords({
      ParsedResults: [
        {
          TextOverlay: {
            Lines: [
              {
                Words: [
                  { WordText: "Entropy", Left: 12, Top: 24, Width: 80, Height: 20 },
                  { WordText: "!", Left: 95, Top: 24, Width: 5, Height: 20 },
                ],
              },
            ],
          },
        },
      ],
    });

    expect(words).toEqual([
      {
        id: "0-entropy-12-24",
        text: "Entropy",
        left: 12,
        top: 24,
        width: 80,
        height: 20,
      },
    ]);
  });

  it("throws OCR.space processing errors", () => {
    expect(() =>
      parseOcrSpaceWords({
        IsErroredOnProcessing: true,
        ErrorMessage: ["File failed validation"],
      }),
    ).toThrow("File failed validation");
  });

  it("cleans punctuation from detected words", () => {
    expect(cleanReadWord('"velocity,"')).toBe("velocity");
    expect(cleanReadWord("co-operate")).toBe("co-operate");
  });

  it("extracts the first dictionary definition", () => {
    const definition = parseDictionaryDefinition("harvest", [
      {
        word: "harvest",
        meanings: [
          {
            partOfSpeech: "noun",
            definitions: [{ definition: "The process of gathering a crop." }],
          },
        ],
      },
    ]);

    expect(definition).toEqual({
      word: "harvest",
      definition: "The process of gathering a crop.",
      partOfSpeech: "noun",
    });
  });

  it("returns an editable blank definition when dictionary has no match", () => {
    expect(parseDictionaryDefinition("unknown", { title: "No Definitions Found" })).toEqual({
      word: "unknown",
      definition: "",
      partOfSpeech: "",
    });
  });
});
