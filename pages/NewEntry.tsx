import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UserProfile, ViharEntry, AreaRoute } from '../types';
import { Save, Loader2, MapPin } from 'lucide-react';

interface NewEntryProps {
  currentUser: UserProfile;
  onSubmit: () => void;
}

const NewEntry: React.FC<NewEntryProps> = ({ currentUser, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<ViharEntry>>({
    vihar_date: new Date().toISOString().split('T')[0],
    vihar_type: 'morning',
    group_sadhu: false,
    group_sadhvi: false,
    wheelchair: false,
    sevaks: [],
  });

  const [loading, setLoading] = useState(false);
  const [orgSevaks, setOrgSevaks] = useState<UserProfile[]>([]);
  const [sevakSearch, setSevakSearch] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState<AreaRoute[]>([]);
  const [uniqueAreas, setUniqueAreas] = useState<string[]>([]);
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);

  // Load Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sevaks, routes] = await Promise.all([
          dataService.getOrgSevaks(currentUser.organization_id),
          dataService.getRoutes()
        ]);
        setOrgSevaks(sevaks);
        setAvailableRoutes(routes);
        
        // Extract unique locations for dropdowns
        const areas = new Set<string>();
        routes.forEach(r => {
            areas.add(r.from_name);
            areas.add(r.to_name);
        });
        setUniqueAreas(Array.from(areas).sort());

      } catch (err) {
        console.error("Failed to load dependency data", err);
      }
    };
    fetchData();
  }, [currentUser]);

  // Distance Calculation
  useEffect(() => {
    if (formData.vihar_from && formData.vihar_to) {
      const route = availableRoutes.find(
        r => r.from_name === formData.vihar_from && r.to_name === formData.vihar_to
      );
      if (route) {
        setFormData(prev => ({ ...prev, distance_km: route.distance_km }));
        setDistanceInfo(`${route.distance_km} km (Auto-calculated)`);
      } else {
        setFormData(prev => ({ ...prev, distance_km: 0 }));
        setDistanceInfo("Custom Route - Distance will be calculated if mapped");
      }
    }
  }, [formData.vihar_from, formData.vihar_to, availableRoutes]);

  const handleSevakToggle = (username: string) => {
    const current = formData.sevaks || [];
    if (current.includes(username)) {
      setFormData({ ...formData, sevaks: current.filter(s => s !== username) });
    } else {
      setFormData({ ...formData, sevaks: [...current, username] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sevaks?.length) {
      alert("Please select at least one Sevak");
      return;
    }
    
    setLoading(true);
    try {
      // Prepare Entry Payload
      const entry: ViharEntry = {
        ...formData as ViharEntry,
        organization_id: currentUser.organization_id,
        created_by: currentUser.id,
        // Ensure numbers are numbers
        no_sadhubhagwan: formData.no_sadhubhagwan ? Number(formData.no_sadhubhagwan) : 0,
        no_sadhvijibhagwan: formData.no_sadhvijibhagwan ? Number(formData.no_sadhvijibhagwan) : 0,
      };

      await dataService.createViharEntry(entry);
      alert("Vihar Entry Saved Successfully!");
      onSubmit(); // Navigate back
    } catch (err: any) {
      console.error(err);
      alert(`Error saving entry: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSevaks = orgSevaks.filter(s => 
    s.full_name.toLowerCase().includes(sevakSearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">New Vihar Entry</h2>
        <p className="text-sm text-gray-500">Log a journey for {currentUser.organization_id}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Date & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date" 
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500"
              value={formData.vihar_date}
              onChange={e => setFormData({...formData, vihar_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vihar Type</label>
            <div className="flex space-x-4">
              {['morning', 'evening'].map(type => (
                <label key={type} className={`flex-1 cursor-pointer p-3 text-center rounded-lg border capitalize ${
                  formData.vihar_type === type 
                  ? 'bg-saffron-50 border-saffron-500 text-saffron-700 font-semibold' 
                  : 'bg-white border-gray-300 text-gray-600'
                }`}>
                  <input 
                    type="radio" 
                    name="vihar_type" 
                    value={type}
                    checked={formData.vihar_type === type}
                    onChange={() => setFormData({...formData, vihar_type: type as any})}
                    className="hidden"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Group Composition */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Group Composition</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200">
                <input 
                  type="checkbox" 
                  checked={formData.group_sadhu}
                  onChange={e => setFormData({...formData, group_sadhu: e.target.checked})}
                  className="h-5 w-5 text-saffron-600 rounded"
                />
                <span>Sadhubhagwan</span>
              </label>
              <label className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200">
                <input 
                  type="checkbox" 
                  checked={formData.group_sadhvi}
                  onChange={e => setFormData({...formData, group_sadhvi: e.target.checked})}
                  className="h-5 w-5 text-saffron-600 rounded"
                />
                <span>Sadhvijibhagwan</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               {formData.group_sadhu && (
                 <div>
                   <label className="text-xs text-gray-500">Count (Sadhu)</label>
                   <input type="number" min="0" className="w-full p-2 border rounded" 
                     value={formData.no_sadhubhagwan || ''} 
                     onChange={e => setFormData({...formData, no_sadhubhagwan: parseInt(e.target.value)})}
                   />
                 </div>
               )}
               {formData.group_sadhvi && (
                 <div>
                   <label className="text-xs text-gray-500">Count (Sadhvi)</label>
                   <input type="number" min="0" className="w-full p-2 border rounded"
                     value={formData.no_sadhvijibhagwan || ''} 
                     onChange={e => setFormData({...formData, no_sadhvijibhagwan: parseInt(e.target.value)})}
                   />
                 </div>
               )}
            </div>
        </div>

        {/* Route */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <div className="relative">
                <select 
                required
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-saffron-500 appearance-none bg-white"
                value={formData.vihar_from}
                onChange={e => setFormData({...formData, vihar_from: e.target.value})}
                >
                <option value="">Select Location</option>
                {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <div className="relative">
                <select 
                required
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-saffron-500 appearance-none bg-white"
                value={formData.vihar_to}
                onChange={e => setFormData({...formData, vihar_to: e.target.value})}
                >
                <option value="">Select Location</option>
                {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                 <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
            </div>
          </div>
          
          {distanceInfo && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 mt-8 md:mt-0 bg-saffron-100 text-saffron-800 text-xs px-3 py-1 rounded-full font-bold shadow-sm z-10 whitespace-nowrap">
              {distanceInfo}
            </div>
          )}
        </div>

        {/* Sevak Selection (Multi-select) */}
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Assign Sevaks <span className="text-red-500">*</span></label>
           <input 
             type="text" 
             placeholder="Search name..." 
             className="w-full p-2 mb-2 border rounded text-sm"
             value={sevakSearch}
             onChange={e => setSevakSearch(e.target.value)}
           />
           <div className="h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredSevaks.map(sevak => (
                <div 
                  key={sevak.id}
                  onClick={() => handleSevakToggle(sevak.username)}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between text-sm transition-all ${
                    formData.sevaks?.includes(sevak.username) 
                      ? 'bg-saffron-600 text-white shadow-md' 
                      : 'bg-white hover:bg-gray-200 text-gray-700 border border-gray-200'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{sevak.full_name}</span>
                    <span className={`text-[10px] ${formData.sevaks?.includes(sevak.username) ? 'text-saffron-100' : 'text-gray-400'}`}>
                        {sevak.mobile}
                    </span>
                  </div>
                  {formData.sevaks?.includes(sevak.username) && <span className="font-bold bg-white/20 p-1 rounded-full">✓</span>}
                </div>
              ))}
              {filteredSevaks.length === 0 && <p className="col-span-2 text-center text-gray-400 py-8">No matching sevaks found.</p>}
           </div>
           <p className="text-xs text-gray-500 mt-2 text-right">
             {formData.sevaks?.length} Sevaks Selected
           </p>
        </div>

        {/* Additional Options */}
        <div className="flex items-center space-x-2 border-t pt-4">
            <input 
              type="checkbox" 
              id="wc" 
              className="w-5 h-5 text-saffron-600 rounded"
              checked={formData.wheelchair}
              onChange={e => setFormData({...formData, wheelchair: e.target.checked})}
            />
            <label htmlFor="wc" className="text-gray-700">Wheelchair Assistance Provided?</label>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Samuday</label>
            <input 
                type="text" 
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="e.g. Labdhi Vikram"
                value={formData.samuday || ''}
                onChange={e => setFormData({...formData, samuday: e.target.value})}
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center space-x-2 text-lg transition-transform active:scale-95 disabled:opacity-70"
        >
           {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
           <span>{loading ? "Saving..." : "Submit Entry"}</span>
        </button>

      </form>
    </div>
  );
};

export default NewEntry;