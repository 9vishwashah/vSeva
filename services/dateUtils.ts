// Returns a Date's LOCAL calendar date as "YYYY-MM-DD".
//
// Date.prototype.toISOString() is a common footgun for this: it converts to
// UTC first, so in any timezone ahead of UTC (e.g. IST, UTC+5:30) it silently
// returns YESTERDAY's date for the first several hours of every local day —
// exactly the early-morning window Vihars often happen in. vihar_date/
// report_date and any "did something happen on this calendar day" check are
// always about the LOCAL day, so use this instead of toISOString() for them.
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
