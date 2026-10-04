import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getCached, invalidate } from './requestCache';

// Sankalp = the yearly Vihar target. Per Vihar Year (identified by its START year, e.g. VY 2026-27 -> 2026):
//   * every Sevak has their own Sankalp (sevak_sankalps),
//   * the Group (organisation) has a Group Sankalp set by the Captain (org_sankalps), plus the Captain's
//     switch for whether Sevaks may keep editing theirs (sevaks_can_edit, default on).
// Writes go through database functions that check who is calling (scripts/sankalp_feature.sql).

export interface OrgSankalp {
  target: number | null;
  sevaks_can_edit: boolean;
}

const CHANGED = 'sankalp-changed';
const notifyChanged = () => {
  invalidate('sankalp:');
  window.dispatchEvent(new Event(CHANGED));
};

export const sankalpService = {
  // null = not set yet for that Vihar Year
  async getMine(userId: string, year: number): Promise<number | null> {
    return getCached(`sankalp:me:${userId}:${year}`, async () => {
      const { data, error } = await supabase
        .from('sevak_sankalps')
        .select('target')
        .eq('user_id', userId)
        .eq('vihar_year', year)
        .maybeSingle();
      if (error) throw error;
      return data?.target ?? null;
    }, 30_000);
  },

  async getOrg(orgId: string, year: number): Promise<OrgSankalp> {
    return getCached(`sankalp:org:${orgId}:${year}`, async () => {
      const { data, error } = await supabase
        .from('org_sankalps')
        .select('target, sevaks_can_edit')
        .eq('organization_id', orgId)
        .eq('vihar_year', year)
        .maybeSingle();
      if (error) throw error;
      return { target: data?.target ?? null, sevaks_can_edit: data?.sevaks_can_edit ?? true };
    }, 30_000);
  },

  async setMine(year: number, target: number): Promise<void> {
    const { error } = await supabase.rpc('set_my_sankalp', { p_vihar_year: year, p_target: target });
    if (error) throw new Error(error.message);
    notifyChanged();
  },

  async setOrg(year: number, target: number): Promise<void> {
    const { error } = await supabase.rpc('set_org_sankalp', { p_vihar_year: year, p_target: target });
    if (error) throw new Error(error.message);
    notifyChanged();
  },

  async setSevaksCanEdit(year: number, canEdit: boolean): Promise<void> {
    const { error } = await supabase.rpc('set_sevaks_can_edit', { p_vihar_year: year, p_can_edit: canEdit });
    if (error) throw new Error(error.message);
    notifyChanged();
  },
};

// Hooks: undefined while loading, then the value. They reload whenever any screen changes a Sankalp.
export function useMySankalp(userId: string | undefined, year: number): number | null | undefined {
  const [value, setValue] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const load = () => sankalpService.getMine(userId, year).then(v => { if (alive) setValue(v); }).catch(() => { if (alive) setValue(null); });
    load();
    window.addEventListener(CHANGED, load);
    return () => { alive = false; window.removeEventListener(CHANGED, load); };
  }, [userId, year]);
  return value;
}

export function useOrgSankalp(orgId: string | undefined, year: number): OrgSankalp | undefined {
  const [value, setValue] = useState<OrgSankalp | undefined>(undefined);
  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    const load = () => sankalpService.getOrg(orgId, year).then(v => { if (alive) setValue(v); }).catch(() => { if (alive) setValue({ target: null, sevaks_can_edit: true }); });
    load();
    window.addEventListener(CHANGED, load);
    return () => { alive = false; window.removeEventListener(CHANGED, load); };
  }, [orgId, year]);
  return value;
}
