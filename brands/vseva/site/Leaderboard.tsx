import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Footprints, Medal, RefreshCw, Trophy } from 'lucide-react';

// Public leaderboard (landing page): top Vihar Sevaks and groups across every vSeva group. Reads the file the
// Super Admin "Refresh" button publishes (netlify/functions/route-directory.js, buildLeaderboard), so it only
// changes then. Approved Vihars only.

type SevakRow = [string, 'M' | 'F' | '', number, number, number, number, number]; // name, gender, group, vyV, vyK, allV, allK
type GroupRow = [string, string, number, number, number, number, number]; // name, city, vyV, vyK, allV, allK, activeSevaksVY
interface Board { v: number; generatedAt: string; vy: { startYear: number; label: string } | null; sevaks: SevakRow[]; groups: GroupRow[] }

const SRC = `${import.meta.env.VITE_SUPABASE_URL || ''}/storage/v1/object/public/public-data/leaderboard.json`;
const sourceUrl = () => {
  if (import.meta.env.DEV) {
    try { const dev = localStorage.getItem('leaderboardSrc'); if (dev) return dev; } catch { /* ignore */ }
  }
  return SRC;
};

type Who = 'all' | 'M' | 'F';
type Metric = 'vihars' | 'km';
type Period = 'all' | 'vy';

const fmtKm = (k: number) => (k % 1 ? k.toFixed(1) : String(k));
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

