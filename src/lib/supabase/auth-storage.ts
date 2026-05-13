"use client";

export function getSupabaseAuthStorageKey() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    return null;
  }

  try {
    const hostname = new URL(rawUrl).hostname;
    const projectRef = hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

export function clearSupabaseAuthStorage(storage: Storage | null = globalThis.localStorage ?? null) {
  const storageKey = getSupabaseAuthStorageKey();
  if (!storage || !storageKey) {
    return;
  }

  storage.removeItem(storageKey);
  storage.removeItem(`${storageKey}-code-verifier`);
  storage.removeItem(`${storageKey}-user`);
}

export function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return message.toLowerCase().includes("invalid refresh token");
}
