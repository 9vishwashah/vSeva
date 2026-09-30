import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, ViharEntry, UserRole, Organization, AreaRoute } from '../types';
import { dataService } from '../services/dataService';
import UpcomingViharCard from '../components/UpcomingViharCard';
import Avatar from '../components/Avatar';
import SankalpRing from '../components/SankalpRing';
import ViharYearSelector from '../components/ViharYearSelector';
import Modal from '../components/Modal';
import StatusScreen from '../components/StatusScreen';
import { Users, MapPin, Footprints, Download, FileText, Table, Activity, AlertCircle, X, Plus, Handshake, Medal, Crown, Shield, Flame, Calendar, SlidersHorizontal, Loader2 } from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';
import vsgLogo from '../assets/vsg.jpg';
import { useToast } from '../context/ToastContext';
import { useViharYear } from '../context/ViharYearContext';
import { supabase } from '../services/supabase';
import { getViharYearForDate, isDateInViharYear } from '../services/viharYear';
import { toLocalDateKey } from '../services/dateUtils';
import { deliverPdf } from '../services/pdfDelivery';

type ExportColumnKey = 'date' | 'from' | 'to' | 'sadhu' | 'sadhvi' | 'samuday' | 'wheelchair' | 'type' | 'kms' | 'sevaks';

const EXPORT_COLUMNS: { key: ExportColumnKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'sadhu', label: 'Sadhu' },
  { key: 'sadhvi', label: 'Sadhvi' },
  { key: 'samuday', label: 'Samuday' },
  { key: 'wheelchair', label: 'Wheelchair' },
  { key: 'type', label: 'Type' },
  { key: 'kms', label: 'Kms' },
  { key: 'sevaks', label: 'Sevaks' },
];

