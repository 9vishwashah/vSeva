import React, { useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, Loader2, ShieldCheck, ShieldAlert, Send, RotateCcw, ChevronDown } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import { renderPreview, VIHAR_REMINDER } from '../supabase/functions/_shared/whatsapp/template';

// Super Admin → one organisation → WhatsApp reminders. Only the platform owner sees this (the server enforces it).
// Nothing is sent unless this group is switched on here AND the server-side Meta readiness gate passes.

interface Recipient { userId: string; name: string; active: boolean; phone: string; phoneValid: boolean; optedIn: boolean; consentAt: string | null; consentSource: string | null; optedOutAt: string | null; lastReminderAt: string | null }
interface Msg { id: number; name: string; status: string; is_test: boolean; template_params: string[]; phone_e164: string; attempts: number; retryable: boolean; last_error_code?: string | null; last_error_message?: string | null; cancel_reason?: string | null; created_at: string; accepted_at?: string | null; delivered_at?: string | null; read_at?: string | null }
interface OrgData {
  migrated: boolean;
  config?: any;
  settings?: { enabled: boolean; daily_limit: number; min_days_between: number; send_time: string; timezone: string; consent_mode?: string; group_consent_at?: string | null; group_consent_by?: string | null } | null;
  reminderDays?: { enabled: boolean; days: number[] };
  recipients?: Recipient[];
  preview?: { name: string; days: string | number | null; tier: number | null; eligible: boolean; reason: string | null }[];
  history?: Msg[];
  totals?: Record<string, number>;
}

