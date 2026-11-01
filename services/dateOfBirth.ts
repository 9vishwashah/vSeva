// Date of birth is stored as 'YYYY-MM-DD' (profiles.date_of_birth); age is always worked out from it, never stored.

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parse = (dob: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
};

export const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

// Today in India, so a birthday turns at midnight IST wherever the phone is
function todayIST() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).split('-').map(Number);
  return { y, m, d };
}

export function ageFromDob(dob: string | null | undefined): number | null {
  const b = parse(dob);
  if (!b) return null;
  const t = todayIST();
  let age = t.y - b.y;
  if (t.m < b.m || (t.m === b.m && t.d < b.d)) age -= 1;
  return age >= 0 ? age : null;
}

// "21 March 2005"
export function formatDob(dob: string | null | undefined): string {
  const b = parse(dob);
  return b ? `${b.d} ${MONTHS[b.m - 1]} ${b.y}` : '';
}

// "21 March 2005 · 21 yrs", or '-' when not filled
export function dobWithAge(dob: string | null | undefined): string {
  const age = ageFromDob(dob);
  return dob && age !== null ? `${formatDob(dob)} · ${age} yrs` : '-';
}

// A real calendar date, not in the future, not before 1900
export function isValidDob(dob: string): boolean {
  const b = parse(dob);
  if (!b || b.y < 1900 || b.m < 1 || b.m > 12 || b.d < 1 || b.d > daysInMonth(b.y, b.m)) return false;
  const t = todayIST();
  return b.y < t.y || (b.y === t.y && (b.m < t.m || (b.m === t.m && b.d <= t.d)));
}

export function currentYearIST(): number {
  return todayIST().y;
}
