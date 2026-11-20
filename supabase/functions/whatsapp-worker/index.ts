// whatsapp-worker: sends queued WhatsApp reminders. NOT DEPLOYED YET (see docs/whatsapp/README.md).
//
// Called by pg_cron (scripts/whatsapp_reminders_cron.sql) and by the super-admin Netlify function, always with the
// x-whatsapp-cron-secret header. Modes:
//   { "mode": "check" }  refresh sender / template readiness from the Graph API (no messages)
//   { "mode": "run" }    send due jobs, only if the production gate passes
//   { "mode": "test", "orgId", "to", "name", "days" }  one test message to an allow-listed number, test mode only
//
// "accepted" from Meta is stored as accepted, never as delivered; delivery comes only from the webhook.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createGraphClient } from '../_shared/whatsapp/graph.ts';
import { buildTemplateMessage, TemplateParamError } from '../_shared/whatsapp/template.ts';
import { evaluateReadiness, isTestRecipient, type WaEnv } from '../_shared/whatsapp/readiness.ts';
import { retryPlan } from '../_shared/whatsapp/retry.ts';
import { maskPhone, normalizeIndianMobile } from '../_shared/whatsapp/phone.ts';

const env = Deno.env.toObject() as WaEnv & Record<string, string>;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function secretOk(req: Request): boolean {
  const want = env.WHATSAPP_CRON_SECRET ?? '';
  const got = req.headers.get('x-whatsapp-cron-secret') ?? '';
  if (!want || got.length !== want.length) return false;
  let d = 0;
  for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function graph() {
  return createGraphClient({ token: env.WHATSAPP_ACCESS_TOKEN ?? '', version: env.WHATSAPP_API_VERSION || 'v25.0' });
}

async function loadConfig() {
  const { data, error } = await sb.from('whatsapp_config').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

/** Refreshes readiness straight from Meta, so "approved" can never be typed in by hand. */
async function check() {
  const patch: Record<string, unknown> = { last_checked_at: new Date().toISOString(), last_check_error: null };
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
    patch.last_check_error = 'WhatsApp secrets are not set';
  } else {
    const g = graph();
    const phone = await g.getPhoneNumber(env.WHATSAPP_PHONE_NUMBER_ID);
    if (phone.ok) {
      Object.assign(patch, {
        sender_display_name: phone.data.verified_name ?? null,
        sender_phone: phone.data.display_phone_number ?? null,
        sender_name_status: phone.data.name_status ?? null,
        sender_quality_rating: phone.data.quality_rating ?? null,
      });
    } else patch.last_check_error = `Phone number: ${phone.error.code} ${phone.error.message}`;
    const cfg = await loadConfig();
    const t = await g.getTemplate(env.WHATSAPP_BUSINESS_ACCOUNT_ID, cfg.template_name, cfg.template_language);
    if (t.ok) {
      Object.assign(patch, { template_status: t.data?.status ?? 'NOT_FOUND', template_category: t.data?.category ?? null, template_id: t.data?.id ?? null });
    } else patch.last_check_error = `${patch.last_check_error ? patch.last_check_error + '; ' : ''}Template: ${t.error.code} ${t.error.message}`;
  }
  await sb.from('whatsapp_config').update(patch).eq('id', 1);
  const readiness = evaluateReadiness(env, await loadConfig());
  // saved so the super-admin screen shows exactly why sending is blocked (no secrets in it)
  await sb.from('whatsapp_config').update({ readiness }).eq('id', 1);
  return readiness;
}

async function sendOne(job: any) {
  let payload;
  try {
    payload = buildTemplateMessage({ to: job.phone_e164, templateName: job.template_name, language: job.template_language, params: job.template_params });
  } catch (e) {
    const msg = e instanceof TemplateParamError ? e.message : 'Could not build the message';
    await sb.from('whatsapp_messages').update({ status: 'failed', failed_at: new Date().toISOString(), last_error_code: 'params', last_error_message: msg, locked_at: null, retryable: false }).eq('id', job.id);
    return 'failed';
  }
  const res = await graph().sendTemplate(env.WHATSAPP_PHONE_NUMBER_ID!, payload);
  const now = new Date().toISOString();
  if (res.ok) {
    await sb.from('whatsapp_messages').update({ status: 'accepted', meta_message_id: res.messageId, accepted_at: now, locked_at: null, last_error_code: null, last_error_message: null }).eq('id', job.id);
    if (!job.is_test && job.user_id) await sb.from('whatsapp_preferences').update({ last_reminder_at: now, updated_at: now }).eq('user_id', job.user_id);
    return 'accepted';
  }
  const plan = retryPlan(res.error.kind, job.attempts);
  if (res.error.kind === 'opted_out' && job.user_id) {
    await sb.from('whatsapp_preferences').update({ opted_in: false, opted_out_at: now, updated_at: now }).eq('user_id', job.user_id);
  }
  await sb.from('whatsapp_messages').update({
    status: plan.retry ? 'queued' : 'failed',
    next_retry_at: plan.retry ? new Date(Date.now() + plan.delayMs).toISOString() : null,
    failed_at: plan.retry ? null : now,
    retryable: plan.retry,
    last_error_code: res.error.code,
    last_error_message: res.error.message,
    locked_at: null,
  }).eq('id', job.id);
  console.log(`whatsapp job ${job.id} to ${maskPhone(job.phone_e164)}: ${res.error.kind} ${res.error.code}`);
  return plan.retry ? 'retry' : 'failed';
}

async function run() {
  const cfg = await loadConfig();
  const stale = !cfg.last_checked_at || Date.now() - Date.parse(cfg.last_checked_at) > 30 * 60_000;
  const readiness = stale ? await check() : evaluateReadiness(env, cfg);
  if (!readiness.canSendProduction) return { sent: 0, blocked: readiness.productionBlockers };

  const batch = Math.min(Number(env.WHATSAPP_MAX_BATCH || 25), 200);
  const gapMs = Math.ceil(1000 / Math.max(1, Number(env.WHATSAPP_MAX_PER_SECOND || 5)));
  const { data: jobs, error } = await sb.rpc('whatsapp_claim_batch', { p_limit: batch });
  if (error) throw error;
  const tally: Record<string, number> = {};
  for (const job of jobs ?? []) {
    if (job.is_test) continue; // test messages are only sent by mode "test"
    const { data: reason } = await sb.rpc('whatsapp_recheck', { p_message_id: job.id });
    if (reason) {
      await sb.from('whatsapp_messages').update({ status: 'cancelled', cancel_reason: reason, locked_at: null }).eq('id', job.id);
      tally.cancelled = (tally.cancelled ?? 0) + 1;
      continue;
    }
    const r = await sendOne(job);
    tally[r] = (tally[r] ?? 0) + 1;
    await sleep(gapMs);
  }
  return { claimed: jobs?.length ?? 0, ...tally };
}

async function test(body: any) {
  const cfg = await loadConfig();
  const readiness = evaluateReadiness(env, cfg);
  if (!readiness.canSendTest) return { sent: false, blocked: readiness.testBlockers };
  const to = normalizeIndianMobile(body.to);
  if (!to || !isTestRecipient(env.WHATSAPP_TEST_RECIPIENTS, to)) return { sent: false, blocked: ['Number is not in WHATSAPP_TEST_RECIPIENTS'] };
  if (!body.orgId) return { sent: false, blocked: ['orgId is required'] };
  const endOfDay = new Date(Date.now() + 24 * 3600_000).toISOString();
  const { data: job, error } = await sb.from('whatsapp_messages').insert({
    organization_id: body.orgId, phone_e164: to, template_name: cfg.template_name, template_language: cfg.template_language,
    template_params: [String(body.name || 'Sevak'), String(body.days || '7')], is_test: true, status: 'sending',
    attempts: 1, locked_at: new Date().toISOString(), expires_at: endOfDay,
  }).select('*').single();
  if (error) throw error;
  return { sent: true, result: await sendOne(job), messageId: job.id };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  if (!secretOk(req)) return json(401, { error: 'unauthorised' });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.mode === 'check') return json(200, await check());
    if (body.mode === 'run') return json(200, await run());
    if (body.mode === 'test') return json(200, await test(body));
    return json(400, { error: 'mode must be check, run or test' });
  } catch (e) {
    console.error('whatsapp-worker error', (e as Error)?.message);
    return json(500, { error: 'worker error' });
  }
});
