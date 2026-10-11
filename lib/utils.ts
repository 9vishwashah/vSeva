// shadcn-style class helper: joins the truthy class names (`cn('a', cond && 'b')`).
// Kept dependency-free; swap in clsx + tailwind-merge if conflicting Tailwind classes ever need merging.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
