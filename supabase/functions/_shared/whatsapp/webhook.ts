// Meta webhook helpers: verification handshake, X-Hub-Signature-256 check, and status-event parsing.
// Uses Web Crypto (available in Deno and in Node), so it is unit-tested locally.

/** GET handshake: Meta sends hub.mode=subscribe, hub.verify_token, hub.challenge. */
export function verifyHandshake(params: URLSearchParams, verifyToken: string | undefined) {
  const ok = !!verifyToken && params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === verifyToken;
  return { ok, challenge: ok ? params.get('hub.challenge') ?? '' : '' };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checks Meta's signature over the RAW request body with the App Secret. */
export async function verifySignature(rawBody: string, header: string | null, appSecret: string | undefined): Promise<boolean> {
  if (!header || !appSecret || !header.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, header.slice('sha256='.length).toLowerCase());
}

export interface StatusEvent {
  metaMessageId: string;
  status: string; // sent | delivered | read | failed
  eventAt: string | null; // ISO
  errorCode: string | null;
  errorTitle: string | null;
  provider: Record<string, unknown>; // the status object WITHOUT the recipient's phone number
}

/** Every status update in a webhook body (a body can carry several). Other event types are ignored. */
export function parseStatusEvents(body: any): StatusEvent[] {
  const out: StatusEvent[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== 'messages') continue;
      for (const s of change?.value?.statuses ?? []) {
        if (!s?.id || !s?.status) continue;
        const err = Array.isArray(s.errors) ? s.errors[0] : null;
        const { recipient_id: _drop, ...rest } = s; // no phone numbers in the delivery log
        out.push({
          metaMessageId: String(s.id),
          status: String(s.status),
          eventAt: s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : null,
          errorCode: err?.code != null ? String(err.code) : null,
          errorTitle: err ? String(err.title || err.message || err.error_data?.details || '').slice(0, 300) || null : null,
          provider: rest,
        });
      }
    }
  }
  return out;
}
