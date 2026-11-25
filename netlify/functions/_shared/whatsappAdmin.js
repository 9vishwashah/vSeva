// Super Admin → WhatsApp reminders. Called from super-admin.js for actions starting with "wa_".
// Platform owner only (SUPER_ADMIN_EMAILS): brand-scoped admins and Captains can never switch WhatsApp on, so
// messages (and Meta costs) only ever go to organisations the owner picked.
//
//   wa_overview                        global config + last readiness + organisations switched on
//   wa_org        { orgId, status?, from?, to?, userId? }   one organisation: switch, consent, today's preview, history, totals
//   wa_set_org    { orgId, enabled, dailyLimit?, minDaysBetween?, sendTime?, groupConsent? }
//                 groupConsent true = consent confirmed once for the whole group: every Sevak counts as agreed
//                 unless they opt out (recorded with who confirmed it and when, as the consent record)
//   wa_set_consent{ orgId, userId, optIn }
//   wa_retry      { messageId }        re-queue a failed message that Meta said may be retried
//   wa_set_global { automationEnabled?, productionMode? }   (the server gate still needs every Meta check)
//   wa_refresh                         ask the worker to re-read sender / template status from Meta
//   wa_test       { orgId, to, name, days }   one TEST message to an allow-listed number (test mode only)
import { HttpError } from './adminAuth.js';

const MISSING_TABLE = /relation .*whatsapp_.* does not exist|Could not find the table/i;
const STATUSES = ['queued', 'sending', 'accepted', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'expired'];

const maskPhone = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    return d.length < 4 ? 'XXXX' : `${d.slice(0, 2)}${'X'.repeat(Math.max(0, d.length - 6))}${d.slice(-4)}`;
};
const validPhone = (m) => /^(?:91|0)?[6-9]\d{9}$/.test(String(m || '').replace(/\D/g, ''));

async function audit(sb, actor, action, organizationId, targetUserId, details) {
    await sb.from('whatsapp_audit_log').insert({ actor, action, organization_id: organizationId || null, target_user_id: targetUserId || null, details: details || null });
}

