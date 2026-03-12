import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry, Organization, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { Search, Calendar, User, MessageCircle, Trash2, Pencil, X } from 'lucide-react';
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
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [org, setOrg] = useState<Organization | null>(null);

  const [entries, setEntries] = useState<ViharEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sevakMap, setSevakMap] = useState<Record<string, string>>({}); // username -> fullname
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, organization] = await Promise.all([
          dataService.getEntries(currentUser.organization_id),
          dataService.getOrganization(currentUser.organization_id),
        ]);

        let filteredData = data || [];
        if (currentUser.role === UserRole.SEVAK) {
          filteredData = filteredData.filter(e => (e.sevaks || []).includes(currentUser.username));
        }
        setEntries(filteredData);
        setOrg(organization);

        // Collect all unique usernames across all entries, then do a single targeted query
        const allUsernames = Array.from(
          new Set(filteredData.flatMap(e => e.sevaks || []))
        );

        if (allUsernames.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('username, full_name')
            .in('username', allUsernames);

          const map: Record<string, string> = {};
          (profiles || []).forEach((p: { username: string; full_name: string }) => {
            map[p.username] = p.full_name;               // exact match
            map[p.username.split('@')[0]] = p.full_name; // part before @
          });
          setSevakMap(map);
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
        (s) => sevakMap[s]?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Date filter
    const entryDate = new Date(e.vihar_date);

    const fromMatch = fromDate
      ? entryDate >= new Date(fromDate)
      : true;

    const toMatch = toDate
      ? entryDate <= new Date(toDate)
      : true;

    return textMatch && fromMatch && toMatch;
  });

  const formatWhatsAppLink = (entry: ViharEntry) => {
    const text = `*Vihar Update* 🚶‍♂️\n\n📅 Date: ${entry.vihar_date}\n📍 Route: ${entry.vihar_from} to ${entry.vihar_to}\n📏 Distance: ${entry.distance_km} km\n🙏 Sadhu: ${entry.no_sadhubhagwan || 0} | Sadhvi: ${entry.no_sadhvijibhagwan || 0}\n\nJai Jinendra!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const getSevakName = (username: string) => {
    const plainUsername = username.split('@')[0];
    return sevakMap[username] || sevakMap[username.toLowerCase()] || sevakMap[plainUsername] || sevakMap[plainUsername.toLowerCase()] || plainUsername;
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
      {/* Orange Gradient Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-400 p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-6 w-full">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar size={22} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {currentUser.role === UserRole.SEVAK ? 'My Vihars' : 'Vihar Entries'}
              </h1>
            </div>
            <p className="text-white/80 text-sm mt-1 ml-1 mb-3 xl:mb-0">
              {currentUser.role === UserRole.SEVAK
                ? 'Your personal Vihar journey log'
                : <>Manage and view all recorded journeys for{' '}
                  {org
                    ? <span className="font-semibold text-white">{org.name}{org.city ? `, ${org.city}` : ''}</span>
                    : <span className="inline-block h-4 w-32 rounded bg-white/30 animate-pulse align-middle" />
                  }
                </>
              }
            </p>
            {!loading && (
              <span className="hidden xl:inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mt-2">
                {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
              </span>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3 w-full xl:w-auto mt-4 xl:mt-0">
            {/* Date filters inside banner */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-sm w-full md:w-auto">
              <div className="w-full sm:flex-1 md:w-36">
                <label className="block text-[10px] font-bold text-white/90 uppercase mb-1.5 ml-1 tracking-wider">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#fff8eb] text-gray-800 focus:ring-2 focus:ring-white border-none outline-none font-medium text-sm shadow-inner transition-shadow"
                />
              </div>
              <div className="w-full sm:flex-1 md:w-36">
                <label className="block text-[10px] font-bold text-white/90 uppercase mb-1.5 ml-1 tracking-wider">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#fff8eb] text-gray-800 focus:ring-2 focus:ring-white border-none outline-none font-medium text-sm shadow-inner transition-shadow"
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="text-white hover:text-red-200 p-1 sm:mb-1 self-end sm:self-end transition-colors mt-1 sm:mt-0"
                  title="Clear Dates"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-56 shrink-0 h-full">
              <label className="hidden md:block text-[10px] font-bold text-white/0 uppercase mb-1 ml-1 pointer-events-none">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-[11px] text-white/60 z-10 pointer-events-none" size={18} />
                <input
                  type="text"
                  placeholder="Search entries..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/80 focus:outline-none focus:ring-2 focus:ring-white text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
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
                          {(entry.sevaks || []).map(u => getSevakName(u)).join(', ')}
                        </div>
                      </td>
                      <td className="p-4 text-center text-gray-400">
                        {entry.wheelchair ? <span className="text-blue-600 font-bold text-xs">Yes</span> : '-'}
                      </td>
                      <td className="p-4 max-w-[150px] truncate" title={entry.samuday}>{entry.samuday || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${entry.vihar_type === 'morning' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
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
            {filteredEntries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                getSevakName={getSevakName}
                onDelete={currentUser.role === UserRole.ORG_ADMIN ? handleDelete : undefined}
                onEdit={currentUser.role === UserRole.ORG_ADMIN && onEdit ? onEdit : undefined}
              />
            ))}
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