interface DashboardProps {
  currentUser: UserProfile;
  navigateToProfile?: () => void;
  navigateToNotifications?: () => void;
  onAddVihar?: () => void;
  // Fetched once at login (same time as currentUser) so the org badge can paint
  // instantly instead of waiting on this page's own heavier data load below.
  orgDetails?: Organization | null;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, navigateToProfile, navigateToNotifications, onAddVihar, orgDetails: orgDetailsProp }) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
  const [sevakMap, setSevakMap] = useState<Record<string, string>>({}); // Add this state
  const [sevakGenderMap, setSevakGenderMap] = useState<Record<string, string>>({});
  const [data, setData] = useState<{ entries: ViharEntry[], stats: any, leaderboard?: { male: any[], female: any[] } }>({
    entries: [],
    stats: {
      totalVihars: 0,
      totalKm: 0,
      totalSadhu: 0,
      totalSadhvi: 0,
      longestVihar: 0,
      streak: 0,
      vSynergy: "N/A",
      vRank: "N/A",
      activeUsernames: []
    },
    leaderboard: { male: [], female: [] }
  });

  const [orgDetails, setOrgDetails] = useState<Organization | null>(orgDetailsProp ?? null);
  const [yearlyGoal, setYearlyGoal] = useState(25);
  const [captainName, setCaptainName] = useState<string | null>(null);
  const [orgEntriesAll, setOrgEntriesAll] = useState<ViharEntry[]>([]);
  const { selectedVYStartYear, setSelectedVYStartYear, currentVYStartYear, selectedVY } = useViharYear();

  // Export configuration modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportGender, setExportGender] = useState<'all' | 'male' | 'female'>('all');
  const [exportColumns, setExportColumns] = useState<Record<ExportColumnKey, boolean>>({
    date: true, from: true, to: true, sadhu: true, sadhvi: true,
    samuday: true, wheelchair: true, type: true, kms: true, sevaks: true,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (orgDetailsProp) setOrgDetails(orgDetailsProp);
  }, [orgDetailsProp]);

  useEffect(() => {
    dataService.getYearlyGoal(currentUser.id).then(setYearlyGoal);
  }, [currentUser.id]);

  // A Sevak needs their Captain's name for the header below — fetched separately
  // (fast, independent of the heavier Promise.all further down) since an admin
  // already knows it: it's just their own currentUser.full_name.
  useEffect(() => {
    if (currentUser.role === UserRole.SEVAK) {
      dataService.getOrgAdmins([currentUser.organization_id]).then(map => {
        const admin = map[currentUser.organization_id];
        if (admin?.full_name) setCaptainName(admin.full_name);
      });
    }
  }, [currentUser.organization_id, currentUser.role]);

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showActiveSevaksModal, setShowActiveSevaksModal] = useState(false);

  useEffect(() => {
    if (currentUser.role === UserRole.SEVAK) {
      const isProfileIncomplete = !currentUser.blood_group?.trim() || !currentUser.emergency_number?.trim() || !currentUser.address?.trim();
      if (isProfileIncomplete) {
        const hasSeen = sessionStorage.getItem('hasSeenCompletenessPrompt');
        if (!hasSeen) {
          setShowProfileModal(true);
          sessionStorage.setItem('hasSeenCompletenessPrompt', 'true');
        }
      }
    }
  }, [currentUser]);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<AreaRoute[]>([]);
  const [uniqueAreas, setUniqueAreas] = useState<string[]>([]);

  const [alertData, setAlertData] = useState({
    date: toLocalDateKey(new Date()),
    time: '06:00',
    from: '',
    to: '',
    type: 'morning',
    sadhu: 0,
    sadhvi: 0
  });

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log("Triggering create_upcoming_alert RPC with data:", alertData);
      const { data: rpcData, error } = await supabase.rpc('create_upcoming_alert', {
        vihar_date_input: alertData.date,
        vihar_time_input: alertData.time,
        from_loc: alertData.from,
        to_loc: alertData.to,
        v_type: alertData.type,
        s_count: Number(alertData.sadhu),
        sv_count: Number(alertData.sadhvi)
      });

      if (error) {
        console.error("RPC Error:", error);
        alert(`Failed to trigger alert! Error: ${JSON.stringify(error)}`);
        throw error;
      };

      console.log("RPC Success. Data:", rpcData);
      showToast(`Alert sent with Priority!`, 'success');
      setIsAlertOpen(false);
      // Reset form
      setAlertData({ date: toLocalDateKey(new Date()), time: '06:00', from: '', to: '', type: 'morning', sadhu: 0, sadhvi: 0 });
    } catch (err: any) {
      console.error("Catch Error:", err);
      alert(`System Error: ${err.message || "Unknown error occurred"}`);
      showToast(err.message || "Failed to create alert", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const isAdmin = currentUser.role === UserRole.ORG_ADMIN;

        // All of these only depend on currentUser (already known), not on each
        // other's results — they were previously awaited in a 4-stage sequential
        // chain. Firing them together turns ~4 round-trips into 1.
        const [
          org, orgSevaks, routes, secureMap, allOrgEntries, rankingEntries, detailedStats, totalOrgSevaksCount
        ] = await Promise.all([
          dataService.getOrganization(currentUser.organization_id),
          dataService.getAllOrgUsers(currentUser.organization_id, true),
          dataService.getRoutes(currentUser.organization_id),
          dataService.getSevakNameMap(currentUser.organization_id),
          dataService.getEntries(currentUser.organization_id),
          // Org-wide, for rank/leaderboard only — getEntries() above is RLS-
          // limited to a Sevak's own entries, which breaks ranking (everyone's
          // "whole org" view of themselves trivially ranks #1).
          dataService.getOrgEntriesForRanking(currentUser.organization_id),
          dataService.getDashboardStats(currentUser.organization_id).catch(e => {
            console.error("Failed to load accurate dashboard stats", e);
            return null;
          }),
          isAdmin ? Promise.resolve(null) : dataService.getTotalOrgSevaks(currentUser.organization_id),
        ]);

        setOrgDetails(org);
        setAvailableRoutes(routes);

        // Extract Unique Areas
        const areas = new Set<string>();
        routes.forEach(r => {
          areas.add(r.from_name);
          areas.add(r.to_name);
        });
        setUniqueAreas(Array.from(areas).sort());

        // Create username -> fullname map for Synergy display
        const nameMap: Record<string, string> = {};
        Object.assign(nameMap, secureMap);
        const genderMap: Record<string, string> = {};
        orgSevaks.forEach(s => {
          nameMap[s.username] = s.full_name;
          nameMap[s.username.split('@')[0]] = s.full_name;
          const g = (s.gender || '').toLowerCase();
          genderMap[s.username] = g;
          genderMap[s.username.split('@')[0]] = g;
        });
        setSevakMap(nameMap);
        setSevakGenderMap(genderMap);

        let myEntries: ViharEntry[];
        let totalCount: number | null;

        if (isAdmin) {
          // Admin sees org stats
          myEntries = allOrgEntries;
          totalCount = orgSevaks.length;
        } else {
          // Sevak sees own stats
          myEntries = allOrgEntries.filter(e => (e.sevaks || []).includes(currentUser.username));
          totalCount = totalOrgSevaksCount;
        }
        setOrgEntriesAll(rankingEntries);

        // Vihar Year (VY) scoping for the headline KPI tiles (Km/Vihars/Sadhu/
        // Sadhvi/Co-Sevak), rank, and the leaderboard happens in the vyStats/
        // vyLeaderboard memos below, reacting to the year selector — like a
        // Financial Year P&L, computed live from vihar_date, nothing stored or
        // moved. Only the roster-based numbers (active/total sevaks) are set here.
        const stats: any = { totalKm: 0, totalVihars: 0, totalSadhu: 0, totalSadhvi: 0, longestVihar: 0, streak: 0, vSynergy: 'N/A', vRank: isAdmin ? 'Admin' : 'N/A' };

        if (detailedStats) {
          stats.totalOrgSevaks = detailedStats.totalMale + detailedStats.totalFemale;
          stats.activeSevaks = detailedStats.activeMale + detailedStats.activeFemale;
          stats.totalMale = detailedStats.totalMale;
          stats.totalFemale = detailedStats.totalFemale;
          stats.activeMale = detailedStats.activeMale;
          stats.activeFemale = detailedStats.activeFemale;
          stats.activeUsernames = detailedStats.activeUsernames || [];
        } else {
          stats.totalOrgSevaks = totalCount !== null ? totalCount : 0;
          stats.activeSevaks = 0;
          stats.totalMale = 0;
          stats.totalFemale = 0;
          stats.activeMale = 0;
          stats.activeFemale = 0;
          stats.activeUsernames = [];
        }

        setData({ entries: myEntries, stats, leaderboard: { male: [], female: [] } });

        // Fire-and-forget — the Captain's dashboard scans the whole org, a
        // Sevak's dashboard only checks themselves.
        dataService.checkInactivity(currentUser.organization_id, isAdmin ? undefined : currentUser.username);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
        setLoadError(navigator.onLine ? 'error' : 'offline');
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Helper for names
  const getSevakName = (username: string) => {
    const plainUsername = username.split('@')[0];
    return sevakMap[username] || sevakMap[plainUsername] || plainUsername;
  };

  // Applies the Export modal's date range + gender filter, then shapes each
  // entry into flat row data. Gender filtering never hides a whole entry just
  // because it also has other-gender participants — it only drops entries with
  // NO matching-gender sevak at all, and otherwise hides just the non-matching
  // names from that entry's sevak list while keeping the matching ones.
  const prepareExportData = () => {
    let filtered = data.entries;

    if (exportDateFrom) filtered = filtered.filter(e => e.vihar_date >= exportDateFrom);
    if (exportDateTo) filtered = filtered.filter(e => e.vihar_date <= exportDateTo);

    if (exportGender !== 'all') {
      filtered = filtered
        .map(e => {
          const matching = (e.sevaks || []).filter(u => {
            const g = sevakGenderMap[u] ?? sevakGenderMap[u.split('@')[0]];
            return g === exportGender;
          });
          return matching.length > 0 ? { ...e, sevaks: matching } : null;
        })
        .filter((e): e is ViharEntry => e !== null);
    }

    // Which Vihar Year(s) the exported rows actually fall in — checked against
    // the real entry dates rather than assumed from "today", so a report pulled
    // for a past period is labeled correctly instead of always showing the
    // current VY.
    const vyLabels = new Set(filtered.map(e => getViharYearForDate(e.vihar_date).label));
    const reportVYLabel = vyLabels.size === 1 ? [...vyLabels][0] : vyLabels.size > 1 ? 'Multiple Vihar Years' : selectedVY.label;

    const rows = filtered.map((entry, index) => {
      const sevakNames = (entry.sevaks || []).map(u => getSevakName(u)).join(', ');

      return {
        srNo: index + 1,
        date: entry.vihar_date ? entry.vihar_date.split('-').reverse().join('-') : '-',
        from: entry.vihar_from,
        to: entry.vihar_to,
        sadhu: entry.no_sadhubhagwan || 0,
        sadhvi: entry.no_sadhvijibhagwan || 0,
        samuday: entry.samuday || '-',
        wheelchair: entry.wheelchair ? 'Yes' : 'No',
        type: entry.vihar_type === 'morning' ? 'Morning' : 'Evening',
        kms: entry.distance_km,
        sevaks: sevakNames
      };
    });

    return { rows, reportVYLabel };
  };

  const downloadPDF = async () => {
    setExporting(true);
    try {
      // jsPDF + autoTable (~420KB) and the Hindi/Gujarati font data (~570KB)
      // are only needed for this rarely-used export action — load them on
      // demand instead of bundling them into Dashboard's initial chunk, which
      // every user pays for just to open the app.
      const [
        { default: jsPDF },
        { default: autoTable },
        { NotoSansDevanagariBase64 },
        { NotoSansGujaratiBase64 },
      ] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('../assets/NotoSansDevanagari-Regular'),
        import('../assets/NotoSansGujarati-Regular'),
      ]);
      const doc = new jsPDF();
      const { rows: exportData, reportVYLabel } = prepareExportData();

      if (exportData.length === 0) {
        showToast("No entries found to export", 'info');
        return;
      }

      doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', NotoSansDevanagariBase64);
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
      doc.addFileToVFS('NotoSansGujarati-Regular.ttf', NotoSansGujaratiBase64);
      doc.addFont('NotoSansGujarati-Regular.ttf', 'NotoSansGujarati', 'normal');

      // Add Logo (As Base64 or Image) - Using the imported image directly might rely on bundler
      // Ideally we load it into an image object first or verify if jspdf accepts URL
      // For now, let's try adding it. If it fails, we might need to fetch it.
      // Since it's imported via Vite/Webpack, it's a URL.
      // We will assume standard addImage works with that URL in browser environment or we need to convert.
      // Safe bet: load image to dataURL first.

      const img = new Image();
      img.src = vSevaLogo;

      // We need to wait for image load if we weren't sure, but it's likely cached/loaded. 
      // Better approach: simple addImage with the imported path often works in modern bundlers if it's a data URI or valid URL.
      // Let's rely on doc.addImage(vSevaLogo, ...)

      doc.addImage(vSevaLogo, 'PNG', 14, 10, 15, 15);
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.addImage(vsgLogo, 'JPEG', pageWidth - 14 - 15, 10, 15, 15);

      // Title & Credits
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(18);
      doc.setTextColor(234, 88, 12); // Saffron

      const orgName = orgDetails?.name || 'Organization';
      const orgCity = orgDetails?.city ? `, ${orgDetails.city}` : '';
      const title = `${orgName}${orgCity}`;
      doc.text(title, 35, 18);

      doc.setFontSize(10);
      doc.setTextColor(150); // grey
      doc.text("vSeva by VJAS", 35, 24);

      // Top-centered report-type badge — only when a gender filter narrowed the report.
      let headerBottomY = 30;
      if (exportGender !== 'all') {
        const reportLabel = exportGender === 'male' ? 'Sevak Report (Male)' : 'Sevika Report (Female)';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const badgeW = doc.getTextWidth(reportLabel) + 12;
        const badgeX = (pageWidth - badgeW) / 2;
        doc.setFillColor(234, 88, 12);
        doc.roundedRect(badgeX, headerBottomY - 5, badgeW, 7, 3.5, 3.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(reportLabel, pageWidth / 2, headerBottomY - 0.3, { align: 'center' });
        headerBottomY += 8;
      }

      // Left column: Captain / Vice Captain / Vihar Year Period.
      // Right column: Generated on.
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100);
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      const generatedAt = `${now.toLocaleDateString('en-GB')} ${timeString}`;
      const pageRight = doc.internal.pageSize.getWidth() - 14;
      doc.text(`Generated on: ${generatedAt}`, pageRight, headerBottomY, { align: 'right' });

      doc.setTextColor(234, 88, 12); // Saffron
      const captainForPdf = currentUser.role === UserRole.ORG_ADMIN ? currentUser.full_name : (captainName || currentUser.full_name);
      doc.text(`Captain: ${captainForPdf}`, 14, headerBottomY);
      headerBottomY += 6;

      if (orgDetails?.vice_captain_name) {
        doc.text(`Vice Captain: ${orgDetails.vice_captain_name}`, 14, headerBottomY);
        headerBottomY += 6;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Vihar Year Period: ${reportVYLabel}`, 14, headerBottomY);
      doc.setFont('helvetica', 'normal');
      headerBottomY += 6;

      // Helper to draw watermark on a page
      const drawWatermark = () => {
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const wmSize = 100; // mm
        const wmX = (pageW - wmSize) / 2;
        const wmY = (pageH - wmSize) / 2;
        (doc as any).saveGraphicsState();
        (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
        doc.addImage(vSevaLogo, 'PNG', wmX, wmY, wmSize, wmSize);
        (doc as any).restoreGraphicsState();
      };

      const activeColumns = EXPORT_COLUMNS.filter(c => exportColumns[c.key]);

      let totalSadhu = 0;
      let totalSadhvi = 0;
      let totalKms = 0;

      const bodyData = exportData.map(item => {
        totalSadhu += Number(item.sadhu) || 0;
        totalSadhvi += Number(item.sadhvi) || 0;
        totalKms += Number(item.kms) || 0;
        return [item.srNo, ...activeColumns.map(c => (item as any)[c.key])];
      });

      // Add Total Row — 'TOTAL' label goes in the Date column if present, else
      // the first selected column; Sadhu/Sadhvi/Km are summed wherever selected.
      const totalsByKey: Record<ExportColumnKey, any> = {
        date: 'TOTAL', from: '', to: '', sadhu: totalSadhu, sadhvi: totalSadhvi,
        samuday: '', wheelchair: '', type: '', kms: parseFloat(totalKms.toFixed(2)), sevaks: '',
      };
      if (!exportColumns.date && activeColumns.length > 0) {
        totalsByKey[activeColumns[0].key] = 'TOTAL';
      }
      bodyData.push(['', ...activeColumns.map(c => totalsByKey[c.key])]);

      // KPI summary boxes — same visual language as the Dashboard's stat tiles,
      // placed above the table so the report opens with the headline numbers.
      const kpiY = headerBottomY + 3;
      const kpiH = 20;
      const kpiGap = 4;
      const kpiCount = 4;
      const kpiW = (pageWidth - 28 - kpiGap * (kpiCount - 1)) / kpiCount;
      const kpiTiles: { label: string; value: string; bg: [number, number, number]; fg: [number, number, number] }[] = [
        { label: 'TOTAL KM', value: totalKms.toFixed(1), bg: [255, 240, 229], fg: [181, 96, 44] },
        { label: 'TOTAL VIHARS', value: String(exportData.length), bg: [233, 244, 253], fg: [46, 126, 176] },
        { label: 'SADHU', value: String(totalSadhu), bg: [252, 234, 235], fg: [192, 90, 87] },
        { label: 'SADHVI', value: String(totalSadhvi), bg: [241, 234, 251], fg: [107, 79, 174] },
      ];
      kpiTiles.forEach((tile, i) => {
        const x = 14 + i * (kpiW + kpiGap);
        doc.setFillColor(tile.bg[0], tile.bg[1], tile.bg[2]);
        doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(tile.fg[0], tile.fg[1], tile.fg[2]);
        doc.text(tile.value, x + kpiW / 2, kpiY + 10, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(tile.label, x + kpiW / 2, kpiY + 16, { align: 'center' });
      });

      // A Vihar with both a male and a female Sevak is kept in full on both
      // the Sevak and Sevika reports (per how this export is designed), so
      // their totals can legitimately add up to more than the "All" report —
      // flagged here so that's never mistaken for a calculation error.
      let noteHeight = 0;
      if (exportGender !== 'all') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(140, 140, 140);
        const noteText = 'Note: Vihars with both male and female Sevaks are counted in full on both the Sevak and Sevika reports, so their combined totals can exceed the "All" report\'s totals.';
        const noteLines = doc.splitTextToSize(noteText, pageWidth - 28);
        doc.text(noteLines, 14, kpiY + kpiH + 5);
        noteHeight = noteLines.length * 3.2 + 3;
        doc.setFont('helvetica', 'normal');
      }

      // Top 10 leaderboard \u2014 no total row, just each Sevak's own numbers \u2014
      // placed above the main entries table.
      const leaderboardSource = exportGender === 'male' ? vyLeaderboard.male : exportGender === 'female' ? vyLeaderboard.female : vyLeaderboard.overall;
      const top10 = leaderboardSource.slice(0, 10);
      let mainTableStartY = kpiY + kpiH + 6 + noteHeight;

      if (top10.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(234, 88, 12);
        const top10Title = exportGender === 'male' ? 'Top 10 Sevaks' : exportGender === 'female' ? 'Top 10 Sevikas' : 'Top 10 Sevaks & Sevikas';
        doc.text(top10Title, 14, mainTableStartY + 4);

        autoTable(doc, {
          startY: mainTableStartY + 7,
          head: [['Rank', 'Name', 'Vihars', 'Km']],
          body: top10.map(s => [`#${s.rank}`, s.name, s.count, s.km]),
          styles: {
            fontSize: 7,
            lineColor: [200, 200, 200],
            lineWidth: 0.2,
            textColor: [30, 30, 30]
          },
          headStyles: { fillColor: [234, 88, 12], textColor: 255 },
          alternateRowStyles: { fillColor: [255, 250, 245] },
          didParseCell: (hookData) => {
            const text = hookData.cell.raw != null ? String(hookData.cell.raw) : '';
            const hasHindi = /[\u0900-\u097F]/.test(text);
            const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
            if (hasGujarati) hookData.cell.styles.font = 'NotoSansGujarati';
            else if (hasHindi) hookData.cell.styles.font = 'NotoSansDevanagari';
          },
        });

        mainTableStartY = (doc as any).lastAutoTable.finalY + 8;
      }

      autoTable(doc, {
        startY: mainTableStartY,
        head: [['Sr No', ...activeColumns.map(c => c.label)]],
        body: bodyData,
        styles: {
          fontSize: 7,
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          textColor: [30, 30, 30]
        },
        headStyles: { fillColor: [234, 88, 12], textColor: 255 },
        alternateRowStyles: { fillColor: [255, 250, 245] },
        didParseCell: (hookData) => {
          const text = hookData.cell.raw != null ? String(hookData.cell.raw) : '';
          const hasHindi = /[\u0900-\u097F]/.test(text);
          const hasGujarati = /[\u0A80-\u0AFF]/.test(text);
          if (hasGujarati) {
            hookData.cell.styles.font = 'NotoSansGujarati';
          } else if (hasHindi) {
            hookData.cell.styles.font = 'NotoSansDevanagari';
          }

          // Style for the Total row
          if (hookData.section === 'body' && hookData.row.index === bodyData.length - 1) {
            hookData.cell.styles.fillColor = [254, 235, 219]; // Light saffron/orange bg
            hookData.cell.styles.textColor = [234, 88, 12]; // Saffron text
            hookData.cell.styles.fontStyle = 'bold';
            // Custom fonts might not have bold, fallback to normal for non-English if needed
            if (!hasHindi && !hasGujarati) {
              hookData.cell.styles.font = 'helvetica';
            }
          }
        },
        didDrawPage: () => drawWatermark(),
      });

      await deliverPdf(doc, `vSeva_Report_${toLocalDateKey(new Date())}.pdf`);
      showToast("PDF Report downloaded successfully", 'success');
      setShowExportModal(false);
    } catch (error) {
      console.error(error);
      showToast("Failed to generate PDF", 'error');
    } finally {
      setExporting(false);
    }
  };

  const downloadExcel = async () => {
    setExporting(true);
    try {
      // xlsx (~280KB) is only needed for this rarely-used export action —
      // load it on demand rather than bundling it into Dashboard's initial chunk.
      const XLSX = await import('xlsx');
      const { rows: data } = prepareExportData();

      if (data.length === 0) {
        showToast("No entries found to export", 'info');
        return;
      }

      const activeColumns = EXPORT_COLUMNS.filter(c => exportColumns[c.key]);
      const excelData = data.map(item => {
        const row: Record<string, any> = { 'Sr No': item.srNo };
        activeColumns.forEach(c => { row[c.label] = (item as any)[c.key]; });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(excelData);

      // Same reason as the PDF note: a Vihar with both a male and a female
      // Sevak is counted in full on both split reports, so their totals can
      // legitimately exceed the "All" report's totals — flagged here so it's
      // never mistaken for a calculation error.
      if (exportGender !== 'all') {
        XLSX.utils.sheet_add_aoa(ws, [
          [],
          ['Note: Vihars with both male and female Sevaks are counted in full on both the Sevak and Sevika reports, so their combined totals can exceed the "All" report\'s totals.'],
        ], { origin: -1 });
      }

      const wb = XLSX.utils.book_new();
      const sheetName = exportGender === 'male' ? 'Sevak Report' : exportGender === 'female' ? 'Sevika Report' : 'Vihar Entries';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `vSeva_Report_${toLocalDateKey(new Date())}.xlsx`);

      showToast("Excel Export downloaded successfully", 'success');
      setShowExportModal(false);
    } catch (error) {
      showToast("Failed to export Excel", 'error');
    } finally {
      setExporting(false);
    }
  };

  const SkeletonLoader = ({ width = "w-16" }) => (
    <div className={`h-8 ${width} bg-gray-200 rounded animate-pulse mt-1`}></div>
  );

  // Tangerine redesign: Consistency + Recent Activity + Sankalp count are all
  // derived from data.entries — no new data source needed.
  // A "Vihar Year" (VY) runs Oct 14 -> Jul 13, matching when Vihar actually
  // happens around Chaturmas — not the calendar year. Purely a display grouping
  // computed from each entry's existing vihar_date; nothing is stored or moved.
  // The year selector picks selectedVY (state, defaults to the current VY);
  // these two memos recompute the headline stats/leaderboard for whichever VY
  // is selected, purely client-side from data already fetched — no re-fetch.
  const vyStats = useMemo(() => {
    const myEntriesVY = data.entries.filter(e => isDateInViharYear(e.vihar_date, selectedVY));
    const orgEntriesVY = orgEntriesAll.filter(e => isDateInViharYear(e.vihar_date, selectedVY));
    // calculateStats(myEntriesVY, ...) already scopes .streak to this VY's
    // entries (its own streak logic just walks consecutive-day runs from
    // whatever's passed in) — no separate override needed here.
    const base: any = dataService.calculateStats(myEntriesVY, currentUser.username, sevakMap);
    base.vRank = currentUser.role === UserRole.ORG_ADMIN ? 'Admin' : dataService.calculateRank(orgEntriesVY, currentUser.username);

    // Active Sevaks — who actually did a Vihar during the selected VY,
    // instead of the org-wide "active in the last 30 days" snapshot, which
    // stays pinned to today regardless of which VY is being viewed.
    const activeUsernamesVY = new Set<string>();
    orgEntriesVY.forEach(e => (e.sevaks || []).forEach(u => activeUsernamesVY.add(u)));
    let activeMale = 0, activeFemale = 0;
    activeUsernamesVY.forEach(u => {
      const g = (sevakGenderMap[u] || '').toLowerCase();
      if (g === 'female' || g === 'સ્ત્રી' || g === 'mahila') activeFemale++;
      else activeMale++;
    });
    base.activeMale = activeMale;
    base.activeFemale = activeFemale;
    base.activeSevaks = activeMale + activeFemale;
    base.activeUsernames = Array.from(activeUsernamesVY);

    return base;
  }, [data.entries, orgEntriesAll, selectedVY.start.getTime(), selectedVY.end.getTime(), sevakMap, sevakGenderMap, currentUser.username, currentUser.role]);

  const vyLeaderboard = useMemo(() => {
    const orgEntriesVY = orgEntriesAll.filter(e => isDateInViharYear(e.vihar_date, selectedVY));
    return dataService.getTopSevaksLeaderboard(orgEntriesVY, sevakMap, sevakGenderMap);
  }, [orgEntriesAll, selectedVY.start.getTime(), selectedVY.end.getTime(), sevakMap, sevakGenderMap]);

  const displayStats = { ...data.stats, ...vyStats };

  const yearlyViharCount = data.entries.filter(e => isDateInViharYear(e.vihar_date, selectedVY)).length;

  // When browsing a past VY, anchor the rolling windows (week strip, recent
  // activity) to the end of that VY instead of today, so they show that
  // period's own data rather than an unrelated "right now".
  const isViewingCurrentVY = selectedVYStartYear === currentVYStartYear;
  const vyAnchorDate = isViewingCurrentVY ? new Date() : selectedVY.end;

  const weekDayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const startOfWeek = (() => {
    const d = new Date(vyAnchorDate);
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const weeklyConsistency = weekDayLabels.map((label, i) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    const dayKey = toLocalDateKey(dayDate);
    return { label, done: data.entries.some(e => e.vihar_date === dayKey) };
  });

  const recentActivity = [...data.entries]
    .filter(e => isDateInViharYear(e.vihar_date, selectedVY))
    .sort((a, b) => new Date(b.vihar_date).getTime() - new Date(a.vihar_date).getTime())
    .slice(0, 3);

  // data.entries is desc-sorted, so [0] is the most recent Vihar this Sevak joined.
  const daysSinceLastVihar = currentUser.role === UserRole.SEVAK && data.entries.length > 0
    ? Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(`${data.entries[0].vihar_date}T00:00:00`).getTime()) / 86400000)
    : null;

  const formatRelativeDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loadError && !isLoading) {
    return (
      <div className="space-y-5 animate-fade-in relative">
        <StatusScreen variant={loadError} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in relative">
      {/* Profile Completion Modal (Stats Page) */}
      <Modal open={showProfileModal} onClose={() => setShowProfileModal(false)} maxWidth="max-w-sm" className="p-6 relative border-t-4 border-orange-500">
        <button
          onClick={() => setShowProfileModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="flex justify-center mb-4 text-orange-500">
          <AlertCircle size={48} className="drop-shadow-sm" />
        </div>
        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Kindly Complete Your Profile</h3>
        <p className="text-sm text-center text-gray-600 mb-6 leading-relaxed">
          Updating your Blood Group, Emergency Number, and Address ensures we can assist you promptly during an incident. It is also required to generate your complete Vihar Sevak Card.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowProfileModal(false)}
            className="flex-1 py-2.5 text-orange-700 font-semibold bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors border border-orange-100"
          >
            Later
          </button>
          <button
            onClick={() => {
              setShowProfileModal(false);
              if (navigateToProfile) navigateToProfile();
            }}
            className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-saffron-600 hover:from-orange-700 hover:to-saffron-700 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95"
          >
            Complete Now
          </button>
        </div>
      </Modal>

      {/* Alert Modal */}
      <Modal open={isAlertOpen} onClose={() => setIsAlertOpen(false)}>
            <div className="p-5 flex justify-between items-center text-white shrink-0" style={{ background: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Announce Upcoming Vihar</h3>
                  <p className="text-[11px] text-white/85 leading-tight">Every Sevak gets notified instantly</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsAlertOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors shrink-0">
                <X size={18} />
              </button>
            </div>

            <form id="alertViharForm" onSubmit={handleCreateAlert} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" required className="w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm transition-shadow"
                    value={alertData.date} onChange={e => setAlertData({ ...alertData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Time</label>
                  <input type="time" required className="w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm transition-shadow"
                    value={alertData.time} onChange={e => setAlertData({ ...alertData, time: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Type</label>
                <div className="flex bg-[#F7F4F0] p-1 rounded-xl">
                  {(['morning', 'evening'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAlertData({ ...alertData, type: t })}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${alertData.type === t ? 'bg-white text-saffron-700 shadow-sm' : 'text-[#8A6A57]'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">From</label>
                  <select
                    required
                    className="w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm appearance-none transition-shadow"
                    value={alertData.from}
                    onChange={e => setAlertData({ ...alertData, from: e.target.value, to: '' })}
                  >
                    <option value="">Start Location</option>
                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">To</label>
                  <select
                    required
                    disabled={!alertData.from}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm appearance-none transition-shadow disabled:opacity-60"
                    value={alertData.to}
                    onChange={e => setAlertData({ ...alertData, to: e.target.value })}
                  >
                    <option value="">End Location</option>
                    {uniqueAreas.filter(a => a !== alertData.from).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Sadhu Bhagwan</label>
                  <input type="number" min="0" className="w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm transition-shadow"
                    value={alertData.sadhu} onChange={e => setAlertData({ ...alertData, sadhu: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Sadhviji Bhagwan</label>
                  <input type="number" min="0" className="w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm transition-shadow"
                    value={alertData.sadhvi} onChange={e => setAlertData({ ...alertData, sadhvi: Number(e.target.value) })} />
                </div>
              </div>
            </form>

            <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
              <button type="button" onClick={() => setIsAlertOpen(false)} className="flex-1 py-3 text-[#8A6A57] font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
              <button type="submit" form="alertViharForm" disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 py-3 bg-saffron-600 hover:bg-saffron-700 text-white font-extrabold rounded-xl shadow-lg shadow-saffron-100 transition-all active:scale-[0.98] disabled:opacity-60">
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                {isLoading ? 'Sending...' : 'Send Alert to All'}
              </button>
            </div>
      </Modal>

      {/* Active Sevaks Modal */}
      <Modal open={showActiveSevaksModal} onClose={() => setShowActiveSevaksModal(false)} maxWidth="max-w-md" className="relative border-t-4 border-orange-500">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Activity size={20} className="text-orange-500" /> Active Sevaks</h3>
          <button onClick={() => setShowActiveSevaksModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">
          {displayStats.activeUsernames && displayStats.activeUsernames.length > 0 ? (
            <ul className="space-y-2">
              {displayStats.activeUsernames.map((u: string) => {
                const plainUsername = u.split('@')[0];
                const fullName = sevakMap[u] || sevakMap[plainUsername] || plainUsername;
                return (
                  <li key={u} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100 text-orange-900 font-medium shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-800 font-bold text-xs shrink-0 border border-orange-300">
                      {fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{fullName}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center text-gray-500 py-8">No active sevaks found.</div>
          )}
        </div>
      </Modal>

      {/* Export Configuration Modal */}
      <Modal open={showExportModal} onClose={() => !exporting && setShowExportModal(false)}>
        <div className="p-4 flex justify-between items-center text-white shrink-0" style={{ background: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)' }}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={20} />
            <h3 className="font-bold text-lg">Export Configuration</h3>
          </div>
          <button onClick={() => !exporting && setShowExportModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Calendar size={14} /> Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">From</label>
                <input type="date" className="w-full p-2 border rounded-lg text-sm" value={exportDateFrom} onChange={e => setExportDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">To</label>
                <input type="date" className="w-full p-2 border rounded-lg text-sm" value={exportDateTo} onChange={e => setExportDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Gender / Report Type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Users size={14} /> Report Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'all', label: 'All (Common)' },
                { key: 'male', label: 'Sevak (Male)' },
                { key: 'female', label: 'Sevika (Female)' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setExportGender(opt.key)}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors ${exportGender === opt.key ? 'bg-saffron-600 text-white border-saffron-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {exportGender !== 'all' && (
              <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                Only Vihars with at least one {exportGender === 'male' ? 'Sevak' : 'Sevika'} will be included.
                {exportGender === 'male' ? ' Sevika names are hidden from those rows.' : ' Sevak names are hidden from those rows.'}
              </p>
            )}
          </div>

          {/* Columns */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Columns to Include</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPORT_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={exportColumns[col.key]}
                    onChange={e => setExportColumns(prev => ({ ...prev, [col.key]: e.target.checked }))}
                    className="accent-saffron-600"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={downloadPDF}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-colors border border-red-100 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Download PDF
          </button>
          <button
            type="button"
            onClick={downloadExcel}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-bold transition-colors border border-green-100 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Table size={16} />}
            Export Excel
          </button>
        </div>
      </Modal>


      {/* Header - plain greeting bar (Tangerine redesign: gradient moved to Sankalp card below) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={currentUser.full_name} url={currentUser.avatar_url} size={56} className="text-base" />
          <div className="flex flex-col min-w-0">
            {currentUser.role === UserRole.ORG_ADMIN ? (
              <>
                {/* Org name — first */}
                {orgDetails ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-saffron-50 self-start max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 shrink-0" />
                    <span className="text-xs font-bold text-saffron-700 truncate">
                      {orgDetails.name}{orgDetails.city ? `, ${orgDetails.city}` : ''}
                    </span>
                  </div>
                ) : isLoading ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-saffron-50 self-start max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron-200 shrink-0" />
                    <span className="h-3 w-28 bg-saffron-100 animate-pulse rounded" />
                  </div>
                ) : null}

                {/* Captain / Vice Captain badges — same size, below org name */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-bold bg-[#241C17] text-white">
                    <Crown size={13} className="text-saffron-400 shrink-0" />
                    <span className="truncate">Captain: {currentUser.full_name}</span>
                  </span>
                  {orgDetails?.vice_captain_name && (
                    <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-bold bg-[#F1EAFB] text-[#6B4FAE]">
                      <Shield size={13} className="shrink-0" />
                      <span className="truncate">Vice Captain: {orgDetails.vice_captain_name}</span>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="m-0 text-xs font-bold text-[#8A6A57]">Jai Jinendra,</p>
                <h1 className="m-0 text-xl sm:text-2xl font-extrabold tracking-tight text-[#241C17] truncate">
                  {currentUser.full_name}
                </h1>
                {orgDetails ? (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-saffron-50 self-start max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 shrink-0" />
                    <span className="text-xs font-bold text-saffron-700 truncate">
                      {orgDetails.name}{orgDetails.city ? `, ${orgDetails.city}` : ''}
                    </span>
                  </div>
                ) : isLoading ? (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-saffron-50 self-start max-w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron-200 shrink-0" />
                    <span className="h-3 w-28 bg-saffron-100 animate-pulse rounded" />
                  </div>
                ) : null}
                {(captainName || orgDetails?.vice_captain_name) && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {captainName && (
                      <p className="m-0 text-[11px] font-semibold text-[#8A6A57]">
                        Captain: <span className="text-[#241C17] font-bold">{captainName}</span>
                      </p>
                    )}
                    {orgDetails?.vice_captain_name && (
                      <p className="m-0 text-[11px] font-semibold text-[#8A6A57]">
                        Vice Captain: <span className="text-[#241C17] font-bold">{orgDetails.vice_captain_name}</span>
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action buttons (admin only) */}
        {currentUser.role === UserRole.ORG_ADMIN && (
          <div className="flex flex-row gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsAlertOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-3 sm:px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
            >
              <MapPin size={18} />
              <span className="truncate">Alert Vihar</span>
            </button>

            <div className="relative flex-1 md:flex-none">
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-[#241C17] font-semibold px-3 sm:px-4 py-2.5 rounded-xl transition-all active:scale-95 text-sm shadow-sm"
              >
                <Download size={18} />
                <span className="truncate">Export</span>
              </button>
            </div>
          </div>
        )}

        {/* Add Vihar (Sevak only) — a Sevak has no direct-log flow, so their entry
            is always a submission awaiting Captain approval. */}
        {currentUser.role === UserRole.SEVAK && onAddVihar && (
          <button
            onClick={onAddVihar}
            className="flex items-center justify-center gap-1.5 bg-saffron-600 hover:bg-saffron-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm w-full md:w-auto shrink-0"
          >
            <Plus size={18} />
            <span>Add Vihar</span>
          </button>
        )}
      </div>

      {/* No Vihar Since... — a personal nudge once a Sevak has gone quiet for a while */}
      {!isLoading && daysSinceLastVihar !== null && daysSinceLastVihar >= 5 && (
        <div
          className="rounded-[22px] p-5 flex items-center gap-4 text-white"
          style={{
            background: daysSinceLastVihar >= 15
              ? 'linear-gradient(150deg,#DC2626,#991B1B)'
              : daysSinceLastVihar >= 7
                ? 'linear-gradient(150deg,#EA580C,#C2410C)'
                : 'linear-gradient(150deg,#F59E0B,#D97706)',
          }}
        >
          <div className="shrink-0 w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="m-0 font-extrabold text-base">No Vihar Since {daysSinceLastVihar} Days</p>
            <p className="m-0 text-sm text-white/90 mt-0.5">Kindly Join In Seva</p>
          </div>
        </div>
      )}

      {/* Yearly Sankalp — real progress vs. the goal set in Profile settings */}
      <SankalpRing count={yearlyViharCount} goal={yearlyGoal} periodLabel={selectedVY.label} />

      <UpcomingViharCard currentUser={currentUser} onViewAll={navigateToNotifications} />

      {/* Stats section */}
      <div className="max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="m-0 text-sm font-bold text-[#241C17]">{currentUser.role === UserRole.ORG_ADMIN ? 'Org Stats' : 'Your Stats'}</p>
            <span className="text-[10px] font-extrabold bg-saffron-100 text-saffron-700 px-2 py-0.5 rounded-full">{selectedVY.label}</span>
          </div>
          <ViharYearSelector
            selectedStartYear={selectedVYStartYear}
            currentStartYear={currentVYStartYear}
            onChange={setSelectedVYStartYear}
          />
        </div>
        {/* Quick Stats Grid — primary tiles (Tangerine redesign, flat tints) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Total Km */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#FFF0E5', animationDelay: '0ms' }}>
              <div className="flex items-start justify-between">
                {isLoading ? <SkeletonLoader /> : (
                  <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{displayStats.totalKm}<span className="text-[13px] font-bold text-[#8A6A57]"> km</span></p>
                )}
                <Footprints size={21} style={{ color: '#DE8A5A' }} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs font-semibold text-[#B5602C]">Total KM</p>
            </div>

            {/* 2. Total Vihars */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#E9F4FD', animationDelay: '40ms' }}>
              <div className="flex items-start justify-between">
                {isLoading ? <SkeletonLoader /> : (
                  <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{displayStats.totalVihars}</p>
                )}
                <MapPin size={21} style={{ color: '#5B9BC7' }} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs font-semibold text-[#2E7EB0]">Vihars</p>
            </div>

            {/* 3. Sadhu / Sadhvi (combined) */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#FCEAEB', animationDelay: '80ms' }}>
              <div className="flex items-start justify-between">
                {isLoading ? <SkeletonLoader /> : (
                  <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{displayStats.totalSadhu}<span className="text-sm text-[#D9A6A5]"> / </span>{displayStats.totalSadhvi}</p>
                )}
                <Users size={21} style={{ color: '#D68C89' }} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs font-semibold text-[#C05A57]">Sadhu / Sadhvi</p>
            </div>

            {/* 4. Co-Sevak */}
            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#F1EAFB', animationDelay: '120ms' }}>
              <div className="flex items-start justify-between gap-2">
                {isLoading ? <SkeletonLoader /> : (
                  currentUser.role === UserRole.ORG_ADMIN ? (
                    <p className="text-[22px] font-extrabold text-[#241C17] leading-none">{displayStats.totalOrgSevaks}</p>
                  ) : displayStats.vSynergy && displayStats.vSynergy !== "N/A" ? (
                    <p className="text-[15px] font-extrabold text-[#241C17] leading-tight truncate">{displayStats.vSynergy.split(',')[0]}</p>
                  ) : (
                    <p className="text-[15px] font-semibold text-[#8A6A57]/70 italic">Find a partner</p>
                  )
                )}
                <Handshake size={21} style={{ color: '#9A85C9' }} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs font-semibold text-[#6B4FAE]">Co-Sevak</p>
            </div>
          </div>

          {/* Secondary stats — Rank / Streak / Total Sevaks / Active Sevaks (kept from existing dashboard, not in the pilot mock but not removed) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {currentUser.role !== UserRole.ORG_ADMIN && (
              <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#FFF6E0', animationDelay: '160ms' }}>
                <div className="flex items-start justify-between">
                  {isLoading ? <SkeletonLoader /> : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[22px] font-extrabold text-[#241C17] leading-none">#{displayStats.vRank}</span>
                      {typeof displayStats.vRank === 'number' && displayStats.totalOrgSevaks > 0 && (
                        <span className="text-xs font-bold text-[#8A6A57]">/ {displayStats.totalOrgSevaks}</span>
                      )}
                    </div>
                  )}
                  <Medal size={21} style={{ color: '#C9A227' }} className="shrink-0" />
                </div>
                <p className="mt-1 text-xs font-semibold text-[#946800]">Rank in Org</p>
              </div>
            )}

            {currentUser.role !== UserRole.ORG_ADMIN && (
              <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#FFF0E5', animationDelay: '180ms' }}>
                <div className="flex items-start justify-between">
                  {isLoading ? <SkeletonLoader /> : (
                    <span className="text-[22px] font-extrabold text-[#241C17] leading-none">{displayStats.streak}</span>
                  )}
                  <Flame size={21} style={{ color: '#DE6B38' }} className="shrink-0" />
                </div>
                <p className="mt-1 text-xs font-semibold text-[#B5602C]">Day Streak</p>
              </div>
            )}

            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#E6F7F0', animationDelay: '200ms' }}>
              <div className="flex items-start justify-between">
                {isLoading ? <SkeletonLoader /> : (
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-extrabold text-[#241C17] leading-none">{displayStats.totalOrgSevaks}</span>
                    <span className="text-[10px] font-bold text-[#1F8A63]/70">{displayStats.totalMale || 0}M / {displayStats.totalFemale || 0}F</span>
                  </div>
                )}
                <Users size={21} style={{ color: '#4EA37E' }} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs font-semibold text-[#1F8A63]">Total Sevaks</p>
            </div>

            <div className="rounded-[18px] p-4 vseva-stagger-in" style={{ background: '#E3F6F5', animationDelay: '240ms' }}>
              {isLoading ? <SkeletonLoader /> : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity size={21} style={{ color: '#2F9CA6' }} className="shrink-0" />
                    <span className="text-[22px] font-extrabold text-[#241C17] leading-none">{displayStats.activeSevaks}</span>
                  </div>
                  <button onClick={() => setShowActiveSevaksModal(true)} className="text-[9px] font-bold px-2.5 py-1 bg-white/70 text-[#1B8A94] rounded-lg hover:bg-white transition-colors active:scale-95 tracking-wider">VIEW</button>
                </div>
              )}
              <p className="mt-1 text-xs font-semibold text-[#1B8A94]" title=">= 1 Vihar in last 30 days">Active Sevaks</p>
            </div>
          </div>

          {/* Consistency — this week */}
          <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <p className="m-0 mb-3.5 text-sm font-bold text-[#241C17]">Consistency · This week</p>
            <div className="grid grid-cols-7 gap-2 text-center">
              {weeklyConsistency.map((d, i) => (
                <div key={d.label}>
                  <p className="m-0 mb-1.5 text-[10px] font-bold text-gray-400">{d.label}</p>
                  <div
                    className="w-full aspect-square rounded-full vseva-stagger-in"
                    style={{
                      background: d.done ? '#DE6B38' : '#F2EEE8',
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-[22px] p-5 flex flex-col gap-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <p className="m-0 text-sm font-bold text-[#241C17]">Recent Activity</p>
              {navigateToNotifications && (
                <button onClick={navigateToNotifications} className="text-[12.5px] font-bold text-saffron-600 hover:text-saffron-700">
                  View all Vihars
                </button>
              )}
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400">No Vihars logged yet.</p>
            ) : (
              recentActivity.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-3 vseva-stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-[#EAF6E6] flex items-center justify-center">
                    <Footprints size={17} className="text-[#5A9A45]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13.5px] font-bold text-[#241C17] truncate">{entry.vihar_from} → {entry.vihar_to}</p>
                    <p className="mt-0.5 text-xs text-gray-500 capitalize">
                      {formatRelativeDate(entry.vihar_date)} · {entry.vihar_type} · {(entry.sevaks || []).length} Sevak{(entry.sevaks || []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="m-0 text-sm font-extrabold text-saffron-600 shrink-0">{(entry.distance_km ?? entry.haversine_km ?? 0).toFixed(1)} km</p>
                </div>
              ))
            )}
          </div>

      </div>

    </div>

  );
};

export default Dashboard;