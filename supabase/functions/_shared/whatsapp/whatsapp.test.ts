// Unit tests for the WhatsApp modules. Run: npm run test:whatsapp
// Meta is always mocked: nothing here talks to the network or sends a message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { normalizeIndianMobile, maskPhone } from './phone.ts';
import { buildTemplateMessage, renderPreview, viharReminderParams, VIHAR_REMINDER, TemplateParamError } from './template.ts';
import { createGraphClient, classifyError } from './graph.ts';
import { retryPlan, MAX_ATTEMPTS } from './retry.ts';
import { evaluateReadiness, isTestRecipient, EXPECTED_IDS, type WaEnv, type WaConfig } from './readiness.ts';
import { verifyHandshake, verifySignature, parseStatusEvents } from './webhook.ts';

// ───────────── phone numbers ─────────────
test('phone: Indian mobiles normalise to 91XXXXXXXXXX, others are rejected', () => {
  assert.equal(normalizeIndianMobile('98765 43210'), '919876543210');
  assert.equal(normalizeIndianMobile('+91 98765-43210'), '919876543210');
  assert.equal(normalizeIndianMobile('09876543210'), '919876543210');
  assert.equal(normalizeIndianMobile(9876543210), '919876543210');
  assert.equal(normalizeIndianMobile('12345'), null);
  assert.equal(normalizeIndianMobile('5876543210'), null); // landline-like start
  assert.equal(normalizeIndianMobile(''), null);
  assert.equal(normalizeIndianMobile(null), null);
});

test('phone: masking never shows the full number', () => {
  assert.equal(maskPhone('919876543210'), '91XXXXXX3210');
  assert.ok(!maskPhone('919876543210').includes('98765'));
});

// ───────────── template ─────────────
test('template: exact approved name, Hindi, two body params in order {{1}} name, {{2}} days', () => {
  const p = buildTemplateMessage({ to: '919876543210', templateName: 'vihar_reminder', language: 'hi', params: ['Ramesh Shah', '7'] });
  assert.equal(p.messaging_product, 'whatsapp');
  assert.equal(p.type, 'template');
  assert.equal(p.template.name, 'vihar_reminder');
  assert.deepEqual(p.template.language, { code: 'hi' });
  assert.deepEqual(p.template.components[0].parameters, [{ type: 'text', text: 'Ramesh Shah' }, { type: 'text', text: '7' }]);
  assert.equal(VIHAR_REMINDER.category, 'MARKETING');
});

test('template: preview fills the approved body', () => {
  const text = renderPreview(['Ramesh Shah', '7']);
  assert.ok(text.startsWith('🙏 Jai Jinendra Ramesh Shah,'));
  assert.ok(text.includes('Aapki pichhli Vihar Seva ko 7 din ho gaye hain.'));
  assert.ok(text.endsWith('vSeva App'));
});

test('template: bad parameters are refused before calling Meta', () => {
  assert.throws(() => viharReminderParams(['Ramesh']), TemplateParamError);
  assert.throws(() => viharReminderParams(['', '7']), TemplateParamError);
  assert.throws(() => viharReminderParams(['Ramesh', 'seven']), TemplateParamError);
  assert.deepEqual(viharReminderParams(['Ramesh\n  Shah', '12']), ['Ramesh Shah', '12']); // new lines would make Meta reject it
  assert.throws(() => buildTemplateMessage({ to: '98765', templateName: 'vihar_reminder', language: 'hi', params: ['A', '1'] }), TemplateParamError);
});

// ───────────── Graph API client (mocked fetch) ─────────────
function mockFetch(status: number, body: unknown, seen: { url?: string; init?: any } = {}) {
  return (async (url: string, init: any) => {
    seen.url = url; seen.init = init;
    return { status, json: async () => body } as any;
  }) as unknown as typeof fetch;
}

