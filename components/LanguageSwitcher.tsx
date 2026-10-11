import React from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

interface LanguageSwitcherProps {
  className?: string;
  // Tighter sizing for cramped header space (e.g. next to the notification
  // bell) — smaller padding/text, no leading icon.
  compact?: boolean;
}

// EN / ગુજરાતી / हिंदी as an iOS-style segmented switch: one white thumb glides to the chosen language
// (spring, shared layout like the bottom bar). Selection persists to localStorage via LanguageContext
// and applies app-wide immediately.
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', compact = false }) => {
  const { lang, setLang, t } = useLanguage();

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}>
      <div
        className={`inline-flex items-center bg-[#EFE8E0] rounded-full shadow-[inset_0_1px_2px_rgba(36,28,23,0.08)] ${compact ? 'p-[3px]' : 'p-1'} ${className}`}
        role="radiogroup"
        aria-label={t('nav.language')}
      >
        {!compact && <Languages size={14} className="text-[#8A6A57] mx-1.5 shrink-0" />}
        {LANGUAGES.map(l => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={l.label}
              onClick={() => { if (!active) { try { (navigator as any).vibrate?.(6); } catch { /* ignore */ } setLang(l.code); } }}
              className={`relative rounded-full font-bold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-saffron-300 ${compact ? 'px-2 py-[5px] text-[10.5px]' : 'px-3 py-1.5 text-xs'}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {active && (
                <motion.span
                  layoutId={compact ? 'lang-thumb-compact' : 'lang-thumb'}
                  className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(36,28,23,0.18),0_1px_1px_rgba(36,28,23,0.06)]"
                />
              )}
              <span className={`relative z-10 transition-colors duration-200 ${active ? 'text-saffron-700' : 'text-[#8A6A57]'}`}>
                {l.nativeLabel}
              </span>
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
};

export default LanguageSwitcher;
