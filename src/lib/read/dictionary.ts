export interface ReadDefinition {
  word: string;
  definition: string;
  partOfSpeech: string;
}

interface DictionaryDefinition {
  definition?: unknown;
}

interface DictionaryMeaning {
  partOfSpeech?: unknown;
  definitions?: unknown;
}

interface DictionaryEntry {
  word?: unknown;
  meanings?: unknown;
}

function normalizeLookupWord(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9'-]/g, "").trim();
}

export function parseDictionaryDefinition(
  word: string,
  payload: unknown,
): ReadDefinition {
  const normalizedWord = normalizeLookupWord(word);

  if (!Array.isArray(payload)) {
    return { word: normalizedWord || word, definition: "", partOfSpeech: "" };
  }

  for (const entry of payload as DictionaryEntry[]) {
    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
    for (const meaning of meanings as DictionaryMeaning[]) {
      const definitions = Array.isArray(meaning.definitions) ? meaning.definitions : [];
      const firstDefinition = (definitions as DictionaryDefinition[]).find(
        (item) => typeof item.definition === "string" && item.definition.trim(),
      );

      if (firstDefinition?.definition && typeof firstDefinition.definition === "string") {
        return {
          word:
            typeof entry.word === "string" && entry.word.trim()
              ? entry.word.trim()
              : normalizedWord || word,
          definition: firstDefinition.definition.trim(),
          partOfSpeech:
            typeof meaning.partOfSpeech === "string" ? meaning.partOfSpeech.trim() : "",
        };
      }
    }
  }

  return { word: normalizedWord || word, definition: "", partOfSpeech: "" };
}

export async function fetchDictionaryDefinition(word: string): Promise<ReadDefinition> {
  const normalizedWord = normalizeLookupWord(word);
  if (!normalizedWord) {
    return { word, definition: "", partOfSpeech: "" };
  }

  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
  );

  if (!response.ok) {
    return { word: normalizedWord, definition: "", partOfSpeech: "" };
  }

  return parseDictionaryDefinition(normalizedWord, await response.json());
}