test('api: sends to /{PHONE_NUMBER_ID}/messages with the token in the header; "accepted" is not delivery', async () => {
  const seen: any = {};
  const g = createGraphClient({ token: 'TEST_TOKEN', version: 'v25.0', fetchImpl: mockFetch(200, { messages: [{ id: 'wamid.1', message_status: 'accepted' }] }, seen) });
  const r = await g.sendTemplate(EXPECTED_IDS.phoneNumberId, { a: 1 });
  assert.equal(seen.url, `https://graph.facebook.com/v25.0/${EXPECTED_IDS.phoneNumberId}/messages`);
  assert.equal(seen.init.headers.Authorization, 'Bearer TEST_TOKEN');
  assert.deepEqual(r, { ok: true, messageId: 'wamid.1', messageStatus: 'accepted' });
});

test('api: templates are read from the WABA, phone details from the Phone Number ID', async () => {
  const seen: any = {};
  const g = createGraphClient({ token: 't', version: 'v25.0', fetchImpl: mockFetch(200, { data: [{ name: 'vihar_reminder', language: 'hi', status: 'APPROVED', category: 'MARKETING', id: '1123858537229648' }] }, seen) });
  const t = await g.getTemplate(EXPECTED_IDS.wabaId, 'vihar_reminder', 'hi');
  assert.ok(seen.url.includes(`/${EXPECTED_IDS.wabaId}/message_templates?name=vihar_reminder`));
  assert.equal(t.ok && t.data.status, 'APPROVED');
  const g2 = createGraphClient({ token: 't', version: 'v25.0', fetchImpl: mockFetch(200, { id: EXPECTED_IDS.phoneNumberId, name_status: 'PENDING_REVIEW' }, seen) });
  const p = await g2.getPhoneNumber(EXPECTED_IDS.phoneNumberId);
  assert.ok(seen.url.includes(`/${EXPECTED_IDS.phoneNumberId}?fields=`));
  assert.equal(p.ok && p.data.name_status, 'PENDING_REVIEW');
});

test('api: auth failure, invalid template, rate limit and opt-out are classified', async () => {
  const cases: [number, unknown, string][] = [
    [401, { error: { code: 190, message: 'Invalid OAuth access token' } }, 'auth'],
    [400, { error: { code: 132001, message: 'Template name does not exist in the translation' } }, 'permanent'],
    [400, { error: { code: 131056, message: 'Pair rate limit hit' } }, 'rate_limit'],
    [429, { error: { code: 80007, message: 'Rate limit' } }, 'rate_limit'],
    [400, { error: { code: 131050, message: 'User stopped marketing messages' } }, 'opted_out'],
    [503, { error: { code: 131016, message: 'Service unavailable' } }, 'transient'],
  ];
  for (const [status, body, kind] of cases) {
    const r = await createGraphClient({ token: 't', version: 'v25.0', fetchImpl: mockFetch(status, body) }).sendTemplate('1', {});
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.kind, kind, JSON.stringify(body));
  }
  assert.equal(classifyError(400, '131026'), 'permanent'); // undeliverable
});

test('api: timeout is a transient error, not a crash', async () => {
  const hang = ((_u: string, init: any) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))))) as unknown as typeof fetch;
  const r = await createGraphClient({ token: 't', version: 'v25.0', fetchImpl: hang, timeoutMs: 20 }).sendTemplate('1', {});
  assert.equal(r.ok, false);
  if (!r.ok) { assert.equal(r.error.code, 'timeout'); assert.equal(r.error.kind, 'transient'); }
});

// ───────────── retries ─────────────
test('retry: exponential backoff for temporary errors, never for permanent ones, capped attempts', () => {
  assert.deepEqual(retryPlan('permanent', 1), { retry: false, delayMs: 0 });
  assert.deepEqual(retryPlan('auth', 1), { retry: false, delayMs: 0 });
  assert.deepEqual(retryPlan('opted_out', 1), { retry: false, delayMs: 0 });
  assert.equal(retryPlan('transient', 1).delayMs, 60_000);
  assert.equal(retryPlan('transient', 2).delayMs, 120_000);
  assert.equal(retryPlan('rate_limit', 1).delayMs, 300_000);
  assert.equal(retryPlan('transient', MAX_ATTEMPTS).retry, false);
});

