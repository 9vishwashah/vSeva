import React from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

interface LanguageDropdownProps {
  className?: string;
}

// Space-saving language picker for tight headers: a single button showing the current
// language, opening a small menu of the others. Same state as LanguageSwitcher
// (LanguageContext), so the choice persists and applies app-wide.
const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ className = '' }) => {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.language')}
        className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-full bg-[#F7F4F0] text-[#241C17] text-xs font-bold hover:bg-[#EFE9E2] transition-colors"
      >
        <Languages size={15} className="text-[#8A6A57] shrink-0" />
        <span className="whitespace-nowrap">{current.nativeLabel}</span>
        <ChevronDown size={14} className={`text-[#8A6A57] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-2 min-w-[9.5rem] rounded-2xl bg-white border border-orange-100 shadow-xl py-1.5 z-50 overflow-hidden"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left hover:bg-orange-50 ${l.code === lang ? 'font-extrabold text-saffron-700' : 'font-semibold text-[#241C17]'}`}
              >
                <span>{l.nativeLabel}</span>
                {l.code === lang && <Check size={15} className="text-saffron-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageDropdown;
