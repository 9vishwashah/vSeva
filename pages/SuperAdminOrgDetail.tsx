import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Building2, Users, Footprints, MapPin, Phone, Download, FileText, MessageCircle,
  Search, RefreshCw, Loader2, Lock, Target, Route, Calendar, Clock,
} from 'lucide-react';
import { BRAND } from '@brand';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';
import StatusScreen from '../components/StatusScreen';
import SuperAdminPinGate, { isSuperAdminPinVerified, clearSuperAdminPin } from '../components/SuperAdminPinGate';
import { deliverPdf } from '../services/pdfDelivery';
import { getViharYearStartYear, getViharYearBoundsForStartYear, isDateInViharYear } from '../services/viharYear';

interface SevakRow {
  id: string; full_name: string; username: string; mobile: string; gender?: string | null; age?: number | null;
  blood_group?: string | null; emergency_number?: string | null; emergency_contact_name?: string | null;
  occupation?: string | null; occupation_details?: string | null; address?: string | null;
  is_active: boolean; last_login_at?: string | null; created_at?: string | null;
}
interface EntryRow {
  id: number; vihar_date: string; vihar_from: string; vihar_to: string; sevaks: string[] | null;
  group_sadhu: boolean; group_sadhvi: boolean; no_sadhubhagwan?: number | null; no_sadhvijibhagwan?: number | null;
  wheelchair: boolean; samuday?: string | null; distance_km?: number | null; vihar_type: string; status?: string | null; notes?: string | null;
}
interface OrgDetail {
  org: { id: string; name: string; city?: string; town?: string; brand: string; created_at: string; vice_captain_name?: string | null };
  captain: SevakRow | null;
  registration: { sangh_name?: string; vihar_group_name?: string; full_address?: string; city?: string; town?: string; pin_code?: string; state?: string; email?: string; mobile?: string } | null;
  sevaks: SevakRow[];
  entries: EntryRow[];
  entriesTruncated: boolean;
  orgSankalps: { vihar_year: number; target: number; sevaks_can_edit: boolean }[];
  sevakSankalps: { user_id: string; vihar_year: number; target: number }[];
}

const PLATFORM_LABELS: Record<string, string> = { vseva: 'vSeva', ssg: 'SSG · Shraman Seva Group' };
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const fmtDay = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';
const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const monthIndex = (dateStr: string) => (parseInt(dateStr.slice(5, 7), 10) + 2) % 12; // Oct -> 0 ... Sep -> 11

// The fields a Sevak fills in from Profile & Settings (same rule as the Captain's Manage Sevaks screen).
const missingFields = (s: SevakRow): string[] => {
  const m: string[] = [];
  if (!has(s.age)) m.push('Age');
  if (!has(s.blood_group)) m.push('Blood group');
  if (!has(s.emergency_number)) m.push('Emergency number');
  if (!has(s.emergency_contact_name)) m.push('Emergency contact name');
  if (!has(s.occupation) || (s.occupation === 'Other' && !has(s.occupation_details))) m.push('Occupation');
  if (!has(s.address)) m.push('Address');
  return m;
};
const completion = (s: SevakRow) => Math.round(((6 - missingFields(s).length) / 6) * 100);
const occupationText = (s: SevakRow) => (s.occupation ? (s.occupation_details ? `${s.occupation} · ${s.occupation_details}` : s.occupation) : '');

const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.style.visibility = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tone: string }> = ({ icon, label, value, sub, tone }) => (
  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
    <div className="text-sm font-semibold text-gray-900 break-words">{children || '-'}</div>
  </div>
);

