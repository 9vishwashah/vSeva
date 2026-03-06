import React, { useState, useEffect } from 'react';
import { UserProfile, Organization } from '../types';
import { dataService } from '../services/dataService';
import { UserPlus, Loader2, CheckCircle, Users, Copy, Check, Trash2, AlertTriangle, Search, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

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

  const color = days < 7 ? 'text-green-600' : days < 30 ? 'text-yellow-600' : 'text-gray-500';
  return { label, color };
};

const AddSevak: React.FC<AddSevakProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    gender: 'Male',
    age: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ username: string, password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for the list of existing sevaks
  const [sevaks, setSevaks] = useState<UserProfile[]>([]);
  const [loadingSevaks, setLoadingSevaks] = useState(true);

  // Org Details
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      setLoadingSevaks(true);
      const [sevaksData, orgData] = await Promise.all([
        dataService.getOrgSevaks(currentUser.organization_id),
        dataService.getOrganization(currentUser.organization_id)
      ]);
      setSevaks(sevaksData);
      setOrgDetails(orgData);
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
        age: parseInt(formData.age)
      });

      setSuccess(creds);
      showToast(`Sevak ${formData.fullName} added successfully!`, 'success');
      setFormData({ fullName: '', mobile: '', gender: 'Male', age: '' });
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
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(userId);
    try {
      await dataService.deleteSevak(userId);
      // Remove from local state immediately
      setSevaks(prev => prev.filter(s => s.id !== userId));
      showToast(`${userName} has been removed.`, 'success');
    } catch (err: any) {
      showToast(`Failed to delete user: ${err.message}`, 'error');
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSevaks = sevaks.filter(sevak =>
    sevak.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sevak.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sevak.mobile.includes(searchQuery)
  );

  const generateWhatsAppMessage = (sevak: UserProfile) => {
    const orgName = orgDetails ? `${orgDetails.name}, ${orgDetails.city || ''}` : '';
    const message = `Pranam ${sevak.full_name}

You have been successfully added to vSeva under the organization
\`${orgName}\`.

You can now view your Vihar summary and share your contribution.

Login Details:
Username: \`${sevak.username}\`
Password: \`${sevak.mobile}\`

All Vihar entries are managed by Namya Mehta.

If any changes in entries contact Vijay Mehta or Rakhi Jain

Login to vSeva:
https://vseva.netlify.app

Install vSeva App.

Follow vSeva for updates and inspiration:
https://instagram.com/the.vseva

"Inspire every steps"

vSeva
by Vishwa Alpesh Shah`;

    return encodeURIComponent(message);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Form Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserPlus size={24} className="text-saffron-600" />
            Add New Sevak
          </h2>
          <p className="text-sm text-gray-500">Create a profile and login credentials for a new volunteer.</p>
        </div>

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
                maxLength={10}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                placeholder="10 digit number (Used as Password)"
                value={formData.mobile}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, mobile: val });
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none bg-white"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white font-medium py-4 rounded-xl shadow-lg flex justify-center items-center space-x-2 transition-all mt-4"
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
            <p className="text-sm text-gray-500">
              Currently active sevaks in <span className="font-semibold text-gray-700">{orgDetails ? `${orgDetails.name}, ${orgDetails.city || ''}` : currentUser.organization_id}</span>
            </p>
          </div>

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
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-4 w-12">Sr.</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Mobile</th>
                  <th className="p-4">Gender</th>
                  <th className="p-4">
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-saffron-500" />
                      Last Login
                    </div>
                  </th>
                  <th className="p-4 text-center">WhatsApp</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSevaks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No members found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredSevaks.map((sevak, index) => (
                    <tr key={sevak.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4 text-gray-500 font-mono text-xs">{index + 1}</td>
                      <td className="p-4 font-medium text-gray-900">{sevak.full_name}</td>

                      {/* Stylized Username with Copy */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 border border-gray-200">
                            {sevak.username}
                          </code>
                          <button
                            onClick={() => handleCopy(sevak.username, sevak.id)}
                            className="text-gray-400 hover:text-saffron-600 transition-colors p-1"
                            title="Copy Username"
                          >
                            {copiedId === sevak.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      <td className="p-4">{sevak.mobile}</td>
                      <td className="p-4">{sevak.gender || '-'}</td>

                      {/* Last Login */}
                      <td className="p-4">
                        {(() => {
                          const { label, color } = formatLastLogin(sevak.last_login_at);
                          return (
                            <span className={`text-xs font-medium ${color} flex items-center gap-1`}>
                              <Clock size={11} />
                              {label}
                            </span>
                          );
                        })()}
                      </td>


                      <td className="p-4 text-center">
                        <a
                          href={`https://wa.me/${sevak.mobile}?text=${generateWhatsAppMessage(sevak)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-[#25D366] hover:text-white hover:bg-[#25D366] p-2 rounded-lg transition-colors"
                          title="Send WhatsApp Message"
                        >
                          <i className="fa-brands fa-whatsapp text-2xl" aria-hidden="true"></i>
                        </a>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(sevak.id, sevak.full_name)}
                          disabled={deletingId === sevak.id}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors disabled:opacity-50"
                          title="Delete Member"
                        >
                          {deletingId === sevak.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddSevak;