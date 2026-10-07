import React, { useEffect, useState } from 'react';

interface SankalpRingProps {
  count: number;
  /** The target; null = not set for this Vihar Year, undefined = still loading. */
  goal: number | null | undefined;
  /** Card title, e.g. "My Sankalp" or "Group Sankalp". */
  title?: string;
  /** Colour: saffron for a Sevak's own Sankalp, a flat light purple (same shade as the dashboard KPI tiles) for the Group Sankalp. */
  tone?: 'saffron' | 'purple';
  /** e.g. "VY 2026-27" — the Vihar Year this count is scoped to. */
  periodLabel?: string;
}

// saffron: the bold gradient hero. purple: flat light tile, no shadow, matching the KPI cards.
const THEMES = {
  saffron: { bg: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)', shadow: '0 8px 20px -10px rgba(222,107,56,0.55)', track: 'rgba(255,255,255,0.3)', ring: '#fff', big: 'text-white', soft: 'text-white/85', title: 'text-white/85', main: 'text-white', pill: 'bg-white/25' },
  purple: { bg: '#F1EAFB', shadow: 'none', track: 'rgba(107,79,174,0.16)', ring: '#6B4FAE', big: 'text-[#241C17]', soft: 'text-[#6B4FAE]/80', title: 'text-[#6B4FAE]', main: 'text-[#241C17]', pill: 'bg-[#6B4FAE]/[0.12]' },
} as const;

const SIZE = 76;
const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Dashboard hero card: gradient "Yearly Sankalp" progress ring.
// Ring fills from empty to the real count/goal ratio once on mount.
const SankalpRing: React.FC<SankalpRingProps> = ({ count, goal, title = 'Yearly Sankalp', tone = 'saffron', periodLabel }) => {
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
  }, [percent]);

  const center = SIZE / 2;
  const th = THEMES[tone];

  return (
    <div
      style={{ background: th.bg, boxShadow: th.shadow }}
      className="rounded-[18px] px-5 py-3.5 flex items-center gap-3.5"
    >
      <div className="shrink-0 relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={RADIUS} fill="none" stroke={th.track} strokeWidth="7" />
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={th.ring}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-extrabold leading-none ${th.big}`}>{count}</span>
          <span className={`text-[10px] font-semibold ${th.soft}`}>{hasGoal ? `/ ${safeGoal}` : '—'}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className={`m-0 text-[11px] font-bold uppercase tracking-wider ${th.title} flex items-center gap-1.5 flex-wrap`}>
          {title}
          {periodLabel && (
            <span className={`text-[9px] font-extrabold normal-case tracking-normal ${th.pill} px-1.5 py-0.5 rounded-full`}>{periodLabel}</span>
          )}
        </p>
        <p className={`m-0 text-[14px] font-bold ${th.main}`}>{hasGoal ? `${Math.round(percent * 100)}% complete` : (goal === undefined ? '\u00A0' : 'Sankalp not set yet')}</p>
        <p className={`m-0 text-[12px] ${th.soft} truncate`}>
          {!hasGoal
            ? (goal === undefined ? '' : 'Set it in Profile & Settings')
            : remaining > 0 ? `${remaining} Vihar${remaining === 1 ? '' : 's'} remaining this Vihar Year` : 'Goal reached — Jai Jinendra!'}
        </p>
      </div>
    </div>
  );
};

export default SankalpRing;