const SuperAdminOrgDetail: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { showToast } = useToast();
  const [pinOk, setPinOk] = useState(isSuperAdminPinVerified());
  const [data, setData] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [vyYear, setVyYear] = useState(getViharYearStartYear());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [entryLimit, setEntryLimit] = useState(25);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setOffline(false);
    try {
      setData(await dataService.getSuperAdminOrgDetail(orgId));
    } catch (e: any) {
      setError(e?.message || 'Could not load this organisation.');
      setOffline(!navigator.onLine);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (pinOk) load(); }, [pinOk, orgId]);

  const vy = useMemo(() => getViharYearBoundsForStartYear(vyYear), [vyYear]);

  const calc = useMemo(() => {
    if (!data) return null;
    const nameByUser = new Map<string, string>();
    data.sevaks.forEach(s => nameByUser.set(s.username, s.full_name));
    if (data.captain) nameByUser.set(data.captain.username, data.captain.full_name);

    const approved = data.entries.filter(e => !e.status || e.status === 'approved');
    const pending = data.entries.filter(e => e.status === 'pending').length;
    const inVy = approved.filter(e => isDateInViharYear(e.vihar_date, vy));

    const years = new Set<number>([getViharYearStartYear()]);
    approved.forEach(e => years.add(getViharYearStartYear(new Date(`${e.vihar_date}T00:00:00`))));

    const perSevak = new Map<string, { vy: number; total: number; last?: string }>();
    data.sevaks.forEach(s => perSevak.set(s.username, { vy: 0, total: 0 }));
    approved.forEach(e => {
      const inThisVy = isDateInViharYear(e.vihar_date, vy);
      (e.sevaks || []).forEach(u => {
        const r = perSevak.get(u) || { vy: 0, total: 0 };
        r.total += 1;
        if (inThisVy) r.vy += 1;
        if (!r.last || e.vihar_date > r.last) r.last = e.vihar_date;
        perSevak.set(u, r);
      });
    });

    const monthly = MONTHS.map(() => 0);
    inVy.forEach(e => { monthly[monthIndex(e.vihar_date)] += 1; });

    const km = inVy.reduce((a, e) => a + (Number(e.distance_km) || 0), 0);
    const sadhu = inVy.reduce((a, e) => a + (e.group_sadhu ? (e.no_sadhubhagwan || 0) : 0), 0);
    const sadhvi = inVy.reduce((a, e) => a + (e.group_sadhvi ? (e.no_sadhvijibhagwan || 0) : 0), 0);
    const wheelchair = inVy.filter(e => e.wheelchair).length;
    const morning = inVy.filter(e => e.vihar_type === 'morning').length;
    const evening = inVy.filter(e => e.vihar_type === 'evening').length;

    const routeCount = new Map<string, number>();
    inVy.forEach(e => { const k = `${e.vihar_from} → ${e.vihar_to}`; routeCount.set(k, (routeCount.get(k) || 0) + 1); });
    const topRoutes = [...routeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const orgSankalp = data.orgSankalps.find(s => s.vihar_year === vyYear) || null;
    const sevakSankalp = new Map<string, number>();
    data.sevakSankalps.filter(s => s.vihar_year === vyYear).forEach(s => sevakSankalp.set(s.user_id, s.target));

    const lastEntry = approved[0]?.vihar_date || null;
    const active = data.sevaks.filter(s => s.is_active).length;
    const top = [...data.sevaks]
      .map(s => ({ s, n: perSevak.get(s.username)?.vy || 0 }))
      .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);

    return { nameByUser, approved, pending, inVy, years: [...years].sort((a, b) => b - a), perSevak, monthly, km, sadhu, sadhvi, wheelchair, morning, evening, topRoutes, orgSankalp, sevakSankalp, lastEntry, active, top };
  }, [data, vy, vyYear]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.sevaks.filter(s => {
      if (statusFilter === 'active' && !s.is_active) return false;
      if (statusFilter === 'inactive' && s.is_active) return false;
      if (!q) return true;
      return [s.full_name, s.username, s.mobile, s.occupation, s.address].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [data, query, statusFilter]);

  if (!pinOk) return <SuperAdminPinGate onVerified={() => setPinOk(true)} />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        {offline ? <StatusScreen variant="offline" onRetry={load} /> : (
          <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4"><Lock size={26} /></div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Can't open this organisation</h1>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <div className="flex gap-2 justify-center">
              <a href="/super-admin" className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">Back</a>
              <button onClick={load} className="px-5 py-2.5 rounded-xl bg-saffron-600 text-white text-sm font-bold">Retry</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!data || !calc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500"><Loader2 className="animate-spin text-saffron-600" size={32} /><span className="font-medium">Loading organisation…</span></div>
      </div>
    );
  }

  const { org, captain, registration } = data;
  const platform = PLATFORM_LABELS[org.brand] ?? org.brand.toUpperCase();
  const place = [org.town || registration?.town, org.city, registration?.state].filter(Boolean).join(', ');
  const orgTarget = calc.orgSankalp?.target ?? null;
  const pct = orgTarget ? Math.min(100, Math.round((calc.inVy.length / orgTarget) * 100)) : null;
  const maxMonth = Math.max(1, ...calc.monthly);
  const safeName = org.name.replace(/[^\w]+/g, '_');

  const exportSevaksCsv = () => {
    downloadCsv(`${safeName}_sevaks.csv`, [
      ['Sr', 'Name', 'Username', 'Mobile', 'Gender', 'Age', 'Blood Group', 'Occupation', 'Family Emergency Contact', 'Family Emergency Number', 'Address', 'Active', 'Joined', 'Last Login', `Vihars ${vy.label}`, 'Vihars (All Time)', 'Last Vihar', `Sankalp ${vy.label}`, 'Profile %'],
      ...data.sevaks.map((s, i) => {
        const p = calc.perSevak.get(s.username);
        return [i + 1, s.full_name, s.username, s.mobile, s.gender || '', s.age ?? '', s.blood_group || '', occupationText(s), s.emergency_contact_name || '', s.emergency_number || '', (s.address || '').replace(/\s*\n\s*/g, ', '), s.is_active ? 'Yes' : 'No', fmtDate(s.created_at), fmtDate(s.last_login_at), p?.vy ?? 0, p?.total ?? 0, p?.last ? fmtDay(p.last) : '', calc.sevakSankalp.get(s.id) ?? '', completion(s)];
      }),
    ]);
  };

  const exportEntriesCsv = () => {
    downloadCsv(`${safeName}_vihars.csv`, [
      ['Date', 'Type', 'From', 'To', 'Distance (km)', 'Sadhu Bhagwan', 'Sadhviji Bhagwan', 'Wheelchair', 'Samuday', 'Sevaks', 'Status', 'Notes'],
      ...data.entries.map(e => [fmtDay(e.vihar_date), e.vihar_type, e.vihar_from, e.vihar_to, e.distance_km ?? '', e.group_sadhu ? (e.no_sadhubhagwan ?? '') : 0, e.group_sadhvi ? (e.no_sadhvijibhagwan ?? '') : 0, e.wheelchair ? 'Yes' : 'No', e.samuday || '', (e.sevaks || []).map(u => calc.nameByUser.get(u) || u).join('; '), e.status || 'approved', (e.notes || '').replace(/\s*\n\s*/g, ' ')]),
    ]);
  };

  const exportReportPdf = async () => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }, { NotoSansDevanagariBase64 }] = await Promise.all([
        import('jspdf'), import('jspdf-autotable'), import('../assets/NotoSansDevanagari-Regular'),
      ]);
      const doc = new jsPDF();
      doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
      const parse = (d: any) => { if (/[ऀ-ॿ]/.test(d.cell.text.join(' '))) d.cell.styles.font = 'NotoSansDevanagari'; };
      const accent: [number, number, number] = [230, 110, 0];
      const next = () => ((doc as any).lastAutoTable?.finalY ?? 40) + 8;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...accent);
      doc.text(`${org.name} — Group Report`, 14, 16);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`${platform}  |  ${vy.label}  |  Generated ${new Date().toLocaleString('en-IN')}`, 14, 22);
      doc.setDrawColor(...accent); doc.line(14, 25, 196, 25);

      autoTable(doc, {
        startY: 30, head: [['Group & Captain', '']], theme: 'striped', headStyles: { fillColor: accent },
        styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } }, didParseCell: parse,
        body: [
          ['Group name', org.name], ['Platform', platform], ['Sangh', registration?.sangh_name || '-'],
          ['Location', place || '-'], ['Address', [registration?.full_address, registration?.pin_code].filter(Boolean).join(' - ') || '-'],
          ['Captain', captain?.full_name || '-'], ['Captain mobile', captain?.mobile || '-'], ['Captain login', captain?.username || '-'],
          ['Vice-Captain', org.vice_captain_name || '-'], ['Created', fmtDate(org.created_at)],
        ],
      });
      autoTable(doc, {
        startY: next(), head: [[`Group stats — ${vy.label}`, '']], theme: 'striped', headStyles: { fillColor: accent },
        styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
        body: [
          ['Sevaks', `${data.sevaks.length} (${calc.active} active)`], ['Vihars this year', String(calc.inVy.length)],
          ['Vihars all time', String(calc.approved.length)], ['Group Sankalp', orgTarget ? `${orgTarget} (${pct}% done)` : 'Not set'],
          ['Distance covered', `${calc.km.toFixed(1)} km`], ['Sadhu / Sadhviji Bhagwan served', `${calc.sadhu} / ${calc.sadhvi}`],
          ['Wheelchair Vihars', String(calc.wheelchair)], ['Morning / Evening', `${calc.morning} / ${calc.evening}`],
          ['Last Vihar', calc.lastEntry ? fmtDay(calc.lastEntry) : '-'], ['Pending approvals', String(calc.pending)],
        ],
      });
      autoTable(doc, {
        startY: next(), head: [MONTHS], body: [calc.monthly.map(String)], theme: 'grid', headStyles: { fillColor: accent, halign: 'center' },
        styles: { fontSize: 9, halign: 'center' },
      });
      autoTable(doc, {
        startY: next(), theme: 'striped', headStyles: { fillColor: accent }, styles: { fontSize: 8, cellPadding: 1.8 }, didParseCell: parse,
        head: [['#', 'Sevak', 'Mobile', 'Age', 'Blood', 'Occupation', 'Vihars (VY)', 'Total', 'Last Vihar', 'Sankalp', 'Profile']],
        body: data.sevaks.map((s, i) => {
          const p = calc.perSevak.get(s.username);
          return [i + 1, s.full_name + (s.is_active ? '' : ' (inactive)'), s.mobile, s.age ?? '-', s.blood_group || '-', occupationText(s) || '-', p?.vy ?? 0, p?.total ?? 0, p?.last ? fmtDay(p.last) : '-', calc.sevakSankalp.get(s.id) ?? '-', `${completion(s)}%`];
        }),
      });
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120);
        doc.text(`${BRAND.name} Central Control  |  Page ${i} of ${pages}`, 105, 290, { align: 'center' });
      }
      await deliverPdf(doc, `${safeName}_Report_${vy.label.replace(/\s/g, '_')}.pdf`);
      showToast('Report downloaded', 'success');
    } catch (e) {
      console.error(e);
      showToast('Could not build the report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const whatsapp = () => {
    if (!captain?.mobile) return;
    window.open(`https://wa.me/91${captain.mobile}`, '_blank');
  };

  const btn = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <a href="/super-admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-saffron-700 mb-2"><ArrowLeft size={16} /> Central Control</a>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2 bg-saffron-600 rounded-lg text-white shadow-lg shadow-saffron-200"><Building2 size={22} /></div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">{org.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${org.brand === 'vseva' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>{platform}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-1.5"><MapPin size={14} /> {place || 'Location not provided'} <span className="text-gray-300">•</span> Joined {fmtDate(org.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={vyYear} onChange={e => setVyYear(parseInt(e.target.value, 10))} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700">
              {calc.years.map(y => <option key={y} value={y}>{getViharYearBoundsForStartYear(y).label}</option>)}
            </select>
            <button onClick={load} className={`${btn} bg-white border border-gray-200 text-gray-600 hover:bg-gray-50`}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
            <button onClick={exportReportPdf} disabled={exporting} className={`${btn} bg-saffron-600 text-white hover:bg-saffron-700 disabled:opacity-60`}>
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Report (PDF)
            </button>
            <button onClick={exportSevaksCsv} className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100`}><Download size={16} /> Sevaks CSV</button>
            <button onClick={exportEntriesCsv} className={`${btn} bg-green-50 text-green-700 hover:bg-green-100`}><Download size={16} /> Vihars CSV</button>
            <button onClick={() => { clearSuperAdminPin(); setPinOk(false); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl" title="Lock"><Lock size={18} /></button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Stat tone="bg-saffron-50 text-saffron-600" icon={<Users size={20} />} label="Sevaks" value={data.sevaks.length} sub={`${calc.active} active · ${data.sevaks.length - calc.active} inactive`} />
          <Stat tone="bg-green-50 text-green-600" icon={<Footprints size={20} />} label={`Vihars · ${vy.label}`} value={calc.inVy.length} sub={`${calc.approved.length} all time${calc.pending ? ` · ${calc.pending} pending` : ''}`} />
          <Stat tone="bg-purple-50 text-purple-600" icon={<Target size={20} />} label="Group Sankalp" value={orgTarget ? `${calc.inVy.length} / ${orgTarget}` : 'Not set'} sub={pct !== null ? `${pct}% complete` : undefined} />
          <Stat tone="bg-blue-50 text-blue-600" icon={<Route size={20} />} label="Distance" value={`${calc.km.toFixed(0)} km`} sub={`Last Vihar ${calc.lastEntry ? fmtDay(calc.lastEntry) : '—'}`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Group & Captain */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 space-y-4 lg:col-span-1">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Building2 size={16} className="text-blue-600" /> Group &amp; Captain</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Captain">{captain?.full_name}</Field>
              <Field label="Mobile">{captain?.mobile && <span className="font-mono">{captain.mobile}</span>}</Field>
              <Field label="Login (email)">{captain?.username}</Field>
              <Field label="Vice-Captain">{org.vice_captain_name}</Field>
              <Field label="Sangh">{registration?.sangh_name}</Field>
              <Field label="State">{registration?.state}</Field>
              <div className="col-span-2"><Field label="Address">{[registration?.full_address, registration?.pin_code].filter(Boolean).join(' - ')}</Field></div>
              <Field label="Captain last login">{fmtDate(captain?.last_login_at)}</Field>
              <Field label="Created">{fmtDate(org.created_at)}</Field>
            </div>
            {captain?.mobile && (
              <div className="flex gap-2 pt-1">
                <button onClick={whatsapp} className={`${btn} bg-[#25D366] text-white hover:bg-[#20bd5a]`}><MessageCircle size={15} /> WhatsApp</button>
                <a href={`tel:+91${captain.mobile}`} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}><Phone size={15} /> Call</a>
              </div>
            )}
          </div>

          {/* Group stats */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 space-y-4 lg:col-span-2">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Calendar size={16} className="text-green-600" /> Group stats · {vy.label}</h2>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Vihars per month</p>
              <div className="flex items-end gap-1.5 h-28">
                {calc.monthly.map((n, i) => (
                  <div key={MONTHS[i]} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                    <span className="text-[10px] font-bold text-gray-500">{n || ''}</span>
                    <div className="w-full rounded-t-md bg-saffron-400" style={{ height: `${n ? Math.max(6, (n / maxMonth) * 80) : 2}%`, opacity: n ? 1 : 0.25 }} />
                    <span className="text-[10px] text-gray-400">{MONTHS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Sadhu Bhagwan served">{calc.sadhu}</Field>
              <Field label="Sadhviji Bhagwan served">{calc.sadhvi}</Field>
              <Field label="Wheelchair Vihars">{calc.wheelchair}</Field>
              <Field label="Morning / Evening">{`${calc.morning} / ${calc.evening}`}</Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Top Sevaks</p>
                {calc.top.length === 0 ? <p className="text-sm text-gray-400">No Vihars this year</p> : (
                  <ol className="space-y-1">{calc.top.map(({ s, n }, i) => (
                    <li key={s.id} className="flex items-center justify-between text-sm"><span className="truncate"><span className="text-gray-400 mr-1.5">{i + 1}.</span>{s.full_name}</span><span className="font-bold text-saffron-700">{n}</span></li>
                  ))}</ol>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Top routes</p>
                {calc.topRoutes.length === 0 ? <p className="text-sm text-gray-400">No Vihars this year</p> : (
                  <ol className="space-y-1">{calc.topRoutes.map(([r, n]) => (
                    <li key={r} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{r}</span><span className="font-bold text-blue-700">{n}</span></li>
                  ))}</ol>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sevaks */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users size={18} className="text-saffron-600" /> Sevaks <span className="text-xs font-bold text-saffron-700 bg-saffron-100 px-2 py-0.5 rounded-full">{rows.length}{rows.length !== data.sevaks.length ? ` of ${data.sevaks.length}` : ''}</span></h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, mobile, occupation…" className="pl-9 pr-3 py-2 w-64 max-w-full rounded-xl border border-gray-200 text-sm outline-none focus:border-saffron-400" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700">
                <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3 pl-5">#</th><th className="p-3">Sevak</th><th className="p-3">Mobile</th><th className="p-3">Age / Blood</th>
                    <th className="p-3">Occupation</th><th className="p-3">Family emergency contact</th><th className="p-3">Joined</th><th className="p-3">Last login</th>
                    <th className="p-3 text-center">Vihars ({vy.label.replace('VY ', '')})</th><th className="p-3 text-center">Total</th><th className="p-3">Last Vihar</th>
                    <th className="p-3 text-center">Sankalp</th><th className="p-3 text-center pr-5">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 && <tr><td colSpan={13} className="p-10 text-center text-gray-400">No Sevaks found</td></tr>}
                  {rows.map((s, i) => {
                    const p = calc.perSevak.get(s.username);
                    const pc = completion(s);
                    const miss = missingFields(s);
                    return (
                      <tr key={s.id} className={`hover:bg-gray-50/60 ${s.is_active ? '' : 'opacity-60'}`}>
                        <td className="p-3 pl-5 text-gray-400">{i + 1}</td>
                        <td className="p-3 min-w-[170px]">
                          <p className="font-bold text-gray-900 flex items-center gap-1.5">{s.full_name}{!s.is_active && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 rounded">Inactive</span>}</p>
                          <p className="text-[11px] text-gray-400 font-mono truncate">{s.username}</p>
                        </td>
                        <td className="p-3 font-mono text-gray-700">{s.mobile}</td>
                        <td className="p-3 text-gray-700 whitespace-nowrap">{s.age ?? '-'} · {s.blood_group || '-'}<span className={`ml-1.5 text-[11px] font-bold ${s.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>{s.gender ? s.gender[0] : ''}</span></td>
                        <td className="p-3 text-gray-700 min-w-[140px]">{occupationText(s) || '-'}</td>
                        <td className="p-3 text-gray-700 min-w-[150px]">{s.emergency_number ? <>{s.emergency_contact_name && <span className="block text-xs text-gray-500">{s.emergency_contact_name}</span>}<span className="font-mono">{s.emergency_number}</span></> : '-'}</td>
                        <td className="p-3 text-gray-500 whitespace-nowrap">{fmtDate(s.created_at)}</td>
                        <td className="p-3 text-gray-500 whitespace-nowrap">{fmtDate(s.last_login_at)}</td>
                        <td className="p-3 text-center"><span className="inline-block px-2.5 py-0.5 bg-saffron-50 text-saffron-700 text-xs font-bold rounded-lg border border-saffron-100">{p?.vy ?? 0}</span></td>
                        <td className="p-3 text-center text-gray-600">{p?.total ?? 0}</td>
                        <td className="p-3 text-gray-500 whitespace-nowrap">{p?.last ? fmtDay(p.last) : <span className="text-gray-300 italic">None</span>}</td>
                        <td className="p-3 text-center text-gray-700">{calc.sevakSankalp.get(s.id) ?? <span className="text-gray-300">—</span>}</td>
                        <td className="p-3 pr-5 text-center" title={miss.length ? `Missing: ${miss.join(', ')}` : 'Complete'}>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${pc === 100 ? 'bg-green-100 text-green-700' : pc >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{pc}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Vihar log */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Clock size={18} className="text-green-600" /> Vihar log <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{data.entries.length}</span></h2>
          {data.entriesTruncated && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Showing the most recent 20,000 entries.</p>}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <tr><th className="p-3 pl-5">Date</th><th className="p-3">Route</th><th className="p-3">Type</th><th className="p-3 text-center">Sadhu / Sadhviji</th><th className="p-3 text-center">km</th><th className="p-3">Sevaks</th><th className="p-3 pr-5">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.entries.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-400">No Vihars recorded yet</td></tr>}
                  {data.entries.slice(0, entryLimit).map(e => (
                    <tr key={e.id} className="hover:bg-gray-50/60">
                      <td className="p-3 pl-5 whitespace-nowrap text-gray-700">{fmtDay(e.vihar_date)}</td>
                      <td className="p-3 text-gray-800 min-w-[180px]">{e.vihar_from} → {e.vihar_to}{e.wheelchair && <span className="ml-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 rounded">Wheelchair</span>}</td>
                      <td className="p-3 capitalize text-gray-600">{e.vihar_type}</td>
                      <td className="p-3 text-center text-gray-600">{e.group_sadhu ? e.no_sadhubhagwan ?? 0 : 0} / {e.group_sadhvi ? e.no_sadhvijibhagwan ?? 0 : 0}</td>
                      <td className="p-3 text-center text-gray-600">{e.distance_km ?? '-'}</td>
                      <td className="p-3 text-gray-600 min-w-[200px]">{(e.sevaks || []).map(u => calc.nameByUser.get(u) || u).join(', ') || '-'}</td>
                      <td className="p-3 pr-5"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${(!e.status || e.status === 'approved') ? 'bg-green-100 text-green-700' : e.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{e.status || 'approved'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.entries.length > entryLimit && (
              <button onClick={() => setEntryLimit(l => l + 50)} className="w-full py-3 text-sm font-bold text-saffron-700 hover:bg-saffron-50 border-t border-gray-100">Show more ({data.entries.length - entryLimit} remaining)</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOrgDetail;
