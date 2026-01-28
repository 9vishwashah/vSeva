import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry } from '../types';
import { dataService } from '../services/dataService';
import { Search, MessageCircle, MapPin, Loader2, Calendar, User, Clock, Navigation } from 'lucide-react';
import { Organization } from '../types';
import EntriesSkeleton from '../components/EntriesSkeleton';


interface ViewEntriesProps {
  currentUser: UserProfile;
}

const ViewEntries: React.FC<ViewEntriesProps> = ({ currentUser }) => {
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

      setEntries(data || []);

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

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-saffron-600" size={24} /> Vihar Entries
            </h1>
<p className="text-gray-500 text-xs md:text-sm mt-1 flex items-center gap-2">
  Manage and view all recorded journeys for
  {org ? (
    <span className="font-semibold text-saffron-600">
      {org.name}{org.city ? `, ${org.city}` : ''}
    </span>
  ) : (
    <span className="inline-block h-4 w-40 rounded bg-gray-200 animate-pulse" />
  )}
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
<div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
  <input
    type="date"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    className="px-3 py-2 border rounded-lg text-sm bg-gray-50"
  />

  <input
    type="date"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    className="px-3 py-2 border rounded-lg text-sm bg-gray-50"
  />

  {(fromDate || toDate) && (
    <button
      onClick={() => {
        setFromDate('');
        setToDate('');
      }}
      className="text-xs text-saffron-600 hover:underline self-start md:self-center"
    >
      Clear dates
    </button>
  )}
</div>

       {loading ? (
               <EntriesSkeleton/>
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
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            entry.vihar_type === 'morning' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
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
                        <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                             {/* Top Row: Date & Type */}
                             <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="bg-gray-100 p-2 rounded-lg text-center min-w-[50px]">
                                        <span className="block text-xs text-gray-500 uppercase">{new Date(entry.vihar_date).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="block text-lg font-bold text-gray-800 leading-none">{new Date(entry.vihar_date).getDate()}</span>
                                    </div>
                                    <div>
                                         <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                                            entry.vihar_type === 'morning' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {entry.vihar_type}
                                        </span>
                                        <div className="flex gap-1">
                                            {entry.group_sadhu && <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1 rounded">Sadhu</span>}
                                            {entry.group_sadhvi && <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-1 rounded">Sadhvi</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-saffron-600">{entry.distance_km}</span>
                                    <span className="text-xs text-gray-400 font-medium ml-0.5">km</span>
                                </div>
                             </div>

                             {/* Route */}
                             <div className="flex items-center gap-2 mb-4">
                                <MapPin size={16} className="text-gray-400 shrink-0" />
                                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium truncate w-full">
                                    <span className="truncate">{entry.vihar_from}</span>
                                    <Navigation size={12} className="text-gray-300 shrink-0 rotate-90" />
                                    <span className="truncate">{entry.vihar_to}</span>
                                </div>
                             </div>

                             {/* Stats Grid */}
                             <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg mb-3">
                                <div className="text-center border-r border-gray-200">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sadhu</p>
                                    <p className="font-bold text-gray-800">{entry.no_sadhubhagwan || 0}</p>
                                </div>
                                <div className="text-center border-r border-gray-200">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sadhvi</p>
                                    <p className="font-bold text-gray-800">{entry.no_sadhvijibhagwan || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sevaks</p>
                                    <p className="font-bold text-gray-800">{(entry.sevaks || []).length}</p>
                                </div>
                             </div>

                             {/* Sevaks List */}
                             <div className="mb-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {(entry.sevaks || []).slice(0, 4).map((u, i) => (
                                        <span key={i} className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                            {getSevakName(u)}
                                        </span>
                                    ))}
                                    {(entry.sevaks || []).length > 4 && (
                                        <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                                            +{(entry.sevaks || []).length - 4}
                                        </span>
                                    )}
                                </div>
                             </div>

                             {/* Footer: Notes & Action */}
                             <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex-1 mr-2">
                                    {entry.notes ? (
                                        <p className="text-xs text-gray-500 italic truncate">"{entry.notes}"</p>
                                    ) : (
                                        <span className="text-xs text-gray-300 italic">No notes</span>
                                    )}
                                </div>
                                <a 
                                    href={formatWhatsAppLink(entry)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-green-100 transition-colors"
                                >
                                    <MessageCircle size={14} />
                                    <span>Share</span>
                                </a>
                             </div>
                        </div>
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