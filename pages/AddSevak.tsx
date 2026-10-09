import ResetSevakPasswordModal from '../components/ResetSevakPasswordModal';
import React, { useState, useEffect, useMemo } from 'react';
import { BRAND } from '@brand';
import { UserProfile, Organization, ContactNumber, ViharEntry, SevaPreference } from '../types';
import { getMissingProfileFields, getProfileCompletion } from '../services/profileCompletion';
import ViharPreferencesFields, { formatSevaPreferences } from '../components/ViharPreferencesFields';
import BulkSevakImport from '../components/BulkSevakImport';
import BottomSheet from '../components/BottomSheet';
import { deliverPdf, deliverFile } from '../services/pdfDelivery';
import { dataService } from '../services/dataService';
import { OCCUPATIONS } from '../services/occupations';
import { UserPlus, Loader2, CheckCircle, Users, Copy, Check, Trash2, AlertTriangle, Search, Clock, Edit2, X, Download, Printer, ArrowLeft, Footprints, KeyRound, Upload, FileText, Table } from 'lucide-react';
import IDCardBadge from '../components/IDCardBadge';
import { useToast } from '../context/ToastContext';
import CircularProgressBar from '../components/CircularProgressBar';
import Skeleton from '../components/Skeleton';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import StatusScreen from '../components/StatusScreen';
import { toLocalDateKey } from '../services/dateUtils';
import { isDateInViharYear } from '../services/viharYear';
import { useViharYear } from '../context/ViharYearContext';


interface AddSevakProps {
  currentUser: UserProfile;
}

// Formats a UTC ISO timestamp into a human-readable relative string
const formatLastLogin = (isoString?: string): { label: string; color: string } => {
  if (!isoString) return { label: 'Never', color: 'text-gray-400' };

  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  let label: string;
  if (mins < 1) label = 'Just now';
  else if (mins < 60) label = `${mins}m ago`;
  else if (hours < 24) label = `${hours}h ago`;
  else if (days === 1) label = 'Yesterday';
  else if (days < 7) label = `${days} days ago`;
  else if (days < 30) label = `${Math.floor(days / 7)}w ago`;
  else label = new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  const color = days < 3 ? 'text-green-500' : days < 14 ? 'text-amber-500' : days < 30 ? 'text-red-500' : 'text-gray-400';
  return { label, color };
};

// Same relative-day treatment as formatLastLogin, but for a Vihar date
// (a plain date, not a timestamp) scoped to whichever Vihar Year is selected.
// Unlike last-login, this never fades to gray for old dates — long-inactive
// stays red so it reads as a signal worth acting on, not a stale detail.
const formatLastVihar = (dateStr?: string): { label: string; color: string } => {
  if (!dateStr) return { label: 'No Vihar', color: 'text-gray-400' };

  const days = Math.floor((Date.now() - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000);

  let label: string;
  if (days <= 0) label = 'Today';
  else if (days === 1) label = 'Yesterday';
  else if (days < 7) label = `${days} days ago`;
  else if (days < 30) label = `${Math.floor(days / 7)}w ago`;
  else label = new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  const color = days < 7 ? 'text-green-500' : days < 30 ? 'text-amber-500' : 'text-red-500';
  return { label, color };
};

// One label + value cell of the Sevak Details grid. `wide` spans both columns.
const DetailField: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}>
    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
    {children}
  </div>
);

