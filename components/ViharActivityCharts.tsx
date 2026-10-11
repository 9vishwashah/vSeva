import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ViharEntry } from '../types';
import { toLocalDateKey } from '../services/dateUtils';

// "Vihars · Last 7 Days" bars and the month-by-month "Consistency" calendar.
// One saffron hue, light -> dark = fewer -> more Vihars (sequential encoding). Every bar and square has a
// tooltip: hover on desktop, tap on phones (tap again or tap outside to close). Built from entries the page
// already has; nothing is fetched.

interface DayInfo { key: string; date: Date; count: number; km: number; routes: string[] }

// 0 = empty track, then three steps of the app's saffron ramp (saffron-200 / 500 / 700)
const STEPS = ['#F2E9DE', '#FFCBA0', '#F0803A', '#B5542A'];
const stepFor = (count: number) => (count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3);

const fmtLong = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function useDayIndex(entries: ViharEntry[]) {
  return useMemo(() => {
    const map: Record<string, { count: number; km: number; routes: string[] }> = {};
    entries.forEach(e => {
      const d = (map[e.vihar_date] ||= { count: 0, km: 0, routes: [] });
      d.count += 1;
      d.km += Number(e.distance_km || 0);
      d.routes.push(`${e.vihar_from} → ${e.vihar_to}`);
    });
    return (date: Date): DayInfo => {
      const key = toLocalDateKey(date);
      const d = map[key];
      return { key, date, count: d?.count || 0, km: d ? Math.round(d.km * 10) / 10 : 0, routes: d?.routes || [] };
    };
  }, [entries]);
}

// Floating tooltip inside a relative container, kept within its edges.
const Tip: React.FC<{ day: DayInfo; x: number; y: number; bottom: number; containerWidth: number }> = ({ day, x, y, bottom, containerWidth }) => {
  const W = 200;
  const left = Math.max(0, Math.min(containerWidth - W, x - W / 2));
  // not enough room above the mark (top of the chart): open below it instead
  const below = y < 96;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-xl bg-[#241C17] text-white px-3 py-2 shadow-[0_10px_24px_-10px_rgba(36,28,23,0.6)]"
      style={below ? { left, top: bottom + 8, width: W } : { left, top: y, width: W, transform: 'translateY(calc(-100% - 8px))' }}
    >
      <p className="m-0 text-[11px] font-semibold text-white/70">{fmtLong(day.date)}</p>
      {day.count === 0 ? (
        <p className="m-0 text-[13px] font-bold">No Vihar</p>
      ) : (
        <>
          <p className="m-0 text-[13px] font-bold">{plural(day.count, 'Vihar')}{day.km > 0 && <span className="font-semibold text-white/80"> · {day.km} km</span>}</p>
          {day.routes.slice(0, 3).map((r, i) => <p key={i} className="m-0 text-[11px] text-white/80 truncate">{r}</p>)}
          {day.routes.length > 3 && <p className="m-0 text-[11px] text-white/60">+{day.routes.length - 3} more</p>}
        </>
      )}
    </div>
  );
};

function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ day: DayInfo; x: number; y: number; bottom: number; pinned: boolean } | null>(null);
  const place = (day: DayInfo, el: HTMLElement, pinned: boolean) => {
    const box = ref.current?.getBoundingClientRect();
    // a bar button spans the whole plot height: anchor to the visible bar inside it
    const mark = (el.querySelector('[data-mark]') as HTMLElement | null) || el;
    const r = mark.getBoundingClientRect();
    if (!box) return;
    setTip({ day, x: r.left - box.left + r.width / 2, y: r.top - box.top, bottom: r.bottom - box.top, pinned });
  };
  // a tapped (pinned) tooltip closes on a tap anywhere outside the chart
  useEffect(() => {
    if (!tip?.pinned) return;
    const close = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setTip(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip?.pinned]);
  const handlers = (day: DayInfo) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { if (!tip?.pinned) place(day, e.currentTarget, false); },
    onMouseLeave: () => setTip(t => (t?.pinned ? t : null)),
    onFocus: (e: React.FocusEvent<HTMLElement>) => place(day, e.currentTarget, false),
    onBlur: () => setTip(t => (t?.pinned ? t : null)),
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      if (tip?.pinned && tip.day.key === day.key) setTip(null);
      else place(day, e.currentTarget, true);
    },
  });
  return { ref, tip, setTip, handlers, width: ref.current?.clientWidth || 0 };
}

// ---------------------------------------------------------------------------------------------------------------

