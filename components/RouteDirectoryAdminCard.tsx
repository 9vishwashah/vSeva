import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Route } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';

// Super Admin: publish the public Vihar route directory (vseva.vjas.in/vihar-routes and the landing page section).
// The website only changes when this button is tapped (netlify/functions/route-directory.js).
const SRC = `${import.meta.env.VITE_SUPABASE_URL || ''}/storage/v1/object/public/public-data/route-directory.json`;

interface Info { generatedAt: string; stats: { routes: number; groups: number; cities: number } }

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const RouteDirectoryAdminCard: React.FC = () => {
  const { showToast } = useToast();
  const [info, setInfo] = useState<Info | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${SRC}?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.generatedAt) setInfo({ generatedAt: d.generatedAt, stats: d.stats }); })
      .catch(() => undefined)
      .finally(() => setChecked(true));
  }, []);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await dataService.refreshRouteDirectory();
      setInfo(res);
      showToast(`Route directory updated: ${res.stats.routes} routes from ${res.stats.groups} groups`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not refresh the route directory', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface rounded-card ring-1 ring-inset ring-line p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0"><Route size={20} /></span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">Public route directory</h2>
          <p className="text-[13px] text-ink-2 mt-0.5">
            {!checked ? 'Checking…'
              : info ? <>Last updated {fmt(info.generatedAt)} · {info.stats.routes} routes · {info.stats.groups} groups · {info.stats.cities} cities</>
              : 'Not published yet. Tap Refresh to publish every group’s routes on the website.'}
          </p>
          <p className="text-[12px] text-ink-3 mt-1">Shows each group&rsquo;s routes with its Captain&rsquo;s name and number. Changes only when you refresh.</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <a href="/vihar-routes" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface ring-1 ring-inset ring-line text-ink text-sm font-semibold hover:bg-sunken/60">
          <ExternalLink size={15} /> View
        </a>
        <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-brand hover:bg-brand-600 text-ink text-sm font-semibold disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {busy ? 'Refreshing…' : 'Refresh route directory'}
        </button>
      </div>
    </div>
  );
};

export default RouteDirectoryAdminCard;
