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

function cleanWiktionaryText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\s*\.[a-z][\w-]*\s*\{[^}]*\}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseDictionaryDefinition(payload: unknown, resolvedWord: string): ReadDefinition | null {
  if (!Array.isArray(payload)) return null;

  for (const entry of payload as DictionaryEntry[]) {
    const word =
      typeof entry.word === "string" && entry.word.trim() ? entry.word.trim() : resolvedWord;
    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
    for (const meaning of meanings as DictionaryMeaning[]) {
      const pos = typeof meaning.partOfSpeech === "string" ? meaning.partOfSpeech.trim() : "";
      const defs = Array.isArray(meaning.definitions) ? meaning.definitions : [];
      for (const def of defs as DictionaryDefinition[]) {
        const text = typeof def.definition === "string" ? def.definition.trim() : "";
        if (text) return { word, definition: text, partOfSpeech: pos };
      }
    }
  }

  return null;
}

export function parseWiktionaryDefinition(payload: unknown, resolvedWord: string): ReadDefinition | null {
  if (!payload || typeof payload !== "object") return null;

  for (const section of Object.values(payload as Record<string, unknown>)) {
    if (!Array.isArray(section)) continue;
    for (const entry of section as Array<{ partOfSpeech?: unknown; definitions?: unknown }>) {
      const pos = typeof entry.partOfSpeech === "string" ? entry.partOfSpeech.trim() : "";
      const defs = Array.isArray(entry.definitions) ? entry.definitions : [];
      for (const def of defs as Array<{ definition?: unknown }>) {
        const raw = typeof def.definition === "string" ? def.definition : "";
        const text = cleanWiktionaryText(raw);
        if (text) return { word: resolvedWord, definition: text, partOfSpeech: pos };
      }
    }
  }

  return null;
}

export async function fetchDictionaryDefinition(word: string): Promise<ReadDefinition> {
  const normalizedWord = normalizeLookupWord(word);
  if (!normalizedWord) return { word, definition: "", partOfSpeech: "" };

  const primary = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
  );

  if (primary.ok) {
    const result = parseDictionaryDefinition(await primary.json(), normalizedWord);
    if (result?.definition) return result;
  }

  try {
    const fallback = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(normalizedWord)}`,
    );
    if (fallback.ok) {
      const result = parseWiktionaryDefinition(await fallback.json(), normalizedWord);
      if (result) return result;
    }
  } catch {
    // Wiktionary unavailable
  }

  return { word: normalizedWord, definition: "", partOfSpeech: "" };
}