// ───────────── production gate ─────────────
const fullEnv: WaEnv = {
  WHATSAPP_ACCESS_TOKEN: 'x', WHATSAPP_PHONE_NUMBER_ID: EXPECTED_IDS.phoneNumberId, WHATSAPP_BUSINESS_ACCOUNT_ID: EXPECTED_IDS.wabaId,
  WHATSAPP_VERIFY_TOKEN: 'v', WHATSAPP_APP_SECRET: 's', WHATSAPP_API_VERSION: 'v25.0',
  WHATSAPP_AUTOMATION_ENABLED: 'true', WHATSAPP_PRODUCTION_MODE: 'true', WHATSAPP_TEST_MODE: 'false',
};
const readyCfg: WaConfig = {
  automation_enabled: true, production_mode: true, template_name: 'vihar_reminder', template_language: 'hi',
  sender_name_status: 'APPROVED', template_status: 'APPROVED', template_category: 'MARKETING',
  webhook_verified_at: '2026-11-15T00:00:00Z', controlled_delivery_at: '2026-11-15T00:00:00Z',
};

test('gate: everything green → production allowed', () => {
  assert.equal(evaluateReadiness(fullEnv, readyCfg).canSendProduction, true);
});

test('gate: today\'s real state (display name IN REVIEW, defaults off) blocks production', () => {
  const r = evaluateReadiness(
    { ...fullEnv, WHATSAPP_AUTOMATION_ENABLED: 'false', WHATSAPP_PRODUCTION_MODE: 'false', WHATSAPP_TEST_MODE: 'true' },
    { ...readyCfg, sender_name_status: 'PENDING_REVIEW', automation_enabled: false, production_mode: false, controlled_delivery_at: null, webhook_verified_at: null },
  );
  assert.equal(r.canSendProduction, false);
  assert.match(r.message, /Awaiting Meta sender approval/);
  assert.ok(r.productionBlockers.some((b) => b.includes('display name not approved')));
});

test('gate: each single missing condition blocks production on its own', () => {
  const blocks: [string, WaEnv, WaConfig][] = [
    ['automation secret off', { ...fullEnv, WHATSAPP_AUTOMATION_ENABLED: 'false' }, readyCfg],
    ['production secret off', { ...fullEnv, WHATSAPP_PRODUCTION_MODE: 'false' }, readyCfg],
    ['test mode on', { ...fullEnv, WHATSAPP_TEST_MODE: 'true' }, readyCfg],
    ['display name in review', fullEnv, { ...readyCfg, sender_name_status: 'PENDING_REVIEW' }],
    ['template pending', fullEnv, { ...readyCfg, template_status: 'PENDING' }],
    ['template rejected', fullEnv, { ...readyCfg, template_status: 'REJECTED' }],
    ['category changed', fullEnv, { ...readyCfg, template_category: 'UTILITY' }],
    ['webhook not verified', fullEnv, { ...readyCfg, webhook_verified_at: null }],
    ['no delivered test', fullEnv, { ...readyCfg, controlled_delivery_at: null }],
    ['automation off in admin', fullEnv, { ...readyCfg, automation_enabled: false }],
    ['production off in admin', fullEnv, { ...readyCfg, production_mode: false }],
    ['missing token', { ...fullEnv, WHATSAPP_ACCESS_TOKEN: '' }, readyCfg],
    ['missing app secret', { ...fullEnv, WHATSAPP_APP_SECRET: undefined }, readyCfg],
    ['wrong WABA', { ...fullEnv, WHATSAPP_BUSINESS_ACCOUNT_ID: '999' }, readyCfg],
    ['wrong phone number id', { ...fullEnv, WHATSAPP_PHONE_NUMBER_ID: '999' }, readyCfg],
  ];
  for (const [label, env, cfg] of blocks) assert.equal(evaluateReadiness(env, cfg).canSendProduction, false, label);
});