const Toggle = <T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[]; label: string }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full bg-[color:var(--paper)] p-1 [scrollbar-width:none]">
    {options.map(o => (
      <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
        className={`h-9 whitespace-nowrap rounded-full px-3.5 text-[0.85rem] font-semibold transition-colors ${value === o.v ? 'bg-[color:var(--saffron-deep)] text-white' : 'text-[color:var(--ink-2)] hover:text-[color:var(--ink)]'}`}>
        {o.label}
      </button>
    ))}
  </div>
);

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const style = rank === 1 ? 'bg-[#f6d36b] text-[#5c4300]' : rank === 2 ? 'bg-[#dfe3e8] text-[#3b434c]' : rank === 3 ? 'bg-[#f0c6a4] text-[#6b3b17]' : 'bg-[color:var(--paper)] text-[color:var(--ink-2)]';
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-bold ${style}`}>
      {rank <= 3 ? <Medal size={16} aria-label={`Rank ${rank}`} /> : rank}
    </span>
  );
};

export const Leaderboard: React.FC = () => {
  const [board, setBoard] = useState<Board | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [who, setWho] = useState<Who>('all');
  const [metric, setMetric] = useState<Metric>('vihars');
  const [period, setPeriod] = useState<Period>('all');

  useEffect(() => {
    let alive = true;
    fetch(sourceUrl())
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: Board) => { if (alive) { setBoard(b); setState('ready'); } })
      .catch(() => { if (alive) setState('missing'); });
    return () => { alive = false; };
  }, []);

  // the Sevak's group, as [name, city, ...] (board.groups is indexed the same way as the Sevak rows refer to it)
  const groupName = (i: number) => board?.groups[i] ?? null;

  const sevaks = useMemo(() => {
    if (!board) return [];
    const col = period === 'vy' ? (metric === 'vihars' ? 3 : 4) : (metric === 'vihars' ? 5 : 6);
    return board.sevaks
      .filter(s => (who === 'all' || s[1] === who) && (s[col] as number) > 0)
      .sort((a, b) => (b[col] as number) - (a[col] as number) || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(s => ({ name: s[0], group: s[2], value: s[col] as number }));
  }, [board, who, metric, period]);

  const groups = useMemo(() => {
    if (!board) return [];
    const col = period === 'vy' ? (metric === 'vihars' ? 2 : 3) : (metric === 'vihars' ? 4 : 5);
    return board.groups
      .map((g, i) => ({ i, name: g[0], city: g[1], value: g[col] as number, active: g[6] }))
      .filter(g => g.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [board, metric, period]);

  const unit = metric === 'vihars' ? 'Vihars' : 'km';
  const vyLabel = board?.vy?.label || 'This Vihar Year';

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Toggle label="Who" value={who} onChange={setWho} options={[{ v: 'all', label: 'All' }, { v: 'M', label: 'Sevaks' }, { v: 'F', label: 'Sevikas' }]} />
        <Toggle label="Rank by" value={metric} onChange={setMetric} options={[{ v: 'vihars', label: 'Vihars' }, { v: 'km', label: 'Kilometres' }]} />
        <Toggle label="Period" value={period} onChange={setPeriod} options={[{ v: 'all', label: 'All time' }, { v: 'vy', label: vyLabel }]} />
      </div>

      {state === 'loading' && (
        <div className="mt-5 grid gap-4 lg:grid-cols-12" aria-hidden>
          <div className="h-[420px] animate-pulse rounded-[24px] bg-white/70 lg:col-span-7" />
          <div className="h-[300px] animate-pulse rounded-[24px] bg-white/70 lg:col-span-5" />
        </div>
      )}
      {state === 'missing' && (
        <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-white p-8 text-center">
          <Trophy size={26} className="mx-auto text-[color:var(--muted)]" aria-hidden />
          <p className="mt-2 font-semibold text-[color:var(--ink)]">The leaderboard is being prepared</p>
          <p className="mt-1 text-[0.9rem] text-[color:var(--muted)]">Top Vihar Sevaks across vSeva groups will appear here soon.</p>
        </div>
      )}
      {state === 'ready' && board && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Top Sevaks */}
            <div className="min-w-0 rounded-[24px] border border-[color:var(--line)] bg-white p-4 sm:p-6 lg:col-span-7">
              <p className="flex items-center gap-2 font-[family-name:var(--display)] text-[1.3rem] font-extrabold text-[color:var(--ink)]">
                <Trophy size={20} className="text-[color:var(--saffron-deep)]" aria-hidden />
                Top {who === 'F' ? 'Sevikas' : who === 'M' ? 'Sevaks' : 'Vihar Sevaks'}
              </p>
              {sevaks.length === 0 ? (
                <p className="mt-6 text-center text-[0.95rem] text-[color:var(--muted)]">No Vihars recorded {period === 'vy' ? `in ${vyLabel}` : ''} yet.</p>
              ) : (
                <ol className="mt-4 space-y-2">
                  {sevaks.map((s, i) => {
                    const g = groupName(s.group);
                    return (
                      <li key={`${s.name}|${i}`} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${i === 0 ? 'bg-[color:var(--saffron-tint)]' : 'bg-[color:var(--paper)]'}`}>
                        <RankBadge rank={i + 1} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[1rem] font-semibold text-[color:var(--ink)]">{s.name}</p>
                          {g && <p className="truncate text-[0.8rem] text-[color:var(--muted)]">{g[0]}{g[1] ? ` · ${g[1]}` : ''}</p>}
                        </div>
                        <p className="shrink-0 text-right">
                          <span className="font-[family-name:var(--display)] text-[1.35rem] font-extrabold text-[color:var(--ink)]">{metric === 'km' ? fmtKm(s.value) : s.value}</span>
                          <span className="ml-1 text-[0.8rem] text-[color:var(--muted)]">{unit}</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Top groups */}
            <div className="min-w-0 rounded-[24px] bg-[color:var(--night)] p-4 text-white sm:p-6 lg:col-span-5">
              <p className="flex items-center gap-2 font-[family-name:var(--display)] text-[1.3rem] font-extrabold">
                <Crown size={20} aria-hidden /> Top groups
              </p>
              {groups.length === 0 ? (
                <p className="mt-6 text-center text-[0.95rem] text-white/80">No Vihars recorded {period === 'vy' ? `in ${vyLabel}` : ''} yet.</p>
              ) : (
                <ol className="mt-4 space-y-2.5">
                  {groups.map((g, i) => (
                    <li key={g.i} className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-[0.9rem] font-bold">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[1rem] font-semibold">{g.name}</p>
                        <p className="truncate text-[0.8rem] text-white/75">
                          {g.city}{g.active > 0 ? `${g.city ? ' · ' : ''}${g.active} active this year` : ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="font-[family-name:var(--display)] text-[1.35rem] font-extrabold">{metric === 'km' ? fmtKm(g.value) : g.value}</span>
                        <span className="ml-1 text-[0.8rem] text-white/75">{unit}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              )}
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

export default Leaderboard;
