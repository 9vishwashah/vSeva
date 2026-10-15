import { BRAND } from '@brand';

// Resolves a Netlify Function path: relative on web (unchanged today), absolute
// against the production host when running inside the native Capacitor app,
// where there is no same-origin Netlify deployment to resolve a relative path
// against. Uses a duck-typed check instead of importing @capacitor/core so this
// works before Capacitor is added to the project (Phase 1).
const isNativePlatform = (): boolean => {
  const capacitor = (globalThis as any).Capacitor;
  return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
};

const NATIVE_API_ORIGIN = BRAND.siteUrl;

export const fnUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return isNativePlatform()
    ? `${NATIVE_API_ORIGIN}/.netlify/functions/${cleanPath}`
    : `/.netlify/functions/${cleanPath}`;
};

export interface CallFnOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  // Only set true for calls that are safe to repeat — i.e. reads. Writes
  // (create/delete/update-*) default to no retry: a request that times out
  // after the server already applied it would otherwise be reapplied,
  // risking duplicate accounts/records.
  retry?: boolean;
  timeoutMs?: number;
}

function backoff(attempt: number): Promise<void> {
  const base = 300 * Math.pow(2, attempt); // 300ms, 600ms, 1200ms...
  const jitter = Math.random() * 150;
  return new Promise(resolve => setTimeout(resolve, base + jitter));
}

const RETRYABLE_STATUS = (status: number) => status === 429 || (status >= 502 && status <= 504);

// Calls a Netlify Function with a bounded timeout, and — only when opted
// into via `retry` — exponential backoff retry limited to transient
// failures (network error, request timeout, 429/502/503/504). Never retries
// 4xx other than 429, and never retries unless the caller has said the
// call is idempotent.
// The signed-in user's access token, sent with every function call so the server can check who is asking and
// for which group. Calls that already pass their own Authorization header keep it.
async function authHeader(headers: Record<string, string>): Promise<Record<string, string>> {
  if (Object.keys(headers).some(h => h.toLowerCase() === 'authorization')) return {};
  try {
    const { supabase } = await import('./supabase');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// After the app sat in the background, its saved access token can still look valid while the server has already
// ended that session ("Auth session missing"). Get a fresh token once; null when the session is really over.
async function refreshedAuthHeader(): Promise<Record<string, string> | null> {
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.auth.refreshSession();
    const token = data.session?.access_token;
    return !error && token ? { Authorization: `Bearer ${token}` } : null;
  } catch {
    return null;
  }
}

export async function callFn<T = any>(name: string, opts: CallFnOptions = {}): Promise<T> {
  const { method = 'POST', body, query, retry = false, timeoutMs = 15000 } = opts;
  let headers: Record<string, string> = { ...(await authHeader(opts.headers || {})), ...(opts.headers || {}) };
  let authRetried = false;
  const maxAttempts = retry ? 3 : 1;
  let lastError: unknown;

  let url = fnUrl(name);
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        return (await response.json().catch(() => undefined)) as T;
      }

      // 401 = the server refused before doing anything, so one retry with a refreshed login is safe even for writes
      if (response.status === 401 && !authRetried && Object.keys(headers).some(h => h.toLowerCase() === 'authorization')) {
        authRetried = true;
        const fresh = await refreshedAuthHeader();
        if (!fresh) throw new Error('Your session has ended. Please sign in again.');
        headers = { ...Object.fromEntries(Object.entries(headers).filter(([h]) => h.toLowerCase() !== 'authorization')), ...fresh };
        attempt--; // this retry does not use up one of the network-retry attempts
        continue;
      }

      if (RETRYABLE_STATUS(response.status) && attempt < maxAttempts - 1) {
        await backoff(attempt);
        continue;
      }

      const errBody = await response.json().catch(() => null as any);
      throw new Error((errBody && (errBody.error || errBody.message)) || `${name} failed (${response.status})`);
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      const isAbort = err?.name === 'AbortError';
      const isNetworkError = err instanceof TypeError; // fetch's own "Failed to fetch"
      if ((isAbort || isNetworkError) && attempt < maxAttempts - 1) {
        await backoff(attempt);
        continue;
      }
      throw isAbort ? new Error(`${name} timed out`) : err;
    }
  }
  throw lastError;
}
