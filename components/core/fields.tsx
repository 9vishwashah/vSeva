import React, { useId } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// vSeva Design Core: form fields. Label above, hint or error below, 16px text (no iOS zoom).

export const controlClass =
  'w-full rounded-field bg-white px-4 font-body text-[16px] text-ink ring-1 ring-inset ring-line ' +
  'placeholder:text-ink-3/70 focus:outline-none focus:ring-2 focus:ring-ink disabled:bg-sunken ' +
  'aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-err-solid';

interface FieldProps {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: (a11y: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, hint, error, optional, className, children }) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-body text-sm font-medium text-ink-2">
        {label}
        {optional && <span className="font-normal text-ink-3"> · optional</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p id={hintId} className="text-[13px] text-ink-3">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-[13px] font-medium text-err">{error}</p>}
    </div>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input className={cn(controlClass, 'h-12', className)} {...props} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => (
  <textarea className={cn(controlClass, 'min-h-24 py-3', className)} {...props} />
);

const chevron =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath stroke='%231d1d1b' stroke-width='1.6' d='m1 1.5 5 5 5-5'/%3E%3C/svg%3E\")]";

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...props }) => (
  <select className={cn(controlClass, chevron, 'h-12 appearance-none bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat pr-10', className)} {...props}>
    {children}
  </select>
);

export const SearchField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <div className={cn('relative', className)}>
    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
    <input type="search" className={cn(controlClass, 'h-12 rounded-full pl-11')} {...props} />
  </div>
);
