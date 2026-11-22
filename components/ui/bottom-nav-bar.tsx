import React from 'react';
import { motion, MotionConfig, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavBarProps {
  items: BottomNavItem[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  /** Rendered at the end of the bar (e.g. the profile avatar). */
  trailing?: React.ReactNode;
  /** This item is drawn as the saffron action circle (e.g. New Entry); it still selects like any other tab. */
  actionKey?: string;
  className?: string;
}

// Floating ink pill (vSeva Design Core, docs/design-core.md): a light pill glides between tabs on a spring
// (shared layout animation) and the active label unfolds beside its icon, so older users always see where they
// are. The action item is a saffron circle. Honours "reduce motion".
const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const;

export function BottomNavBar({ items, activeKey, onSelect, trailing, actionKey, className }: BottomNavBarProps) {
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <LayoutGroup>
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          role="tablist"
          aria-label="Main navigation"
          className={cn(
            'relative flex items-center gap-1 p-1.5 rounded-full bg-ink shadow-nav',
            className,
          )}
        >
          {items.map(item => {
            const active = item.key === activeKey;
            if (item.key === actionKey) {
              return (
                <motion.button
                  key={item.key}
                  layout
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={item.label}
                  onClick={() => onSelect(item.key)}
                  whileTap={{ scale: 0.92 }}
                  className={cn(
                    'relative mx-0.5 h-[52px] w-[52px] flex-none rounded-full bg-brand text-ink flex items-center justify-center outline-none',
                    'focus-visible:ring-2 focus-visible:ring-white [&_svg]:w-6 [&_svg]:h-6',
                    active && 'ring-2 ring-white/80',
                  )}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {item.icon}
                </motion.button>
              );
            }
            return (
              <motion.button
                key={item.key}
                layout
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={item.label}
                onClick={() => onSelect(item.key)}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  'relative h-[52px] min-w-[52px] px-3.5 rounded-full flex items-center justify-center outline-none',
                  'focus-visible:ring-2 focus-visible:ring-white/80',
                  // the selected tab sizes to its label; the others share what is left
                  active ? 'flex-none' : 'flex-1',
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: '#FBFAF7' }}
                  />
                )}
                <motion.span layout="position" className="relative z-10 flex items-center">
                  <span className={cn('flex transition-colors duration-200 [&>svg]:w-[22px] [&>svg]:h-[22px]', active ? 'text-ink' : 'text-block-seashell/75')}>
                    {item.icon}
                  </span>
                  {/* Opened / closed with a CSS grid-track transition (0fr <-> 1fr) instead of an animated
                      width: it always lands on its end state, so a deselected label can never stay half-open
                      next to its icon. Long labels end in an ellipsis. */}
                  <span
                    aria-hidden={!active}
                    className={cn(
                      'grid transition-[grid-template-columns,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
                      active ? 'grid-cols-[1fr] opacity-100 ml-1.5' : 'grid-cols-[0fr] opacity-0 ml-0',
                    )}
                  >
                    <span className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis max-w-[104px] text-[14px] font-semibold text-ink">
                      {item.label}
                    </span>
                  </span>
                </motion.span>
              </motion.button>
            );
          })}
          {trailing && <motion.div layout className="shrink-0 pl-0.5 pr-0.5 flex items-center">{trailing}</motion.div>}
        </motion.div>
      </LayoutGroup>
    </MotionConfig>
  );
}

export default BottomNavBar;
