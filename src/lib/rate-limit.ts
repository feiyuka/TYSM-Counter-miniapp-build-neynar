/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per key (FID or IP).
 *
 * Note: In-memory means resets on server restart and doesn't
 * share state across multiple instances. Sufficient for single-pod
 * deployments like Neynar Studio.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 10 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > 60 * 60 * 1000) {
        store.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // ms timestamp when window resets
}

/**
 * Check rate limit for a given key.
 * @param key   Unique identifier (e.g. `fid:${fid}` or `ip:${ip}`)
 * @param config Limit and window configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, config.limit - entry.count);
  const resetAt = entry.windowStart + config.windowMs;

  return {
    allowed: entry.count <= config.limit,
    remaining,
    resetAt,
  };
}
