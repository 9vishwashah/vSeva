import React, { useState, useEffect } from 'react';
import { UserProfile, ViharEntry } from '../types';
import { dataService } from '../services/dataService';
import { Search, MessageCircle, MapPin, Loader2, Calendar } from 'lucide-react';

interface ViewEntriesProps {
  currentUser: UserProfile;
}

const ViewEntries: React.FC<ViewEntriesProps> = ({ currentUser }) => {
  const [entries, setEntries] = useState<ViharEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sevakMap, setSevakMap] = useState<Record<string, string>>({}); // username -> fullname

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, sevaks] = await Promise.all([
          dataService.getEntries(currentUser.organization_id),
          dataService.getOrgSevaks(currentUser.organization_id)
        ]);
        setEntries(data || []);
        
        // Create a map for quick name lookup
        const map: Record<string, string> = {};
        (sevaks || []).forEach(s => map[s.username] = s.full_name);
        setSevakMap(map);

      } catch (err) {
        console.error("Failed to load entries", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const filteredEntries = entries.filter(e => 
    (e.vihar_from || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.vihar_to || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.sevaks || []).some(s => sevakMap[s]?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatWhatsAppLink = (entry: ViharEntry) => {
    const text = `*Vihar Update* 🚶‍♂️\n\n📅 Date: ${entry.vihar_date}\n📍 Route: ${entry.vihar_from} to ${entry.vihar_to}\n📏 Distance: ${entry.distance_km} km\n🙏 Sadhu: ${entry.no_sadhubhagwan || 0} | Sadhvi: ${entry.no_sadhvijibhagwan || 0}\n\nJai Jinendra!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-saffron-600" /> Vihar Entries
            </h1>
            <p className="text-gray-500 text-sm">Manage and view all recorded journeys</p>
          </div>
          <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
             <input 
                type="text" 
                placeholder="Search entries..." 
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
          {loading ? (
             <div className="p-12 flex justify-center text-saffron-600">
                 <Loader2 className="animate-spin" size={32} />
             </div>
          ) : (
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
                            <td className="p-4 text-center">{entry.no_sadhubhagwan || '-'}</td>
                            <td className="p-4 text-center">{entry.no_sadhvijibhagwan || '-'}</td>
                            <td className="p-4 group relative cursor-help">
                                <span>{(entry.sevaks || []).length} Sevaks</span>
                                {/* Tooltip */}
                                <div className="absolute z-10 hidden group-hover:block bg-gray-800 text-white p-2 rounded text-xs -mt-12 left-0 w-48 whitespace-normal shadow-lg">
                                    {(entry.sevaks || []).map(u => sevakMap[u] || u).join(', ')}
                                </div>
                            </td>
                            <td className="p-4 text-center text-gray-400">
                                {entry.wheelchair ? <span className="text-blue-600">Yes</span> : '-'}
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
                            <td className="p-4 max-w-[150px] truncate">{entry.notes || ''}</td>
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
                    {filteredEntries.length === 0 && (
                        <tr>
                            <td colSpan={13} className="p-8 text-center text-gray-400">No entries found</td>
                        </tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}
       </div>
    </div>
  );
};

export default ViewEntries;