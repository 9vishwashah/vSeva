import React from 'react';
import { Check } from 'lucide-react';
import { SEVA_PREFERENCES, VIHAR_SCOPES, type SevaPreference } from '../types';

interface Props {
  scope: string;
  preferences: SevaPreference[];
  onChange: (next: { scope: string; preferences: SevaPreference[] }) => void;
  /** class for the <select>, so it matches the surrounding form */
  selectClassName: string;
  labelClassName: string;
}

// "Vihar Type" (one of Internal / External / Both) and "Seva Preference" (any of Walking, Car Seva (Updhi),
// Wheelchair Seva). Shown only for brands with sevakViharPreferences (Shraman Seva Group).
const ViharPreferencesFields: React.FC<Props> = ({ scope, preferences, onChange, selectClassName, labelClassName }) => {
  const toggle = (p: SevaPreference) =>
    onChange({ scope, preferences: preferences.includes(p) ? preferences.filter(x => x !== p) : [...preferences, p] });

  return (
    <>
      <div>
        <label className={labelClassName}>Vihar Type</label>
        <select value={scope} onChange={e => onChange({ scope: e.target.value, preferences })} className={selectClassName}>
          <option value="">Select Vihar type</option>
          {VIHAR_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClassName}>Seva Preference <span className="normal-case font-semibold opacity-70">(choose any)</span></label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Seva preference">
          {SEVA_PREFERENCES.map(p => {
            const on = preferences.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.value)}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold border transition active:scale-95 ${on ? 'bg-saffron-600 border-saffron-600 text-white' : 'bg-white border-gray-200 text-[#241C17]'}`}
              >
                {on && <Check size={13} />}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export const formatSevaPreferences = (prefs?: string[] | null) =>
  (prefs || []).map(p => SEVA_PREFERENCES.find(x => x.value === p)?.label || p).join(', ');

export default ViharPreferencesFields;
