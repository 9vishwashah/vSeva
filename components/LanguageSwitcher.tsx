import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

interface LanguageSwitcherProps {
  className?: string;
  // Tighter sizing for cramped header space (e.g. next to the notification
  // bell) — smaller padding/text, no leading icon.
  compact?: boolean;
}

// A compact EN / ગુજરાતી / हिंदी pill switcher. Selection persists to
// localStorage via LanguageContext and applies app-wide immediately.
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', compact = false }) => {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-0.5 bg-[#F7F4F0] rounded-full ${compact ? 'p-0.5' : 'p-1'} ${className}`}
      role="group"
      aria-label={t('nav.language')}
    >
      {!compact && <Languages size={14} className="text-[#8A6A57] ml-1.5 shrink-0" />}
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`rounded-full font-bold transition-all whitespace-nowrap ${compact ? 'px-1.5 py-1 text-[10px]' : 'px-2.5 py-1.5 text-xs'} ${lang === l.code
            ? 'bg-white text-saffron-700 shadow-sm'
            : 'text-[#8A6A57] hover:text-[#241C17]'
            }`}
        >
          {l.nativeLabel}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
