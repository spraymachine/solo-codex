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
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const status = "status" in error && typeof error.status === "number" ? error.status : 0;

  return (
    message.toLowerCase().includes("invalid refresh token") ||
    message.toLowerCase().includes("refresh token not found") ||
    code === "refresh_token_not_found" ||
    code === "bad_jwt" ||
    (status === 400 && message.toLowerCase().includes("token"))
  );
}
