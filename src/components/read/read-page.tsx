"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { fetchDictionaryDefinition } from "@/lib/read/dictionary";
import {
  cleanReadWord,
  getOcrSpaceApiKey,
  parseOcrSpaceWords,
  type OcrWordBox,
} from "@/lib/read/ocr-space";
import { personaMeta, usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";
import type { ReadSourceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ReadRecordList } from "./read-record-list";

type CaptureState = "idle" | "reading" | "ready" | "error";

interface SelectedWord {
  boxId: string;
  word: string;
  definition: string;
  partOfSpeech: string;
  myDefinition: string;
  synonyms: string[];
  allDefinitions: Array<{ partOfSpeech: string; definition: string; example?: string }>;
  allSynonyms: string[];
  loading: boolean;
}

const sourceOptions: Array<{ value: ReadSourceType; label: string }> = [
  { value: "book", label: "Book" },
  { value: "note", label: "Note" },
  { value: "newspaper", label: "Newspaper" },
  { value: "other", label: "Other" },
];

/* ---------- Dashboard-schema primitives ---------- */

function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-[var(--accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled = false,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent-solid)]/40 hover:text-[var(--text-primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Image helpers (unchanged) ---------- */

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image could not be loaded.")); };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => { canvas.toBlob(resolve, "image/jpeg", quality); });
}

async function compressForOcr(file: File) {
  if (file.size <= 950_000) return file;
  const image = await loadImage(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.86, 0.74, 0.62, 0.5]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= 950_000)
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  }
  const blob = await canvasToBlob(canvas, 0.42);
  return blob
    ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
    : file;
}

async function readImageWithOcrSpace(file: File) {
  const formData = new FormData();
  formData.append("apikey", getOcrSpaceApiKey());
  formData.append("file", file);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "true");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2");
  const response = await fetch("https://api.ocr.space/parse/image", { method: "POST", body: formData });
  if (!response.ok) throw new Error("OCR request failed.");
  return parseOcrSpaceWords(await response.json());
}

/* ---------- Word queue ---------- */