async function callWorker(payload) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const secret = process.env.WHATSAPP_CRON_SECRET;
    if (!url || !secret) throw new HttpError(503, 'WhatsApp worker is not configured yet (WHATSAPP_CRON_SECRET).');
    const res = await fetch(`${url.replace(/\/+$/, '')}/functions/v1/whatsapp-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-whatsapp-cron-secret': secret },
        body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(502, body.error || `WhatsApp worker returned ${res.status}`);
    return body;
}

async function orgInfo(sb, orgId) {
    const { data: org, error } = await sb.from('organizations').select('id, name, brand').eq('id', orgId).maybeSingle();
    if (error) throw error;
    if (!org) throw new HttpError(404, 'Organisation not found');
    return org;
}

export async function whatsappAdmin(sb, user, scope, body) {
    if (!scope.owner) throw new HttpError(403, 'Only the platform owner can manage WhatsApp reminders.');
    try {
        return await handle(sb, user, body);
    } catch (e) {
        if (MISSING_TABLE.test(e?.message || '')) return { migrated: false };
        throw e;
    }
}

async function handle(sb, user, body) {
    switch (body.action) {
        case 'wa_overview': {
            const { data: config, error } = await sb.from('whatsapp_config').select('*').eq('id', 1).single();
            if (error) throw error;
            const { data: orgs } = await sb.from('whatsapp_org_settings').select('organization_id, enabled, daily_limit').eq('enabled', true);
            return { migrated: true, config, enabledOrgs: orgs || [] };
        }

        case 'wa_org': {
            if (!body.orgId) throw new HttpError(400, 'orgId is required');
            const org = await orgInfo(sb, body.orgId);
            const [{ data: config }, { data: settings }, { data: sevaks }, { data: prefs }, { data: reminder }] = await Promise.all([
                sb.from('whatsapp_config').select('*').eq('id', 1).single(),
                sb.from('whatsapp_org_settings').select('*').eq('organization_id', org.id).maybeSingle(),
                sb.from('profiles').select('id, full_name, username, mobile, is_active').eq('organization_id', org.id).eq('role', 'sevak').order('full_name'),
                sb.from('whatsapp_preferences').select('*').eq('organization_id', org.id),
                // the Captain's existing reminder days (read-only here; WhatsApp follows them via the reminder run)
                sb.from('org_reminder_settings').select('enabled, days').eq('organization_id', org.id).maybeSingle(),
            ]);
            const prefBy = new Map((prefs || []).map((p) => [p.user_id, p]));
            const groupConsent = settings?.consent_mode === 'group' && !!settings?.group_consent_at;
            const recipients = (sevaks || []).map((s) => {
                const p = prefBy.get(s.id);
                const own = !!(p?.opted_in && !p?.opted_out_at);
                return {
                    userId: s.id, name: s.full_name, active: s.is_active !== false, phone: maskPhone(s.mobile),
                    phoneValid: validPhone(s.mobile) && p?.phone_status !== 'invalid' && p?.phone_status !== 'not_on_whatsapp',
                    optedIn: !p?.opted_out_at && (own || groupConsent),
                    consentAt: own ? p?.consent_at : groupConsent ? settings.group_consent_at : null,
                    consentSource: own ? p?.consent_source : groupConsent ? 'group' : null,
                    optedOutAt: p?.opted_out_at || null, lastReminderAt: p?.last_reminder_at || null,
                };
            });

            // Today's reminder run for this group: who got a push today and whether WhatsApp would go too.
            const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()); // YYYY-MM-DD
            const dayStart = new Date(`${istDate}T00:00:00+05:30`);
            const { data: todays } = await sb.from('notifications').select('id, user_id, payload, created_at')
                .eq('organization_id', org.id).eq('type', 'inactivity').gte('created_at', dayStart.toISOString());
            const recBy = new Map(recipients.map((r) => [r.userId, r]));
            const preview = (todays || []).map((n) => {
                const r = recBy.get(n.user_id);
                const reason = !settings?.enabled ? 'Group not switched on' : !r ? 'Not a Sevak' : !r.optedIn ? 'No consent' : !r.phoneValid ? 'Invalid number' : null;
                return { name: r?.name || '—', days: n.payload?.days_since ?? null, tier: n.payload?.tier ?? null, eligible: !reason, reason };
            });

            let q = sb.from('whatsapp_messages').select('id, user_id, status, is_test, template_params, phone_e164, attempts, retryable, last_error_code, last_error_message, cancel_reason, created_at, accepted_at, sent_at, delivered_at, read_at, failed_at')
                .eq('organization_id', org.id).order('created_at', { ascending: false }).limit(200);
            if (body.status && STATUSES.includes(body.status)) q = q.eq('status', body.status);
            if (body.from) q = q.gte('created_at', body.from);
            if (body.to) q = q.lte('created_at', `${body.to}T23:59:59+05:30`);
            if (body.userId) q = q.eq('user_id', body.userId);
            const { data: msgs, error: mErr } = await q;
            if (mErr) throw mErr;
            const nameBy = new Map((sevaks || []).map((s) => [s.id, s.full_name]));
            const history = (msgs || []).map((m) => ({ ...m, phone_e164: maskPhone(m.phone_e164), name: nameBy.get(m.user_id) || (m.is_test ? 'Test message' : '—') }));

            const { data: all } = await sb.from('whatsapp_messages').select('status, retryable').eq('organization_id', org.id);
            const totals = Object.fromEntries(STATUSES.map((s) => [s, 0]));
            let retryEligible = 0;
            for (const m of all || []) { totals[m.status] = (totals[m.status] || 0) + 1; if (m.status === 'failed' && m.retryable) retryEligible++; }

            const reminderDays = { enabled: reminder ? reminder.enabled : true, days: reminder?.days || [5, 7, 15] };
            return { migrated: true, org, config, settings: settings || null, reminderDays, recipients, preview, history, totals: { ...totals, retryEligible } };
        }

        case 'wa_set_org': {
            if (!body.orgId) throw new HttpError(400, 'orgId is required');
            await orgInfo(sb, body.orgId);
            const row = { organization_id: body.orgId, enabled: !!body.enabled, updated_at: new Date().toISOString() };
            if (body.enabled) Object.assign(row, { enabled_by: user.email, enabled_at: new Date().toISOString() });
            if (body.dailyLimit != null) row.daily_limit = Math.max(1, Math.min(1000, parseInt(body.dailyLimit, 10) || 100));
            if (body.minDaysBetween != null) row.min_days_between = Math.max(0, Math.min(60, parseInt(body.minDaysBetween, 10) || 0));
            if (body.sendTime && /^\d{2}:\d{2}$/.test(body.sendTime)) row.send_time = body.sendTime;
            if (typeof body.groupConsent === 'boolean') {
                if (body.groupConsent) {
                    const { data: cur } = await sb.from('whatsapp_org_settings').select('consent_mode, group_consent_at').eq('organization_id', body.orgId).maybeSingle();
                    const already = cur?.consent_mode === 'group' && cur?.group_consent_at;
                    Object.assign(row, { consent_mode: 'group', group_consent_by: already ? undefined : user.email, group_consent_at: already ? undefined : new Date().toISOString() });
                    if (already) { delete row.group_consent_by; delete row.group_consent_at; }
                } else {
                    Object.assign(row, { consent_mode: 'opt_in', group_consent_by: null, group_consent_at: null });
                }
            }
            const { error } = await sb.from('whatsapp_org_settings').upsert(row, { onConflict: 'organization_id' });
            if (error) throw error;
            if (!body.enabled) {
                // switching a group off cancels anything still waiting for it
                await sb.from('whatsapp_messages').update({ status: 'cancelled', cancel_reason: 'Group switched off', locked_at: null })
                    .eq('organization_id', body.orgId).eq('status', 'queued');
            }
            await audit(sb, user.email, body.enabled ? 'org_enabled' : 'org_disabled', body.orgId, null, row);
            if (typeof body.groupConsent === 'boolean') await audit(sb, user.email, body.groupConsent ? 'group_consent_confirmed' : 'group_consent_removed', body.orgId, null, null);
            return { ok: true };
        }

        case 'wa_set_consent': {
            if (!body.orgId || !body.userId) throw new HttpError(400, 'orgId and userId are required');
            const { data: prof } = await sb.from('profiles').select('id, organization_id').eq('id', body.userId).maybeSingle();
            if (!prof || prof.organization_id !== body.orgId) throw new HttpError(400, 'This Sevak is not in that organisation.');
            const now = new Date().toISOString();
            const row = body.optIn
                ? { user_id: body.userId, organization_id: body.orgId, opted_in: true, consent_at: now, consent_source: 'super_admin', opted_out_at: null, updated_at: now }
                : { user_id: body.userId, organization_id: body.orgId, opted_in: false, opted_out_at: now, updated_at: now };
            const { error } = await sb.from('whatsapp_preferences').upsert(row, { onConflict: 'user_id' });
            if (error) throw error;
            if (!body.optIn) await sb.from('whatsapp_messages').update({ status: 'cancelled', cancel_reason: 'Opted out', locked_at: null }).eq('user_id', body.userId).eq('status', 'queued');
            await audit(sb, user.email, body.optIn ? 'consent_given' : 'consent_withdrawn', body.orgId, body.userId, null);
            return { ok: true };
        }

        case 'wa_retry': {
            const { data: m } = await sb.from('whatsapp_messages').select('id, organization_id, status, retryable, expires_at').eq('id', body.messageId).maybeSingle();
            if (!m) throw new HttpError(404, 'Message not found');
            if (m.status !== 'failed' || !m.retryable) throw new HttpError(409, 'Meta marked this failure as permanent; it cannot be retried.');
            if (new Date(m.expires_at) <= new Date()) throw new HttpError(409, 'This reminder was for an earlier day, so it is no longer sent.');
            const { error } = await sb.from('whatsapp_messages').update({ status: 'queued', next_retry_at: null, failed_at: null, locked_at: null }).eq('id', m.id);
            if (error) throw error;
            await audit(sb, user.email, 'retry', m.organization_id, null, { messageId: m.id });
            return { ok: true };
        }

        case 'wa_set_global': {
            const patch = { updated_at: new Date().toISOString(), updated_by: user.email };
            if (typeof body.automationEnabled === 'boolean') patch.automation_enabled = body.automationEnabled;
            if (typeof body.productionMode === 'boolean') {
                if (body.productionMode) {
                    const { data: cfg } = await sb.from('whatsapp_config').select('sender_name_status, template_status, webhook_verified_at, controlled_delivery_at').eq('id', 1).single();
                    const senderOk = ['APPROVED', 'AVAILABLE_WITHOUT_REVIEW'].includes(cfg?.sender_name_status);
                    if (!senderOk || cfg?.template_status !== 'APPROVED' || !cfg?.webhook_verified_at || !cfg?.controlled_delivery_at) {
                        throw new HttpError(409, 'Production mode stays off until Meta approves the sender, the template is approved, the webhook is verified and a test message is delivered.');
                    }
                }
                patch.production_mode = body.productionMode;
            }
            const { error } = await sb.from('whatsapp_config').update(patch).eq('id', 1);
            if (error) throw error;
            await audit(sb, user.email, 'global_settings', null, null, patch);
            return { ok: true };
        }

        case 'wa_refresh':
            return { ok: true, readiness: await callWorker({ mode: 'check' }) };

        case 'wa_test': {
            if (!body.orgId || !body.to) throw new HttpError(400, 'orgId and a test number are required');
            const result = await callWorker({ mode: 'test', orgId: body.orgId, to: body.to, name: body.name, days: body.days });
            await audit(sb, user.email, 'test_message', body.orgId, null, { to: maskPhone(body.to), result: result?.result || result?.blocked });
            return result;
        }

        default:
            throw new HttpError(400, 'Unknown WhatsApp action');
    }
}
