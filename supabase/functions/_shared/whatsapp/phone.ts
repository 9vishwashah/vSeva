// Indian mobile numbers for WhatsApp. Same rules as public.whatsapp_normalize_phone() in
// scripts/whatsapp_reminders.sql; keep the two in step.

/** 98XXXXXXXX / +91 98XXX XXXXX / 098XXXXXXXX -> "9198XXXXXXXX"; anything else -> null (never sent). */
export function normalizeIndianMobile(raw: unknown): string | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(d)) return `91${d}`;
  if (/^91[6-9]\d{9}$/.test(d)) return d;
  if (/^0[6-9]\d{9}$/.test(d)) return `91${d.slice(1)}`;
  return null;
}

/** For logs and the admin screen: "91XXXXXX3210". Never log a full number. */
export function maskPhone(phone: unknown): string {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length < 4) return 'XXXX';
  return `${d.slice(0, 2)}${'X'.repeat(Math.max(0, d.length - 6))}${d.slice(-4)}`;
}
