import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry, Organization, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { Search, Calendar, User, MessageCircle, Trash2, Pencil, X, ChevronLeft } from 'lucide-react';
import EntryCard from '../components/EntryCard';
import EntriesSkeleton from '../components/EntriesSkeleton';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabase';


interface ViewEntriesProps {
  currentUser: UserProfile;
  onEdit?: (entry: ViharEntry) => void;
}

const ViewEntries: React.FC<ViewEntriesProps> = ({ currentUser, onEdit }) => {
  const { showToast } = useToast();

  const [entries, setEntries] = useState<ViharEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sevakMap, setSevakMap] = useState<Record<string, string>>({}); // username -> fullname
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dataService.getEntries(currentUser.organization_id);

        let filteredData = data || [];
        if (currentUser.role === UserRole.SEVAK) {
          filteredData = filteredData.filter(e => (e.sevaks || []).includes(currentUser.username));
        }
        setEntries(filteredData);

        // Collect all unique usernames across all entries, then do a single targeted query
        const allUsernames = Array.from(
          new Set(filteredData.flatMap(e => e.sevaks || []))
        );

        if (allUsernames.length > 0) {
          // Attempt direct pull for admin or self, fallback to secure endpoint
          let orgMap: Record<string, string> = {};
          if (currentUser.role === UserRole.ORG_ADMIN) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('username, full_name')
              .in('username', allUsernames);
            (profiles || []).forEach((p: any) => orgMap[p.username] = p.full_name);
          } else {
             orgMap = await dataService.getSevakNameMap(currentUser.organization_id);
          }

          const map: Record<string, { name: string; blood?: string }> = {};
          allUsernames.forEach(username => {
            const fullName = orgMap[username] || username.split('@')[0];
            const info = { name: fullName };
            map[username] = info;               // exact match
            map[username.toLowerCase()] = info;
            map[username.split('@')[0]] = info; // part before @
            map[username.split('@')[0].toLowerCase()] = info;
          });
          
          setSevakMap(map as any);
        }

      } catch (err) {
        console.error('Failed to load entries', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser.organization_id]);

  const filteredEntries = entries.filter((e) => {
    // Text search
    const textMatch =
      (e.vihar_from || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vihar_to || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.sevaks || []).some(
        (s) => sevakMap[s]?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return textMatch;
  });

  const formatDateDivider = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
    const dm = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase();
    if (diffDays === 0) return `TODAY · ${dm}`;
    if (diffDays === 1) return `YESTERDAY · ${dm}`;
    return dm;
  };

  const formatWhatsAppLink = (entry: ViharEntry) => {
    const text = `*Vihar Update* 🚶‍♂️\n\n📅 Date: ${entry.vihar_date}\n📍 Route: ${entry.vihar_from} to ${entry.vihar_to}\n📏 Distance: ${entry.distance_km} km\n🙏 Sadhu: ${entry.no_sadhubhagwan || 0} | Sadhvi: ${entry.no_sadhvijibhagwan || 0}\n\nप्रेरणादाता: प. पु. महाबोधि सुरीश्वरजी महाराजा`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const getSevakInfo = (username: string) => {
    const plainUsername = username.split('@')[0];
    const info = (sevakMap as any)[username] || (sevakMap as any)[username.toLowerCase()] || (sevakMap as any)[plainUsername] || (sevakMap as any)[plainUsername.toLowerCase()];
    return info || { name: plainUsername };
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      await dataService.deleteViharEntry(id);
      showToast("Entry deleted successfully", "success");
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
      showToast("Failed to delete entry", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* Plain top bar — matches the tangerine redesign mock (no gradient banner) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 shrink-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center"
            title="Back"
          >
            <ChevronLeft size={16} className="text-[#241C17]" />
          </button>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17] truncate">
            {currentUser.role === UserRole.SEVAK ? 'My Vihars' : 'Vihar Entries'}
          </h1>
          {!loading && (
            <span className="hidden sm:inline-block text-xs font-semibold text-[#8A6A57] shrink-0">
              {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
            </span>
          )}
        </div>

        <div className="relative w-40 sm:w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-none text-sm text-[#241C17] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <EntriesSkeleton />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">From</th>
                    <th className="p-4">To</th>
                    <th className="p-4 text-center">Sadhu</th>
                    <th className="p-4 text-center">Sadhvi</th>
                    <th className="p-4">Sevaks</th>
                    <th className="p-4 text-center">Wheelchair</th>
                    <th className="p-4">Samuday</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-center">Kms</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium whitespace-nowrap">
                        {entry.vihar_date ? entry.vihar_date.split('-').reverse().join('-') : '-'}
                      </td>
                      <td className="p-4">{entry.vihar_from}</td>
                      <td className="p-4">{entry.vihar_to}</td>
                      <td className="p-4 text-center font-semibold">{entry.no_sadhubhagwan || '-'}</td>
                      <td className="p-4 text-center font-semibold">{entry.no_sadhvijibhagwan || '-'}</td>
                      <td className="p-4 group relative cursor-help">
                        <div className="flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          <span>{(entry.sevaks || []).length}</span>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute z-10 hidden group-hover:block bg-gray-800 text-white p-2 rounded text-xs -mt-8 left-6 w-48 whitespace-normal shadow-lg">
                          {(entry.sevaks || []).map(u => getSevakInfo(u).name).join(', ')}
                        </div>
                      </td>
                      <td className="p-4 text-center text-gray-400">
                        {entry.wheelchair ? <span className="text-blue-600 font-bold text-xs">Yes</span> : '-'}
                      </td>
                      <td className="p-4 max-w-[150px] truncate" title={entry.samuday}>{entry.samuday || '-'}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase" style={{ background: '#FFF0E5', color: '#B5602C' }}>
                          {entry.vihar_type}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-blue-600">
                        {entry.distance_km}
                      </td>
                      <td className="p-4 text-center">
                        <a
                          href={formatWhatsAppLink(entry)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-500 hover:text-green-600 p-2 hover:bg-green-50 rounded-full inline-block transition-colors"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </a>
                        {currentUser.role === UserRole.ORG_ADMIN && onEdit && (
                          <button
                            onClick={() => onEdit(entry)}
                            className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full inline-block transition-colors ml-1"
                            title="Edit Entry"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {currentUser.role === UserRole.ORG_ADMIN && (
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full inline-block transition-colors ml-1"
                            title="Delete Entry"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {(() => {
              let lastDate: string | null = null;
              return filteredEntries.map(entry => {
                const isNewGroup = entry.vihar_date !== lastDate;
                lastDate = entry.vihar_date;
                return (
                  <React.Fragment key={entry.id}>
                    {isNewGroup && (
                      <div className="flex items-center gap-2.5 px-1 pt-1 first:pt-0">
                        <span className="text-xs font-extrabold tracking-wide text-[#8A6A57] uppercase shrink-0">
                          {formatDateDivider(entry.vihar_date)}
                        </span>
                        <div className="flex-1 h-px bg-[#EEE8E1]" />
                      </div>
                    )}
                    <EntryCard
                      entry={entry}
                      getSevakInfo={getSevakInfo}
                      onDelete={currentUser.role === UserRole.ORG_ADMIN ? handleDelete : undefined}
                      onEdit={currentUser.role === UserRole.ORG_ADMIN && onEdit ? onEdit : undefined}
                    />
                  </React.Fragment>
                );
              });
            })()}
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 font-medium">No entries found matching your search.</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting the filter or add a new entry.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ViewEntries;