test('gate: test sends need test mode and only go to allow-listed numbers', () => {
  assert.equal(evaluateReadiness({ ...fullEnv, WHATSAPP_TEST_MODE: 'true' }, { ...readyCfg, sender_name_status: 'PENDING_REVIEW' }).canSendTest, true);
  assert.equal(evaluateReadiness({ ...fullEnv, WHATSAPP_TEST_MODE: 'false' }, readyCfg).canSendTest, false);
  assert.equal(isTestRecipient('+91 98765 43210, 919999999999', '919876543210'), true);
  assert.equal(isTestRecipient('919999999999', '919876543210'), false);
  assert.equal(isTestRecipient(undefined, '919876543210'), false);
});

// ───────────── webhook ─────────────
test('webhook: verification handshake', () => {
  const ok = verifyHandshake(new URLSearchParams('hub.mode=subscribe&hub.verify_token=abc&hub.challenge=42'), 'abc');
  assert.deepEqual(ok, { ok: true, challenge: '42' });
  assert.equal(verifyHandshake(new URLSearchParams('hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42'), 'abc').ok, false);
  assert.equal(verifyHandshake(new URLSearchParams('hub.mode=subscribe&hub.verify_token=abc'), undefined).ok, false);
});

test('webhook: X-Hub-Signature-256 accepted only when it matches the App Secret', async () => {
  const raw = JSON.stringify({ entry: [] });
  const good = 'sha256=' + createHmac('sha256', 'app-secret').update(raw).digest('hex');
  assert.equal(await verifySignature(raw, good, 'app-secret'), true);
  assert.equal(await verifySignature(raw, good, 'other-secret'), false);
  assert.equal(await verifySignature(raw + ' ', good, 'app-secret'), false);
  assert.equal(await verifySignature(raw, null, 'app-secret'), false);
  assert.equal(await verifySignature(raw, 'sha1=abc', 'app-secret'), false);
});

const statusBody = (statuses: unknown[]) => ({ object: 'whatsapp_business_account', entry: [{ id: EXPECTED_IDS.wabaId, changes: [{ field: 'messages', value: { statuses } }] }] });

test('webhook: sent / delivered / read / failed are parsed; the phone number is dropped', () => {
  const evs = parseStatusEvents(statusBody([
    { id: 'wamid.1', status: 'sent', timestamp: '1763190000', recipient_id: '919876543210' },
    { id: 'wamid.1', status: 'delivered', timestamp: '1763190005', recipient_id: '919876543210' },
    { id: 'wamid.1', status: 'read', timestamp: '1763190100', recipient_id: '919876543210' },
    { id: 'wamid.2', status: 'failed', timestamp: '1763190200', recipient_id: '919876543210', errors: [{ code: 131026, title: 'Message undeliverable' }] },
  ]));
  assert.deepEqual(evs.map((e) => e.status), ['sent', 'delivered', 'read', 'failed']);
  assert.equal(evs[3].errorCode, '131026');
  assert.equal(evs[3].errorTitle, 'Message undeliverable');
  assert.equal(evs[0].eventAt, new Date(1763190000 * 1000).toISOString());
  for (const e of evs) assert.ok(!JSON.stringify(e.provider).includes('919876543210'));
});

test('webhook: non-status events and malformed bodies are ignored', () => {
  assert.deepEqual(parseStatusEvents({}), []);
  assert.deepEqual(parseStatusEvents({ entry: [{ changes: [{ field: 'messages', value: { messages: [{ from: '91', text: { body: 'hi' } }] } }] }] }), []);
  assert.deepEqual(parseStatusEvents(statusBody([{ status: 'sent' }])), []);
});