function WordQueue({
  words,
  sourceType,
  saving,
  onChange,
  onRemove,
  onSave,
  onClear,
}: {
  words: SelectedWord[];
  sourceType: ReadSourceType;
  saving: boolean;
  onChange: (boxId: string, updates: Partial<SelectedWord>) => void;
  onRemove: (boxId: string) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  const undefinedCount = words.filter((w) => !w.loading && !w.definition.trim()).length;
  const anyLoading = words.some((w) => w.loading);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Label>Queue</Label>
          <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
            {words.length}
          </span>
          {undefinedCount > 0 && (
            <span className="font-mono text-[0.625rem] tabular-nums text-amber-500">
              {undefinedCount} undefined
            </span>
          )}
        </div>
        {words.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Body */}
      {words.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            Queue empty
          </p>
          <p className="mt-2 max-w-[24ch] text-xs leading-5 text-[var(--text-secondary)] opacity-60">
            Tap highlighted words on the image to collect them here before saving.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 divide-y divide-[var(--surface-border)] overflow-y-auto">
            {words.map((word) => (
              <div key={word.boxId} className="group px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={word.word}
                    onChange={(e) => onChange(word.boxId, { word: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-display)] text-base font-bold tracking-[0.01em] text-[var(--text-primary)] outline-none"
                  />
                  <input
                    value={word.partOfSpeech}
                    placeholder="type"
                    onChange={(e) => onChange(word.boxId, { partOfSpeech: e.target.value })}
                    className="w-16 shrink-0 bg-transparent text-right font-mono text-[0.7rem] italic text-[var(--text-secondary)] outline-none placeholder:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(word.boxId)}
                    className="shrink-0 text-base leading-none text-[var(--text-secondary)] opacity-0 transition-all duration-200 hover:text-red-400 group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={word.loading ? "" : word.definition}
                  disabled={word.loading}
                  placeholder={word.loading ? "Fetching definition…" : "No definition — add one"}
                  onChange={(e) => onChange(word.boxId, { definition: e.target.value })}
                  rows={2}
                  className={cn(
                    "mt-2 w-full resize-none rounded-lg border bg-[var(--bg-secondary)] px-3 py-2 text-xs leading-5 text-[var(--text-primary)] outline-none transition-colors duration-200 focus:border-[var(--accent-solid)] placeholder:text-[var(--text-secondary)] disabled:opacity-50",
                    !word.loading && !word.definition.trim()
                      ? "border-amber-500/40"
                      : "border-[var(--surface-border)]",
                  )}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-5 py-3">
            <span className="hidden font-mono text-[0.625rem] text-[var(--text-secondary)] sm:inline">
              ⌘↵ to save
            </span>
            <ActionButton onClick={onSave} disabled={saving || anyLoading} className="ml-auto">
              {saving ? "Saving…" : `Save to ${sourceType}`}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Page ---------- */

export function ReadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const activePersona = usePersonaStore((state) => state.activePersona);
  const records = useReadStore((state) => state.records);
  const loadRecords = useReadStore((state) => state.load);
  const createRecords = useReadStore((state) => state.createRecords);
  const deleteRecord = useReadStore((state) => state.deleteRecord);

  const [sourceType, setSourceType] = useState<ReadSourceType>("book");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageMetrics, setImageMetrics] = useState({
    naturalWidth: 0, naturalHeight: 0, displayWidth: 0, displayHeight: 0,
  });
  const [ocrWords, setOcrWords] = useState<OcrWordBox[]>([]);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [saving, setSaving] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const selectedBoxIds = useMemo(
    () => new Set(selectedWords.map((w) => w.boxId)),
    [selectedWords],
  );

  const filteredRecords = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.word.toLowerCase().includes(q) ||
        r.definition.toLowerCase().includes(q) ||
        r.partOfSpeech.toLowerCase().includes(q),
    );
  }, [records, filterQuery]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2200);
  }

  useEffect(() => { void loadRecords(activePersona); }, [activePersona, loadRecords]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    function updateImageMetrics() {
      const el = imageRef.current;
      if (!el) return;
      const bounds = el.getBoundingClientRect();
      setImageMetrics((cur) => {
        const next = {
          naturalWidth: el.naturalWidth,
          naturalHeight: el.naturalHeight,
          displayWidth: bounds.width,
          displayHeight: bounds.height,
        };
        if (
          cur.naturalWidth === next.naturalWidth &&
          cur.naturalHeight === next.naturalHeight &&
          Math.round(cur.displayWidth) === Math.round(next.displayWidth) &&
          Math.round(cur.displayHeight) === Math.round(next.displayHeight)
        ) return cur;
        return next;
      });
    }

    updateImageMetrics();
    const observer = new ResizeObserver(updateImageMetrics);
    observer.observe(image);
    window.addEventListener("resize", updateImageMetrics);
    return () => { observer.disconnect(); window.removeEventListener("resize", updateImageMetrics); };
  }, [previewUrl]);

  const saveSelectedWords = useCallback(async () => {
    const readyWords = selectedWords.filter((w) => w.word.trim() && !w.loading);
    if (readyWords.length === 0) return;
    setSaving(true);
    try {
      await createRecords(readyWords.map((w) => ({ word: w.word, definition: w.definition, partOfSpeech: w.partOfSpeech, myDefinition: w.myDefinition, synonyms: w.synonyms, allDefinitions: w.allDefinitions, allSynonyms: w.allSynonyms, sourceType })));
      setSelectedWords([]);
      showFlash(`${readyWords.length} word${readyWords.length === 1 ? "" : "s"} saved`);
    } finally {
      setSaving(false);
    }
  }, [selectedWords, sourceType, createRecords]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && selectedWords.length > 0) {
        e.preventDefault();
        void saveSelectedWords();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveSelectedWords, selectedWords.length]);

  function clearCapture() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setCaptureState("idle");
    setError("");
    setOcrWords([]);
    setSelectedWords([]);
    setImageMetrics({ naturalWidth: 0, naturalHeight: 0, displayWidth: 0, displayHeight: 0 });
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setCaptureState("reading");
    setError("");
    setOcrWords([]);
    setSelectedWords([]);
    setImageMetrics({ naturalWidth: 0, naturalHeight: 0, displayWidth: 0, displayHeight: 0 });
    try {
      const compressed = await compressForOcr(file);
      const nextUrl = URL.createObjectURL(compressed);
      setPreviewUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return nextUrl; });
      const words = await readImageWithOcrSpace(compressed);
      if (words.length === 0) { setCaptureState("error"); setError("No words found."); return; }
      setOcrWords(words);
      setCaptureState("ready");
    } catch (err) {
      setCaptureState("error");
      setError(err instanceof Error ? err.message : "OCR failed.");
    }
  }

  async function selectWord(box: OcrWordBox) {
    if (selectedBoxIds.has(box.id)) {
      setSelectedWords((items) => items.filter((item) => item.boxId !== box.id));
      return;
    }
    const cleanWord = cleanReadWord(box.text);
    if (!cleanWord) return;
    setSelectedWords((items) => [
      ...items,
      { boxId: box.id, word: cleanWord, definition: "", partOfSpeech: "", myDefinition: "", synonyms: [], allDefinitions: [], allSynonyms: [], loading: true },
    ]);
    const result = await fetchDictionaryDefinition(cleanWord);
    setSelectedWords((items) =>
      items.map((item) =>
        item.boxId === box.id
          ? { ...item, word: result.word || cleanWord, definition: result.definition, partOfSpeech: result.partOfSpeech, allDefinitions: result.allDefinitions, allSynonyms: result.allSynonyms, loading: false }
          : item,
      ),
    );
  }

  function selectAllOcrWords() {
    const unselected = ocrWords.filter((w) => !selectedBoxIds.has(w.id));
    for (const word of unselected) void selectWord(word);
  }

  function updateSelectedWord(boxId: string, updates: Partial<SelectedWord>) {
    setSelectedWords((items) => items.map((item) => (item.boxId === boxId ? { ...item, ...updates } : item)));
  }

  async function handleTextSearch() {
    const word = textInput.trim();
    if (!word || searching) return;

    const existing = records.find((r) => r.word.toLowerCase() === word.toLowerCase());
    if (existing) {
      showFlash(`"${existing.word}" already in ledger`);
      setTextInput("");
      return;
    }

    setSearching(true);
    setTextInput("");
    const result = await fetchDictionaryDefinition(word);
    await createRecords([{
      word: result.word || word,
      definition: result.definition,
      partOfSpeech: result.partOfSpeech,
      myDefinition: "",
      synonyms: [],
      allDefinitions: result.allDefinitions,
      allSynonyms: result.allSynonyms,
      sourceType,
    }]);
    showFlash(result.definition ? `"${result.word || word}" saved` : `"${result.word || word}" saved — no definition`);
    setSearching(false);
  }

  const statusText =
    captureState === "reading" ? "Reading…"
    : captureState === "ready" ? `${ocrWords.length} words · ${selectedBoxIds.size} selected`
    : captureState === "error" ? error
    : "Ready";

  return (
    <div className="min-h-screen text-[var(--text-primary)]">

      {/* Flash */}
      {flash && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] shadow-[0_8px_32px_rgba(0,0,0,0.32)]">
          {flash}
        </div>
      )}

      {/* Header */}
      <header className="section-dots relative overflow-hidden border-b border-[var(--surface-border)] bg-[var(--bg-panel)]">
        <div className="relative z-10 px-5 py-5 md:px-8 md:py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-soft)]"
            >
              ← Dashboard
            </Link>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-[var(--accent-soft)]">
              {personaMeta[activePersona].label} · private
            </span>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)] md:text-5xl">
            Read
          </h1>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-24 bg-[var(--accent-solid)]" />
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          void handleFile(file);
        }}
      />

      {/* 01 / Capture */}
      <section className="read-reveal border-b border-[var(--surface-border)] px-4 py-8 sm:px-5 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
              01 / Capture
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.03em] text-[var(--text-primary)] md:text-4xl">
              Add words
            </h2>
          </div>
          <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
            {statusText}
          </span>
        </div>

        {/* Controls: source + search */}
        <div className="mb-5 space-y-3">
          {/* Source segmented */}
          <div className="flex flex-wrap items-center gap-2">
            <Label className="mr-1">Source</Label>
            {sourceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSourceType(option.value)}
                className={cn(
                  "rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200",
                  sourceType === option.value
                    ? "border-[var(--accent-solid)] bg-[var(--accent-solid)]/12 text-[var(--text-primary)]"
                    : "border-[var(--surface-border)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search row */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 transition-colors duration-200 focus-within:border-[var(--accent-solid)]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="shrink-0 text-[var(--text-secondary)]">
                <circle cx="6.5" cy="6.5" r="5" />
                <line x1="10.5" y1="10.5" x2="14" y2="14" />
              </svg>
              <input
                type="text"
                placeholder="Look up a word and save it directly"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleTextSearch(); }}
                className="flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>
            <ActionButton onClick={() => void handleTextSearch()} disabled={searching || !textInput.trim()} className="h-11 px-5">
              {searching ? "…" : "Search"}
            </ActionButton>
            <GhostButton onClick={() => inputRef.current?.click()} title="Scan image" className="h-11 w-11 px-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 5.5A1.5 1.5 0 0 1 2.5 4h.73l.74-1.5h4.06L8.77 4h.73A1.5 1.5 0 0 1 11 5.5v6A1.5 1.5 0 0 1 9.5 13h-7A1.5 1.5 0 0 1 1 11.5v-6Z" />
                <circle cx="6" cy="8.5" r="2" />
              </svg>
            </GhostButton>
          </div>
        </div>

        {/* Two-column: image | queue — only show after camera pressed */}
        {captureState !== "idle" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.5fr)]">

            {/* Image capture card */}
            {previewUrl ? (
              <div className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)]">
                <div className="flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Label>Source image</Label>
                    <span className="font-mono text-[0.625rem] tabular-nums text-[var(--text-secondary)]">
                      not stored
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {captureState === "ready" && (
                      <>
                        {selectedBoxIds.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedWords([])}
                            className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                          >
                            Deselect
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={selectAllOcrWords}
                          className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                        >
                          Select all
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={clearCapture}
                      title="Clear image"
                      className="text-base leading-none text-[var(--text-secondary)] transition-colors hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="flex justify-center bg-[var(--bg-secondary)] p-4 md:p-6">
                  <div className="relative inline-block max-w-full align-top">
                    {/* Blob preview from local camera — never persisted */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageRef}
                      src={previewUrl}
                      alt="Captured reading source"
                      className="block max-h-[60vh] max-w-full rounded-lg object-contain"
                      onLoad={() => {
                        const el = imageRef.current;
                        if (!el) return;
                        const bounds = el.getBoundingClientRect();
                        setImageMetrics({
                          naturalWidth: el.naturalWidth,
                          naturalHeight: el.naturalHeight,
                          displayWidth: bounds.width,
                          displayHeight: bounds.height,
                        });
                      }}
                    />

                    {captureState === "reading" && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[var(--bg-primary)]/70">
                        <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                          Reading…
                        </span>
                      </div>
                    )}

                    {captureState === "ready" && imageMetrics.naturalWidth > 0 && imageMetrics.naturalHeight > 0
                      ? ocrWords.map((word) => {
                          const selected = selectedBoxIds.has(word.id);
                          const scaleX = imageMetrics.displayWidth / imageMetrics.naturalWidth;
                          const scaleY = imageMetrics.displayHeight / imageMetrics.naturalHeight;
                          return (
                            <button
                              key={word.id}
                              type="button"
                              aria-label={`Select ${word.text}`}
                              onClick={() => void selectWord(word)}
                              className={cn(
                                "absolute rounded-[3px] border transition-all duration-150",
                                selected
                                  ? "border-amber-400 bg-amber-300/30 shadow-[0_0_0_1px_rgba(245,158,11,0.3)]"
                                  : "border-[var(--accent-solid)]/40 bg-[var(--accent-solid)]/10 hover:bg-[var(--accent-solid)]/25",
                              )}
                              style={{
                                left: `${word.left * scaleX}px`,
                                top: `${word.top * scaleY}px`,
                                width: `${word.width * scaleX}px`,
                                height: `${word.height * scaleY}px`,
                              }}
                            />
                          );
                        })
                      : null}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={captureState === "reading"}
                className="group grid min-h-[340px] place-items-center rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--bg-panel)] p-8 text-center transition-colors duration-200 hover:border-[var(--accent-solid)]/40 hover:bg-[var(--bg-panel-strong)] disabled:opacity-50"
              >
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--accent-soft)]">
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 5.5A1.5 1.5 0 0 1 2.5 4h.73l.74-1.5h4.06L8.77 4h.73A1.5 1.5 0 0 1 11 5.5v6A1.5 1.5 0 0 1 9.5 13h-7A1.5 1.5 0 0 1 1 11.5v-6Z" />
                      <circle cx="6" cy="8.5" r="2" />
                    </svg>
                  </div>
                  <p className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
                    Photograph a page
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)] opacity-70">
                    Tap to open the camera, then highlight the words you want. The image is never saved.
                  </p>
                </div>
              </button>
            )}

            {/* Queue card */}
            <WordQueue
              words={selectedWords}
              sourceType={sourceType}
              saving={saving}
              onChange={updateSelectedWord}
              onRemove={(boxId) => setSelectedWords((items) => items.filter((item) => item.boxId !== boxId))}
              onSave={() => void saveSelectedWords()}
              onClear={() => setSelectedWords([])}
            />
          </div>
        )}
      </section>

      {/* 02 / Ledger */}
      <section className="read-reveal read-reveal-delay-1 px-4 py-8 sm:px-5 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[0.625rem] font-bold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
              02 / Ledger
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.03em] text-[var(--text-primary)] md:text-4xl">
              Saved words
            </h2>
          </div>
          <span className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
            {filteredRecords.length}{filterQuery ? ` / ${records.length}` : ""} total
          </span>
        </div>

        {records.length > 0 && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 transition-colors duration-200 focus-within:border-[var(--accent-solid)]">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="shrink-0 text-[var(--text-secondary)]">
              <circle cx="6.5" cy="6.5" r="5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" />
            </svg>
            <input
              type="text"
              placeholder="Filter saved words…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="flex-1 bg-transparent py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="shrink-0 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <ReadRecordList
          records={filteredRecords}
          onDelete={(id) => void deleteRecord(id)}
        />
      </section>
    </div>
  );
}