const AddSevak: React.FC<AddSevakProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    gender: 'Male',
    alias: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ username: string, password: string, renamed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for the list of existing sevaks
  const [sevaks, setSevaks] = useState<UserProfile[]>([]);
  const [loadingSevaks, setLoadingSevaks] = useState(true);
  const [sevaksLoadError, setSevaksLoadError] = useState<'offline' | 'error' | null>(null);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [editMobile, setEditMobile] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string, name: string } | null>(null);

  const [selectedSevak, setSelectedSevak] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<{ mobile: string; age: string; bloodGroup: string; emergencyNumber: string; emergencyContactName: string; occupation: string; occupationDetails: string; address: string; gender: string; alias: string; viharScope: string; sevaPreferences: SevaPreference[] }>({ mobile: '', age: '', bloodGroup: '', emergencyNumber: '', emergencyContactName: '', occupation: '', occupationDetails: '', address: '', gender: 'Male', alias: '', viharScope: '', sevaPreferences: [] });
  const [showIdCard, setShowIdCard] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportChoice, setShowExportChoice] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Organization State
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [orgEntries, setOrgEntries] = useState<ViharEntry[]>([]);
  const { selectedVY } = useViharYear();


  const fetchData = async () => {
    try {
      setLoadingSevaks(true);
      setSevaksLoadError(null);
      const [sevaksData, org, entries] = await Promise.all([
        dataService.getOrgSevaks(currentUser.organization_id),
        dataService.getOrganization(currentUser.organization_id),
        dataService.getEntries(currentUser.organization_id),
      ]);
      setSevaks(sevaksData);
      setOrgEntries(entries);
      if (org) setOrgDetails(org);
    } catch (err) {
      console.error("Failed to load data", err);
      showToast("Could not load organization members", 'error');
      setSevaksLoadError(navigator.onLine ? 'error' : 'offline');
    } finally {
      setLoadingSevaks(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchData();
  }, [currentUser.organization_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const creds = await dataService.createSevak(currentUser.organization_id, {
        fullName: formData.fullName,
        mobile: formData.mobile,
        gender: formData.gender,
        age: undefined,
        bloodGroup: undefined,
        emergencyNumber: '',
        address: '',
        alias: formData.alias,
      });

      // the server adds a number when another Sevak (in any group) already has this name
      const wanted = formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      setSuccess({ ...creds, renamed: creds.username !== wanted });
      showToast(`Sevak ${formData.fullName} added successfully!`, 'success');
      setFormData({ fullName: '', mobile: '', gender: 'Male', alias: '' });
      // Refresh the list after successful addition
      fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Failed to add sevak. Ensure backend functions are deployed.";
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Username copied to clipboard", 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (userId: string, userName: string) => {
    setShowDeleteModal({ id: userId, name: userName });
  };

  const confirmDelete = async () => {
    if (!showDeleteModal) return;
    const { id: userId, name: userName } = showDeleteModal;
    
    setDeletingId(userId);
    setShowDeleteModal(null);
    try {
      await dataService.deleteSevak(userId);
      // Remove from local state immediately
      setSevaks(prev => prev.filter(s => s.id !== userId));
      if (selectedSevak?.id === userId) setSelectedSevak(null);
      showToast(`${userName} has been removed.`, 'success');
    } catch (err: any) {
      showToast(`Failed to delete user: ${err.message}`, 'error');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const openModal = (sevak: UserProfile) => {
    setSelectedSevak(sevak);
    setEditingId(null);
  };

  const startEdit = (sevak: UserProfile) => {
    setEditingId(sevak.id);
    setEditForm({
      mobile: sevak.mobile || '',
      age: sevak.age?.toString() || '',
      bloodGroup: sevak.blood_group || 'O+',
      emergencyNumber: sevak.emergency_number || '',
      emergencyContactName: sevak.emergency_contact_name || '',
      occupation: sevak.occupation || '',
      occupationDetails: sevak.occupation_details || '',
      address: sevak.address || '',
      gender: sevak.gender || 'Male',
      alias: sevak.alias || '',
      viharScope: sevak.vihar_scope || '',
      sevaPreferences: (sevak.seva_preferences || []) as SevaPreference[],
    });
  };

  const handleSaveProfile = async () => {
    if (!selectedSevak) return;
    if (editForm.occupation === 'Other' && !editForm.occupationDetails.trim()) {
      showToast('Please specify the occupation', 'error');
      return;
    }
    setSavingId(selectedSevak.id);
    
    const newAge = editForm.age ? parseInt(editForm.age) : undefined;
    
    try {
      await dataService.updateSevakDetails(selectedSevak.id, {
        age: isNaN(newAge as number) ? undefined : newAge,
        bloodGroup: editForm.bloodGroup,
        emergencyNumber: editForm.emergencyNumber,
        emergencyContactName: editForm.emergencyNumber ? editForm.emergencyContactName : '',
        occupation: editForm.occupation,
        occupationDetails: editForm.occupation ? editForm.occupationDetails : '',
        address: editForm.address,
        gender: editForm.gender,
        alias: editForm.alias,
        ...(BRAND.sevakViharPreferences ? { viharScope: editForm.viharScope, sevaPreferences: editForm.sevaPreferences } : {}),
      });
      // update local
      const updated = { ...selectedSevak, age: newAge, blood_group: editForm.bloodGroup, emergency_number: editForm.emergencyNumber, emergency_contact_name: editForm.emergencyNumber ? editForm.emergencyContactName.trim() || null : null, occupation: editForm.occupation || null, occupation_details: editForm.occupation ? editForm.occupationDetails.trim() || null : null, address: editForm.address, gender: editForm.gender, alias: editForm.alias.trim() || null,
        ...(BRAND.sevakViharPreferences ? { vihar_scope: (editForm.viharScope || null) as UserProfile['vihar_scope'], seva_preferences: editForm.sevaPreferences.length ? editForm.sevaPreferences : null } : {}) };
      setSevaks(prev => prev.map(s => s.id === selectedSevak.id ? updated : s));
      setSelectedSevak(updated);
      showToast(`Profile updated successfully!`, 'success');
      setEditingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  // Most recent Vihar date per sevak within the selected Vihar Year — same
  // relative-time treatment as last login, but scoped to selectedVY.
  const lastViharMap = useMemo(() => {
    const map: Record<string, string> = {};
    orgEntries.forEach(entry => {
      if (!isDateInViharYear(entry.vihar_date, selectedVY)) return;
      (entry.sevaks || []).forEach(username => {
        if (!map[username] || entry.vihar_date > map[username]) {
          map[username] = entry.vihar_date;
        }
      });
    });
    return map;
  }, [orgEntries, selectedVY.start.getTime(), selectedVY.end.getTime()]);

  // Profile completion (getMissingProfileFields / getProfileCompletion) comes from services/profileCompletion.




  const sortedSevaks = [...sevaks].sort((a, b) => {
    const timeA = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
    const timeB = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
    return timeB - timeA;
  });

  const filteredSevaks = sortedSevaks.filter(sevak =>
    sevak.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sevak.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sevak.alias || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    sevak.mobile.includes(searchQuery)
  );

  // Sr. No. follows the order Sevaks were added (#1 = the first one ever added) and stays with the card,
  // whatever order the cards are shown in.
  const serialById = useMemo(() => {
    const ordered = [...sevaks].sort((a, b) =>
      (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id));
    return Object.fromEntries(ordered.map((s, i) => [s.id, i + 1])) as Record<string, number>;
  }, [sevaks]);

  const exportRows = () => [...sevaks]
    .sort((a, b) => (serialById[a.id] || 0) - (serialById[b.id] || 0))
    .map(s => ({
      'Sr. No': serialById[s.id],
      Name: s.full_name,
      Alias: s.alias || '',
      Username: s.username,
      Mobile: s.mobile,
      Gender: s.gender || '',
      Age: s.age ? String(s.age) : '',
      ...(BRAND.sevakViharPreferences ? { 'Vihar Type': s.vihar_scope || '', 'Seva Preference': formatSevaPreferences(s.seva_preferences) } : {}),
    }));

  const exportMembers = async (kind: 'pdf' | 'excel') => {
    if (sevaks.length === 0) {
      showToast("No members to download", 'error');
      return;
    }
    setExporting(kind);
    const rows = exportRows();
    const base = `${BRAND.shortName}_Sevaks_${toLocalDateKey(new Date())}`.replace(/\s+/g, '_');
    try {
      if (kind === 'excel') {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sevaks');
        const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        await deliverFile(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${base}.xlsx`);
      } else {
        const needsIndic = rows.some(r => Object.values(r).some(v => /[\u0900-\u097F\u0A80-\u0AFF]/.test(String(v))));
        const [{ default: jsPDF }, { default: autoTable }, fonts] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
          needsIndic
            ? Promise.all([import('../assets/NotoSansDevanagari-Regular'), import('../assets/NotoSansGujarati-Regular')])
            : Promise.resolve(null),
        ]);
        const doc = new jsPDF({ orientation: BRAND.sevakViharPreferences ? 'landscape' : 'portrait' });
        if (fonts) {
          doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', fonts[0].NotoSansDevanagariBase64);
          doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
          doc.addFileToVFS('NotoSansGujarati-Regular.ttf', fonts[1].NotoSansGujaratiBase64);
          doc.addFont('NotoSansGujarati-Regular.ttf', 'NotoSansGujarati', 'normal');
        }
        const title = orgDetails?.name ? `${orgDetails.name}${orgDetails.city ? `, ${orgDetails.city}` : ''}` : BRAND.name;
        doc.setFontSize(14);
        doc.text(title, 14, 16);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Sevaks: ${rows.length}   ·   ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, 14, 22);
        const head = Object.keys(rows[0]);
        autoTable(doc, {
          startY: 27,
          head: [head],
          body: rows.map(r => head.map(h => String((r as Record<string, unknown>)[h] ?? ''))),
          styles: { fontSize: 8, lineColor: [220, 220, 220], lineWidth: 0.2, textColor: [30, 30, 30] },
          headStyles: { fillColor: [222, 107, 56], textColor: 255 },
          alternateRowStyles: { fillColor: [255, 250, 245] },
          didParseCell: (hook) => {
            const text = hook.cell.raw != null ? String(hook.cell.raw) : '';
            if (/[\u0A80-\u0AFF]/.test(text)) hook.cell.styles.font = 'NotoSansGujarati';
            else if (/[\u0900-\u097F]/.test(text)) hook.cell.styles.font = 'NotoSansDevanagari';
          },
        });
        await deliverPdf(doc, `${base}.pdf`);
      }
      setShowExportChoice(false);
    } catch (err) {
      console.error('Export failed', err);
      showToast('Could not create the file', 'error');
    } finally {
      setExporting(null);
    }
  };


  const generateWhatsAppMessage = (sevak: UserProfile) => {
    const orgName = orgDetails?.name || 'our organization';
    const orgCity = orgDetails?.city || 'our city';
    const message = `Pranam ${sevak.full_name}

You have been successfully added to ${BRAND.name} under the organization
${orgName}, ${orgCity}

You can now view your Vihar summary and share your contribution.

Login Details:
Username: ${sevak.username}
Password: ${sevak.mobile}

All Vihar entries are managed by ${currentUser.full_name}.


Login to ${BRAND.name}:
${BRAND.siteUrl || window.location.origin}

Install ${BRAND.name} App.
${BRAND.instagram ? `
Follow ${BRAND.name} for updates:
${BRAND.instagram.url}
` : ''}
"${BRAND.slogan}"

${BRAND.name}${BRAND.cardCredit ? `
${BRAND.cardCredit}` : ''}`;

    return encodeURIComponent(message);
  };

  // A gentle Vihar reminder, prefilled with the sevak's own last-recorded
  // Vihar date (within the selected Vihar Year) so it reads as personal.
  const generateViharReminderMessage = (sevak: UserProfile) => {
    const lastDate = lastViharMap[sevak.username];
    const lastDateLabel = lastDate
      ? new Date(`${lastDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'not yet recorded this Vihar Year';
    const message = `Jai Jinendra ${sevak.full_name},
This is a gentle reminder regarding your Vihar Seva.
Your last Vihar was on ${lastDateLabel}.
Kindly do Vihar and continue your Seva.`;
    return encodeURIComponent(message);
  };

  // Border/background/text triplet per last-Vihar recency, matching the
  // color scale formatLastVihar already computes.
  const viharButtonClasses = (color: string) => {
    if (color === 'text-green-500') return 'bg-green-50 hover:bg-green-100 text-green-600 border-green-100';
    if (color === 'text-amber-500') return 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100';
    if (color === 'text-red-500') return 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100';
    return 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-100';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 md:space-y-4">

      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17] flex items-center gap-2">
          <UserPlus size={20} className="text-saffron-600" />
          Add New Sevak
        </h1>
        <p className="text-xs text-[#8A6A57]">Create a profile and login credentials for a new volunteer</p>
      </div>

      {/* Form Section - white card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 md:p-4 space-y-4">

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fade-in">
              <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
              <h3 className="text-lg font-bold text-green-800">Sevak Added Successfully!</h3>
              <p className="text-sm text-gray-600 mt-2">Share these credentials with the sevak:</p>
              <div className="mt-4 bg-white p-4 rounded border border-green-100 inline-block text-left shadow-sm">
                <p className="text-sm"><strong>Username:</strong> {success.username}</p>
                <p className="text-sm"><strong>Password:</strong> {success.password}</p>
              </div>
              {success.renamed && (
                <p className="mt-3 text-xs text-gray-600 max-w-sm mx-auto">Another Sevak already uses this name, so a number was added to the username. The Sevak can still sign in with their name and mobile number.</p>
              )}
            </div>
          )}

          {/* Mobile: stacked. Desktop: one row — name, mobile, gender, create button */}
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-[1.25fr_1fr_0.9fr_auto_auto] md:items-end md:gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                required
                className="w-full p-3 rounded-xl bg-[#F7F4F0] border-none focus:ring-2 focus:ring-saffron-300 outline-none font-semibold text-[#241C17]"
                placeholder="e.g. Rahul Jain"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Mobile Number</label>
              <input
                type="tel"
                required
                maxLength={10}
                className="w-full p-3 rounded-xl bg-[#F7F4F0] border-none focus:ring-2 focus:ring-saffron-300 outline-none font-semibold text-[#241C17]"
                placeholder="10 digit number (Used as Password)"
                value={formData.mobile}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, mobile: val });
                }}
              />
              <p className="text-xs text-gray-400 mt-1 md:hidden">Additional details (age, address, etc.) can be filled by the sevak on their profile.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Alias <span className="normal-case font-semibold text-gray-400">(optional)</span></label>
              <input
                type="text"
                maxLength={60}
                className="w-full p-3 rounded-xl bg-[#F7F4F0] border-none focus:ring-2 focus:ring-saffron-300 outline-none font-semibold text-[#241C17]"
                placeholder="e.g. Rahul Paldi, Bhai"
                value={formData.alias}
                onChange={e => setFormData({ ...formData, alias: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider mb-1.5">Gender</label>
              <div className="flex bg-[#F7F4F0] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Male' })}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                    formData.gender === 'Male'
                      ? 'bg-saffron-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Female' })}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                    formData.gender === 'Female'
                      ? 'bg-saffron-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-saffron-600 hover:bg-saffron-700 text-white font-medium py-3.5 md:py-3 md:px-5 rounded-xl shadow-lg md:shadow-md flex justify-center items-center space-x-2 transition-all mt-4 md:mt-0 whitespace-nowrap"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
              <span>{loading ? "Creating..." : "Create Sevak Account"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={24} className="text-saffron-600" />
              Organization Members
              {!loadingSevaks && (
                <span className="text-xs font-bold text-saffron-700 bg-saffron-100 px-2.5 py-1 rounded-full">
                  {sevaks.length} {sevaks.length === 1 ? 'Member' : 'Members'}
                </span>
              )}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search sevaks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none text-sm"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            
            <button
              onClick={() => setShowBulkImport(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap shadow-sm"
              title="Add many Sevaks from a CSV or Excel file"
            >
              <Upload size={16} className="text-gray-500" />
              Bulk upload
            </button>
            <button
              onClick={() => setShowExportChoice(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap shadow-sm"
              title="Download the member list"
            >
              <Download size={16} className="text-gray-500" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingSevaks ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-gray-50/50">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[110px] w-full rounded-[20px]" />
              ))}
            </div>
          ) : sevaksLoadError ? (
            <div className="p-4">
              <StatusScreen variant={sevaksLoadError} onRetry={fetchData} compact />
            </div>
          ) : sevaks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No members found. Add your first member above.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-gray-50/50">
              {filteredSevaks.length === 0 ? (
                <div className="col-span-full p-12 text-center text-gray-400 font-medium">
                  No members found matching "{searchQuery}"
                </div>
              ) : (
                filteredSevaks.map((sevak, index) => {
                  const { label, color } = formatLastLogin(sevak.last_login_at);
                  const statusDotColor = color.replace('text-', 'bg-');
                  const { label: viharLabel, color: viharColor } = formatLastVihar(lastViharMap[sevak.username]);
                  const pct = getProfileCompletion(sevak);

                   return (
                    <div key={sevak.id} className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col group overflow-hidden relative">

                      {/* Top Line: Sr No + Name + Last Seen */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded tracking-widest uppercase border border-gray-100 whitespace-nowrap flex-shrink-0">
                            #{serialById[sevak.id] ?? index + 1}
                          </span>
                          <h3 className="text-base font-bold text-gray-900 tracking-tight truncate group-hover:text-saffron-600 transition-colors">
                            {sevak.full_name}
                            {sevak.alias && <span className="font-semibold text-[#8A6A57]"> ({sevak.alias})</span>}
                          </h3>
                        </div>
                        {/* Last seen */}
                        <div className="flex items-center gap-1 whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded border border-gray-100 flex-shrink-0">
                           <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor} shadow-sm`}></div>
                           <span className={`text-[9px] font-bold ${color} uppercase tracking-wider`}>{label}</span>
                        </div>
                      </div>

                      {/* Bottom Row: Completion Ring + Profile + WhatsApp + Last Vihar reminder */}
                      <div className="mt-3 flex gap-2 items-center">
                        {/* Circular Progress - now in bottom row */}
                        <div className="w-12 h-12 flex-shrink-0" title={`${pct}% profile complete`}>
                          <CircularProgressBar
                            percent={pct}
                            animate={false}
                            strokeWidth={8}
                            barColor={pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'}
                            trackColor="#e5e7eb"
                            centerContent={<Avatar name={sevak.full_name} url={sevak.avatar_url} size={34} className="text-[11px]" />}
                          />
                        </div>
                        <button
                          onClick={() => openModal(sevak)}
                          className="flex-1 py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-[12px] font-extrabold text-[11px] tracking-wider uppercase transition-colors flex justify-center items-center gap-2 border border-indigo-100 hover:border-indigo-200 shadow-sm"
                        >
                          Profile
                        </button>
                        <a
                          href={`https://wa.me/91${sevak.mobile}?text=${generateWhatsAppMessage(sevak)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-9 h-9 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-[12px] transition-colors border border-[#25D366]/20 focus:outline-none shadow-sm shrink-0"
                          title="Notify via WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px] shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                        <a
                          href={`https://wa.me/91${sevak.mobile}?text=${generateViharReminderMessage(sevak)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 h-9 px-2.5 rounded-[12px] border transition-colors shrink-0 ${viharButtonClasses(viharColor)}`}
                          title="Send Vihar reminder via WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Footprints size={12} className="shrink-0" />
                          <span className="text-[9px] font-extrabold uppercase tracking-wider whitespace-nowrap">{viharLabel}</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>


      <BulkSevakImport open={showBulkImport} onClose={() => setShowBulkImport(false)} orgId={currentUser.organization_id} onCreated={fetchData} />

      <BottomSheet open={showExportChoice} onClose={() => { if (!exporting) setShowExportChoice(false); }} maxWidth="max-w-sm">
        <div className="px-5 pt-3 pb-5 md:pt-5">
          <p className="m-0 text-base font-extrabold text-[#241C17]">Export member list</p>
          <p className="m-0 mt-0.5 text-xs text-[#8A6A57]">{sevaks.length} members, numbered in the order they were added</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([['pdf', 'PDF', FileText, 'text-red-600 bg-red-50'], ['excel', 'Excel', Table, 'text-green-700 bg-green-50']] as const).map(([kind, label, Icon, tone]) => (
              <button
                key={kind}
                type="button"
                disabled={!!exporting}
                onClick={() => exportMembers(kind)}
                className={`flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl font-extrabold text-sm active:scale-[0.98] transition disabled:opacity-60 ${tone}`}
              >
                {exporting === kind ? <Loader2 size={24} className="animate-spin" /> : <Icon size={24} />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* View More Details Modal */}
      <Modal open={!!selectedSevak} onClose={() => { setSelectedSevak(null); setEditingId(null); setShowIdCard(false); }} maxWidth="max-w-md">
        {selectedSevak && (() => {
          const editing = editingId === selectedSevak.id;
          const missing = getMissingProfileFields(selectedSevak);
          const modalPct = getProfileCompletion(selectedSevak);
          const pctColor = modalPct === 100 ? { bg: '#dcfce7', text: '#16a34a' } : modalPct >= 50 ? { bg: '#fef3c7', text: '#d97706' } : { bg: '#fee2e2', text: '#dc2626' };
          const joined = selectedSevak.created_at && !isNaN(new Date(selectedSevak.created_at).getTime())
            ? new Date(selectedSevak.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
          const inp = 'w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 outline-none';
          const close = () => { setSelectedSevak(null); setEditingId(null); setShowIdCard(false); };
          return (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-saffron-600" />
                Sevak Details
              </h3>
              <button onClick={close} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-3 overflow-y-auto flex-1">
              {showIdCard ? (
                 <div className="flex flex-col items-center justify-center py-3 min-h-[40vh]">
                    <IDCardBadge user={selectedSevak} orgName={currentUser.organization_id} />
                    <p className="text-xs text-gray-500 mt-4 text-center max-w-xs print:hidden">
                        Print this badge. Scanning the QR code will verify the identity.
                    </p>
                 </div>
              ) : (
                <>
                  {/* Identity */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 shrink-0">
                      <Avatar name={selectedSevak.full_name} url={selectedSevak.avatar_url} size={56} variant="gradient" className="text-xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-bold text-gray-900 truncate">{selectedSevak.full_name}{selectedSevak.alias && <span className="font-semibold text-gray-500"> ({selectedSevak.alias})</span>}</h4>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        {editing ? (
                          <div className="flex bg-gray-100 p-0.5 rounded-lg">
                            {['Male', 'Female'].map(g => (
                              <button key={g} type="button" onClick={() => setEditForm({ ...editForm, gender: g })}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${editForm.gender === g ? 'bg-saffron-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{g}</button>
                            ))}
                          </div>
                        ) : (
                          <span className={`font-bold ${selectedSevak.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>{selectedSevak.gender || 'Unknown'}</span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: pctColor.bg, color: pctColor.text }}>Profile {modalPct}%</span>
                      </div>
                      {joined && <p className="mt-0.5 text-[11px] text-gray-400">Joined {joined}</p>}
                    </div>
                  </div>
                  {!editing && missing.length > 0 && (
                    <p className="mt-2 text-[11px] leading-snug text-amber-700 bg-amber-50 rounded-md px-2 py-1.5">Still to fill: {missing.join(', ')}</p>
                  )}

                  {/* Details — compact two-column grid */}
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <DetailField label="Username">
                      <div className="flex items-center justify-between gap-1">
                        <code className="text-sm font-mono text-gray-800 truncate">{selectedSevak.username}</code>
                        <button onClick={() => handleCopy(selectedSevak.username, selectedSevak.id)} className="text-gray-400 hover:text-saffron-600 p-0.5 shrink-0" title="Copy username">
                          {copiedId === selectedSevak.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </DetailField>

                    {/* Mobile is the Sevak's password: changed only through Reset password */}
                    <DetailField label="Mobile Number">
                      <span className="text-sm font-mono font-semibold text-gray-800">{selectedSevak.mobile}</span>
                    </DetailField>

                    <DetailField label="Age">
                      {editing ? (
                        <input type="number" min={1} max={120} value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} className={inp} />
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">{selectedSevak.age || '-'}</span>
                      )}
                    </DetailField>

                    <DetailField label="Blood Group">
                      {editing ? (
                        <select value={editForm.bloodGroup} onChange={e => setEditForm({ ...editForm, bloodGroup: e.target.value })} className={inp}>
                          {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">{selectedSevak.blood_group || '-'}</span>
                      )}
                    </DetailField>

                    <DetailField label="Family Emergency Number">
                      {editing ? (
                        <input type="tel" maxLength={10} value={editForm.emergencyNumber} onChange={e => setEditForm({ ...editForm, emergencyNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit number" className={inp} />
                      ) : (
                        <span className="text-sm font-mono font-semibold text-gray-900">{selectedSevak.emergency_number || '-'}</span>
                      )}
                    </DetailField>

                    <DetailField label="Emergency Contact Name">
                      {editing ? (
                        <input type="text" maxLength={80} value={editForm.emergencyContactName} onChange={e => setEditForm({ ...editForm, emergencyContactName: e.target.value })} placeholder="Whose number?" className={inp} />
                      ) : (
                        <span className="text-sm font-semibold text-gray-900 break-words">{selectedSevak.emergency_contact_name || '-'}</span>
                      )}
                    </DetailField>

                    <DetailField label="Occupation / Profession" wide>
                      {editing ? (
                        <div className="grid grid-cols-2 gap-2">
                          <select value={editForm.occupation} onChange={e => setEditForm({ ...editForm, occupation: e.target.value, occupationDetails: e.target.value ? editForm.occupationDetails : '' })} className={inp}>
                            <option value="">Select occupation</option>
                            {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          {editForm.occupation && (
                            <input type="text" maxLength={120} value={editForm.occupationDetails} onChange={e => setEditForm({ ...editForm, occupationDetails: e.target.value })} placeholder={editForm.occupation === 'Other' ? 'Specify occupation' : 'Details (optional)'} className={inp} />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900 break-words">{selectedSevak.occupation ? (selectedSevak.occupation_details ? `${selectedSevak.occupation} · ${selectedSevak.occupation_details}` : selectedSevak.occupation) : '-'}</span>
                      )}
                    </DetailField>

                    <DetailField label="Alias" wide>
                      {editing ? (
                        <input type="text" maxLength={60} value={editForm.alias} onChange={e => setEditForm({ ...editForm, alias: e.target.value })} placeholder="A name you know them by (optional)" className={inp} />
                      ) : (
                        <span className="text-sm font-semibold text-gray-900 break-words">{selectedSevak.alias || '-'}</span>
                      )}
                    </DetailField>

                    {BRAND.sevakViharPreferences && (editing ? (
                      <div className="col-span-2 space-y-2.5">
                        <ViharPreferencesFields
                          scope={editForm.viharScope}
                          preferences={editForm.sevaPreferences}
                          onChange={({ scope, preferences }) => setEditForm({ ...editForm, viharScope: scope, sevaPreferences: preferences })}
                          selectClassName={inp}
                          labelClassName="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1"
                        />
                      </div>
                    ) : (
                      <>
                        <DetailField label="Vihar Type">
                          <span className="text-sm font-semibold text-gray-900">{selectedSevak.vihar_scope || '-'}</span>
                        </DetailField>
                        <DetailField label="Seva Preference">
                          <span className="text-sm font-semibold text-gray-900 break-words">{formatSevaPreferences(selectedSevak.seva_preferences) || '-'}</span>
                        </DetailField>
                      </>
                    ))}

                    <DetailField label="Address" wide>
                      {editing ? (
                        <textarea value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Full address" rows={2} className={inp + ' resize-none'} />
                      ) : (
                        <span className="text-sm font-semibold text-gray-900 whitespace-pre-wrap break-words leading-snug">{selectedSevak.address || '-'}</span>
                      )}
                    </DetailField>
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-3 py-2.5 border-t border-gray-100 bg-white flex items-center gap-2">
              {showIdCard ? (
                  <button onClick={() => setShowIdCard(false)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold transition-colors flex justify-center items-center gap-2">
                    <ArrowLeft size={16} /> Back to Details
                  </button>
              ) : editing ? (
                <>
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-gray-200 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm">
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={savingId === selectedSevak.id} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm flex justify-center items-center gap-1.5 disabled:opacity-60">
                    {savingId === selectedSevak.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDelete(selectedSevak.id, selectedSevak.full_name)} title="Delete Sevak" className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => setShowResetPassword(true)} className="flex-1 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap">
                    <KeyRound size={15} /> Reset password
                  </button>
                  <button onClick={() => setShowIdCard(true)} className="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap">
                    <Printer size={15} /> ID Card
                  </button>
                  <button onClick={() => startEdit(selectedSevak)} className="flex-1 py-2 bg-saffron-600 hover:bg-saffron-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap">
                    <Edit2 size={15} /> Edit Profile
                  </button>
                </>
              )}
            </div>
          </>
          );
        })()}
      </Modal>

      {/* Reset password: the Captain sets the Sevak's new mobile number (= their password) */}
      <ResetSevakPasswordModal
        open={showResetPassword && !!selectedSevak}
        sevakId={selectedSevak?.id ?? null}
        sevakName={selectedSevak?.full_name ?? ''}
        onClose={() => setShowResetPassword(false)}
        onDone={(newMobile) => {
          if (selectedSevak) {
            const updated = { ...selectedSevak, mobile: newMobile };
            setSevaks(prev => prev.map(s => s.id === selectedSevak.id ? updated : s));
            setSelectedSevak(updated);
          }
          setShowResetPassword(false);
          showToast('Password reset. Please tell the Sevak to sign in with the new number.', 'success');
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} maxWidth="max-w-md">
        {showDeleteModal && (
          <div className="p-6 text-center overflow-y-auto">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Sevak?</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-800">{showDeleteModal.name}</span>?
              This action will clear all their data and cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-red-200"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default AddSevak;