const fmt = (s?: string | null) => (s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
const STATUS_TONE: Record<string, string> = {
  queued: 'bg-sunken text-ink', sending: 'bg-sunken text-ink', accepted: 'bg-info-soft text-info',
  sent: 'bg-indigo-50 text-indigo-700', delivered: 'bg-ok-soft text-ok', read: 'bg-ok-soft text-emerald-800',
  failed: 'bg-err-soft text-err', cancelled: 'bg-warn-soft text-warn', expired: 'bg-sunken text-ink-2',
};
const STATUS_LABEL: Record<string, string> = { accepted: 'Accepted by Meta' };

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }> = ({ on, onChange, disabled, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-green-500' : 'bg-gray-300'}`}>
    <span className={`inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const WhatsAppAdminPanel: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { showToast } = useToast();
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: '', from: '', to: '', userId: '' });
  const [form, setForm] = useState({ dailyLimit: 100, minDaysBetween: 0, sendTime: '09:15' });
  const [testTo, setTestTo] = useState('');
  const [showBlockers, setShowBlockers] = useState(false);
  const [hidden, setHidden] = useState(false); // not the platform owner: the server refuses, so show nothing

  const load = async (f = filters) => {
    setLoading(true);
    try {
      const d = await dataService.superAdminWhatsApp<OrgData>('wa_org', { orgId, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) });
      setData(d);
      if (d.settings) setForm({ dailyLimit: d.settings.daily_limit, minDaysBetween: d.settings.min_days_between, sendTime: d.settings.send_time.slice(0, 5) });
    } catch (e: any) {
      if (/platform owner/i.test(e?.message || '')) setHidden(true);
      else showToast(e?.message || 'Could not load WhatsApp settings', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [orgId]);

  if (hidden) return null;

  const act = async (key: string, action: string, params: Record<string, unknown>, okMsg: string) => {
    setBusy(key);
    try {
      const r = await dataService.superAdminWhatsApp<any>(action, params);
      if (r?.blocked) showToast(`Not sent: ${r.blocked.join('; ')}`, 'error');
      else showToast(okMsg, 'success');
      await load();
    } catch (e: any) {
      showToast(e?.message || 'Something went wrong', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) {
    return <div className="bg-surface rounded-2xl border border-line p-5 flex items-center gap-2 text-sm text-ink-2"><Loader2 size={16} className="animate-spin" /> Loading WhatsApp reminders…</div>;
  }
  if (!data) return null;
  if (!data.migrated) {
    return (
      <section className="bg-surface rounded-2xl border border-line shadow-sm p-5">
        <h2 className="flex items-center gap-2 font-bold text-ink"><MessageCircle size={18} className="text-ok" /> WhatsApp reminders</h2>
        <p className="mt-2 text-sm text-ink-2">Not set up yet: the WhatsApp database step (scripts/whatsapp_reminders.sql) has not been applied.</p>
      </section>
    );
  }

  const cfg = data.config || {};
  const readiness = cfg.readiness || null;
  const live = !!readiness?.canSendProduction;
  const statusMsg = readiness?.message || 'WhatsApp integration configured. Awaiting Meta sender approval. Automated sending is currently disabled.';
  const enabled = !!data.settings?.enabled;
  const groupConsent = data.settings?.consent_mode === 'group' && !!data.settings?.group_consent_at;
  const t = data.totals || {};
  const sample = data.preview?.find(p => p.eligible) || data.preview?.[0];
  const previewText = (() => { try { return renderPreview([sample?.name && sample.name !== '—' ? sample.name : 'Ramesh Shah', String(sample?.days ?? 7)]); } catch { return ''; } })();

  return (
    <section className="bg-surface rounded-2xl border border-line shadow-sm p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-ink"><MessageCircle size={18} className="text-ok" /> WhatsApp reminders</h2>
          <p className="text-xs text-ink-2 mt-0.5">Only groups switched on here get WhatsApp messages. Every other group keeps its normal push reminders only.</p>
        </div>
        <button type="button" onClick={() => act('refresh', 'wa_refresh', {}, 'Status refreshed from Meta')} disabled={!!busy}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-sunken/60 border border-line rounded-xl px-3 py-2 hover:bg-sunken disabled:opacity-50">
          {busy === 'refresh' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh from Meta
        </button>
      </div>

      {/* Server-side readiness: shown, never overridable from here */}
      <div className={`rounded-xl p-3.5 border ${live ? 'bg-ok-soft border-ok-soft' : 'bg-warn-soft border-warn-soft'}`}>
        <p className={`flex items-start gap-2 text-sm font-semibold ${live ? 'text-ok' : 'text-amber-900'}`}>
          {live ? <ShieldCheck size={18} className="shrink-0 mt-0.5" /> : <ShieldAlert size={18} className="shrink-0 mt-0.5" />} {statusMsg}
        </p>
        {!live && readiness?.productionBlockers?.length > 0 && (
          <>
            <button type="button" onClick={() => setShowBlockers(v => !v)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-900">
              <ChevronDown size={14} className={showBlockers ? 'rotate-180' : ''} /> {readiness.productionBlockers.length} checks still open
            </button>
            {showBlockers && <ul className="mt-1.5 ml-5 list-disc text-xs text-amber-900 space-y-0.5">{readiness.productionBlockers.map((b: string) => <li key={b}>{b}</li>)}</ul>}
          </>
        )}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><p className="text-ink-2">Sender</p><p className="font-bold text-ink">{cfg.sender_display_name || 'vSeva'}</p></div>
          <div><p className="text-ink-2">Number</p><p className="font-bold text-ink">{cfg.sender_phone || '+1 555-744-6307'}</p></div>
          <div><p className="text-ink-2">Meta name review</p><p className="font-bold text-ink">{cfg.sender_name_status || 'Not checked yet'}</p></div>
          <div><p className="text-ink-2">Last checked</p><p className="font-bold text-ink">{fmt(cfg.last_checked_at)}</p></div>
          <div><p className="text-ink-2">Template</p><p className="font-bold text-ink">{cfg.template_name || VIHAR_REMINDER.name} ({cfg.template_language || 'hi'})</p></div>
          <div><p className="text-ink-2">Category / status</p><p className="font-bold text-ink">{cfg.template_category || VIHAR_REMINDER.category} · {cfg.template_status || '–'}</p></div>
          <div><p className="text-ink-2">Webhook</p><p className="font-bold text-ink">{cfg.webhook_verified_at ? 'Verified' : 'Not verified'}</p></div>
          <div><p className="text-ink-2">Test delivered</p><p className="font-bold text-ink">{cfg.controlled_delivery_at ? fmt(cfg.controlled_delivery_at) : 'Not yet'}</p></div>
        </div>
        {cfg.last_check_error && <p className="mt-2 text-xs text-err">Last check: {cfg.last_check_error}</p>}
      </div>

      {/* This group's switch (the cost control) */}
      <div className="rounded-xl border border-line p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-sm text-ink">Send WhatsApp reminders to this group</p>
            <p className="text-xs text-ink-2">Sevaks with consent and a valid number. Switching off cancels anything still waiting.</p>
          </div>
          <Toggle on={enabled} label="WhatsApp for this group" disabled={!!busy}
            onChange={(v) => act('org', 'wa_set_org', { orgId, enabled: v, ...form }, v ? 'WhatsApp switched on for this group' : 'WhatsApp switched off for this group')} />
        </div>
        <div className="flex items-start justify-between gap-3 rounded-lg bg-sunken/60 p-3">
          <div>
            <p className="font-bold text-sm text-ink">Group consent (no opt-in needed)</p>
            <p className="text-xs text-ink-2 mt-0.5">
              Turn on only when this group's Sevaks have agreed to get vSeva Vihar reminders on WhatsApp (for example, the Captain told the group).
              Then every Sevak, existing and new, receives them without doing anything; anyone can still turn it off in Profile.
            </p>
            {groupConsent && <p className="text-[11px] text-ink-2 mt-1">Confirmed by {data.settings?.group_consent_by || 'super-admin'} on {fmt(data.settings?.group_consent_at)}</p>}
          </div>
          <Toggle on={groupConsent} label="Group consent" disabled={!!busy}
            onChange={(v) => {
              if (v && !window.confirm("Confirm that this group's Sevaks have agreed to receive vSeva Vihar reminders on WhatsApp. This is saved with your name and today's date as the consent record.")) return;
              act('consent', 'wa_set_org', { orgId, enabled, groupConsent: v }, v ? 'Group consent recorded: all Sevaks will receive reminders' : 'Group consent removed: only Sevaks who opt in will receive reminders');
            }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs text-ink-2">Max messages a day
            <input type="number" min={1} max={1000} value={form.dailyLimit} onChange={e => setForm({ ...form, dailyLimit: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-ink-2">Min days between WhatsApps per Sevak
            <input type="number" min={0} max={60} value={form.minDaysBetween} onChange={e => setForm({ ...form, minDaysBetween: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-ink-2">Sending time (India time)
            <input type="time" value={form.sendTime} onChange={e => setForm({ ...form, sendTime: e.target.value })} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-2">
            Reminder days come from the Captain's settings: <b>{data.reminderDays?.enabled === false ? 'reminders off' : (data.reminderDays?.days || []).join(', ') + ' days'}</b> (read-only here, same as the push reminder).
          </p>
          <button type="button" disabled={!!busy} onClick={() => act('save', 'wa_set_org', { orgId, enabled, ...form }, 'Saved')}
            className="text-xs font-bold text-white bg-gray-900 rounded-xl px-4 py-2 disabled:opacity-50">{busy === 'save' ? 'Saving…' : 'Save limits'}</button>
        </div>
      </div>

      {/* Global switches (still blocked by the server until every Meta check passes) */}
      <div className="rounded-xl border border-line p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-bold text-sm text-ink">Automation (all switched-on groups)</p><p className="text-xs text-ink-2">Master switch; also needs the Supabase secret.</p></div>
          <Toggle on={!!cfg.automation_enabled} label="Automation" disabled={!!busy} onChange={(v) => act('auto', 'wa_set_global', { automationEnabled: v }, v ? 'Automation on' : 'Automation off')} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><p className="font-bold text-sm text-ink">Production mode</p><p className="text-xs text-ink-2">Refused until Meta approves the sender and a test is delivered.</p></div>
          <Toggle on={!!cfg.production_mode} label="Production mode" disabled={!!busy} onChange={(v) => act('prod', 'wa_set_global', { productionMode: v }, v ? 'Production mode on' : 'Production mode off')} />
        </div>
      </div>

      {/* Message preview + test */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">Message preview</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-[#E7FFDB] border border-ok-soft p-3 text-[13px] leading-snug text-ink font-sans">{previewText}</pre>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">Test message (test mode only)</p>
          <p className="text-xs text-ink-2 mb-2">Goes only to numbers in the WHATSAPP_TEST_RECIPIENTS secret. A delivered test completes the last readiness check.</p>
          <div className="flex gap-2">
            <input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="Test number" inputMode="tel" className="flex-1 min-w-0 rounded-lg border border-line px-3 py-2 text-sm" />
            <button type="button" disabled={!!busy || !testTo} onClick={() => act('test', 'wa_test', { orgId, to: testTo, name: sample?.name || 'Sevak', days: sample?.days ?? 7 }, 'Test sent to Meta (watch for "delivered")')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-green-600 rounded-xl px-3 py-2 disabled:opacity-50"><Send size={14} /> Send test</button>
          </div>
        </div>
      </div>

      {/* Today's reminder run for this group */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">Today's reminders ({data.preview?.length || 0})</p>
        {data.preview?.length ? (
          <ul className="divide-y divide-line border border-line rounded-xl">
            {data.preview.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-semibold text-ink truncate">{p.name}</span>
                <span className="text-xs text-ink-2 shrink-0">{p.days} days</span>
                <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0 ${p.eligible ? 'bg-ok-soft text-ok' : 'bg-sunken text-ink-2'}`}>{p.eligible ? 'WhatsApp + push' : `Push only · ${p.reason}`}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-2">No reminder was due for this group today.</p>}
      </div>

      {/* Delivery report */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">Delivery report</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[['queued', 'Queued'], ['accepted', 'Accepted by Meta'], ['sent', 'Sent'], ['delivered', 'Delivered'], ['read', 'Read'], ['failed', 'Failed'], ['cancelled', 'Cancelled'], ['expired', 'Expired'], ['retryEligible', 'Retry eligible']].map(([k, label]) => (
            <div key={k} className="rounded-xl border border-line p-2.5">
              <p className="text-lg font-bold text-ink">{(t[k] || 0) + (k === 'queued' ? t.sending || 0 : 0)}</p>
              <p className="text-[11px] text-ink-2 leading-tight">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-2">“Accepted by Meta” only means Meta took the message. It counts as delivered only when Meta's webhook says so.</p>
      </div>

      {/* Consent */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">Sevak consent ({data.recipients?.filter(r => r.optedIn).length || 0} of {data.recipients?.length || 0} opted in)</p>
        <div className="max-h-80 overflow-auto border border-line rounded-xl divide-y divide-line">
          {(data.recipients || []).map(r => (
            <div key={r.userId} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{r.name}{!r.active && <span className="ml-1 text-[11px] text-ink-3">inactive</span>}</p>
                <p className="text-[11px] text-ink-2">
                  {r.phone}{!r.phoneValid && <span className="ml-1 font-bold text-err">invalid number</span>}
                  {r.optedIn ? ` · consent ${fmt(r.consentAt)} (${r.consentSource === 'sevak_app' ? 'by Sevak' : r.consentSource === 'group' ? 'group consent' : 'by admin'})` : r.optedOutAt ? ` · opted out ${fmt(r.optedOutAt)}` : ' · no consent'}
                </p>
              </div>
              <Toggle on={r.optedIn} label={`WhatsApp consent for ${r.name}`} disabled={!!busy}
                onChange={(v) => act(`c-${r.userId}`, 'wa_set_consent', { orgId, userId: r.userId, optIn: v }, v ? 'Consent recorded' : 'Opted out')} />
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-2">{groupConsent ? 'Group consent is on: everyone receives reminders unless switched off here or by the Sevak in Profile.' : 'Record consent here only when the Sevak has agreed to receive WhatsApp reminders. Sevaks can also opt in or out themselves in Profile.'}</p>
      </div>

      {/* History */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">Message history</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border border-line px-2 py-2 text-sm">
            <option value="">All statuses</option>
            {Object.keys(STATUS_TONE).map(s => <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>)}
          </select>
          <select value={filters.userId} onChange={e => setFilters({ ...filters, userId: e.target.value })} className="rounded-lg border border-line px-2 py-2 text-sm">
            <option value="">All Sevaks</option>
            {(data.recipients || []).map(r => <option key={r.userId} value={r.userId}>{r.name}</option>)}
          </select>
          <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className="rounded-lg border border-line px-2 py-2 text-sm" aria-label="From date" />
          <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className="rounded-lg border border-line px-2 py-2 text-sm" aria-label="To date" />
        </div>
        <div className="flex justify-end mb-2">
          <button type="button" onClick={() => load(filters)} className="text-xs font-bold text-ink bg-sunken/60 border border-line rounded-xl px-3 py-1.5">Apply filters</button>
        </div>
        {data.history?.length ? (
          <div className="overflow-x-auto border border-line rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-sunken/60 text-ink-2"><tr><th className="text-left px-3 py-2">Sevak</th><th className="text-left px-3 py-2">Days</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Created</th><th className="text-left px-3 py-2">Detail</th><th /></tr></thead>
              <tbody className="divide-y divide-line">
                {data.history.map(m => (
                  <tr key={m.id}>
                    <td className="px-3 py-2"><p className="font-semibold text-ink">{m.name}</p><p className="text-ink-3">{m.phone_e164}</p></td>
                    <td className="px-3 py-2">{m.template_params?.[1] ?? '–'}</td>
                    <td className="px-3 py-2"><span className={`font-bold rounded-full px-2 py-0.5 ${STATUS_TONE[m.status] || ''}`}>{STATUS_LABEL[m.status] || m.status}</span>{m.is_test && <span className="ml-1 text-ink-3">test</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(m.created_at)}</td>
                    <td className="px-3 py-2 text-ink-2">{m.last_error_code ? `${m.last_error_code}: ${m.last_error_message || ''}` : m.cancel_reason || (m.read_at ? `Read ${fmt(m.read_at)}` : m.delivered_at ? `Delivered ${fmt(m.delivered_at)}` : '')}</td>
                    <td className="px-3 py-2">
                      {m.status === 'failed' && m.retryable && (
                        <button type="button" disabled={!!busy} onClick={() => act(`r-${m.id}`, 'wa_retry', { messageId: m.id }, 'Queued again')} className="inline-flex items-center gap-1 font-bold text-ink"><RotateCcw size={12} /> Retry</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-ink-2">No WhatsApp messages for this group yet.</p>}
      </div>
    </section>
  );
};

export default WhatsAppAdminPanel;
