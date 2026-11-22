import React from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

interface LanguageDropdownProps {
  className?: string;
  // Open the menu above the button (for controls at the bottom of a screen/sidebar).
  placement?: 'bottom' | 'top';
  // Stretch the button to the width of its container.
  block?: boolean;
}

// Space-saving language picker for tight headers: a single button showing the current
// language, opening a small menu of the others. Same state as LanguageSwitcher
// (LanguageContext), so the choice persists and applies app-wide.
const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ className = '', placement = 'bottom', block = false }) => {
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
        className={`flex items-center justify-center gap-1.5 h-11 min-w-[44px] pl-3 pr-2.5 max-[359px]:px-0 rounded-full bg-surface text-ink text-[13px] font-semibold ring-1 ring-inset ring-line hover:bg-white transition-colors ${block ? 'w-full' : 'inline-flex'}`}
      >
        <Languages size={16} className="text-ink-2 shrink-0" />
        <span className={`whitespace-nowrap ${block ? 'flex-1 text-left' : 'max-[359px]:hidden'}`}>{current.nativeLabel}</span>
        <ChevronDown size={14} className={`text-ink-3 transition-transform ${block ? '' : 'max-[359px]:hidden'} ${open !== (placement === 'top') ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className={`absolute ${block ? 'left-0 right-0' : 'right-0 min-w-[9.5rem]'} ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} rounded-2xl bg-surface ring-1 ring-line shadow-xl py-1.5 z-50 overflow-hidden`}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-[15px] text-left hover:bg-sunken ${l.code === lang ? 'font-bold text-ink' : 'font-medium text-ink-2'}`}
              >
                <span>{l.nativeLabel}</span>
                {l.code === lang && <Check size={16} className="text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageDropdown;
