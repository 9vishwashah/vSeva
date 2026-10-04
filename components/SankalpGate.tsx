import React, { useState } from 'react';
import { Target, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { UserProfile, UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getViharYearStartYear, getViharYearBoundsForStartYear } from '../services/viharYear';
import { sankalpService, useMySankalp, useOrgSankalp } from '../services/sankalpService';

interface SankalpGateProps {
  user: UserProfile;
}

// A Sevak must set their own Sankalp (target number of Vihars) for the current Vihar Year, and a Captain
// the Group Sankalp, before carrying on. The prompt cannot be dismissed: it stays until a value is saved
// (a Sevak whose Captain has locked edits can still set it the first time).
const SankalpGate: React.FC<SankalpGateProps> = ({ user }) => {
  const { t } = useLanguage();
  const isCaptain = user.role === UserRole.ORG_ADMIN;
  const year = getViharYearStartYear();
  const vy = getViharYearBoundsForStartYear(year).label;

  const mine = useMySankalp(isCaptain ? undefined : user.id, year);
  const org = useOrgSankalp(isCaptain ? user.organization_id : undefined, year);
  const missing = isCaptain ? (org !== undefined && org.target === null) : mine === null;

  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quick = isCaptain ? [25, 50, 100, 200] : [12, 25, 50, 100];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1 || n > (isCaptain ? 100000 : 365)) { setError(t('sankalp.invalid')); return; }
    setBusy(true);
    setError(null);
    try {
      if (isCaptain) await sankalpService.setOrg(year, n);
      else await sankalpService.setMine(year, n);
    } catch (err: any) {
      setError(err?.message || 'Could not save your Sankalp.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={missing} onClose={() => { /* not dismissible until a Sankalp is saved */ }} closeOnBackdrop={false} maxWidth="max-w-sm">
      <form onSubmit={submit} className="p-6">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-saffron-100 text-saffron-600">
          <Target size={26} />
        </div>
        <p className="text-center text-[11px] font-extrabold uppercase tracking-wider text-saffron-600">{vy}</p>
        <h3 className="mt-1 text-center text-lg font-extrabold text-[#241C17]">
          {isCaptain ? t('sankalp.captainTitle') : t('sankalp.sevakTitle')}
        </h3>
        <p className="mt-1 text-center text-sm text-[#8A6A57]">
          {(isCaptain ? t('sankalp.captainBody') : t('sankalp.sevakBody')).replace('{vy}', vy)}
        </p>

        <label htmlFor="sankalp-target" className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-[#8A6A57]">
          {t('sankalp.inputLabel')}
        </label>
        <input
          id="sankalp-target"
          type="number"
          inputMode="numeric"
          min={1}
          max={isCaptain ? 100000 : 365}
          autoFocus
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={String(quick[1])}
          className="mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 text-lg font-bold text-gray-900 outline-none transition focus:border-saffron-400 focus:bg-white focus:ring-4 focus:ring-saffron-100"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setValue(String(q))}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${value === String(q) ? 'bg-saffron-600 text-white' : 'bg-saffron-50 text-saffron-700 hover:bg-saffron-100'}`}
            >
              {q}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-base font-semibold text-white shadow-lg shadow-saffron-300/50 transition hover:brightness-105 disabled:opacity-70"
        >
          {busy && <Loader2 size={18} className="animate-spin" />}
          {t('sankalp.save')}
        </button>
        <p className="mt-3 text-center text-xs text-[#8A6A57]">{isCaptain ? t('sankalp.hintCaptain') : t('sankalp.hintSevak')}</p>
      </form>
    </Modal>
  );
};

export default SankalpGate;