export const LastSevenDaysChart: React.FC<{ entries: ViharEntry[]; anchorDate: Date }> = ({ entries, anchorDate }) => {
  const dayInfo = useDayIndex(entries);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchorDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return dayInfo(d);
  }), [dayInfo, anchorDate.toDateString()]);
  const max = Math.max(1, ...days.map(d => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  const t = useTooltip();
  const todayKey = toLocalDateKey(new Date());

  return (
    <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col" onMouseLeave={() => t.setTip(x => (x?.pinned ? x : null))}>
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <p className="m-0 text-sm font-bold text-[#241C17]">Vihars · Last 7 Days</p>
        <p className="m-0 text-xs font-semibold text-[#8A6A57]">{plural(total, 'Vihar')}</p>
      </div>
      <div ref={t.ref} className="relative flex-1 flex flex-col">
        {t.tip && <Tip day={t.tip.day} x={t.tip.x} y={t.tip.y} bottom={t.tip.bottom} containerWidth={t.width} />}
        {/* plot: bars grow from a shared baseline; a value sits on each bar that has one */}
        <div className="relative flex-1 flex items-end gap-2 border-b border-[#EFE6DB]" style={{ minHeight: 130 }}>
          {days.map(d => {
            const h = d.count ? Math.max(14, (d.count / max) * 100) : 0;
            const active = t.tip?.day.key === d.key;
            return (
              <button
                key={d.key}
                type="button"
                aria-label={`${fmtLong(d.date)}: ${d.count ? plural(d.count, 'Vihar') : 'no Vihar'}`}
                {...t.handlers(d)}
                className="relative flex-1 h-full flex flex-col justify-end items-center outline-none focus-visible:ring-2 focus-visible:ring-saffron-300 rounded-md"
              >
                {d.count > 0 && <span className="mb-1 text-[11px] font-bold text-[#241C17]">{d.count}</span>}
                <span
                  data-mark
                  className="w-full max-w-[44px] rounded-t-[4px] transition-[height,background-color] duration-300"
                  style={{ height: d.count ? `${h}%` : 3, background: d.count ? (active ? STEPS[3] : STEPS[2]) : STEPS[0] }}
                />
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-1.5">
          {days.map(d => (
            <span key={d.key} className={`flex-1 text-center text-[10px] font-semibold ${d.key === todayKey ? 'text-saffron-700' : 'text-gray-400'}`}>
              {d.date.toLocaleDateString('en-IN', { weekday: 'short' })}
            </span>
          ))}
        </div>
      </div>
      {total === 0 && <p className="m-0 mt-3 text-xs text-[#8A6A57]">No Vihars in these 7 days yet.</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------

// Same colours as the Dashboard's "Consistency · This week" dots: 1 Vihar orange, 2 yellow, 3+ green.
export const DAY_COLOURS = { none: '#F2EEE8', one: '#DE6B38', two: '#E8B923', many: '#3FA34D' };
const dayColour = (count: number) => (count >= 3 ? DAY_COLOURS.many : count === 2 ? DAY_COLOURS.two : count === 1 ? DAY_COLOURS.one : DAY_COLOURS.none);
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// "Consistency" as a month calendar (Sunday first, like the phone / Windows calendar): each day is a dot in
// the 7-day colours, today is ringed, and the arrows move between months (not past the current month).
export const ConsistencyCalendar: React.FC<{ entries: ViharEntry[]; anchorDate: Date }> = ({ entries, anchorDate }) => {
  const dayInfo = useDayIndex(entries);
  const t = useTooltip();
  const [month, setMonth] = useState(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  // follow the page's Vihar Year selector when it changes
  useEffect(() => { setMonth(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)); t.setTip(null); }, [anchorDate.getFullYear(), anchorDate.getMonth()]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today);
  const latestMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = month < latestMonth;

  const { cells, activeDays, total } = useMemo(() => {
    const first = new Date(month);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: ((DayInfo & { future: boolean }) | null)[] = Array.from({ length: first.getDay() }, () => null);
    let activeDays = 0, total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const info = { ...dayInfo(date), future: date > today };
      if (!info.future && info.count) { activeDays++; total += info.count; }
      cells.push(info);
    }
    while (cells.length % 7) cells.push(null);
    return { cells, activeDays, total };
  }, [dayInfo, month.getTime(), todayKey]);

  const go = (delta: number) => {
    t.setTip(null);
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  return (
    <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="m-0 text-sm font-bold text-[#241C17]">Consistency</p>
        <p className="m-0 text-xs font-semibold text-[#8A6A57]">{plural(activeDays, 'day')} · {plural(total, 'Vihar')}</p>
      </div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="m-0 text-[15px] font-extrabold text-[#241C17]">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="w-9 h-9 rounded-full flex items-center justify-center text-[#8A6A57] hover:bg-[#F7F4F0] active:scale-95 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button type="button" onClick={() => go(1)} disabled={!canNext} aria-label="Next month" className="w-9 h-9 rounded-full flex items-center justify-center text-[#8A6A57] hover:bg-[#F7F4F0] active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <div ref={t.ref} className="relative" onMouseLeave={() => t.setTip(x => (x?.pinned ? x : null))}>
        {t.tip && <Tip day={t.tip.day} x={t.tip.x} y={t.tip.y} bottom={t.tip.bottom} containerWidth={t.width} />}
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {WEEKDAYS.map(w => <span key={w} className="text-[10px] font-bold text-gray-400 pb-1">{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`blank-${i}`} />;
            const isToday = d.key === todayKey;
            const active = t.tip?.day.key === d.key;
            const filled = !d.future && d.count > 0;
            return (
              <div key={d.key} className="flex items-center justify-center">
                <button
                  type="button"
                  disabled={d.future}
                  aria-label={`${fmtLong(d.date)}: ${d.count ? plural(d.count, 'Vihar') : 'no Vihar'}`}
                  {...(d.future ? {} : t.handlers(d))}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-[13px] font-bold outline-none transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-saffron-300 disabled:hover:scale-100 ${active ? 'ring-2 ring-[#241C17] ring-offset-2' : isToday ? 'ring-2 ring-saffron-500 ring-offset-2' : ''}`}
                  style={{
                    background: d.future ? 'transparent' : dayColour(d.count),
                    color: d.future ? '#C9C2BA' : filled ? '#FFFFFF' : '#5C4A3F',
                  }}
                >
                  {d.date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
        {/* legend */}
        <div className="mt-3.5 flex items-center justify-end gap-3 text-[10px] font-semibold text-[#8A6A57]">
          {[['1', DAY_COLOURS.one], ['2', DAY_COLOURS.two], ['3+', DAY_COLOURS.many]].map(([label, colour]) => (
            <span key={label} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: colour }} />{label} Vihar{label === '1' ? '' : 's'}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
