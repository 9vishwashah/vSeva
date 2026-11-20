// whatsapp-webhook: Meta calls this with delivery statuses. NOT DEPLOYED YET (see docs/whatsapp/README.md).
//   GET  verification handshake (hub.verify_token = WHATSAPP_VERIFY_TOKEN); marks the webhook verified
//   POST status events; rejected unless X-Hub-Signature-256 matches WHATSAPP_APP_SECRET
// Independent of the sending function. Duplicate events are ignored by whatsapp_record_event().
import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseStatusEvents, verifyHandshake, verifySignature } from '../_shared/whatsapp/webhook.ts';

const env = Deno.env.toObject();
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const { ok, challenge } = verifyHandshake(url.searchParams, env.WHATSAPP_VERIFY_TOKEN);
    if (!ok) return new Response('forbidden', { status: 403 });
    await sb.from('whatsapp_config').update({ webhook_verified_at: new Date().toISOString() }).eq('id', 1);
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get('x-hub-signature-256'), env.WHATSAPP_APP_SECRET))) {
    return new Response('invalid signature', { status: 401 });
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }

  for (const ev of parseStatusEvents(body)) {
    const { error } = await sb.rpc('whatsapp_record_event', {
      p_meta_message_id: ev.metaMessageId, p_status: ev.status, p_event_at: ev.eventAt,
      p_error_code: ev.errorCode, p_error_title: ev.errorTitle, p_provider: ev.provider,
    });
    if (error) console.error('whatsapp_record_event failed', error.message);
  }
  // Always 200 after a valid signature, so Meta does not keep re-sending events we already stored.
  return new Response('ok', { status: 200 });
});
