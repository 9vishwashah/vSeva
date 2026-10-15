import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

interface Option { value: string; label: string }

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: (string | Option)[];
  placeholder: string;
  /** title shown at the top of the sheet; defaults to the placeholder */
  title?: string;
  /** class for the closed field, so it matches the surrounding inputs */
  className: string;
  disabled?: boolean;
  /** show "Clear selection" (default true) */
  clearable?: boolean;
  /** extra content before the value, e.g. an icon */
  leading?: React.ReactNode;
  /** hide the chevron when the surrounding layout draws its own */
  hideChevron?: boolean;
}

// A drop-in for a plain <select>: the closed field looks the same as the form's inputs, and tapping it opens a
// bottom sheet in the app's theme (frosted peach, saffron selection) instead of the phone's default picker.
const ThemedSelect: React.FC<Props> = ({ value, onChange, options, placeholder, title, className, disabled, clearable = true, leading, hideChevron }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) setQuery(''); }, [open]);
  const opts: Option[] = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
  const current = opts.find(o => o.value === value);
  // long lists (areas) get a search box
  const searchable = opts.length > 8;
  const q = query.trim().toLowerCase();
  const shown = q ? opts.filter(o => o.label.toLowerCase().includes(q)) : opts;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} aria-haspopup="listbox" className={`${className} flex items-center justify-between gap-2 text-left disabled:opacity-60`}>
        {leading}
        <span className={`flex-1 min-w-0 truncate ${current ? '' : 'text-gray-400'}`}>{current ? current.label : placeholder}</span>
        {!hideChevron && <ChevronDown size={16} className="shrink-0 text-[#8A6A57]" />}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 app-modal-backdrop" />
          <div
            role="listbox"
            aria-label={title || placeholder}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[75vh] overflow-y-auto bg-[#FBE8D9] rounded-t-[28px] sm:rounded-[28px] p-4 shadow-xl app-sheet-up"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', overscrollBehavior: 'contain' }}
          >
            <div className="w-9 h-1 rounded-full bg-[#7A4A2E]/25 mx-auto mb-3 sm:hidden" />
            <p className="m-0 px-2 pb-2 text-xs font-extrabold uppercase tracking-wider text-[#B5602C]">{title || placeholder}</p>
            {searchable && (
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A6A57] pointer-events-none" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" className="w-full h-11 pl-10 pr-3 rounded-2xl bg-white/70 border border-white text-sm font-semibold text-[#241C17] outline-none focus:ring-2 focus:ring-saffron-300" />
              </div>
            )}
            <div className="space-y-2">
              {shown.length === 0 && <p className="m-0 p-3.5 text-sm font-semibold text-[#8A6A57]">No match</p>}
              {shown.map(o => {
                const on = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => pick(o.value)}
                    className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl text-sm font-bold transition-colors active:scale-[0.98] ${on ? 'bg-[#DE6B38] text-white' : 'bg-white/75 text-[#5C3A24] hover:bg-white'}`}
                  >
                    {o.label}
                    {on && <Check size={18} />}
                  </button>
                );
              })}
              {clearable && value && (
                <button type="button" onClick={() => pick('')} className="w-full p-3 rounded-2xl text-xs font-bold text-[#8A6A57] hover:bg-white/50">
                  Clear selection
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default ThemedSelect;
