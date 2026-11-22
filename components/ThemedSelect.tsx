import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

// hint: a short extra label shown beside the option and matched by the search (e.g. a place alias "SP")
interface Option { value: string; label: string; hint?: string }

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
  // long lists (areas) get a search box, and so does any list with hints (aliases) to search by
  const searchable = opts.length > 8 || opts.some(o => o.hint);
  const q = query.trim().toLowerCase();
  // an exact hint match (typing an alias) comes first
  const shown = q
    ? opts
        .filter(o => o.label.toLowerCase().includes(q) || (o.hint || '').toLowerCase().includes(q))
        .sort((a, b) => Number((b.hint || '').toLowerCase() === q) - Number((a.hint || '').toLowerCase() === q))
    : opts;

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
        <span className={`flex-1 min-w-0 truncate ${current ? '' : 'text-ink-3/70'}`}>{current ? current.label : placeholder}</span>
        {!hideChevron && <ChevronDown size={16} className="shrink-0 text-ink-3" />}
      </button>
      {open && createPortal(
        // z-[150]: above every modal and sheet (Modal 100, BottomSheet 110, 120) it may be opened from; below toasts (200)
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/45 app-modal-backdrop" />
          <div
            role="listbox"
            aria-label={title || placeholder}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[75vh] overflow-y-auto bg-surface rounded-t-sheet sm:rounded-[28px] p-4 shadow-sheet app-sheet-up"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', overscrollBehavior: 'contain' }}
          >
            <div className="w-10 h-1.5 rounded-full bg-line mx-auto mb-3 sm:hidden" />
            <p className="display m-0 px-1 pb-3 text-[1.6rem] font-bold text-ink">{title || placeholder}</p>
            {searchable && (
              <div className="relative mb-2">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder={opts.some(o => o.hint) ? "Search by name or short form…" : "Search…"} className="w-full h-12 pl-11 pr-4 rounded-full bg-white ring-1 ring-inset ring-line text-[16px] text-ink outline-none focus:ring-2 focus:ring-ink" />
              </div>
            )}
            <div className="space-y-2">
              {shown.length === 0 && <p className="m-0 p-3.5 text-[15px] text-ink-2">No match</p>}
              {shown.map(o => {
                const on = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => pick(o.value)}
                    className={`w-full flex items-center justify-between gap-3 min-h-[52px] px-4 py-3 rounded-[20px] text-[15px] font-semibold transition-colors active:scale-[0.98] ${on ? 'bg-brand text-ink' : 'bg-white text-ink ring-1 ring-inset ring-line hover:bg-canvas'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-left">
                      <span className="min-w-0">{o.label}</span>
                      {o.hint && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${on ? 'bg-white/15 text-surface' : 'bg-sunken text-ink-2'}`}>{o.hint}</span>
                      )}
                    </span>
                    {on && <Check size={18} className="shrink-0" />}
                  </button>
                );
              })}
              {clearable && value && (
                <button type="button" onClick={() => pick('')} className="w-full p-3 rounded-full text-sm font-semibold text-ink-2 hover:bg-sunken">
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
