export interface DefinitionEntry {
  partOfSpeech: string;
  definition: string;
  example?: string;
  source?: string;
}

export interface ReadDefinition {
  word: string;
  definition: string;
  partOfSpeech: string;
  allDefinitions: DefinitionEntry[];
  allSynonyms: string[];
}

interface DictionaryDefinition {
  definition?: unknown;
  example?: unknown;
  synonyms?: unknown;
}

interface DictionaryMeaning {
  partOfSpeech?: unknown;
  definitions?: unknown;
  synonyms?: unknown;
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

export function parseDictionaryDefinition(payload: unknown, resolvedWord: string): ReadDefinition {
  const empty: ReadDefinition = { word: resolvedWord, definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] };

  if (!Array.isArray(payload)) return empty;

  const allDefinitions: DefinitionEntry[] = [];
  const synSet = new Set<string>();
  let firstWord = resolvedWord;
  let firstDef = "";
  let firstPos = "";

  for (const entry of payload as DictionaryEntry[]) {
    const word = typeof entry.word === "string" && entry.word.trim() ? entry.word.trim() : resolvedWord;
    if (firstWord === resolvedWord) firstWord = word;

    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
    for (const meaning of meanings as DictionaryMeaning[]) {
      const pos = typeof meaning.partOfSpeech === "string" ? meaning.partOfSpeech.trim() : "";

      if (Array.isArray(meaning.synonyms)) {
        for (const s of meaning.synonyms as unknown[]) {
          if (typeof s === "string" && s.trim()) synSet.add(s.trim());
        }
      }

      const defs = Array.isArray(meaning.definitions) ? meaning.definitions : [];
      for (const def of defs as DictionaryDefinition[]) {
        const text = typeof def.definition === "string" ? def.definition.trim() : "";
        if (!text) continue;

        const example = typeof def.example === "string" && def.example.trim() ? def.example.trim() : undefined;
        const defEntry: DefinitionEntry = example
          ? { partOfSpeech: pos, definition: text, example, source: "DictionaryAPI" }
          : { partOfSpeech: pos, definition: text, source: "DictionaryAPI" };
        allDefinitions.push(defEntry);

        if (!firstDef) { firstDef = text; firstPos = pos; }

        if (Array.isArray(def.synonyms)) {
          for (const s of def.synonyms as unknown[]) {
            if (typeof s === "string" && s.trim()) synSet.add(s.trim());
          }
        }
      }
    }
  }

  return {
    word: firstWord,
    definition: firstDef,
    partOfSpeech: firstPos,
    allDefinitions,
    allSynonyms: Array.from(synSet),
  };
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
        if (text) {
          return {
            word: resolvedWord,
            definition: text,
            partOfSpeech: pos,
            allDefinitions: [{ partOfSpeech: pos, definition: text, source: "Wiktionary" }],
            allSynonyms: [],
          };
        }
      }
    }
  }

  return null;
}

interface WordnikDefinition {
  text?: unknown;
  partOfSpeech?: unknown;
  exampleUses?: unknown;
}

export function parseWordnikDefinition(payload: unknown, resolvedWord: string): ReadDefinition | null {
  if (!Array.isArray(payload)) return null;

  const allDefinitions: DefinitionEntry[] = [];
  let firstDef = "";
  let firstPos = "";

  for (const entry of payload as WordnikDefinition[]) {
    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    if (!text) continue;

    const pos = typeof entry.partOfSpeech === "string" ? entry.partOfSpeech.trim() : "";
    const exampleUses = Array.isArray(entry.exampleUses) ? entry.exampleUses : [];
    const exampleText =
      exampleUses.length > 0 && typeof (exampleUses[0] as { text?: unknown })?.text === "string"
        ? ((exampleUses[0] as { text: string }).text.trim() || undefined)
        : undefined;

    allDefinitions.push({
      partOfSpeech: pos,
      definition: text,
      example: exampleText,
      source: "Wordnik",
    });

    if (!firstDef) { firstDef = text; firstPos = pos; }
  }

  if (!firstDef) return null;

  return {
    word: resolvedWord,
    definition: firstDef,
    partOfSpeech: firstPos,
    allDefinitions,
    allSynonyms: [],
  };
}

export async function fetchFromWordnik(normalizedWord: string): Promise<ReadDefinition | null> {
  const wordnikApiKey = process.env.NEXT_PUBLIC_WORDNIK_API_KEY;
  if (!wordnikApiKey) return null;
  try {
    const wordnik = await fetch(
      `https://api.wordnik.com/v4/word.json/${encodeURIComponent(normalizedWord)}/definitions?limit=10&includeRelated=false&useCanonical=true&includeTags=false&api_key=${encodeURIComponent(wordnikApiKey)}`,
    );
    if (wordnik.ok) return parseWordnikDefinition(await wordnik.json(), normalizedWord);
  } catch {
    // Wordnik unavailable
  }
  return null;
}

export async function fetchFromDictionaryApi(normalizedWord: string): Promise<ReadDefinition | null> {
  const primary = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
  );
  if (primary.ok) {
    const result = parseDictionaryDefinition(await primary.json(), normalizedWord);
    if (result.definition) return result;
  }
  return null;
}

export async function fetchFromWiktionary(normalizedWord: string): Promise<ReadDefinition | null> {
  try {
    const fallback = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(normalizedWord)}`,
    );
    if (fallback.ok) return parseWiktionaryDefinition(await fallback.json(), normalizedWord);
  } catch {
    // Wiktionary unavailable
  }
  return null;
}

export async function fetchDictionaryDefinition(word: string, userId?: string): Promise<ReadDefinition> {
  const normalizedWord = normalizeLookupWord(word);
  if (!normalizedWord) return { word, definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] };

  // Rate limit check (skip if userId not provided)
  if (userId) {
    const { checkRateLimit, RateLimitError } = await import("@/lib/rate-limiter");
    const { allowed, resetMs } = checkRateLimit("dictionary", userId);
    if (!allowed) {
      throw new RateLimitError("dictionary", resetMs);
    }
  }

  const wordnikResult = await fetchFromWordnik(normalizedWord);
  if (wordnikResult) return wordnikResult;

  const dictionaryApiResult = await fetchFromDictionaryApi(normalizedWord);
  if (dictionaryApiResult) return dictionaryApiResult;

  const wiktionaryResult = await fetchFromWiktionary(normalizedWord);
  if (wiktionaryResult) return wiktionaryResult;

  return { word: normalizedWord, definition: "", partOfSpeech: "", allDefinitions: [], allSynonyms: [] };
}
