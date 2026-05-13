import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSupabaseAuthStorage,
  getSupabaseAuthStorageKey,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/auth-storage";

describe("Supabase auth storage helpers", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    vi.restoreAllMocks();
  });

  it("matches the browser auth storage key Supabase derives from the project URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    expect(getSupabaseAuthStorageKey()).toBe("sb-abc123-auth-token");
  });

  it("clears all persisted auth session keys", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    const storage = {
      removeItem: vi.fn(),
    } as unknown as Storage;

    clearSupabaseAuthStorage(storage);

    expect(storage.removeItem).toHaveBeenCalledWith("sb-abc123-auth-token");
    expect(storage.removeItem).toHaveBeenCalledWith("sb-abc123-auth-token-code-verifier");
    expect(storage.removeItem).toHaveBeenCalledWith("sb-abc123-auth-token-user");
  });

  it("recognizes stale refresh-token failures", () => {
    expect(
      isInvalidRefreshTokenError({
        message: "Invalid Refresh Token: Refresh Token Not Found",
      }),
    ).toBe(true);
    expect(isInvalidRefreshTokenError({ message: "network failed" })).toBe(false);
  });
});
