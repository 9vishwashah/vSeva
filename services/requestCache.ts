// Request cache for read calls (profiles, org data, entries, etc.). Three jobs:
//   1. Dedup: two simultaneous callers asking for the same key share one
//      in-flight promise instead of firing two identical requests.
//   2. TTL cache: a fresh-enough result is returned instantly with no
//      network round trip at all.
//   3. Opt-in "show last time's data instantly" (persist: true): the last good
//      result is also kept on the device. When the app is opened again it is
//      returned immediately while a fresh copy loads in the background; if the
//      fresh copy differs, a 'vseva:cache-refreshed' event tells open screens
//      to re-read (they then hit the now-fresh in-memory entry, so it is instant).
//      This is what makes the app feel quick on a slow mobile connection.
//
// Safety: persisted entries are scoped to the signed-in user (setCacheScope) and
// wiped on logout / any clearAll(); a write that calls invalidate() drops the
// matching persisted entries too, so you never see your own edit "undone".

interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  promise?: Promise<T>;
  stale?: T; // last persisted value, served while the network copy loads
}

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 30_000;
const PREFIX = 'vsc1:';
const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PERSIST_BYTES = 1_500_000;
export const CACHE_REFRESHED_EVENT = 'vseva:cache-refreshed';

let scope: string | null = null;

// Called once the signed-in user is known (null on logout). Persisted entries
// belong to exactly one user; switching user drops everything else.
export function setCacheScope(id: string | null): void {
  if (scope === id) return;
  if (scope !== null) cache.clear(); // a different user (or logout): nothing in memory may carry over
  scope = id;
  purgePersisted(k => !id || !k.startsWith(`${PREFIX}${id}:`));
}

function storageKey(key: string): string | null {
  return scope ? `${PREFIX}${scope}:${key}` : null;
}

function readPersisted<T>(key: string): T | undefined {
  const sk = storageKey(key);
  if (!sk) return undefined;
  try {
    const raw = localStorage.getItem(sk);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { v: T; t: number };
    if (!parsed || Date.now() - parsed.t > MAX_STALE_MS) { localStorage.removeItem(sk); return undefined; }
    return parsed.v;
  } catch { return undefined; }
}

function writePersisted<T>(key: string, value: T): void {
  const sk = storageKey(key);
  if (!sk) return;
  try {
    const raw = JSON.stringify({ v: value, t: Date.now() });
    if (raw.length > MAX_PERSIST_BYTES) return;
    localStorage.setItem(sk, raw);
  } catch { /* quota / private mode — just skip persistence */ }
}

function purgePersisted(shouldRemove: (storageKey: string) => boolean): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && shouldRemove(k)) doomed.push(k);
    }
    doomed.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export interface CacheOptions {
  /** Keep the last good result on the device and show it instantly next time. */
  persist?: boolean;
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
  opts: CacheOptions = {}
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);

  if (existing) {
    if (existing.promise) return existing.stale !== undefined ? existing.stale : existing.promise; // in-flight — share it
    if (existing.expiresAt > now) return existing.value as T; // fresh hit
  }

  const stale = opts.persist ? readPersisted<T>(key) : undefined;

  const promise = fetcher()
    .then(value => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      if (opts.persist) {
        writePersisted(key, value);
        if (stale !== undefined) {
          let changed = true;
          try { changed = JSON.stringify(value) !== JSON.stringify(stale); } catch { /* assume changed */ }
          if (changed) window.dispatchEvent(new CustomEvent(CACHE_REFRESHED_EVENT, { detail: { key } }));
        }
      }
      return value;
    })
    .catch(err => {
      cache.delete(key); // never cache a failure
      if (stale !== undefined) return stale; // offline / error: last known data beats an error screen
      throw err;
    });

  cache.set(key, { expiresAt: 0, promise, stale });
  return stale !== undefined ? stale : promise;
}

// Removes every cache entry whose key contains `match` as a substring.
// Cache keys are built as `<kind>:<id>:...` (see dataService.ts), so
// invalidate(orgId) or invalidate(userId) sweeps every cache entry scoped
// to that org/user regardless of which read method produced it.
export function invalidate(match: string): void {
  for (const key of cache.keys()) {
    if (key.includes(match)) cache.delete(key);
  }
  const base = scope ? `${PREFIX}${scope}:` : null;
  if (base) purgePersisted(k => k.startsWith(base) && k.slice(base.length).includes(match));
}

export function clearAll(): void {
  cache.clear();
  purgePersisted(() => true);
}
