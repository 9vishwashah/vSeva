import React from 'react';
import { cn } from '@/lib/utils';

// vSeva Design Core: buttons. Presentation only: every handler and prop passes straight through.

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-full font-body font-medium whitespace-nowrap ' +
  'transition-[transform,background-color,opacity] duration-150 active:translate-y-px ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  // Saffron is the main action; ink text keeps it readable (white on this orange fails contrast for body text)
  primary: 'bg-brand text-ink hover:bg-brand-600',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-white',
  dark: 'bg-ink text-surface hover:bg-[#33322f]',
  ghost: 'text-ink hover:bg-sunken',
  danger: 'bg-err-solid text-white hover:bg-[#b23736]',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-14 px-7 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className, type = 'button', ...props }) => (
  <button type={type} className={buttonClass(variant as ButtonVariant, size as ButtonSize, className)} {...props} />
);

// Round icon-only button, 44px touch target, always labelled
export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'surface' | 'ink' | 'clear' | 'brand' }
> = ({ label, tone = 'surface', className, children, type = 'button', ...props }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
      tone === 'surface' && 'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-white',
      tone === 'ink' && 'bg-ink text-surface',
      tone === 'brand' && 'bg-brand text-ink',
      tone === 'clear' && 'text-ink hover:bg-black/5',
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
