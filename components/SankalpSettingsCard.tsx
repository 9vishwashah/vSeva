import React, { useState } from 'react';
import { Target, Lock, Loader2 } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getViharYearStartYear, getViharYearBoundsForStartYear } from '../services/viharYear';
import { sankalpService, useMySankalp, useOrgSankalp } from '../services/sankalpService';

// Profile & Settings: a Sevak sees/edits their own Sankalp for the current Vihar Year (unless the Captain
// has locked it); a Captain sees/edits the Group Sankalp and owns the "Sevaks can edit" switch.
const SankalpSettingsCard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const isCaptain = user.role === UserRole.ORG_ADMIN;
  const year = getViharYearStartYear();
  const vy = getViharYearBoundsForStartYear(year).label;

  const mine = useMySankalp(isCaptain ? undefined : user.id, year);
  const org = useOrgSankalp(user.organization_id, year);

  const target = isCaptain ? (org?.target ?? null) : (mine ?? null);
  const canEdit = isCaptain ? true : (org?.sevaks_can_edit ?? true) || target === null;
  const locked = !isCaptain && org !== undefined && !org.sevaks_can_edit && target !== null;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [switchBusy, setSwitchBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1 || n > (isCaptain ? 100000 : 365)) { showToast(t('sankalp.invalid'), 'error'); return; }
    setBusy(true);
    try {
      if (isCaptain) await sankalpService.setOrg(year, n);
      else await sankalpService.setMine(year, n);
      showToast(t('sankalp.saved'), 'success');
      setEditing(false);
    } catch (err: any) {
      showToast(err?.message || 'Could not save', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    if (!org) return;
    setSwitchBusy(true);
    try {
      await sankalpService.setSevaksCanEdit(year, !org.sevaks_can_edit);
    } catch (err: any) {
      showToast(err?.message || 'Could not change this setting', 'error');
    } finally {
      setSwitchBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FFF0E5' }}>
            <Target size={18} style={{ color: '#DE6B38' }} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#241C17]">
              {isCaptain ? t('sankalp.groupTitle') : t('sankalp.mineTitle')} <span className="ml-1 rounded-full bg-saffron-50 px-2 py-0.5 text-[10px] font-extrabold text-saffron-700">{vy}</span>
            </p>
            <p className="mt-0.5 text-xs text-[#8A6A57]">
              {target === null ? t('sankalp.notSet') : <><strong className="text-base text-[#241C17]">{target}</strong> {t('sankalp.viharsUnit')}</>}
            </p>
          </div>
        </div>

        {!editing && (locked ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#8A6A57]"><Lock size={13} /> {t('sankalp.locked')}</span>
        ) : canEdit && (
          <button
            type="button"
            onClick={() => { setValue(target !== null ? String(target) : ''); setEditing(true); }}
            className="shrink-0 text-sm font-bold text-saffron-700 hover:underline"
          >
            {t('sankalp.edit')}
          </button>
        ))}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={isCaptain ? 100000 : 365}
            autoFocus
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t('sankalp.inputLabel')}
            className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 text-base font-bold text-gray-900 outline-none focus:border-saffron-400 focus:bg-white focus:ring-4 focus:ring-saffron-100"
          />
          <button type="button" onClick={() => setEditing(false)} disabled={busy} className="h-11 rounded-xl bg-gray-100 px-3 text-sm font-bold text-[#241C17] disabled:opacity-50">{t('sankalp.cancel')}</button>
          <button type="submit" disabled={busy} className="flex h-11 items-center gap-1.5 rounded-xl bg-saffron-600 px-4 text-sm font-bold text-white hover:bg-saffron-700 disabled:opacity-60">
            {busy && <Loader2 size={14} className="animate-spin" />} {t('sankalp.save')}
          </button>
        </form>
      )}

      {isCaptain && (
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-gray-100 pt-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#241C17]">{t('sankalp.allowEdit')}</p>
            <p className="mt-0.5 text-xs text-[#8A6A57]">{t('sankalp.allowEditHelp')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={org?.sevaks_can_edit ?? true}
            aria-label={t('sankalp.allowEdit')}
            onClick={toggle}
            disabled={!org || switchBusy}
            className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${(org?.sevaks_can_edit ?? true) ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${(org?.sevaks_can_edit ?? true) ? 'left-[1.4rem]' : 'left-0.5'}`} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SankalpSettingsCard;
