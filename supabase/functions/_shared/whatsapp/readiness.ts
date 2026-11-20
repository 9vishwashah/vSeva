// The server-side production gate. Every automated (non-test) send passes through canSendProduction.
// It reads Edge Function secrets and the whatsapp_config row (refreshed from Meta, never typed in by an org admin).
// There is deliberately no way for an organisation, a Captain or the browser to override it.
import { VIHAR_REMINDER } from './template.ts';

// The VSeva Meta assets. A mismatch blocks sending (protects against using another app's / Little Bunnies' IDs).
export const EXPECTED_IDS = {
  wabaId: '1691237689298935',
  phoneNumberId: '1452234317984360',
} as const;

// Meta name_status values that allow normal outbound messaging.
const SENDER_OK = new Set(['APPROVED', 'AVAILABLE_WITHOUT_REVIEW']);

export interface WaEnv {
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_API_VERSION?: string;
  WHATSAPP_AUTOMATION_ENABLED?: string;
  WHATSAPP_TEST_MODE?: string;
  WHATSAPP_PRODUCTION_MODE?: string;
}

export interface WaConfig {
  automation_enabled?: boolean | null;
  production_mode?: boolean | null;
  template_name?: string | null;
  template_language?: string | null;
  sender_name_status?: string | null;
  template_status?: string | null;
  template_category?: string | null;
  webhook_verified_at?: string | null;
  controlled_delivery_at?: string | null;
  last_checked_at?: string | null;
}

const on = (v?: string) => String(v ?? '').trim().toLowerCase() === 'true';

export function missingSecrets(env: WaEnv): string[] {
  const need: (keyof WaEnv)[] = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET', 'WHATSAPP_API_VERSION'];
  return need.filter((k) => !String(env[k] ?? '').trim());
}

export function evaluateReadiness(env: WaEnv, cfg: WaConfig | null) {
  const c = cfg ?? {};
  const base: string[] = []; // needed for ANY send, test or production
  const missing = missingSecrets(env);
  if (missing.length) base.push(`Missing secrets: ${missing.join(', ')}`);
  if (env.WHATSAPP_BUSINESS_ACCOUNT_ID && env.WHATSAPP_BUSINESS_ACCOUNT_ID !== EXPECTED_IDS.wabaId) base.push('WhatsApp Business Account ID is not the VSeva WABA');
  if (env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_PHONE_NUMBER_ID !== EXPECTED_IDS.phoneNumberId) base.push('Phone Number ID is not the VSeva sender');
  if ((c.template_name ?? VIHAR_REMINDER.name) !== VIHAR_REMINDER.name || (c.template_language ?? VIHAR_REMINDER.language) !== VIHAR_REMINDER.language) base.push('Template must be vihar_reminder (hi)');
  if (c.template_status !== 'APPROVED') base.push(`Template not approved (Meta status: ${c.template_status ?? 'unknown'})`);
  if (c.template_category && c.template_category !== VIHAR_REMINDER.category) base.push(`Template category changed to ${c.template_category}`);

  const production = [...base];
  if (!SENDER_OK.has(String(c.sender_name_status ?? ''))) production.push(`Sender display name not approved (Meta status: ${c.sender_name_status ?? 'unknown'})`);
  if (!c.webhook_verified_at) production.push('Webhook not verified by Meta yet');
  if (!c.controlled_delivery_at) production.push('No test message confirmed delivered yet');
  if (!on(env.WHATSAPP_AUTOMATION_ENABLED)) production.push('WHATSAPP_AUTOMATION_ENABLED secret is off');
  if (!on(env.WHATSAPP_PRODUCTION_MODE)) production.push('WHATSAPP_PRODUCTION_MODE secret is off');
  if (on(env.WHATSAPP_TEST_MODE)) production.push('WHATSAPP_TEST_MODE secret is on (test mode)');
  if (!c.automation_enabled) production.push('Automation is switched off in Super Admin');
  if (!c.production_mode) production.push('Production mode is off in Super Admin');

  const test = [...base];
  if (!on(env.WHATSAPP_TEST_MODE)) test.push('WHATSAPP_TEST_MODE secret is off');

  const canSendProduction = production.length === 0;
  const awaitingMeta = !SENDER_OK.has(String(c.sender_name_status ?? ''));
  return {
    canSendProduction,
    canSendTest: test.length === 0,
    productionBlockers: production,
    testBlockers: test,
    message: canSendProduction
      ? 'WhatsApp automation is live for the organisations switched on below.'
      : awaitingMeta
        ? 'WhatsApp integration configured. Awaiting Meta sender approval. Automated sending is currently disabled.'
        : 'WhatsApp integration configured. Automated sending is currently disabled until every check below passes.',
  };
}

/** The test allow-list (WHATSAPP_TEST_RECIPIENTS = comma-separated numbers): test sends go nowhere else. */
export function isTestRecipient(list: string | undefined, phoneE164: string): boolean {
  return String(list ?? '').split(',').map((s) => s.replace(/\D/g, '')).filter(Boolean).includes(phoneE164);
}
