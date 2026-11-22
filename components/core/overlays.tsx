import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// vSeva Design Core: sheet (bottom on phones, centred on desktop), toast look, and the sticky form footer.

export const CoreSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, description, footer, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="vs-core fixed inset-0 z-[80] flex items-end justify-center bg-[rgb(29_29_27/0.42)] sm:items-center" onClick={onClose} style={{ background: 'rgb(29 29 27 / 0.42)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-surface shadow-sheet animate-core-sheet sm:max-w-lg sm:rounded-sheet"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="display text-[1.75rem] font-bold">{title}</h2>
            {description && <div className="mt-1 text-sm text-ink-2">{description}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunken">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="border-t border-line bg-surface px-5 pt-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export type ToastKind = 'success' | 'error' | 'info';

// The toast's look only; the app keeps its own ToastContext for when and how toasts show
export const ToastView: React.FC<{ kind: ToastKind; message: string }> = ({ kind, message }) => (
  <div role="status" className="inline-flex max-w-[92vw] items-center gap-2.5 rounded-[18px] bg-ink px-4 py-3 font-body text-[15px] text-surface shadow-nav">
    {kind === 'success' && <CheckCircle2 size={18} className="shrink-0 text-[#8fd3c4]" aria-hidden="true" />}
    {kind === 'error' && <AlertCircle size={18} className="shrink-0 text-[#f2a3a2]" aria-hidden="true" />}
    {kind === 'info' && <Info size={18} className="shrink-0 text-block-sky" aria-hidden="true" />}
    <span>{message}</span>
  </div>
);

// Sticky footer for multi-step forms: keeps the existing Back / Next / Submit buttons, only restyled
export const FormFooter: React.FC<{ children: React.ReactNode; progress?: { step: number; total: number }; className?: string }> = ({ children, progress, className }) => (
  <div className={cn('border-t border-line bg-canvas/95 px-4 pt-3 backdrop-blur-md', className)} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
    {progress && (
      <div className="mb-3 flex gap-1.5" aria-label={`Step ${progress.step} of ${progress.total}`}>
        {Array.from({ length: progress.total }, (_, i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < progress.step ? 'bg-ink' : 'bg-line')} />
        ))}
      </div>
    )}
    <div className="flex gap-2">{children}</div>
  </div>
);
