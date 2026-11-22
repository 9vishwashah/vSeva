import React, { useEffect, useState } from 'react';

interface SankalpRingProps {
  count: number;
  /** The target; null = not set for this Vihar Year, undefined = still loading. */
  goal: number | null | undefined;
  /** Card title, e.g. "My Sankalp" or "Group Sankalp". */
  title?: string;
  /** Colour: saffron for a Sevak's own Sankalp, a flat light purple (same shade as the dashboard KPI tiles) for the Group Sankalp. */
  tone?: 'saffron' | 'purple' | 'light';
  /** Smaller ring and padding (Dashboard). */
  compact?: boolean;
  /** e.g. "VY 2026-27" — the Vihar Year this count is scoped to. */
  periodLabel?: string;
}

// Design Core (docs/design-core.md): Sankalp is lavender everywhere, as a solid block with ink text.
// saffron stays available (solid saffron, ink text); light and purple both use the lavender block.
const LAVENDER = { bg: '#808BC5', shadow: 'none', track: 'rgba(29,29,27,0.18)', ring: '#1D1D1B', big: 'text-ink', soft: 'text-ink/70', title: 'text-ink/75', main: 'text-ink', pill: 'bg-ink/10' };
const THEMES = {
  saffron: { bg: '#E8730C', shadow: 'none', track: 'rgba(29,29,27,0.18)', ring: '#1D1D1B', big: 'text-ink', soft: 'text-ink/70', title: 'text-ink/75', main: 'text-ink', pill: 'bg-ink/10' },
  light: LAVENDER,
  purple: LAVENDER,
} as const;



// Dashboard hero card: gradient "Yearly Sankalp" progress ring.
// Ring fills from empty to the real count/goal ratio once on mount.
const SankalpRing: React.FC<SankalpRingProps> = ({ count, goal, title = 'Yearly Sankalp', tone = 'saffron', periodLabel, compact }) => {
  const SIZE = compact ? 56 : 76;
  const RADIUS = compact ? 23 : 32;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const hasGoal = typeof goal === 'number' && goal > 0;
  const safeGoal = hasGoal ? (goal as number) : 0;
  const percent = hasGoal ? Math.max(0, Math.min(1, count / safeGoal)) : 0;
  const remaining = Math.max(0, safeGoal - count);

  const [dashoffset, setDashoffset] = useState(CIRCUMFERENCE);

  useEffect(() => {
    setDashoffset(CIRCUMFERENCE);
    const id = requestAnimationFrame(() => {
      setDashoffset(CIRCUMFERENCE * (1 - percent));
    });
    return () => cancelAnimationFrame(id);
  }, [percent, CIRCUMFERENCE]);

  // count up from 0 to the real number alongside the ring fill
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(count); return; }
    let raf = 0; const start = performance.now();
    const step = (now: number) => { const p = Math.min(1, (now - start) / 800); setShown(Math.round(count * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  const center = SIZE / 2;
  const th = THEMES[tone];

  return (
    <div
      style={{ background: th.bg, boxShadow: th.shadow }}
      className={`relative overflow-hidden rounded-tile flex items-center ${compact ? 'px-4 py-3 gap-3.5' : 'px-5 py-4 gap-4'}`}
    >
      <div className="shrink-0 relative" style={{ width: SIZE, height: SIZE }}>
        <span aria-hidden="true" className="sankalp-breathe absolute inset-0 rounded-full" style={{ border: `3px solid ${th.ring}` }} />
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={RADIUS} fill="none" stroke={th.track} strokeWidth={compact ? 6 : 7} />
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={th.ring}
            strokeWidth={compact ? 6 : 7}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><p className="m-0 flex items-baseline">
          <span className={`display num text-[1.35rem] font-extrabold leading-none ${th.big}`}>{shown}</span>
          <span className={`text-[11px] font-semibold ${th.soft}`}>{hasGoal ? `/${safeGoal}` : '/—'}</span>
        </p></div>
      </div>
      <div className="min-w-0">
        <p className={`m-0 text-[13px] font-semibold ${th.title} flex items-center gap-1.5 flex-wrap`}>
          {title}
        </p>
        <p className={`display m-0 mt-0.5 text-[1.35rem] font-bold ${th.main}`}>{hasGoal ? `${Math.round(percent * 100)}% complete` : (goal === undefined ? '\u00A0' : 'Sankalp not set yet')}</p>
        <p className={`m-0 mt-0.5 text-[13px] ${th.soft} truncate`}>
          {!hasGoal
            ? (goal === undefined ? '' : 'Set it in Profile & Settings')
            : remaining > 0 ? `${remaining} Vihar${remaining === 1 ? '' : 's'} remaining this Vihar Year` : 'Goal reached — Jai Jinendra!'}
        </p>
      </div>
    </div>
  );
};

export default SankalpRing;
