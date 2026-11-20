// Minimal Meta Graph API client for the WhatsApp Cloud API. Server-side only: the token never reaches a browser.
// `fetchImpl` is injectable so tests use mocked Meta responses and never send a real message.

export type ErrorKind = 'transient' | 'rate_limit' | 'permanent' | 'auth' | 'opted_out';

export interface GraphError {
  httpStatus: number;
  code: string;
  subcode?: string;
  message: string;
  kind: ErrorKind;
}

export type SendResult =
  | { ok: true; messageId: string; messageStatus: string } // "accepted" = Meta took it, NOT delivered
  | { ok: false; error: GraphError };

// Meta error codes → how we treat them (https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)
const AUTH = new Set(['190', '10', '200', '3']);
const RATE = new Set(['4', '80007', '130429', '131048', '131056']);
const TRANSIENT = new Set(['1', '2', '131000', '131016', '133004']);
const OPTED_OUT = new Set(['131050']); // the user stopped marketing messages from this business

export function classifyError(httpStatus: number, code: string): ErrorKind {
  if (OPTED_OUT.has(code)) return 'opted_out';
  if (AUTH.has(code) || httpStatus === 401) return 'auth';
  if (RATE.has(code) || httpStatus === 429) return 'rate_limit';
  if (TRANSIENT.has(code) || httpStatus >= 500 || httpStatus === 0) return 'transient';
  return 'permanent'; // e.g. 131026 undeliverable, 132000/132012 parameter issues, 132001 template missing, 131049 frequency cap
}

export function createGraphClient(opts: {
  token: string;
  version: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  baseUrl?: string;
}) {
  const doFetch = opts.fetchImpl ?? fetch;
  const base = `${opts.baseUrl ?? 'https://graph.facebook.com'}/${opts.version}`;
  const timeoutMs = opts.timeoutMs ?? 15000;

  async function call(method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; json: any }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await doFetch(`${base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      let json: any = null;
      try { json = await res.json(); } catch { json = null; }
      return { status: res.status, json };
    } catch (e) {
      const aborted = (e as Error)?.name === 'AbortError';
      return { status: 0, json: { error: { code: aborted ? 'timeout' : 'network', message: aborted ? 'Request to Meta timed out' : 'Network error reaching Meta' } } };
    } finally {
      clearTimeout(timer);
    }
  }

  function toError(status: number, json: any): GraphError {
    const err = json?.error ?? {};
    const code = String(err.code ?? status);
    return {
      httpStatus: status,
      code,
      subcode: err.error_subcode != null ? String(err.error_subcode) : undefined,
      message: String(err.error_user_msg || err.message || `HTTP ${status}`).slice(0, 300),
      kind: classifyError(status, code),
    };
  }

  return {
    async sendTemplate(phoneNumberId: string, payload: unknown): Promise<SendResult> {
      const { status, json } = await call('POST', `/${phoneNumberId}/messages`, payload);
      const msg = json?.messages?.[0];
      if (status >= 200 && status < 300 && msg?.id) {
        return { ok: true, messageId: String(msg.id), messageStatus: String(msg.message_status ?? 'accepted') };
      }
      return { ok: false, error: toError(status, json) };
    },

    /** Sender readiness: display name review (name_status), number, quality. */
    async getPhoneNumber(phoneNumberId: string) {
      const fields = 'display_phone_number,verified_name,name_status,quality_rating,code_verification_status,platform_type';
      const { status, json } = await call('GET', `/${phoneNumberId}?fields=${fields}`);
      if (status >= 200 && status < 300 && json?.id) return { ok: true as const, data: json };
      return { ok: false as const, error: toError(status, json) };
    },

    /** The template as Meta has it under this WABA (status, category, language, id). */
    async getTemplate(wabaId: string, name: string, language: string) {
      const { status, json } = await call('GET', `/${wabaId}/message_templates?name=${encodeURIComponent(name)}&fields=id,name,status,category,language`);
      if (status >= 200 && status < 300 && Array.isArray(json?.data)) {
        const t = json.data.find((x: any) => x?.name === name && x?.language === language) ?? null;
        return { ok: true as const, data: t };
      }
      return { ok: false as const, error: toError(status, json) };
    },
  };
}
