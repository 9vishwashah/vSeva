import React, { useEffect, useState } from 'react';
import ThemedSelect from './ThemedSelect';
import { MONTHS, ageFromDob, currentYearIST, daysInMonth } from '../services/dateOfBirth';

interface Props {
  /** 'YYYY-MM-DD', or '' when not set */
  value: string;
  /** called with a complete date, or '' while any of day / month / year is still empty */
  onChange: (value: string) => void;
  /** class for each of the three pickers (matches the other inputs of the form) */
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const split = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? { d: String(+m[3]), m: String(+m[2]), y: m[1] } : { d: '', m: '', y: '' };
};

// Day / Month / Year, picked separately, with the age worked out underneath.
const DateOfBirthField: React.FC<Props> = ({ value, onChange, className }) => {
  const [parts, setParts] = useState(() => split(value));

  // A new value from outside (the stored profile loads, or the form resets) replaces what is picked
  useEffect(() => {
    const next = split(value);
    const current = parts.d && parts.m && parts.y ? `${parts.y}-${pad(+parts.m)}-${pad(+parts.d)}` : '';
    if (value !== current) setParts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const thisYear = currentYearIST();
  const years = Array.from({ length: 101 }, (_, i) => String(thisYear - i));
  const maxDay = parts.m ? daysInMonth(parts.y ? +parts.y : 2000, +parts.m) : 31; // 2000: a leap year, so 29 Feb stays pickable
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1));

  const update = (p: { d: string; m: string; y: string }) => {
    // 31 → 30 / 29 / 28 when the month or year has fewer days
    if (p.d && p.m) {
      const max = daysInMonth(p.y ? +p.y : 2000, +p.m);
      if (+p.d > max) p = { ...p, d: String(max) };
    }
    setParts(p);
    onChange(p.d && p.m && p.y ? `${p.y}-${pad(+p.m)}-${pad(+p.d)}` : '');
  };

  const complete = parts.d && parts.m && parts.y ? `${parts.y}-${pad(+parts.m)}-${pad(+parts.d)}` : '';
  const age = complete ? ageFromDob(complete) : null;

  return (
    <div>
      <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
        <ThemedSelect value={parts.d} onChange={d => update({ ...parts, d })} options={days} placeholder="Day" title="Day" className={className} />
        <ThemedSelect value={parts.m} onChange={m => update({ ...parts, m })} options={MONTHS.map((label, i) => ({ value: String(i + 1), label }))} placeholder="Month" title="Month" className={className} />
        <ThemedSelect value={parts.y} onChange={y => update({ ...parts, y })} options={years} placeholder="Year" title="Year" className={className} />
      </div>
      <p className="text-xs text-[#8A6A57] mt-1.5 min-h-[1rem]">
        {complete
          ? (age !== null ? <>Age: <span className="font-bold text-[#241C17]">{age} years</span> (worked out from the date)</> : 'This date is in the future.')
          : (parts.d || parts.m || parts.y ? 'Pick day, month and year.' : 'Your age is worked out from this.')}
      </p>
    </div>
  );
};

export default DateOfBirthField;
