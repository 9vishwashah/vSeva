import React from 'react';
import { CalendarDays } from 'lucide-react';

// A date field that always reads DD/MM/YYYY (a plain <input type="date"> shows whatever format the phone or
// browser uses). The real date input sits invisibly on top, so tapping still opens the phone's own calendar and
// the value stays the usual YYYY-MM-DD.
const toDMY = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

interface Props {
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  id?: string;
  min?: string;
  max?: string;
  className?: string; // the field's look (height, ring, radius...), same classes the old input used
  'aria-label'?: string;
}

const DateInputDMY: React.FC<Props> = ({ value, onChange, required, id, min, max, className = '', ...rest }) => (
  <div className={`relative flex items-center justify-between gap-2 focus-within:ring-2 focus-within:ring-ink ${className}`}>
    <span className={`num truncate ${value ? 'text-ink' : 'text-ink-3/70'}`}>{toDMY(value) || 'DD/MM/YYYY'}</span>
    <CalendarDays size={18} className="shrink-0 text-ink-3" aria-hidden />
    <input
      id={id}
      type="date"
      required={required}
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(e.target.value)}
      onClick={e => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* not supported */ } }}
      aria-label={rest['aria-label']}
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
    />
  </div>
);

export default DateInputDMY;
