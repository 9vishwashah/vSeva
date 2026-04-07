import React, { useState, useEffect } from 'react';
import { UserProfile, Organization, ContactNumber } from '../types';
import { dataService } from '../services/dataService';
import { UserPlus, Loader2, CheckCircle, Users, Copy, Check, Trash2, AlertTriangle, Search, Clock, Edit2, X, Download, Printer, ArrowLeft } from 'lucide-react';
import IDCardBadge from '../components/IDCardBadge';
import { useToast } from '../context/ToastContext';
import CircularProgressBar from '../components/CircularProgressBar';


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

const AddSevak: React.FC<AddSevakProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    gender: 'Male'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ username: string, password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for the list of existing sevaks
  const [sevaks, setSevaks] = useState<UserProfile[]>([]);
  const [loadingSevaks, setLoadingSevaks] = useState(true);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMobile, setEditMobile] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string, name: string } | null>(null);

  const [selectedSevak, setSelectedSevak] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<{ mobile: string; age: string; bloodGroup: string; emergencyNumber: string; address: string; gender: string }>({ mobile: '', age: '', bloodGroup: '', emergencyNumber: '', address: '', gender: 'Male' });
  const [showIdCard, setShowIdCard] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');


  const fetchData = async () => {
    try {
      setLoadingSevaks(true);
      const sevaksData = await dataService.getOrgSevaks(currentUser.organization_id);
      setSevaks(sevaksData);
    } catch (err) {
      console.error("Failed to load data", err);
      showToast("Could not load organization members", 'error');
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
        address: ''
      });

      setSuccess(creds);
      showToast(`Sevak ${formData.fullName} added successfully!`, 'success');
      setFormData({ fullName: '', mobile: '', gender: 'Male' });
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
      address: sevak.address || '',
      gender: sevak.gender || 'Male'
    });
  };

  const handleSaveProfile = async () => {
    if (!selectedSevak) return;
    if (editForm.mobile.length !== 10) {
      showToast("Mobile number must be exactly 10 digits", "error");
      return;
    }
    setSavingId(selectedSevak.id);
    
    const mobileChanged = editForm.mobile !== selectedSevak.mobile;
    const newAge = editForm.age ? parseInt(editForm.age) : undefined;
    
    try {
      await dataService.updateSevakDetails(selectedSevak.id, {
        mobile: mobileChanged ? editForm.mobile : undefined,
        age: isNaN(newAge as number) ? undefined : newAge,
        bloodGroup: editForm.bloodGroup,
        emergencyNumber: editForm.emergencyNumber,
        address: editForm.address,
        gender: editForm.gender
      });
      // update local
      const updated = { ...selectedSevak, mobile: editForm.mobile, age: newAge, blood_group: editForm.bloodGroup, emergency_number: editForm.emergencyNumber, address: editForm.address, gender: editForm.gender };
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

  // Profile completion: counts blood_group, emergency_number, address, age
  const getProfileCompletion = (sevak: UserProfile): number => {
    const fields = [sevak.blood_group, sevak.emergency_number, sevak.address, sevak.age];
    const filled = fields.filter(f => f !== null && f !== undefined && String(f).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  };



  const sortedSevaks = [...sevaks].sort((a, b) => {
    const timeA = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
    const timeB = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
    return timeB - timeA;
  });

  const filteredSevaks = sortedSevaks.filter(sevak =>
    sevak.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sevak.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sevak.mobile.includes(searchQuery)
  );

  const downloadCSV = () => {
    if (sevaks.length === 0) {
      showToast("No members to download", 'error');
      return;
    }

    const headers = ["Sr. No", "Name", "Username", "Mobile", "Gender", "Age"];
    const csvContent = [
      headers.join(","),
      ...sevaks.map((s, i) => [
        i + 1,
        `"${s.full_name}"`,
        s.username,
        s.mobile,
        s.gender || '-',
        s.age || '-'
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sevaks_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const generateWhatsAppMessage = (sevak: UserProfile) => {
    const message = `Pranam ${sevak.full_name} 

A gentle *Reminder to Login* 

Click Here to Login
https://vseva.netlify.app

*Login Details:*
Username: ${sevak.username}
Password: ${sevak.mobile}

*If you face any difficulty, please feel free to contact us.*`;

    return encodeURIComponent(message);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Orange Gradient Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-400 p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <UserPlus size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Add New Sevak</h1>
          </div>
          <p className="text-white/80 text-sm mt-1 ml-1">Create a profile and login credentials for a new volunteer.</p>
        </div>
      </div>

      {/* Form Section - white card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

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
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                placeholder="e.g. Rahul Jain"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                maxLength={10}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                placeholder="10 digit number (Used as Password)"
                value={formData.mobile}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, mobile: val });
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Additional details (age, address, etc.) can be filled by the sevak on their profile.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Male' })}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
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
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                    formData.gender === 'Female'
                      ? 'bg-saffron-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-medium py-4 rounded-xl shadow-lg flex justify-center items-center space-x-2 transition-all mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
            <span>{loading ? "Creating Profile..." : "Create Sevak Account"}</span>
          </button>
        </form>
      </div>

      {/* Existing Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={24} className="text-saffron-600" />
              Organization Members
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
              onClick={downloadCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap shadow-sm"
              title="Download as CSV"
            >
              <Download size={16} className="text-gray-500" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingSevaks ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
              <Loader2 className="animate-spin mb-2 text-saffron-600" />
              Loading members...
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
                  const pct = getProfileCompletion(sevak);

                  return (
                    <div key={sevak.id} className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300 flex flex-col group transform hover:-translate-y-1 overflow-hidden relative">
                      
                      {/* Top Line: Sr No + Name + badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded tracking-widest uppercase border border-gray-100 whitespace-nowrap flex-shrink-0">
                            #{index + 1}
                          </span>
                          <h3 className="text-base font-bold text-gray-900 tracking-tight truncate group-hover:text-saffron-600 transition-colors">
                            {sevak.full_name}
                          </h3>
                          {sevak.gender && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              sevak.gender === 'Female' 
                                ? 'bg-pink-50 text-pink-600 border-pink-100' 
                                : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {sevak.gender}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Circular Progress Badge */}
                          <div className="w-7 h-7 flex-shrink-0" title={`${pct}% profile complete`}>
                            <CircularProgressBar 
                              percent={pct} 
                              number={""}
                              animate={false}
                              strokeWidth={12}
                              barColor={pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'}
                              trackColor="#e5e7eb"
                            />
                          </div>
                          {/* Last seen */}
                          <div className="flex items-center gap-1 whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                             <div className={`w-1.5 h-1.5 rounded-full ${statusDotColor} shadow-sm`}></div>
                             <span className={`text-[9px] font-bold ${color} uppercase tracking-wider`}>{label}</span>
                          </div>
                        </div>
                      </div>

                      {/* View More Button & WhatsApp */}
                      <div className="mt-4 flex gap-2">
                        <button 
                          onClick={() => openModal(sevak)}
                          className="flex-1 py-2.5 bg-saffron-100 hover:bg-saffron-200 text-saffron-700 rounded-[12px] font-extrabold text-[11px] tracking-wider uppercase transition-colors flex justify-center items-center gap-2 border border-saffron-200 hover:border-saffron-300 shadow-sm"
                        >
                          View More
                        </button>
                        <a
                          href={`https://wa.me/${sevak.mobile}?text=${generateWhatsAppMessage(sevak)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-11 flex-shrink-0 flex items-center justify-center bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-[12px] transition-colors border border-[#25D366]/20 focus:outline-none shadow-sm"
                          title="Notify via WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <i className="fa-brands fa-whatsapp text-lg" aria-hidden="true"></i>
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


      {/* View More Details Modal */}
      {selectedSevak && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-white/40 animate-fade-in"
          onClick={() => { setSelectedSevak(null); setEditingId(null); setShowIdCard(false); }}
        >
          <div 
            className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 w-full max-w-md overflow-hidden animate-slide-up flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-saffron-600" />
                Sevak Details
              </h3>
              <button onClick={() => { setSelectedSevak(null); setEditingId(null); setShowIdCard(false); }} className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {showIdCard ? (
                 <div className="flex flex-col items-center justify-center py-4 min-h-[40vh]">
                    <IDCardBadge user={selectedSevak} orgName={currentUser.organization_id} />
                    <p className="text-xs text-gray-500 mt-6 text-center max-w-xs print:hidden">
                        Print this badge. Scanning the QR code will verify the identity.
                    </p>
                 </div>
              ) : (
                <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-saffron-100 text-saffron-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold border border-saffron-200">
                  {selectedSevak.full_name.charAt(0).toUpperCase()}
                </div>
                <h4 className="text-xl font-bold text-gray-900">{selectedSevak.full_name}</h4>
                {editingId === selectedSevak.id ? (
                  <div className="flex bg-gray-100 p-1 rounded-lg w-fit mx-auto mt-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, gender: 'Male' })}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        editForm.gender === 'Male'
                          ? 'bg-saffron-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, gender: 'Female' })}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        editForm.gender === 'Female'
                          ? 'bg-saffron-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                ) : (
                  <p className={`text-sm font-bold mt-1 ${selectedSevak.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>
                    {selectedSevak.gender || 'Unknown Gender'}
                  </p>
                )}
              </div>

              {/* Detail fields */}
              <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                {/* Username */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm">
                    <code className="text-sm font-mono text-gray-700 truncate">{selectedSevak.username}</code>
                    <button onClick={() => handleCopy(selectedSevak.username, selectedSevak.id)} className="text-gray-400 hover:text-saffron-600 p-1 flex-shrink-0">
                      {copiedId === selectedSevak.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Mobile Number</label>
                  {editingId === selectedSevak.id ? (
                    <input 
                      type="tel" 
                      maxLength={10} 
                      value={editForm.mobile}
                      onChange={e => setEditForm({...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                      className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none font-mono transition-shadow shadow-sm"
                    />
                  ) : (
                    <div className="flex justify-between items-center text-sm font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100 shadow-inner">
                      <span className="font-mono text-gray-800 font-semibold tracking-wide">{selectedSevak.mobile}</span>
                    </div>
                  )}
                </div>

                {/* Age & Blood Group */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Age</label>
                    {editingId === selectedSevak.id ? (
                      <input 
                        type="number" 
                        value={editForm.age}
                        onChange={e => setEditForm({...editForm, age: e.target.value})}
                        className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none transition-shadow shadow-sm"
                      />
                    ) : (
                      <div className="text-sm font-medium bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm text-gray-800">{selectedSevak.age || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Blood Group</label>
                    {editingId === selectedSevak.id ? (
                      <select 
                        value={editForm.bloodGroup}
                        onChange={e => setEditForm({...editForm, bloodGroup: e.target.value})}
                        className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none bg-white font-semibold transition-shadow shadow-sm"
                      >
                         <option value="O+">O+</option>
                         <option value="O-">O-</option>
                         <option value="A+">A+</option>
                         <option value="A-">A-</option>
                         <option value="B+">B+</option>
                         <option value="B-">B-</option>
                         <option value="AB+">AB+</option>
                         <option value="AB-">AB-</option>
                      </select>
                    ) : (
                      <div className="text-sm font-medium bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm text-gray-800 font-semibold">{selectedSevak.blood_group || '-'}</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Emergency Number</label>
                    {editingId === selectedSevak.id ? (
                      <input 
                        type="text" 
                        maxLength={15}
                        value={editForm.emergencyNumber}
                        onChange={e => setEditForm({...editForm, emergencyNumber: e.target.value})}
                        placeholder="Emergency Contact"
                        className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none transition-shadow shadow-sm text-gray-800"
                      />
                    ) : (
                      <div className="text-sm font-medium bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm text-gray-800 font-mono">{selectedSevak.emergency_number || '-'}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Address</label>
                    {editingId === selectedSevak.id ? (
                      <textarea
                        value={editForm.address}
                        onChange={e => setEditForm({...editForm, address: e.target.value})}
                        placeholder="Full Address"
                        className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none transition-shadow shadow-sm resize-none h-20 text-gray-800"
                      />
                    ) : (
                      <div className="text-sm font-medium bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedSevak.address || '-'}</div>
                    )}
                  </div>
                </div>

              </div>
               </>
              )}
            </div>
            
            {/* Modal Actions */}
            <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              {showIdCard ? (
                  <button onClick={() => setShowIdCard(false)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors flex justify-center items-center gap-2">
                    <ArrowLeft size={18} /> Back to Details
                  </button>
              ) : editingId === selectedSevak.id ? (
                <>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2.5 border border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm flex-1">
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={savingId === selectedSevak.id} className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-sm flex-1 flex justify-center items-center gap-2 shadow-sm shadow-green-200">
                    {savingId === selectedSevak.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save changes
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDelete(selectedSevak.id, selectedSevak.full_name)} className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-transparent flex items-center justify-center gap-2 flex-1">
                    <Trash2 size={18} /> <span className="text-sm font-semibold pt-0.5">Delete</span>
                  </button>
                  <button onClick={() => setShowIdCard(true)} className="px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors border border-transparent flex items-center justify-center gap-2 flex-1">
                    <Printer size={18} /> <span className="text-sm font-semibold pt-0.5">ID Card</span>
                  </button>
                  <button onClick={() => startEdit(selectedSevak)} className="px-4 py-2.5 bg-saffron-600 hover:bg-saffron-700 text-white rounded-xl transition-all shadow-md shadow-saffron-200 hover:shadow-lg flex items-center justify-center gap-2 flex-1">
                    <Edit2 size={18} /> <span className="text-sm font-semibold pt-0.5">Edit Profile</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md bg-white/40 animate-fade-in"
          onClick={() => setShowDeleteModal(null)}
        >
          <div 
            className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 w-full max-w-md overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
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
          </div>
        </div>
      )}

    </div>
  );
};

export default AddSevak;
