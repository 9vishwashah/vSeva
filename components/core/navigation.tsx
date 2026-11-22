import React from 'react';
import { cn } from '@/lib/utils';

// vSeva Design Core: header, profile button, bottom navigation, segmented control and tabs.
// Presentational: callers keep their own pages, handlers and order of items.

export const AppHeader: React.FC<{ logo: string; name: string; logoPadded?: boolean; right?: React.ReactNode; className?: string }> = ({
  logo,
  name,
  logoPadded,
  right,
  className,
}) => (
  <header
    className={cn('flex items-center justify-between gap-3 bg-canvas/90 px-4 pb-2 backdrop-blur-md', className)}
    style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
  >
    <div className="flex min-w-0 items-center gap-2">
      <img src={logo} alt="" className={cn('h-10 w-10 shrink-0 object-contain', logoPadded && 'scale-125')} />
      <span className="display truncate text-[1.45rem] font-extrabold">{name}</span>
    </div>
    <div className="flex shrink-0 items-center gap-2">{right}</div>
  </header>
);

// Profile in the top-right corner (approved layout change for Phase 2); same destination as today's avatar
export const ProfileButton: React.FC<{ name: string; photoUrl?: string | null; active?: boolean; onClick?: () => void }> = ({ name, photoUrl, active, onClick }) => {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile & Settings"
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-sm font-semibold text-surface transition-transform active:scale-95',
        active && 'ring-2 ring-brand ring-offset-2 ring-offset-canvas',
      )}
    >
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : initials}
    </button>
  );
};

export interface CoreNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// Floating ink pill. The active tab shows its label (older users rely on it); the action key gets the saffron circle.
export const BottomNav: React.FC<{
  items: CoreNavItem[];
  activeKey: string | null;
  actionKey?: string;
  onSelect: (key: string) => void;
  className?: string;
}> = ({ items, activeKey, actionKey, onSelect, className }) => (
  <nav aria-label="Main" className={cn('flex justify-center px-3', className)} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
    <div className="flex max-w-full items-center gap-1 rounded-full bg-ink p-1.5 shadow-nav">
      {items.map(item => {
        const active = item.key === activeKey;
        if (item.key === actionKey) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className="mx-0.5 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-brand text-ink transition-transform active:scale-95 [&>svg]:h-6 [&>svg]:w-6"
            >
              {item.icon}
            </button>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-current={active ? 'page' : undefined}
            aria-label={active ? undefined : item.label}
            className={cn(
              'flex h-[52px] min-w-[52px] items-center justify-center gap-2 rounded-full transition-colors [&>svg]:h-5 [&>svg]:w-5',
              active ? 'bg-surface px-4 text-ink' : 'text-block-seashell/75 hover:text-block-seashell',
            )}
          >
            {item.icon}
            {active && <span className="max-w-[96px] truncate font-body text-[14px] font-semibold">{item.label}</span>}
          </button>
        );
      })}
    </div>
  </nav>
);

// Pill segmented control (radio semantics)
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-full bg-sunken p-1', className)}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-full px-3 font-body font-medium transition-colors',
              size === 'lg' ? 'h-12 text-[15px]' : 'h-10 text-sm',
              active ? 'bg-brand text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Filter chips row that scrolls sideways on phones instead of wrapping
export function ChipTabs<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 font-body text-sm font-medium transition-colors',
              active ? 'bg-brand text-ink' : 'bg-sunken text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn('num text-xs', active ? 'opacity-70' : 'opacity-80')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
