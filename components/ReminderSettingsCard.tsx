import React, { useEffect, useState } from 'react';
import { BellRing, Check, ChevronUp, Info, Loader2, Plus, X } from 'lucide-react';
import { BRAND } from '@brand';
import { UserProfile } from '../types';
import { useToast } from '../context/ToastContext';
import {
  REMINDER_BANNERS, REMINDER_DEFAULTS, REMINDER_MESSAGE_MAX, REMINDER_MESSAGE_SUGGESTIONS,
  reminderBannerUrl, reminderSettingsService, reminderTitle, useReminderSettings, type ReminderSettings,
} from '../services/reminderSettings';

// Captain's Profile & Settings: the group's "No Vihar Since N Days" reminders — on/off, after how many days, the
// message and the picture. The rules under "How reminders work" are the ones the daily database job applies
// (scripts/vihar_reminders_daily.sql); keep the two in step.

const same = (a: ReminderSettings, b: ReminderSettings) =>
  a.enabled === b.enabled && a.message === b.message && a.banner === b.banner && a.days.join(',') === b.days.join(',');

const label = 'text-xs font-bold uppercase tracking-wider text-[#8A6A57]';

const ReminderSettingsCard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { showToast } = useToast();
  const saved = useReminderSettings(user.organization_id);
  const [draft, setDraft] = useState<ReminderSettings>(REMINDER_DEFAULTS);
  const [newDay, setNewDay] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (saved) setDraft(saved); }, [saved]);
  const dirty = !!saved && !same(saved, draft);

  const addDay = () => {
    const n = parseInt(newDay, 10);
    if (!Number.isFinite(n) || n < 1 || n > 60) { showToast('Pick a number of days from 1 to 60', 'warning'); return; }
    if (draft.days.includes(n)) { setNewDay(''); return; }
    setDraft(d => ({ ...d, days: [...d.days, n].sort((a, b) => a - b) }));
    setNewDay('');
  };
  const removeDay = (n: number) => setDraft(d => ({ ...d, days: d.days.filter(x => x !== n) }));

  const save = async (next: ReminderSettings) => {
    if (next.days.length === 0) { showToast('Add at least one reminder day', 'warning'); return; }
    if (!next.message.trim()) { showToast('Write a message for the reminder', 'warning'); return; }
    setBusy(true);
    try {
      await reminderSettingsService.set(user.organization_id, { ...next, message: next.message.trim() });
      showToast('Reminder settings saved', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not save the reminder settings', 'error');
      if (saved) setDraft(saved);
    } finally {
      setBusy(false);
    }
  };

  // The switch saves straight away; everything else is saved with the button
  const toggle = () => {
    if (!saved) return;
    const next = { ...saved, enabled: !draft.enabled };
    setDraft(d => ({ ...d, enabled: next.enabled }));
    save(next);
  };

  const title = reminderTitle('Ramesh Shah', draft.days[0] ?? 7);
  const message = draft.message.trim() || '…';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FFF0E5' }}>
            <BellRing size={18} style={{ color: '#DE6B38' }} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#241C17]">Vihar reminders</p>
            <p className="mt-0.5 text-xs text-[#8A6A57]">A daily nudge, at 9 AM, for Sevaks who haven’t done a Vihar for a while</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft.enabled}
          aria-label="Send Vihar reminders"
          onClick={toggle}
          disabled={!saved || busy}
          className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${draft.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${draft.enabled ? 'left-[1.4rem]' : 'left-0.5'}`} />
        </button>
      </div>

      {draft.enabled && (
        <div className="mt-4 space-y-5 border-t border-gray-100 pt-4">
          {/* Days */}
          <div>
            <p className={label}>Remind after</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {draft.days.map(d => (
                <span key={d} className="inline-flex items-center gap-1 rounded-full bg-saffron-50 py-1.5 pl-3 pr-1.5 text-sm font-bold text-saffron-700">
                  {d} {d === 1 ? 'day' : 'days'}
                  <button type="button" onClick={() => removeDay(d)} aria-label={`Remove ${d} days`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-saffron-100">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {draft.days.length < 3 && (
                <span className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={newDay}
                    onChange={e => setNewDay(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDay(); } }}
                    placeholder="Days"
                    aria-label="Add a reminder after this many days"
                    className="h-9 w-20 rounded-full border border-gray-200 bg-gray-50/60 px-3 text-sm font-bold text-[#241C17] outline-none focus:border-saffron-400 focus:ring-4 focus:ring-saffron-100"
                  />
                  <button type="button" onClick={addDay} aria-label="Add reminder day" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F4F0] text-[#241C17] hover:bg-gray-100">
                    <Plus size={16} />
                  </button>
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-[#8A6A57]">Up to 3 reminders, 1 to 60 days without a Vihar.</p>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="reminder-message" className={label}>Message</label>
            <input
              id="reminder-message"
              value={draft.message}
              maxLength={REMINDER_MESSAGE_MAX}
              onChange={e => setDraft(d => ({ ...d, message: e.target.value }))}
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 text-[15px] text-[#241C17] outline-none focus:border-saffron-400 focus:bg-white focus:ring-4 focus:ring-saffron-100"
            />
            <p className="mt-1 text-right text-[11px] text-[#8A6A57]">{draft.message.length}/{REMINDER_MESSAGE_MAX}</p>
            <p className="mt-1 text-[11px] font-bold text-[#8A6A57]">Suggestions</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REMINDER_MESSAGE_SUGGESTIONS.map(s => {
                const on = draft.message.trim() === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, message: s }))}
                    className={`rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors ${on ? 'border-saffron-500 bg-saffron-500 text-white' : 'border-saffron-100 bg-saffron-50/60 text-[#5C3A24] hover:border-saffron-300'}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Picture */}
          <div>
            <p className={label}>Picture line</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Reminder picture">
              {REMINDER_BANNERS.map(b => {
                const on = draft.banner === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDraft(d => ({ ...d, banner: b.key }))}
                    className={`flex items-start gap-2.5 rounded-xl border p-2 text-left transition-colors ${on ? 'border-saffron-500 bg-saffron-50' : 'border-gray-200 hover:border-saffron-300'}`}
                  >
                    <img src={reminderBannerUrl(b.key)} alt="" loading="lazy" className="h-10 w-20 shrink-0 rounded-md object-cover" />
                    <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-[#241C17]">{b.line}</span>
                    {on && <Check size={15} className="mt-0.5 shrink-0 text-saffron-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview: an expanded Android notification, as the Sevak will see it */}
          <div>
            <p className={label}>Preview</p>
            <div className="mt-2 overflow-hidden rounded-[22px] bg-[#2A2522] text-white shadow-lg">
              <div className="p-3.5 pb-3">
                <div className="flex items-center gap-2 text-[11px] text-white/70">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: BRAND.themeColor }}>
                    <img src={BRAND.logo} alt="" className="h-4 w-4 object-contain brightness-0 invert" />
                  </span>
                  <span className="font-semibold" style={{ color: '#FFB48A' }}>{BRAND.shortName}</span>
                  <span>· now</span>
                  <ChevronUp size={14} className="ml-auto text-white/60" />
                </div>
                <div className="mt-2 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold leading-snug">{title}</p>
                    <p className="mt-0.5 text-sm text-white/80">{message}</p>
                  </div>
                  <img src="/notify/large-icon.png" alt="" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain" />
                </div>
              </div>
              <img src={reminderBannerUrl(draft.banner)} alt="Reminder picture" className="block aspect-[2/1] w-full object-cover" />
            </div>
            <p className="mt-1.5 text-xs text-[#8A6A57]">Each Sevak sees their own first name and their own number of days. The picture shows when the notification is opened out.</p>
          </div>

          {dirty && (
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => saved && setDraft(saved)} disabled={busy} className="h-10 rounded-xl bg-gray-100 px-3 text-sm font-bold text-[#241C17] disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => save(draft)} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-xl bg-saffron-600 px-4 text-sm font-bold text-white hover:bg-saffron-700 disabled:opacity-60">
                {busy && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          )}
        </div>
      )}

      <details className="mt-4 border-t border-gray-100 pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-saffron-700">
          <Info size={15} /> How reminders work
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-[#5C4A3E]">
          <li>{BRAND.shortName} checks every day at <b>9 AM</b> and sends them by itself. Sevaks don’t need to open the app; they only need notifications turned on.</li>
          <li><b>Every active Sevak</b> is included, also those who <b>haven’t done a single Vihar yet</b>.</li>
          <li>Days are counted from the Sevak’s <b>last approved Vihar</b>. For someone with no Vihar yet, from the day they were added. A Vihar still waiting for your approval doesn’t count yet.</li>
          <li>Each reminder day is sent <b>once</b>: with 5, 7 and 15, a quiet Sevak gets one reminder on day 5, one on day 7 and one on day 15. After their next Vihar the count starts again.</li>
          <li>Only during the Vihar Year, <b>14 October to 13 July</b>. Nothing is sent in Chaturmas, and the count never goes back before this year’s 14 October.</li>
          <li>Sevaks see it as a phone notification, in the bell, and on their Home screen.</li>
        </ul>
      </details>
    </div>
  );
};

export default ReminderSettingsCard;
