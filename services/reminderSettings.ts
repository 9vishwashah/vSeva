import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getCached, invalidate } from './requestCache';
import bannerConfig from './reminderBanners.json';

// Vihar reminders ("<Name>, No Vihar Since N Days"): each group's Captain can turn them off, pick the day gaps,
// write the message and choose the picture (scripts/reminder_settings.sql, scripts/vihar_reminders_daily.sql).
// The database sends them every day at 09:00 India time. A group that never changed them uses DEFAULTS.

export interface ReminderSettings {
  enabled: boolean;
  days: number[]; // ascending, 1–3 values between 1 and 60
  message: string;
  banner: string; // key in reminderBanners.json
}

export const REMINDER_BANNERS: { key: string; line: string }[] = bannerConfig.banners;
export const REMINDER_DEFAULTS: ReminderSettings = { enabled: true, days: [5, 7, 15], message: 'Kindly Join In Seva', banner: bannerConfig.default };
export const REMINDER_MESSAGE_MAX = 80;

// Ready-made lines for the message under the title (the Captain can still write their own)
export const REMINDER_MESSAGE_SUGGESTIONS = [
  'Kindly Join In Seva',
  'Aapka Sankalp aapko yaad kar raha hai 🙏',
  'Chalo, agla Vihar saath mein karein! 🚶',
  'Ek chhota kadam, badi Seva. Aaj judiye!',
  'Maharaj Saheb ke saath chalne ka mauka mat chhodiye',
  'Seva ka safar aapke bina adhoora hai',
  'Your group misses you on the road',
];

// The wide picture for a banner, on the current site (each brand serves its own artwork)
export const reminderBannerUrl = (key: string) =>
  `/notify/reminder-${REMINDER_BANNERS.some(b => b.key === key) ? key : bannerConfig.default}.jpg`;

const CHANGED = 'reminder-settings-changed';

// "Vishwa Shah" → "Vishwa": reminders greet a Sevak by first name
export const firstName = (fullName?: string | null) => (fullName || '').trim().split(/\s+/)[0] || '';
export const reminderTitle = (fullName: string | null | undefined, days: number) => {
  const name = firstName(fullName);
  return `${name ? `${name}, ` : ''}No Vihar Since ${days} Days`;
};

export const reminderSettingsService = {
  async get(orgId: string): Promise<ReminderSettings> {
    return getCached(`reminders:${orgId}`, async () => {
      const { data, error } = await supabase
        .from('org_reminder_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error || !data) return REMINDER_DEFAULTS;
      return {
        enabled: data.enabled !== false,
        days: Array.isArray(data.days) && data.days.length ? [...data.days].sort((a: number, b: number) => a - b) : REMINDER_DEFAULTS.days,
        message: data.message || REMINDER_DEFAULTS.message,
        banner: data.banner || REMINDER_DEFAULTS.banner,
      };
    }, 5 * 60_000, { persist: true });
  },

  // Captain only (checked by the database function)
  async set(orgId: string, s: ReminderSettings) {
    const { error } = await supabase.rpc('set_reminder_settings', { p_enabled: s.enabled, p_days: s.days, p_message: s.message, p_banner: s.banner });
    if (error) throw new Error(error.message);
    invalidate(`reminders:${orgId}`);
    window.dispatchEvent(new Event(CHANGED));
  },
};

export const useReminderSettings = (orgId?: string | null) => {
  const [value, setValue] = useState<ReminderSettings | undefined>(undefined);
  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    const load = () => reminderSettingsService.get(orgId).then(v => { if (alive) setValue(v); }).catch(() => { if (alive) setValue(REMINDER_DEFAULTS); });
    load();
    window.addEventListener(CHANGED, load);
    return () => { alive = false; window.removeEventListener(CHANGED, load); };
  }, [orgId]);
  return value;
};
