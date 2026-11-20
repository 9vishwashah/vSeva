import type { ErrorKind } from './graph.ts';

export const MAX_ATTEMPTS = 4;

/** Whether a failed send should be tried again, and after how long (ms). Permanent errors never retry. */
export function retryPlan(kind: ErrorKind, attempts: number): { retry: boolean; delayMs: number } {
  if (kind !== 'transient' && kind !== 'rate_limit') return { retry: false, delayMs: 0 };
  if (attempts >= MAX_ATTEMPTS) return { retry: false, delayMs: 0 };
  const base = kind === 'rate_limit' ? 5 * 60_000 : 60_000; // 5 min for rate limits, 1 min otherwise
  return { retry: true, delayMs: Math.min(base * 2 ** Math.max(0, attempts - 1), 60 * 60_000) };
}
