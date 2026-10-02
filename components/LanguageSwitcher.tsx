import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

interface LanguageSwitcherProps {
  className?: string;
}

// A compact EN / ગુજરાતી / हिंदी pill switcher. Selection persists to
// localStorage via LanguageContext and applies app-wide immediately.
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 bg-[#F7F4F0] p-1 rounded-xl ${className}`}
      role="group"
      aria-label={t('nav.language')}
    >
      <Languages size={14} className="text-[#8A6A57] ml-1.5 shrink-0" />
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l.code
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
