import React, { useEffect, useState } from 'react';

interface SankalpRingProps {
  count: number;
  /** The target; null = not set for this Vihar Year, undefined = still loading. */
  goal: number | null | undefined;
  /** Card title, e.g. "My Sankalp" or "Group Sankalp". */
  title?: string;
  /** Colour: saffron for a Sevak's own Sankalp, mint green for the Group Sankalp. */
  tone?: 'saffron' | 'mint';
  /** e.g. "VY 2026-27" — the Vihar Year this count is scoped to. */
  periodLabel?: string;
}

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

  return (
    <div
      style={{
        background: tone === 'mint' ? 'linear-gradient(150deg,#52CFA0 0%,#1F9A70 100%)' : 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)',
        boxShadow: tone === 'mint' ? '0 8px 20px -10px rgba(31,154,112,0.55)' : '0 8px 20px -10px rgba(222,107,56,0.55)',
      }}
      className="rounded-[18px] px-5 py-3.5 flex items-center gap-3.5"
    >
      <div className="shrink-0 relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="7" />
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-white leading-none">{count}</span>
          <span className="text-[10px] font-semibold text-white/85">{hasGoal ? `/ ${safeGoal}` : '—'}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-white/85 flex items-center gap-1.5 flex-wrap">
          {title}
          {periodLabel && (
            <span className="text-[9px] font-extrabold normal-case tracking-normal bg-white/25 px-1.5 py-0.5 rounded-full">{periodLabel}</span>
          )}
        </p>
        <p className="m-0 text-[14px] font-bold text-white">{hasGoal ? `${Math.round(percent * 100)}% complete` : (goal === undefined ? '\u00A0' : 'Sankalp not set yet')}</p>
        <p className="m-0 text-[12px] text-white/85 truncate">
          {!hasGoal
            ? (goal === undefined ? '' : 'Set it in Profile & Settings')
            : remaining > 0 ? `${remaining} Vihar${remaining === 1 ? '' : 's'} remaining this Vihar Year` : 'Goal reached — Jai Jinendra!'}
        </p>
      </div>
    </div>
  );
};

export default SankalpRing;
