export interface OcrWordBox {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface OcrSpaceWord {
  WordText?: unknown;
  Left?: unknown;
  Top?: unknown;
  Width?: unknown;
  Height?: unknown;
}

interface OcrSpaceLine {
  Words?: unknown;
}

interface OcrSpaceParsedResult {
  TextOverlay?: {
    Lines?: unknown;
  } | null;
  ErrorMessage?: unknown;
  ErrorDetails?: unknown;
}

interface OcrSpaceResponse {
  ParsedResults?: unknown;
  IsErroredOnProcessing?: unknown;
  ErrorMessage?: unknown;
  ErrorDetails?: unknown;
}

export function cleanReadWord(value: string): string {
  return value
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9'-]+$/g, "")
    .trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function errorText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function parseOcrSpaceWords(response: OcrSpaceResponse): OcrWordBox[] {
  const topLevelError = errorText(response.ErrorMessage) ?? errorText(response.ErrorDetails);
  if (response.IsErroredOnProcessing || topLevelError) {
    throw new Error(topLevelError ?? "OCR.space could not read this image.");
  }

  const parsedResults = Array.isArray(response.ParsedResults) ? response.ParsedResults : [];
  const words: OcrWordBox[] = [];

  for (const parsedResult of parsedResults as OcrSpaceParsedResult[]) {
    const resultError =
      errorText(parsedResult.ErrorMessage) ?? errorText(parsedResult.ErrorDetails);
    if (resultError) {
      throw new Error(resultError);
    }

    const lines = Array.isArray(parsedResult.TextOverlay?.Lines)
      ? parsedResult.TextOverlay?.Lines
      : [];

    for (const line of lines as OcrSpaceLine[]) {
      const lineWords = Array.isArray(line.Words) ? line.Words : [];
      for (const rawWord of lineWords as OcrSpaceWord[]) {
        const text =
          typeof rawWord.WordText === "string" ? cleanReadWord(rawWord.WordText) : "";
        const left = toNumber(rawWord.Left);
        const top = toNumber(rawWord.Top);
        const width = toNumber(rawWord.Width);
        const height = toNumber(rawWord.Height);

        if (!text || text.length <= 3 || left === null || top === null || width === null || height === null) {
          continue;
        }

        words.push({
          id: `${words.length}-${text.toLowerCase()}-${left}-${top}`,
          text,
          left,
          top,
          width,
          height,
        });
      }
    }
  }

  return words;
}

export function getOcrSpaceApiKey() {
  return process.env.NEXT_PUBLIC_OCR_SPACE_API_KEY?.trim() || "helloworld";
}
