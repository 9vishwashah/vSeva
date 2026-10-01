// Lightweight in-memory request cache for read calls (profiles, org data,
// entries, etc.). Two jobs:
//   1. Dedup: two simultaneous callers asking for the same key share one
//      in-flight promise instead of firing two identical requests.
//   2. TTL cache: a fresh-enough result is returned instantly with no
//      network round trip at all.
//
// Intentionally NOT a stale-while-revalidate cache — this app's data layer
// is plain async/await (no reactive subscription from caller to cache), so
// "return stale now, silently refresh and notify later" has no consumer to
// notify. A write always calls clearAll() (see below), so staleness is
// bounded by TTL, not by how long it takes a mutation to happen.
//
// Never used for anything cross-user/cross-session — this lives in page
// memory only, is keyed by whatever ids the caller passes (org id, user id,
// username...), and is wiped on logout via clearAll().

interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  promise?: Promise<T>;
}

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 30_000;

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);

  if (existing) {
    if (existing.promise) return existing.promise; // in-flight — share it
    if (existing.expiresAt > now) return existing.value as T; // fresh hit
  }

  const promise = fetcher()
    .then(value => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch(err => {
      cache.delete(key); // never cache a failure
      throw err;
    });

  cache.set(key, { expiresAt: 0, promise });
  return promise;
}

// Removes every cache entry whose key contains `match` as a substring.
// Cache keys are built as `<kind>:<id>:...` (see dataService.ts), so
// invalidate(orgId) or invalidate(userId) sweeps every cache entry scoped
// to that org/user regardless of which read method produced it.
export function invalidate(match: string): void {
  for (const key of cache.keys()) {
    if (key.includes(match)) cache.delete(key);
  }
}

export function clearAll(): void {
  cache.clear();
}
