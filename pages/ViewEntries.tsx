import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry } from '../types';
import { dataService } from '../services/dataService';
import { Search, MessageCircle, MapPin, Loader2, Calendar, User, Clock, Navigation, Trash2, Pencil } from 'lucide-react';
import { Organization, UserRole } from '../types';
import EntryCard from '../components/EntryCard';
import EntriesSkeleton from '../components/EntriesSkeleton';
import { useToast } from '../context/ToastContext';


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
        const [data, sevaks, organization] = await Promise.all([
          dataService.getEntries(currentUser.organization_id),
          dataService.getOrgSevaks(currentUser.organization_id),
          dataService.getOrganization(currentUser.organization_id),
        ]);

        let filteredData = data || [];
        if (currentUser.role === UserRole.SEVAK) {
          filteredData = filteredData.filter(e => (e.sevaks || []).includes(currentUser.username));
        }
        setEntries(filteredData);

        const map: Record<string, string> = {};
        (sevaks || []).forEach(s => (map[s.username] = s.full_name));
        setSevakMap(map);

        setOrg(organization);
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
    const fullName = sevakMap[username] || username;
    return fullName.split('@')[0]; // Simple clean up if it's an email
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-saffron-600" size={24} />
            {currentUser.role === UserRole.SEVAK ? 'My Entries' : 'Vihar Entries'}
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1 flex items-center gap-2">
            {currentUser.role === UserRole.SEVAK ? 'Your personal Vihar journey log' : 'Manage and view all recorded journeys for'}
            {currentUser.role !== UserRole.SEVAK && (org ? (
              <span className="font-semibold text-saffron-600">
                {org.name}{org.city ? `, ${org.city}` : ''}
              </span>
            ) : (
              <span className="inline-block h-4 w-40 rounded bg-gray-200 animate-pulse" />
            ))}
          </p>

        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search entries..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none text-sm bg-gray-50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:flex md:flex-row gap-4 w-full md:w-auto items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-saffron-500 outline-none border-gray-200"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-saffron-500 outline-none border-gray-200"
          />
        </div>

        {(fromDate || toDate) && (
          <button
            onClick={() => {
              setFromDate('');
              setToDate('');
            }}
            className="col-span-2 md:col-span-1 text-xs text-saffron-600 hover:text-saffron-700 font-medium mb-3 hover:underline text-right md:text-left"
          >
            Clear dates
          </button>
        )}
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
                    <th className="p-4">Group</th>
                    <th className="p-4">From</th>
                    <th className="p-4">To</th>
                    <th className="p-4 text-center">Sadhu</th>
                    <th className="p-4 text-center">Sadhvi</th>
                    <th className="p-4">Sevaks</th>
                    <th className="p-4 text-center">Wheelchair</th>
                    <th className="p-4">Samuday</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-center">Kms</th>
                    <th className="p-4">Notes</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium">{entry.vihar_date}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {entry.group_sadhu && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">SADHU</span>}
                          {entry.group_sadhvi && <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-bold">SADHVI</span>}
                          {!entry.group_sadhu && !entry.group_sadhvi && <span className="text-gray-300">-</span>}
                        </div>
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
                      <td className="p-4 max-w-[150px] truncate text-xs text-gray-500">{entry.notes || '-'}</td>
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