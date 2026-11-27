import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, ChevronDown, Crown, Footprints, RefreshCw, Search, Trophy, X } from 'lucide-react';
import { OPEN_TOP5_EVENT } from './ui';
import Avatar from '../../../components/Avatar';
import { getSiteData } from './siteData';

// Public leaderboard (landing page): top Vihar Sevaks and groups across every vSeva group. Reads the file the
// Super Admin "Refresh website data" button publishes (netlify/functions/route-directory.js, buildLeaderboard), so it
// only changes then. Approved Vihars only. One small JSON file, fetched once and shared by the section and the popup.

type SevakRow = [string, 'M' | 'F' | '', number, number, number, number, number, string?, string?]; // name, gender, group, vyV, vyK, allV, allK, photo path, badge
type GroupRow = [string, string, number, number, number, number, number]; // name, city, vyV, vyK, allV, allK, activeSevaksVY
interface Board { v: number; generatedAt: string; vy: { startYear: number; label: string } | null; sevaks: SevakRow[]; groups: GroupRow[] }

const SRC = `${import.meta.env.VITE_SUPABASE_URL || ''}/storage/v1/object/public/public-data/leaderboard.json`;
// Profile photos live in the public "avatars" bucket; the file carries only each photo's path there
const photoUrl = (path?: string) => (path ? `${import.meta.env.VITE_SUPABASE_URL || ''}/storage/v1/object/public/avatars/${path}` : null);
const sourceUrl = () => {
  if (import.meta.env.DEV) {
    try { const dev = localStorage.getItem('leaderboardSrc'); if (dev) return dev; } catch { /* ignore */ }
  }
  return SRC;
};

let boardPromise: Promise<Board> | null = null;
const loadBoard = () => (boardPromise ??= fetch(sourceUrl()).then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))));
// The copy the build wrote into the page (siteData.ts), if any: the board shows at once, already in the HTML
const embeddedBoard = (): Board | null => getSiteData().leaderboard || null;

const useBoard = () => {
  const [board, setBoard] = useState<Board | null>(embeddedBoard);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(() => (embeddedBoard() ? 'ready' : 'loading'));
  useEffect(() => {
    let alive = true;
    // Also when the page carries a copy: a Super Admin may have refreshed the board since this page was built
    loadBoard()
      .then(b => { if (alive && (!board || b.generatedAt !== board.generatedAt)) { setBoard(b); setState('ready'); } })
      .catch(() => { boardPromise = null; if (alive && !board) setState('missing'); });
    return () => { alive = false; };
  }, []);
  return { board, state };
};

type Who = 'all' | 'M' | 'F';
type Metric = 'vihars' | 'km';
type Period = 'all' | 'vy';

const fmtKm = (k: number) => (k % 1 ? k.toFixed(1) : String(k));
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
const sevakCol = (p: Period, m: Metric) => (p === 'vy' ? (m === 'vihars' ? 3 : 4) : (m === 'vihars' ? 5 : 6));
const groupCol = (p: Period, m: Metric) => (p === 'vy' ? (m === 'vihars' ? 2 : 3) : (m === 'vihars' ? 4 : 5));

interface RankedSevak { rank: number; name: string; group: string; city: string; value: number; photo: string | null; badge: string; idx: number }
interface RankedGroup { rank: number; name: string; city: string; value: number; active: number }

// Every Sevak with a value in the chosen view, ranked (equal values share a rank)
// One Sevak row as the page shows a person (rank and value are filled in by the view)
const personOf = (b: Board, s: SevakRow, idx: number): RankedSevak => {
  const g = b.groups[s[2]];
  return { rank: 0, name: s[0], group: g?.[0] || '', city: g?.[1] || '', value: 0, photo: photoUrl(s[7]), badge: s[8] || '', idx };
};

