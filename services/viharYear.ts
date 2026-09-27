// A "Vihar Year" (VY) is this app's equivalent of a Financial Year, but scoped
// to when Vihar actually happens: Sadhu/Sadhviji Bhagwants walk (Vihar) most of
// the year but stay stationary for Chaturmas (the monsoon retreat), roughly
// mid-July to mid-October. So a VY runs Oct 14 -> Jul 13 of the next calendar
// year, rather than the calendar year or a Financial Year.
//
// This is a pure display/grouping concept computed on the fly from each
// entry's existing vihar_date — nothing is stored, migrated, or renamed in the
// database, so no historical data is touched by introducing it.

export interface ViharYearBounds {
  start: Date;
  end: Date;
  startYear: number;
  label: string; // e.g. "VY 2026-27"
}

const VY_START_MONTH = 9; // October (0-indexed)
const VY_START_DAY = 14;
const VY_END_MONTH = 6; // July (0-indexed)
const VY_END_DAY = 13;

export function getViharYearStartYear(referenceDate: Date = new Date()): number {
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const d = referenceDate.getDate();

  if (m > VY_START_MONTH || (m === VY_START_MONTH && d >= VY_START_DAY)) {
    // On/after Oct 14 this calendar year — this VY started this year.
    return y;
  }
  if (m < VY_END_MONTH || (m === VY_END_MONTH && d <= VY_END_DAY)) {
    // On/before Jul 13 this calendar year — this VY started last year.
    return y - 1;
  }
  // The Chaturmas gap (Jul 14 - Oct 13) — no Vihar happens here. Bucket
  // forward into the VY that's about to start this Oct 14.
  return y;
}

export function getViharYearBoundsForStartYear(startYear: number): ViharYearBounds {
  const start = new Date(startYear, VY_START_MONTH, VY_START_DAY);
  const end = new Date(startYear + 1, VY_END_MONTH, VY_END_DAY, 23, 59, 59, 999);
  const label = `VY ${startYear}-${String(startYear + 1).slice(-2)}`;
  return { start, end, startYear, label };
}

export function getViharYearBounds(referenceDate: Date = new Date()): ViharYearBounds {
  return getViharYearBoundsForStartYear(getViharYearStartYear(referenceDate));
}

export function isDateInViharYear(dateStr: string, bounds: ViharYearBounds): boolean {
  // Delegates to getViharYearStartYear rather than a plain [start, end] range
  // check, so a date that falls in the Chaturmas gap (Jul 14 - Oct 13, outside
  // every VY's own start/end window) still matches — it's bucketed forward
  // into the upcoming VY there, and this keeps filtering agreeing with that
  // instead of silently hiding the entry from every VY.
  const d = new Date(`${dateStr}T00:00:00`);
  return getViharYearStartYear(d) === bounds.startYear;
}

// Which VY a specific entry date falls in — used to double-check/report the
// actual period covered by a data set, instead of assuming "today's VY".
export function getViharYearForDate(dateStr: string): ViharYearBounds {
  return getViharYearBounds(new Date(`${dateStr}T00:00:00`));
}
