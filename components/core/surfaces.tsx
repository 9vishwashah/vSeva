import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// vSeva Design Core: cards, KPI blocks, badges, empty states and loading placeholders.

// One meaning per colour, everywhere (docs/design-core.md → "Colour meaning")
export type StatTone = 'saffron' | 'sky' | 'mustard' | 'pink' | 'tea' | 'lavender' | 'ink' | 'plain';

// Solid fill + text that passes WCAG AA on it
export const TONE: Record<StatTone, { bg: string; fg: string; sub: string; chip: string }> = {
  saffron: { bg: 'bg-brand', fg: 'text-ink', sub: 'text-ink/70', chip: 'bg-ink/10' },
  sky: { bg: 'bg-block-sky', fg: 'text-ink', sub: 'text-ink/65', chip: 'bg-ink/10' },
  mustard: { bg: 'bg-block-mustard', fg: 'text-ink', sub: 'text-ink/65', chip: 'bg-ink/10' },
  pink: { bg: 'bg-block-pink', fg: 'text-ink', sub: 'text-ink/65', chip: 'bg-ink/10' },
  tea: { bg: 'bg-block-tea', fg: 'text-block-seashell', sub: 'text-block-seashell/75', chip: 'bg-white/[0.12]' },
  lavender: { bg: 'bg-block-lavender', fg: 'text-ink', sub: 'text-ink/70', chip: 'bg-ink/10' },
  ink: { bg: 'bg-ink', fg: 'text-block-seashell', sub: 'text-block-seashell/65', chip: 'bg-white/10' },
  plain: { bg: 'bg-surface ring-1 ring-inset ring-line', fg: 'text-ink', sub: 'text-ink-2', chip: 'bg-sunken' },
};

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('rounded-card bg-surface p-4 ring-1 ring-inset ring-line/80 sm:p-5', className)}>{children}</div>
);

export const PageHeader: React.FC<{ kicker?: React.ReactNode; title: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }> = ({
  kicker,
  title,
  actions,
  children,
}) => (
  <header className="flex flex-col gap-3 pb-4 pt-1 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {kicker && <div className="mb-1.5 text-sm font-medium text-ink-2">{kicker}</div>}
      <h1 className="display text-[2.1rem] font-extrabold sm:text-5xl">{title}</h1>
      {children}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; action?: React.ReactNode; className?: string }> = ({ children, action, className }) => (
  <div className={cn('flex items-center justify-between gap-3', className)}>
    <h2 className="display text-2xl font-bold sm:text-[1.75rem]">{children}</h2>
    {action}
  </div>
);

interface StatBlockProps {
  tone?: StatTone;
  label: string;
  value: React.ReactNode;
  unit?: string;
  of?: React.ReactNode; // "12 / 3" style second number, shown lighter
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  size?: 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

// KPI tile: label, then the number right under it, then its meaning. Height comes from the content (no fixed
// min-height), so there is no empty band between the label and the value; tiles in one row still match because
// grid rows stretch them to the tallest one.
export const StatBlock: React.FC<StatBlockProps> = ({ tone = 'plain', label, value, unit, of, sub, icon, onClick, disabled, title, size = 'md', className, style }) => {
  const t = TONE[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, disabled } : {})}
      title={title}
      style={style}
      className={cn(
        'group flex min-w-0 flex-col rounded-tile px-4 py-3.5 text-left',
        onClick && 'transition-transform active:scale-[0.99] disabled:opacity-60',
        t.bg,
        t.fg,
        className,
      )}
    >
      <div className="flex min-h-[20px] items-start justify-between gap-2">
        {/* wraps to a second line on narrow tiles instead of being cut off */}
        <span className={cn('min-w-0 text-[13px] font-semibold leading-[18px] [overflow-wrap:anywhere]', t.sub)}>{label}</span>
        {onClick ? (
          <span className="-my-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/75 text-ink transition-transform group-hover:rotate-45">
            <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        ) : (
          icon && <span className={cn('shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]', t.sub)}>{icon}</span>
        )}
      </div>
      <div className="mt-1.5 flex min-w-0 items-baseline gap-1">
        <span className={cn('display num truncate font-extrabold leading-none', size === 'lg' ? 'text-[2.5rem]' : 'text-[2.1rem]')}>{value}</span>
        {of !== undefined && <span className={cn('display num font-bold leading-none opacity-55', size === 'lg' ? 'text-2xl' : 'text-xl')}>/ {of}</span>}
        {unit && <span className="text-[13px] font-semibold">{unit}</span>}
      </div>
      {sub && <div className={cn('mt-1.5 text-xs font-medium leading-4', t.sub)}>{sub}</div>}
    </Tag>
  );
};

export type StatusKind = 'approved' | 'pending' | 'rejected' | 'info' | 'neutral' | 'active';

const STATUS: Record<StatusKind, string> = {
  approved: 'bg-ok-soft text-ok',
  pending: 'bg-warn-soft text-warn',
  rejected: 'bg-err-soft text-err',
  info: 'bg-info-soft text-info',
  neutral: 'bg-sunken text-ink-2',
  active: 'bg-ink text-surface',
};

// Colour is never the only signal: the badge always carries its word
export const StatusBadge: React.FC<{ kind: StatusKind; children: React.ReactNode; icon?: React.ReactNode; className?: string }> = ({ kind, children, icon, className }) => (
  <span className={cn('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold', STATUS[kind], className)}>
    {icon}
    {children}
  </span>
);

export const Chip: React.FC<{ tone?: StatTone; children: React.ReactNode; className?: string }> = ({ tone = 'plain', children, className }) => (
  <span className={cn('inline-flex h-7 items-center gap-1 rounded-full px-3 text-[13px] font-medium', tone === 'plain' ? 'bg-sunken text-ink-2' : cn(TONE[tone].bg, TONE[tone].fg), className)}>
    {children}
  </span>
);

export const ProgressBar: React.FC<{ value: number; max: number; className?: string; tone?: 'ink' | 'brand' }> = ({ value, max, className, tone = 'ink' }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('h-2 rounded-full bg-ink/15', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn('h-2 rounded-full', tone === 'ink' ? 'bg-ink' : 'bg-brand')} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const EmptyState: React.FC<{ title: string; body: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, body, action, icon }) => (
  <div className="flex flex-col items-start gap-3 rounded-card border-2 border-dashed border-line p-6">
    {icon && <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sunken text-ink-2">{icon}</span>}
    <div>
      <h3 className="display text-2xl font-bold">{title}</h3>
      <p className="mt-1 max-w-prose text-[15px] text-ink-2">{body}</p>
    </div>
    {action}
  </div>
);

// Loading placeholder: warm, soft pulse, shaped like the content it stands in for
export const CoreSkeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <div aria-hidden="true" className={cn('animate-core-pulse rounded-xl bg-sunken', className)} style={style} />
);

// Same box as StatBlock: label line, number line
export const StatBlockSkeleton: React.FC<{ size?: 'md' | 'lg' }> = ({ size = 'md' }) => (
  <div className="flex flex-col rounded-tile bg-sunken px-4 py-3.5 animate-core-pulse" aria-hidden="true">
    <div className="flex h-5 items-center"><div className="h-3 w-20 rounded-full bg-line" /></div>
    <div className={cn('mt-1.5 w-16 rounded-lg bg-line', size === 'lg' ? 'h-10' : 'h-[34px]')} />
  </div>
);