// Ties (common early in a Vihar Year) are broken by the other measure of the same period, then by all-time Vihars, then
// by name, and every row gets its own position, so the list never reads "1, 1, 1".
const rankSevaks = (b: Board, who: Who, metric: Metric, period: Period): RankedSevak[] => {
  const col = sevakCol(period, metric);
  const other = sevakCol(period, metric === 'vihars' ? 'km' : 'vihars');
  return b.sevaks
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => (who === 'all' || s[1] === who) && (s[col] as number) > 0)
    .sort(({ s: x }, { s: y }) => (y[col] as number) - (x[col] as number) || (y[other] as number) - (x[other] as number) || y[5] - x[5] || x[0].localeCompare(y[0]))
    .map(({ s, idx }, i) => ({ ...personOf(b, s, idx), rank: i + 1, value: s[col] as number }));
};

const rankGroups = (b: Board, metric: Metric, period: Period): RankedGroup[] => {
  const col = groupCol(period, metric);
  const other = groupCol(period, metric === 'vihars' ? 'km' : 'vihars');
  return b.groups
    .map(g => ({ name: g[0], city: g[1], value: g[col] as number, tie: g[other] as number, all: g[4], active: g[6] }))
    .filter(g => g.value > 0)
    .sort((x, y) => y.value - x.value || y.tie - x.tie || y.all - x.all || x.name.localeCompare(y.name))
    .map((g, i) => ({ name: g.name, city: g.city, value: g.value, active: g.active, rank: i + 1 }));
};


/* ───────────── shared bits ───────────── */

// Under a person's name: where their group is ("Town, City"), then the group
const whereOf = (s: { city: string; group: string }) => [s.city, s.group].filter(Boolean).join(' · ');

// The verified tick the app shows on special profiles (Team vSeva, Developer); `label` adds the title as a small chip
const Verified: React.FC<{ title: string; label?: boolean; size?: number }> = ({ title, label, size = 16 }) => (
  <span className="inline-flex shrink-0 items-center gap-1 align-middle" title={title}>
    <BadgeCheck size={size} className="shrink-0 fill-[#1D9BF0] text-white" aria-label={`Verified: ${title}`} />
    {label && <span className="whitespace-nowrap rounded-full bg-[#1D9BF0]/12 px-2 py-0.5 text-[0.68rem] font-semibold text-[#0b6fb8]">{title}</span>}
  </span>
);

const Seg = <T extends string>({ value, onChange, options, label, dark }: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[]; label: string; dark?: boolean }) => (
  <div role="radiogroup" aria-label={label} className={`vs-seg${dark ? ' vs-seg-dark' : ''}`}>
    {options.map(o => (
      <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}>{o.label}</button>
    ))}
  </div>
);

// Phones: each control is a labelled dropdown pill (all three fit in one row and read as choices)
const Pick = <T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[]; label: string }) => (
  <label className="min-w-0">
    <span className="mb-1 block px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">{label}</span>
    <span className="relative block">
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="h-11 w-full appearance-none truncate rounded-full border-0 bg-[color:var(--card)] pl-3.5 pr-8 text-[0.9rem] font-semibold text-[color:var(--ink)] shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none focus:ring-2 focus:ring-[color:var(--saffron)]"
      >
        {options.map(o => <option key={o.v} value={o.v} className="bg-white text-[#1d1d1b]">{o.label}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--saffron-deep)]" aria-hidden />
    </span>
  </label>
);

const Value: React.FC<{ v: number; metric: Metric; className?: string; unitClass?: string }> = ({ v, metric, className = '', unitClass = '' }) => (
  <span className="whitespace-nowrap">
    <span className={`vs-num ${className}`}>{metric === 'km' ? fmtKm(v) : v}</span>
    <span className={`ml-1 text-[0.78rem] font-semibold ${unitClass}`}>{metric === 'km' ? 'km' : v === 1 ? 'Vihar' : 'Vihars'}</span>
  </span>
);

