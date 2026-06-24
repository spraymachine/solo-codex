// Client-side rate limiter for external API calls
// Tracks per-user API requests using localStorage

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
}

const RATE_LIMIT_STORAGE_PREFIX = "ratelimit:";

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  dictionary: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 req/min
  ocr: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  googleBooks: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 req/min
};

function getStorageKey(endpoint: string, userId: string): string {
  return `${RATE_LIMIT_STORAGE_PREFIX}${endpoint}:${userId}`;
}

function getRequestTimestamps(endpoint: string, userId: string): number[] {
  try {
    const key = getStorageKey(endpoint, userId);
    const stored = localStorage?.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as number[];
  } catch {
    return [];
  }
}

function saveRequestTimestamps(endpoint: string, userId: string, timestamps: number[]): void {
  try {
    const key = getStorageKey(endpoint, userId);
    localStorage?.setItem(key, JSON.stringify(timestamps));
  } catch {
    // Fail silently if localStorage unavailable
  }
}

export function checkRateLimit(endpoint: string, userId: string): { allowed: boolean; remaining: number; resetMs: number } {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    // Unknown endpoint — allow
    return { allowed: true, remaining: -1, resetMs: 0 };
  }

  const now = Date.now();
  const timestamps = getRequestTimestamps(endpoint, userId);

  // Remove old timestamps outside window
  const recentTimestamps = timestamps.filter((ts) => now - ts < config.windowMs);

  // Check if limit exceeded
  const remaining = config.maxRequests - recentTimestamps.length;
  const allowed = recentTimestamps.length < config.maxRequests;

  // Calculate when the oldest request expires
  const resetMs = recentTimestamps.length > 0 ? config.windowMs - (now - recentTimestamps[0]) : 0;

  if (allowed) {
    // Record this request
    recentTimestamps.push(now);
    saveRequestTimestamps(endpoint, userId, recentTimestamps);
  }

  return { allowed, remaining: Math.max(0, remaining), resetMs: Math.max(0, resetMs) };
}

export class RateLimitError extends Error {
  constructor(
    public endpoint: string,
    public resetMs: number,
  ) {
    super(`Rate limit exceeded for ${endpoint}. Try again in ${Math.ceil(resetMs / 1000)}s.`);
    this.name = "RateLimitError";
  }
}
