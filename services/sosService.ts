import { supabase } from './supabase';
import { SosAlert } from '../types';

// Best-effort location only — SOS creation never waits on or requires this.
// Resolves with null on denial, timeout, or when geolocation isn't
// available at all (no new Capacitor plugin: the WebView's own geolocation
// bridging, gated by the ACCESS_*_LOCATION manifest permissions, is enough).
export function getBestEffortLocation(timeoutMs = 4000): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
} | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

export const sosService = {
  // Server-side: resolves the caller's own org, inserts the SOS row, and
  // notifies every admin/Captain of that org — all in one call, so there's
  // no window where the row exists but nobody's been notified.
  async createSosAlert(params: {
    note?: string | null;
    location?: { latitude: number; longitude: number; accuracy: number | null } | null;
  }): Promise<SosAlert> {
    const { data, error } = await supabase.rpc('create_sos_alert', {
      p_note: params.note || null,
      p_latitude: params.location?.latitude ?? null,
      p_longitude: params.location?.longitude ?? null,
      p_location_accuracy: params.location?.accuracy ?? null,
      p_location_source: params.location ? 'device_gps' : null,
      p_vihar_entry_id: null,
    });
    if (error) throw error;
    return data as SosAlert;
  },

  // RLS already scopes this to "my own active SOS" — used on app open / when
  // the floating SOS button mounts, to reflect an already-active alert
  // instead of offering to create a second one.
  async getMyActiveSosAlert(): Promise<SosAlert | null> {
    const { data, error } = await supabase
      .from('sos_alerts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as SosAlert) || null;
  },

  // RLS scopes this to the alert's own creator or an admin of its org —
  // anyone else's select simply returns no row.
  async getSosAlert(id: string): Promise<SosAlert | null> {
    const { data, error } = await supabase
      .from('sos_alerts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as SosAlert) || null;
  },

  async acknowledgeSosAlert(id: string): Promise<SosAlert> {
    const { data, error } = await supabase.rpc('acknowledge_sos_alert', { p_sos_id: id });
    if (error) throw error;
    return data as SosAlert;
  },

  async resolveSosAlert(id: string): Promise<SosAlert> {
    const { data, error } = await supabase.rpc('resolve_sos_alert', { p_sos_id: id });
    if (error) throw error;
    return data as SosAlert;
  },

  async cancelSosAlert(id: string): Promise<SosAlert> {
    const { data, error } = await supabase.rpc('cancel_sos_alert', { p_sos_id: id });
    if (error) throw error;
    return data as SosAlert;
  },

  // Live updates for an already-open SOS detail screen only — never the
  // primary delivery path (that's the OneSignal push via create_sos_alert's
  // notifications insert). One subscription, scoped to this one row, torn
  // down when the caller unmounts.
  subscribeToSosAlert(id: string, onChange: (alert: SosAlert) => void) {
    const channel = supabase
      .channel(`sos_alert:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_alerts', filter: `id=eq.${id}` },
        (payload) => onChange(payload.new as SosAlert)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