// A small real-looking trophy for the top three: polished gold, silver or bronze on a dark plinth (metal colours, not
// the site's theme), standing at the top of each podium bar
const METAL: Record<number, string[]> = {
  1: ['#6E4A00', '#C8920C', '#F7D44C', '#FFF4B8', '#E3AE1F', '#7A5300'],
  2: ['#575D64', '#9EA5AE', '#E3E7EB', '#FFFFFF', '#B8BFC7', '#5E646B'],
  3: ['#4E250C', '#9C5626', '#E29A5E', '#FFD7B0', '#BE7036', '#55290E'],
};
const PodiumTrophy: React.FC<{ place: number; className?: string }> = ({ place, className = '' }) => {
  const m = METAL[place];
  const id = `vs-trophy-${place}`;
  return (
    <svg viewBox="0 0 48 60" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" x2="1">
          <stop offset="0" stopColor={m[0]} /><stop offset="0.18" stopColor={m[1]} /><stop offset="0.42" stopColor={m[2]} />
          <stop offset="0.55" stopColor={m[3]} /><stop offset="0.78" stopColor={m[4]} /><stop offset="1" stopColor={m[5]} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={m[3]} /><stop offset="1" stopColor={m[1]} />
        </linearGradient>
        <linearGradient id={`${id}-plinth`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4A3D33" /><stop offset="1" stopColor="#1E1814" />
        </linearGradient>
      </defs>
      {/* handles */}
      <path d="M12 12H7.5a5 5 0 0 0 0 10H11" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3" strokeLinecap="round" />
      <path d="M36 12h4.5a5 5 0 0 1 0 10H37" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="3" strokeLinecap="round" />
      {/* cup */}
      <path d="M11 7h26v9.5C37 25 31.2 31 24 31S11 25 11 16.5z" fill={`url(#${id}-metal)`} />
      <ellipse cx="24" cy="7" rx="13" ry="2.6" fill={`url(#${id}-rim)`} />
      <ellipse cx="24" cy="7.3" rx="10.5" ry="1.6" fill={m[0]} opacity="0.55" />
      <path d="M15.5 10.5c-.3 6 1.3 11 4.5 14.5" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* stem and knob */}
      <path d="M21.5 30.5h5l-.9 7h-3.2z" fill={`url(#${id}-metal)`} />
      <ellipse cx="24" cy="38.5" rx="5.5" ry="1.8" fill={`url(#${id}-metal)`} />
      <path d="M17 44c0-2.6 3-4.5 7-4.5s7 1.9 7 4.5z" fill={`url(#${id}-metal)`} />
      {/* plinth */}
      <rect x="13" y="44" width="22" height="11" rx="1.6" fill={`url(#${id}-plinth)`} />
      <rect x="13" y="44" width="22" height="1.6" fill="#FFFFFF" opacity="0.12" />
      <rect x="18" y="47.5" width="12" height="4" rx="0.8" fill={`url(#${id}-metal)`} opacity="0.9" />
    </svg>
  );
};

// Podium: 2nd · 1st · 3rd, in the app's block colours
const PODIUM = [
  { place: 2, tile: 'vs-tile-sky', h: 'h-[134px] sm:h-[150px]' },
  { place: 1, tile: 'vs-tile-mustard', h: 'h-[160px] sm:h-[184px]' },
  { place: 3, tile: 'vs-tile-pink', h: 'h-[118px] sm:h-[130px]' },
];

/* ───────────── Section ───────────── */

