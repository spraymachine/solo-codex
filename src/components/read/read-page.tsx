"use client";

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { fetchDictionaryDefinition, type ReadDefinition } from "@/lib/read/dictionary";
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

interface SelectedWord extends ReadDefinition {
  boxId: string;
  loading: boolean;
}

const sourceOptions: Array<{ value: ReadSourceType; label: string }> = [
  { value: "book", label: "Book" },
  { value: "note", label: "Note" },
  { value: "newspaper", label: "Newspaper" },
  { value: "other", label: "Other" },
];

function PremiumShell({
  children,
  className = "",
  innerClassName = "",
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-[var(--surface-border)] bg-[color:color-mix(in_srgb,var(--bg-panel-strong)_72%,transparent)] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-[calc(2rem-0.375rem)] border border-[var(--surface-highlight)] bg-[var(--bg-panel)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em]",
        tone === "accent"
          ? "border-[color:color-mix(in_srgb,var(--accent-solid)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-solid)_8%,transparent)] text-[var(--accent-soft)]"
          : "border-[var(--surface-border)] text-[var(--text-secondary)]",
      )}
    >
      {children}
    </span>
  );
}

function ActionPill({
  children,
  onClick,
  disabled = false,
  icon = "+",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-4 rounded-full border border-[color:color-mix(in_srgb,var(--accent-solid)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-solid)_15%,var(--bg-panel))] py-2 pl-5 pr-2 text-sm font-semibold text-[var(--text-primary)] shadow-[0_18px_48px_rgba(0,0,0,0.16)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[color:color-mix(in_srgb,var(--accent-solid)_22%,var(--bg-panel))] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      <span>{children}</span>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--accent-solid)_18%,transparent)] text-base transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
        {icon}
      </span>
    </button>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.35rem] border border-[var(--surface-border)] bg-[color:color-mix(in_srgb,var(--bg-secondary)_84%,transparent)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-none text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function ScannerPlate({
  records,
  selectedWords,
  newestRecord,
}: {
  records: number;
  selectedWords: number;
  newestRecord: string;
}) {
  return (
    <div className="read-plate relative min-h-[420px] overflow-hidden rounded-[2rem] border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="absolute right-5 top-5 z-[1] rounded-full border border-[color:color-mix(in_srgb,var(--accent-solid)_34%,transparent)] bg-[var(--bg-panel)] px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--accent-soft)]">
        local
      </div>
      <div className="absolute left-5 top-5 h-24 w-24 rounded-full border border-[var(--surface-border)] bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent-solid)_22%,transparent),transparent_64%)]" />
      <div className="relative z-[1] mt-16 rotate-[-3deg] rounded-[1.4rem] border border-[var(--surface-border)] bg-[var(--bg-panel)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="h-3 w-20 rounded-full bg-[color:color-mix(in_srgb,var(--accent-solid)_34%,transparent)]" />
          <div className="h-3 w-3 rounded-full bg-[var(--accent-soft)] shadow-[0_0_22px_color-mix(in_srgb,var(--accent-solid)_70%,transparent)]" />
        </div>
        <div className="space-y-3">
          {["w-11/12", "w-8/12", "w-10/12", "w-6/12", "w-9/12"].map((width, index) => (
            <div
              key={width}
              className={cn(
                "h-3 rounded-full bg-[color:color-mix(in_srgb,var(--text-primary)_12%,transparent)]",
                width,
                index === 2 ? "bg-[color:color-mix(in_srgb,var(--accent-solid)_42%,transparent)]" : "",
              )}
            />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-3 gap-2">
          <MetricTile label="Saved" value={records} />
          <MetricTile label="Picked" value={selectedWords} />
          <MetricTile label="Latest" value={newestRecord} />
        </div>
      </div>
      <div className="absolute bottom-5 left-5 right-5 grid grid-cols-4 gap-2">
        {sourceOptions.map((option) => (
          <div
            key={option.value}
            className="rounded-full border border-[var(--surface-border)] bg-[color:color-mix(in_srgb,var(--bg-panel)_72%,transparent)] px-3 py-2 text-center text-[0.58rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be loaded."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
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
    if (blob && blob.size <= 950_000) {
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
    }
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

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("OCR request failed.");
  }

  return parseOcrSpaceWords(await response.json());
}

function SelectedWordRows({
  words,
  sourceType,
  saving,
  onChange,
  onRemove,
  onSave,
}: {
  words: SelectedWord[];
  sourceType: ReadSourceType;
  saving: boolean;
  onChange: (boxId: string, updates: Partial<SelectedWord>) => void;
  onRemove: (boxId: string) => void;
  onSave: () => void;
}) {
  if (words.length === 0) {
    return (
      <PremiumShell className="read-reveal read-reveal-delay-1 h-full" innerClassName="min-h-56 p-6">
        <div className="flex h-full min-h-44 flex-col justify-between">
          <div>
            <Eyebrow tone="muted">Definition queue</Eyebrow>
            <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.03em] text-[var(--text-primary)]">
              Tap text to build a record
            </h2>
          </div>
          <p className="mt-8 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
            Selected words land here as editable fields before they enter your private table.
          </p>
        </div>
      </PremiumShell>
    );
  }

  return (
    <PremiumShell className="read-reveal read-reveal-delay-1" innerClassName="p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Selected</Eyebrow>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-[0.04em] text-[var(--text-primary)]">
            {words.length} word{words.length === 1 ? "" : "s"}
          </h2>
        </div>
        <ActionPill onClick={onSave} disabled={saving}>
          {saving ? "Saving" : `Save ${sourceType}`}
        </ActionPill>
      </div>

      <div className="mt-5 space-y-4">
        {words.map((word) => (
          <div
            key={word.boxId}
            className="rounded-[1.5rem] border border-[var(--surface-border)] bg-[var(--bg-secondary)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="min-w-40 flex-1">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Word
                </span>
                <input
                  value={word.word}
                  onChange={(event) => onChange(word.boxId, { word: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[var(--accent-solid)]"
                />
              </label>
              <label className="w-32">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Type
                </span>
                <input
                  value={word.partOfSpeech}
                  onChange={(event) =>
                    onChange(word.boxId, { partOfSpeech: event.target.value })
                  }
                  className="mt-1 w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[var(--accent-solid)]"
                />
              </label>
              <button
                type="button"
                onClick={() => onRemove(word.boxId)}
                className="rounded-full border border-[var(--surface-border)] px-3 py-2 text-xs text-[var(--text-secondary)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:text-red-500"
              >
                Remove
              </button>
            </div>
            <label className="mt-3 block">
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Definition
              </span>
              <textarea
                value={word.loading ? "Loading definition..." : word.definition}
                disabled={word.loading}
                onChange={(event) => onChange(word.boxId, { definition: event.target.value })}
                rows={3}
                className="mt-1 w-full resize-none rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel-strong)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[var(--accent-solid)] disabled:opacity-70"
              />
            </label>
          </div>
        ))}
      </div>
    </PremiumShell>
  );
}

export function ReadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const activePersona = usePersonaStore((state) => state.activePersona);
  const records = useReadStore((state) => state.records);
  const loadRecords = useReadStore((state) => state.load);
  const createRecords = useReadStore((state) => state.createRecords);
  const updateRecord = useReadStore((state) => state.updateRecord);
  const deleteRecord = useReadStore((state) => state.deleteRecord);

  const [sourceType, setSourceType] = useState<ReadSourceType>("book");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageMetrics, setImageMetrics] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    displayWidth: 0,
    displayHeight: 0,
  });
  const [ocrWords, setOcrWords] = useState<OcrWordBox[]>([]);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedBoxIds = useMemo(
    () => new Set(selectedWords.map((word) => word.boxId)),
    [selectedWords],
  );
  const newestRecord = records[0]?.createdAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
        new Date(records[0].createdAt),
      )
    : "none";

  useEffect(() => {
    void loadRecords(activePersona);
  }, [activePersona, loadRecords]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    function updateImageMetrics() {
      const imageElement = imageRef.current;
      if (!imageElement) return;
      const bounds = imageElement.getBoundingClientRect();
      setImageMetrics((current) => {
        const next = {
          naturalWidth: imageElement.naturalWidth,
          naturalHeight: imageElement.naturalHeight,
          displayWidth: bounds.width,
          displayHeight: bounds.height,
        };

        if (
          current.naturalWidth === next.naturalWidth &&
          current.naturalHeight === next.naturalHeight &&
          Math.round(current.displayWidth) === Math.round(next.displayWidth) &&
          Math.round(current.displayHeight) === Math.round(next.displayHeight)
        ) {
          return current;
        }

        return next;
      });
    }

    updateImageMetrics();
    const observer = new ResizeObserver(updateImageMetrics);
    observer.observe(image);
    window.addEventListener("resize", updateImageMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateImageMetrics);
    };
  }, [previewUrl]);

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
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });

      const words = await readImageWithOcrSpace(compressed);
      if (words.length === 0) {
        setCaptureState("error");
        setError("No words found.");
        return;
      }

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
      {
        boxId: box.id,
        word: cleanWord,
        definition: "",
        partOfSpeech: "",
        loading: true,
      },
    ]);

    const definition = await fetchDictionaryDefinition(cleanWord);
    setSelectedWords((items) =>
      items.map((item) =>
        item.boxId === box.id
          ? {
              ...item,
              word: definition.word || cleanWord,
              definition: definition.definition,
              partOfSpeech: definition.partOfSpeech,
              loading: false,
            }
          : item,
      ),
    );
  }

  function updateSelectedWord(boxId: string, updates: Partial<SelectedWord>) {
    setSelectedWords((items) =>
      items.map((item) => (item.boxId === boxId ? { ...item, ...updates } : item)),
    );
  }

  async function saveSelectedWords() {
    const readyWords = selectedWords.filter((word) => word.word.trim() && !word.loading);
    if (readyWords.length === 0) return;

    setSaving(true);
    try {
      await createRecords(
        readyWords.map((word) => ({
          word: word.word,
          definition: word.definition,
          partOfSpeech: word.partOfSpeech,
          sourceType,
        })),
      );
      setSelectedWords([]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="read-canvas min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="relative px-4 pb-8 pt-8 md:px-8 md:pb-12 md:pt-12">
        <div className="read-reveal mx-auto max-w-[1480px]">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] py-2 pl-2 pr-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] shadow-[0_18px_42px_rgba(0,0,0,0.14)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-[var(--text-primary)] active:scale-[0.98]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--bg-secondary)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
                ←
              </span>
              Dashboard
            </Link>
            <span
              className="rounded-full border px-4 py-2 text-[0.65rem] uppercase tracking-[0.18em]"
              style={{
                borderColor: personaMeta[activePersona].accent,
                color: personaMeta[activePersona].accent,
              }}
            >
              {personaMeta[activePersona].label} private
            </span>
          </div>

          <PremiumShell innerClassName="relative overflow-hidden p-6 md:p-9">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-stretch">
              <div>
                <Eyebrow>Read module</Eyebrow>
                <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-6xl font-bold uppercase leading-[0.84] tracking-[0.03em] text-[var(--text-primary)] md:text-8xl lg:text-[8.4rem]">
                  Capture the margin.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
                  Photograph a page, touch the exact words that matter, and keep a private ledger that reads like your own field notes.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <ActionPill onClick={() => inputRef.current?.click()} icon="↗">
                    Camera
                  </ActionPill>
                  <span className="rounded-full border border-[var(--surface-border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    OCR.space + dictionaryapi.dev. Image not saved.
                  </span>
                </div>
              </div>
              <ScannerPlate
                records={records.length}
                selectedWords={selectedWords.length}
                newestRecord={newestRecord}
              />
            </div>
          </PremiumShell>
        </div>
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

      <section className="read-reveal read-reveal-delay-1 mx-auto grid max-w-[1480px] gap-6 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.82fr)]">
        <div className="space-y-6">
          <PremiumShell innerClassName="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <Eyebrow>Capture</Eyebrow>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold uppercase tracking-[0.03em] md:text-5xl">
                  Source tray
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Pick a source type first, then capture. The preview is temporary and stays off your record.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
                {sourceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSourceType(option.value)}
                    className={cn(
                      "group rounded-2xl border px-4 py-3 text-left text-xs uppercase tracking-[0.12em] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                      sourceType === option.value
                        ? "border-[var(--accent-solid)] bg-[color:color-mix(in_srgb,var(--accent-solid)_15%,var(--bg-panel))] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "border-[var(--surface-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:-translate-y-0.5 hover:text-[var(--text-primary)]",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-3 block h-1 w-8 rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        sourceType === option.value
                          ? "bg-[var(--accent-soft)]"
                          : "bg-[var(--surface-border)] group-hover:w-12",
                      )}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.65rem] border border-[var(--surface-border)] bg-[var(--bg-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {previewUrl ? (
                <div className="read-preview-plane flex min-h-[420px] justify-center p-3">
                  <div className="relative inline-block max-w-full align-top">
                    {/* Blob preview comes from local camera/upload and is never persisted. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageRef}
                      src={previewUrl}
                      alt="Captured reading source"
                      className="block max-h-[64vh] max-w-full object-contain"
                      onLoad={() => {
                        const image = imageRef.current;
                        if (!image) return;
                        const bounds = image.getBoundingClientRect();
                        setImageMetrics({
                          naturalWidth: image.naturalWidth,
                          naturalHeight: image.naturalHeight,
                          displayWidth: bounds.width,
                          displayHeight: bounds.height,
                        });
                      }}
                    />
                    {captureState === "ready" &&
                    imageMetrics.naturalWidth > 0 &&
                    imageMetrics.naturalHeight > 0
                      ? ocrWords.map((word) => {
                          const selected = selectedBoxIds.has(word.id);
                          const scaleX =
                            imageMetrics.displayWidth / imageMetrics.naturalWidth;
                          const scaleY =
                            imageMetrics.displayHeight / imageMetrics.naturalHeight;
                          return (
                            <button
                              key={word.id}
                              type="button"
                              aria-label={`Select ${word.text}`}
                              onClick={() => void selectWord(word)}
                              className={cn(
                                "absolute rounded-[0.25rem] border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                selected
                                  ? "border-amber-400 bg-amber-300/45 shadow-[0_0_0_2px_rgba(245,158,11,0.26)]"
                                  : "border-[color:color-mix(in_srgb,var(--accent-solid)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-solid)_12%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--accent-solid)_28%,transparent)]",
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
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="read-empty-capture group flex min-h-[460px] w-full flex-col items-center justify-center gap-5 px-6 text-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--bg-panel-strong)]"
                >
                  <span className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--bg-panel)] text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1 group-hover:scale-105">
                    ◉
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-4xl font-bold uppercase tracking-[0.06em]">
                    Camera
                  </span>
                  <span className="max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
                    Take a picture of a page, note, or newspaper clipping.
                  </span>
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="rounded-full border border-[var(--surface-border)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                {captureState === "reading"
                  ? "Reading image..."
                  : captureState === "ready"
                    ? `${ocrWords.length} words found`
                    : captureState === "error"
                      ? error
                      : "Ready"}
              </p>
              <ActionPill
                onClick={() => inputRef.current?.click()}
                disabled={captureState === "reading"}
                icon="↗"
              >
                New image
              </ActionPill>
            </div>
          </PremiumShell>
        </div>

        <SelectedWordRows
          words={selectedWords}
          sourceType={sourceType}
          saving={saving}
          onChange={updateSelectedWord}
          onRemove={(boxId) =>
            setSelectedWords((items) => items.filter((item) => item.boxId !== boxId))
          }
          onSave={() => void saveSelectedWords()}
        />
      </section>

      <section className="read-reveal read-reveal-delay-2 mx-auto max-w-[1480px] px-4 pb-16 pt-6 md:px-8 md:pb-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Vocabulary ledger</Eyebrow>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold uppercase tracking-[0.03em] md:text-5xl">
              Saved words
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Every saved word stays editable in its own row.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--bg-panel)] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Table rows
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-none">
              {records.length}
            </p>
          </div>
        </div>
        <ReadRecordList
          records={records}
          onUpdate={(id, updates) => void updateRecord(id, updates)}
          onDelete={(id) => void deleteRecord(id)}
        />
      </section>
    </div>
  );
}
