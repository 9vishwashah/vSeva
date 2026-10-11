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
  className?: string;
}

// iOS-style floating tab bar: frosted dark glass, a saffron pill that glides between tabs on a spring
// (shared layout animation) and the active label unfolding beside its icon. Built on the 21st.dev
// "bottom-nav-bar" pattern, adapted to the app's palette and data. Honours "reduce motion".
const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const;

export function BottomNavBar({ items, activeKey, onSelect, trailing, className }: BottomNavBarProps) {
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <LayoutGroup>
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          role="tablist"
          aria-label="Main navigation"
          className={cn(
            'relative flex items-center gap-1 p-1.5 rounded-full',
            'bg-[#241C17]/[0.93] backdrop-blur-xl backdrop-saturate-150',
            'border border-white/[0.08] shadow-[0_18px_40px_-14px_rgba(36,28,23,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]',
            className,
          )}
        >
          {items.map(item => {
            const active = item.key === activeKey;
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
                  'relative h-11 min-w-[44px] px-3 rounded-full flex items-center justify-center outline-none',
                  'focus-visible:ring-2 focus-visible:ring-saffron-300/70',
                  // the selected tab sizes to its label; the others share what is left
                  active ? 'flex-none' : 'flex-1',
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)',
                      boxShadow: '0 6px 16px -6px rgba(222,107,56,0.75), inset 0 1px 0 rgba(255,255,255,0.28)',
                    }}
                  />
                )}
                <motion.span layout="position" className="relative z-10 flex items-center">
                  <span className={cn('flex transition-colors duration-200', active ? 'text-[#241C17]' : 'text-white/85')}>
                    {item.icon}
                  </span>
                  {/* Always rendered and simply opened / closed, so a label can never be left floating over
                      another tab (an exit animation used to leave it behind). Long labels end in an ellipsis. */}
                  <motion.span
                    initial={false}
                    animate={active ? { opacity: 1, width: 'auto', marginLeft: 6 } : { opacity: 0, width: 0, marginLeft: 0 }}
                    aria-hidden={!active}
                    className="block overflow-hidden whitespace-nowrap text-ellipsis max-w-[112px] text-[13px] font-bold text-[#241C17]"
                  >
                    {item.label}
                  </motion.span>
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
