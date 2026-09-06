/**
 * VoterScope Demo — Simple In-Memory Rate Limiter
 *
 * WARNING: This is a LOCAL DEMO rate limiter only.
 * It resets when the server restarts and does NOT work across multiple processes.
 * Production deployments MUST use a distributed rate limiter (e.g., Redis + sliding window).
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

const DEFAULT_LIMITS: Record<string, RateLimitOptions | undefined> = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  nik_lookup: { windowMs: 60 * 1000, maxRequests: 20 },
  api_general: { windowMs: 60 * 1000, maxRequests: 200 },
};

const FALLBACK_OPTIONS: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 200 };

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(
  identifier: string,
  limitType: string = "api_general"
): RateLimitResult {
  const options: RateLimitOptions = DEFAULT_LIMITS[limitType] ?? FALLBACK_OPTIONS;
  const now = Date.now();
  const key = `${limitType}:${identifier}`;

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: now + options.windowMs,
    };
  }

  entry.count++;

  if (entry.count > options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Periodic cleanup to prevent memory growth (runs in-process)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
