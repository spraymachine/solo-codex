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
    const payload = [
      {
        word: "harvest",
        meanings: [
          {
            partOfSpeech: "noun",
            synonyms: [],
            definitions: [{ definition: "The process of gathering a crop.", synonyms: [] }],
          },
        ],
      },
    ];
    const result = parseDictionaryDefinition(payload, "harvest");
    expect(result.word).toBe("harvest");
    expect(result.definition).toBe("The process of gathering a crop.");
    expect(result.partOfSpeech).toBe("noun");
    expect(result.allDefinitions).toEqual([{ partOfSpeech: "noun", definition: "The process of gathering a crop.", source: "DictionaryAPI" }]);
    expect(result.allSynonyms).toEqual([]);
  });

  it("returns an editable blank definition when dictionary has no match", () => {
    const result = parseDictionaryDefinition({ title: "No Definitions Found" }, "unknown");
    expect(result).toEqual({ word: "unknown", definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] });
  });

  it("extracts all definitions and synonyms from a dictionary payload", () => {
    const payload = [
      {
        word: "ephemeral",
        meanings: [
          {
            partOfSpeech: "adjective",
            synonyms: ["fleeting", "transient"],
            definitions: [
              {
                definition: "Lasting for a very short time.",
                example: "fashions are ephemeral",
                synonyms: ["momentary"],
              },
              {
                definition: "Denoting a plant with a very short life cycle.",
                synonyms: [],
              },
            ],
          },
          {
            partOfSpeech: "noun",
            synonyms: [],
            definitions: [
              { definition: "An ephemeral plant.", synonyms: [] },
            ],
          },
        ],
      },
    ];

    const result = parseDictionaryDefinition(payload, "ephemeral");

    expect(result.word).toBe("ephemeral");
    expect(result.definition).toBe("Lasting for a very short time.");
    expect(result.partOfSpeech).toBe("adjective");
    expect(result.allDefinitions).toEqual([
      { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "fashions are ephemeral", source: "DictionaryAPI" },
      { partOfSpeech: "adjective", definition: "Denoting a plant with a very short life cycle.", source: "DictionaryAPI" },
      { partOfSpeech: "noun", definition: "An ephemeral plant.", source: "DictionaryAPI" },
    ]);
    expect(result.allSynonyms).toEqual(["fleeting", "transient", "momentary"]);
  });
});