export const Leaderboard: React.FC = () => {
  const { board, state } = useBoard();
  const [who, setWho] = useState<Who>('all');
  const [metric, setMetric] = useState<Metric>('vihars');
  const [period, setPeriod] = useState<Period>('vy');
  const [query, setQuery] = useState('');


  const sevaks = useMemo(() => (board ? rankSevaks(board, who, metric, period) : []), [board, who, metric, period]);
  const groups = useMemo(() => (board ? rankGroups(board, metric, period) : []), [board, metric, period]);
  const top = sevaks.slice(0, 30); // podium + ranks 4 to 30 in a scrolling list
  const leader = top[0]?.value || 1;
  const vyLabel = board?.vy?.label || 'This Vihar Year';

  // "Find yourself": search every ranked Sevak and group in the current view
  const q = query.trim().toLowerCase();
  const found = useMemo(() => {
    if (q.length < 2 || !board) return null;
    const rankOf = new Map(sevaks.map(x => [x.idx, x]));
    const all = board.sevaks
      .map((row, idx) => rankOf.get(idx) || personOf(board, row, idx))
      .filter(x => x.name.toLowerCase().includes(q))
      // ranked people first (by rank), then the rest by name
      .sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9) || a.name.localeCompare(b.name));
    const groupRank = new Map(groups.map(x => [`${x.name}|${x.city}`, x]));
    const g = board.groups
      .map(([name, city, , , , , active]) => groupRank.get(`${name}|${city}`) || { rank: 0, name, city, value: 0, active })
      .filter(x => `${x.name} ${x.city}`.toLowerCase().includes(q))
      .sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9) || a.name.localeCompare(b.name))
      .slice(0, 6);
    return { s: all.slice(0, 12), more: Math.max(0, all.length - 12), g };
  }, [q, board, sevaks, groups]);

  const viewKey = `${who}${metric}${period}`; // replays the entry animation when the view changes

  return (
    <div>
      {/* Controls */}
      {/* Phones: three dropdown pills in one row. Larger screens: the segmented toggles. */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        <Pick label="Period" value={period} onChange={setPeriod} options={[{ v: 'vy', label: 'This year' }, { v: 'all', label: 'All time' }]} />
        <Pick label="Rank by" value={metric} onChange={setMetric} options={[{ v: 'vihars', label: 'Vihars' }, { v: 'km', label: 'Km' }]} />
        <Pick label="Show" value={who} onChange={setWho} options={[{ v: 'all', label: 'All' }, { v: 'M', label: 'Sevaks' }, { v: 'F', label: 'Sevikas' }]} />
      </div>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <Seg label="Period" value={period} onChange={setPeriod} options={[{ v: 'vy', label: vyLabel }, { v: 'all', label: 'All time' }]} />
        <Seg label="Rank by" value={metric} onChange={setMetric} options={[{ v: 'vihars', label: 'Vihars' }, { v: 'km', label: 'Kilometres' }]} />
        <Seg label="Who" value={who} onChange={setWho} options={[{ v: 'all', label: 'Everyone' }, { v: 'M', label: 'Sevaks' }, { v: 'F', label: 'Sevikas' }]} />
      </div>

      {state === 'loading' && (
        <div className="mt-6 grid gap-4 lg:grid-cols-12" aria-hidden>
          <div className="h-[520px] animate-pulse rounded-[24px] bg-[color:var(--sunken)] lg:col-span-7" />
          <div className="h-[520px] animate-pulse rounded-[24px] bg-[color:var(--sunken)] lg:col-span-5" />
        </div>
      )}
      {state === 'missing' && (
        <div className="mt-6 rounded-[24px] border border-dashed border-[color:var(--line-strong)] bg-[color:var(--card)] p-8 text-center">
          <Trophy size={26} className="mx-auto text-[color:var(--muted)]" aria-hidden />
          <p className="mt-2 font-semibold text-[color:var(--ink)]">The leaderboard is being prepared</p>
          <p className="mt-1 text-[0.9rem] text-[color:var(--muted)]">Top Vihar Sevaks across vSeva groups will appear here soon.</p>
        </div>
      )}

      {state === 'ready' && board && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Top Sevaks: podium, then 4 to 10 as bars */}
            <div className="flex min-w-0 flex-col rounded-[24px] bg-[color:var(--card)] p-4 shadow-[inset_0_0_0_1px_var(--line)] sm:p-6 lg:col-span-7">
              <div className="flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-center gap-2 whitespace-nowrap font-[family-name:var(--display)] text-[1.25rem] font-extrabold tracking-[-0.02em] sm:text-[1.35rem]">
                  <Trophy size={20} className="shrink-0 text-[color:var(--saffron)]" aria-hidden />
                  Top {who === 'F' ? 'Sevikas' : who === 'M' ? 'Sevaks' : 'Vihar Sevaks'}
                </p>
                <span className="shrink-0 rounded-full bg-[color:var(--sunken)] px-3 py-1 text-[0.75rem] font-semibold text-[color:var(--ink-2)]">
                  <span className="hidden sm:inline">{period === 'vy' ? vyLabel : 'All time'} · </span>out of {sevaks.length}
                </span>
              </div>

              {top.length === 0 ? (
                <p className="py-16 text-center text-[0.95rem] text-[color:var(--muted)]">No Vihars recorded {period === 'vy' ? `in ${vyLabel}` : ''} yet.</p>
              ) : (
                <>
                  <ol key={`p${viewKey}`} className="mt-5 grid grid-cols-3 items-end gap-2 sm:gap-3" aria-label="Top three">
                    {PODIUM.map(({ place, tile, h }, i) => {
                      const s = top[place - 1];
                      if (!s) return <li key={place} />;
                      return (
                        <li key={place} className="flex min-w-0 flex-col items-center text-center" style={{ order: i }}>
                          <span className={`relative rounded-full ring-[3px] ${place === 1 ? 'ring-[color:var(--mustard)]' : place === 2 ? 'ring-[color:var(--sky)]' : 'ring-[color:var(--pink)]'}`}>
                            <Avatar name={s.name} url={s.photo} size={place === 1 ? 60 : 52} variant={place === 1 ? 'gradient' : 'pale'} />
                          </span>
                          <p className="mt-2 line-clamp-2 min-h-[2.5em] w-full text-[0.86rem] font-semibold leading-tight sm:text-[0.95rem]">
                            <span className="vs-num mr-1 text-[color:var(--saffron-deep)]">#{place}</span>{s.name}{s.badge && <> <Verified title={s.badge} size={15} /></>}
                          </p>
                          <p className="w-full truncate text-[0.72rem] text-[color:var(--muted)]" title={whereOf(s)}>{whereOf(s)}</p>
                          <div className={`vs-tile ${tile} vs-grow mt-2 flex w-full flex-col items-center justify-start !rounded-b-[10px] !px-1 !pt-2.5 ${h}`} style={{ ['--d' as string]: place === 1 ? 0 : place === 2 ? 1 : 2 }}>
                            <PodiumTrophy place={place} className={`drop-shadow-[0_3px_3px_rgba(0,0,0,0.25)] ${place === 1 ? 'h-[44px] w-[35px]' : 'h-[38px] w-[30px]'}`} />
                            <Value v={s.value} metric={metric} className="mt-1 text-[1.5rem] sm:text-[1.9rem]" unitClass="block !ml-0 opacity-75" />
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {top.length > 3 && (
                    <ol key={`l${viewKey}`} className="vs-scroll mt-4 max-h-[440px] space-y-1.5 overflow-y-auto overscroll-contain pr-1 lg:max-h-none lg:min-h-[320px] lg:flex-1 lg:basis-0" start={4} tabIndex={0} aria-label={`Ranks 4 to ${top.length}, scroll for more`}>
                      {top.slice(3).map((s, i) => (
                        <li key={`${s.name}|${s.rank}`} className="vs-slide grid grid-cols-[1.6rem_auto_1fr_auto] items-center gap-3 rounded-2xl px-2 py-2 hover:bg-[color:var(--paper)]" style={{ ['--d' as string]: Math.min(i, 8) }}>
                          <span className="vs-num text-center text-[1.05rem] text-[color:var(--muted)]">{s.rank}</span>
                          <Avatar name={s.name} url={s.photo} size={36} />
                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-1"><span className="truncate text-[0.98rem] font-semibold">{s.name}</span>{s.badge && <Verified title={s.badge} size={15} />}</span>
                            <span className="block truncate text-[0.74rem] text-[color:var(--muted)]" title={whereOf(s)}>
                              {s.badge && <span className="font-semibold text-[#0b6fb8]">{s.badge} · </span>}{whereOf(s)}
                            </span>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[color:var(--sunken)]">
                              <span className="vs-bar block h-full rounded-full bg-[color:var(--saffron)]" style={{ width: `${Math.max(6, (s.value / leader) * 100)}%`, ['--d' as string]: Math.min(i, 8) }} />
                            </span>
                          </span>
                          <Value v={s.value} metric={metric} className="text-[1.2rem]" unitClass="text-[color:var(--muted)]" />
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}
            </div>

            {/* Right column: find yourself, then the top groups */}
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
              <div className="rounded-[24px] bg-[color:var(--saffron)] p-4 sm:p-5">
                <label htmlFor="lb-find" className="font-[family-name:var(--display)] text-[1.2rem] font-extrabold tracking-[-0.02em] text-[color:var(--ink)]">Find yourself on the board</label>
                <div className="relative mt-3">
                  <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" aria-hidden />
                  <input
                    id="lb-find"
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Type your name or your group"
                    autoComplete="off"
                    className="h-12 w-full rounded-full border-0 bg-[color:var(--card)] pl-11 pr-4 text-[0.98rem] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--ink)]"
                  />
                </div>
                {found && (
                  <ul className="vs-scroll mt-3 max-h-[360px] space-y-1.5 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
                    {found.s.length === 0 && found.g.length === 0 && (
                      <li className="rounded-2xl bg-[color:var(--card)]/80 px-3 py-2.5 text-[0.9rem] text-[color:var(--ink-2)]">
                        No Sevak or group by that name on vSeva yet.
                      </li>
                    )}
                    {found.s.map(s => (
                      <li key={`s${s.idx}`} className="flex items-center gap-3 rounded-2xl bg-[color:var(--card)] px-3 py-2">
                        <span className="w-12 shrink-0 text-center leading-tight">
                          <span className={`vs-num block ${s.rank ? 'text-[1.05rem]' : 'text-[0.95rem] text-[color:var(--muted)]'}`}>{s.rank ? `#${s.rank}` : '–'}</span>
                          {s.rank > 0 && <span className="block text-[0.66rem] font-semibold text-[color:var(--muted)]">of {sevaks.length}</span>}
                        </span>
                        <Avatar name={s.name} url={s.photo} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-1"><span className="truncate text-[0.92rem] font-semibold">{s.name}</span>{s.badge && <Verified title={s.badge} size={15} />}</span>
                          <span className="block truncate text-[0.74rem] text-[color:var(--muted)]">{whereOf(s)}</span>
                        </span>
                        <Value v={s.value} metric={metric} className="text-[1.05rem]" unitClass="text-[color:var(--muted)]" />
                      </li>
                    ))}
                    {found.more > 0 && (
                      <li className="px-3 py-1 text-[0.82rem] font-medium text-[color:var(--ink)]/75">and {found.more} more. Type more of the name to narrow it down.</li>
                    )}
                    {found.g.map(g => (
                      <li key={`g${g.name}${g.rank}`} className="flex items-center gap-3 rounded-2xl bg-[color:var(--mustard)] px-3 py-2 text-[color:var(--ink)]">
                        <span className="w-12 shrink-0 text-center leading-tight">
                          <span className="vs-num block text-[1.05rem]">{g.rank ? `#${g.rank}` : '–'}</span>
                          {g.rank > 0 && <span className="block text-[0.66rem] font-semibold opacity-70">of {groups.length}</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.92rem] font-semibold">{g.name}</span>
                          <span className="block truncate text-[0.74rem] opacity-70">Group{g.city ? ` · ${g.city}` : ''}</span>
                        </span>
                        <Value v={g.value} metric={metric} className="text-[1.05rem]" unitClass="opacity-70" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="vs-tile-mustard flex-1 rounded-[24px] p-4 sm:p-6">
                <p className="flex items-center gap-2 font-[family-name:var(--display)] text-[1.35rem] font-extrabold tracking-[-0.02em] text-[color:var(--ink)]">
                  <Crown size={20} className="text-[color:var(--ink)]" aria-hidden /> Top groups
                </p>
                {groups.length === 0 ? (
                  <p className="py-10 text-center text-[0.95rem] text-[color:var(--ink-2)]">No Vihars recorded {period === 'vy' ? `in ${vyLabel}` : ''} yet.</p>
                ) : (
                  <ol key={`g${viewKey}`} className="mt-4 space-y-2">
                    {groups.slice(0, 8).map((g, i) => (
                      <li key={g.name + g.city} className={`vs-slide rounded-2xl bg-white/45 px-3 py-2.5 ${i >= 5 ? 'max-lg:hidden' : ''}`} style={{ ['--d' as string]: i }}>
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9rem] font-bold ${i === 0 ? 'bg-[color:var(--ink)] text-white' : 'bg-white/70 text-[color:var(--ink)]'}`}>{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.98rem] font-semibold text-[color:var(--ink)]">{g.name}</p>
                            <p className="truncate text-[0.76rem] text-[color:var(--ink)]/65">{g.city}{g.active > 0 ? `${g.city ? ' · ' : ''}${g.active} active this year` : ''}</p>
                          </div>
                          <Value v={g.value} metric={metric} className="text-[1.25rem] text-[color:var(--ink)]" unitClass="text-[color:var(--ink)]/65" />
                        </div>
                        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-[color:var(--ink)]/10">
                          <span className="vs-bar block h-full rounded-full bg-[color:var(--ink)]" style={{ width: `${Math.max(6, (g.value / (groups[0]?.value || 1)) * 100)}%`, ['--d' as string]: i }} />
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[0.85rem] text-[color:var(--muted)]">
            <span className="inline-flex items-center gap-1.5"><Footprints size={14} aria-hidden /> Approved Vihars recorded on vSeva. A Sevak&rsquo;s km is the distance of the Vihars they were part of.</span>
            <span className="inline-flex items-center gap-1.5"><RefreshCw size={13} aria-hidden /> Last updated {fmtDate(board.generatedAt)}</span>
          </div>
        </>
      )}
    </div>
  );
};

/* ───────────── Popup: this year's top 5, shortly after the page opens ───────────── */

const PEEK_KEY = 'vs_lb_peek_closed';

// A small card, not a blocking modal: it never covers the page's main content or steals focus, closes with ×, Escape
// or "See the full leaderboard", and stays closed for the rest of the visit. It waits until the page has settled.
export const LeaderboardPeek: React.FC<{ targetId: string }> = ({ targetId }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'sevaks' | 'groups'>('sevaks');
  const [period, setPeriod] = useState<Period>('vy');
  const [board, setBoard] = useState<Board | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    try { if (sessionStorage.getItem(PEEK_KEY)) return; } catch { /* private mode: show once per page load */ }
    let alive = true;
    const t = window.setTimeout(() => {
      loadBoard().then(b => {
        if (!alive || closedRef.current) return;
        // Skip it when the visitor has already scrolled to the leaderboard
        const el = document.getElementById(targetId);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.6) return;
        setBoard(b);
        setOpen(true);
      }).catch(() => undefined);
    }, 1800);
    return () => { alive = false; window.clearTimeout(t); };
  }, [targetId]);

  // The trophy button (FloatingActions in ui.tsx) opens it any time, or closes it if it is open
  useEffect(() => {
    const onOpen = () => {
      if (open) { setOpen(false); return; }
      loadBoard().then(b => { setBoard(b); setOpen(true); }).catch(() => undefined);
    };
    window.addEventListener(OPEN_TOP5_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TOP5_EVENT, onOpen);
  }, [open]);

  const close = () => {
    closedRef.current = true;
    setOpen(false);
    try { sessionStorage.setItem(PEEK_KEY, '1'); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const sevaks = useMemo(() => (board ? rankSevaks(board, 'all', 'vihars', period).slice(0, 5) : []), [board, period]);
  const groups = useMemo(() => (board ? rankGroups(board, 'vihars', period).slice(0, 5) : []), [board, period]);
  const rows = tab === 'sevaks' ? sevaks.map(s => ({ k: s.name + s.rank, name: s.name, sub: whereOf(s), v: s.value, photo: s.photo as string | null | undefined, badge: s.badge })) : groups.map(g => ({ k: g.name + g.city, name: g.name, sub: g.city, v: g.value, photo: undefined, badge: '' }));

  if (!open || !board) return null;
  const vyLabel = board.vy?.label || 'This Vihar Year';
  const label = period === 'vy' ? vyLabel : 'All time';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="lb-peek-title"
      className="vs-pop fixed left-3 right-[70px] z-50 max-w-[360px] sm:left-auto sm:right-[84px] sm:w-[360px]"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
    >
      <div className="vs-glass overflow-hidden rounded-[24px] text-[color:var(--ink)]">
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--saffron-deep)]">Leaderboard · {label}</p>
            <p id="lb-peek-title" className="mt-1 font-[family-name:var(--display)] text-[1.35rem] font-extrabold leading-tight tracking-[-0.02em]">{period === 'vy' ? 'Top 5 this year' : 'Top 5 of all time'}</p>
          </div>
          <button type="button" onClick={close} className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)]/[0.07] hover:bg-[color:var(--ink)]/[0.12]" aria-label="Close">
            <X size={17} aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 pt-3 [&_button]:!h-8 [&_button]:!px-3 [&_button]:!text-[0.82rem]">
          <Seg label="Period" value={period} onChange={setPeriod} options={[{ v: 'vy', label: 'Year' }, { v: 'all', label: 'All time' }]} />
          <Seg label="Show" value={tab} onChange={setTab} options={[{ v: 'sevaks', label: 'Sevaks' }, { v: 'groups', label: 'Groups' }]} />
        </div>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-[0.92rem] text-[color:var(--muted)]">No Vihars recorded in {vyLabel} yet. Try All time.</p>
        )}
        <ol key={tab + period} className="space-y-1 px-3 pb-2 pt-3">
          {rows.map((r, i) => (
            <li key={r.k} className="vs-slide flex items-center gap-3 rounded-2xl px-2 py-1.5" style={{ ['--d' as string]: i }}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-bold ${i === 0 ? 'bg-[color:var(--mustard)] text-[color:var(--ink)]' : i === 1 ? 'bg-[color:var(--sky)] text-[color:var(--ink)]' : i === 2 ? 'bg-[color:var(--pink)] text-[color:var(--ink)]' : 'bg-white/70 text-[color:var(--ink)]'}`}>{i + 1}</span>
              {tab === 'sevaks' && <Avatar name={r.name} url={r.photo} size={34} />}
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1"><span className="truncate text-[0.92rem] font-semibold">{r.name}</span>{r.badge && <Verified title={r.badge} size={15} />}</span>
                {r.sub && <span className="block truncate text-[0.72rem] text-[color:var(--muted)]">{r.sub}</span>}
              </span>
              <Value v={r.v} metric="vihars" className="text-[1.1rem]" unitClass="text-[color:var(--muted)]" />
            </li>
          ))}
        </ol>
        <a
          href={`#${targetId}`}
          onClick={close}
          className="flex items-center justify-center gap-2 bg-[color:var(--saffron)] px-4 py-3 text-[0.95rem] font-semibold text-[color:var(--ink)] no-underline hover:bg-[color:var(--saffron-press)]"
        >
          See the full leaderboard <ArrowRight size={16} aria-hidden />
        </a>
      </div>
    </div>
  );
};

export default Leaderboard;
