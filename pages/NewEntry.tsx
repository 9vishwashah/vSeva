import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { UserProfile, ViharEntry, AreaRoute } from '../types';
import { Save, Loader2, MapPin, Search, X, User, Users, FilePlus, ChevronDown, Map, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Organization } from '../types';


interface NewEntryProps {
  currentUser: UserProfile;
  onSubmit: () => void;
}

const NewEntry: React.FC<NewEntryProps> = ({ currentUser, onSubmit }) => {
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);

  const { showToast } = useToast();
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
      const [sevaks, routes, org] = await Promise.all([
        dataService.getOrgSevaks(currentUser.organization_id),
        dataService.getRoutes(),
        dataService.getOrganization(currentUser.organization_id),
      ]);

      setOrgSevaks(sevaks);
      setAvailableRoutes(routes);
      setOrgDetails(org);

      const areas = new Set<string>();
      routes.forEach(r => {
        areas.add(r.from_name);
        areas.add(r.to_name);
      });
      setUniqueAreas(Array.from(areas).sort());

    } catch (err) {
      console.error("Failed to load dependency data", err);
      showToast("Failed to load initial data", 'error');
    }
  };

  fetchData();
}, [currentUser.organization_id]);


  // Distance Calculation
  useEffect(() => {
    if (formData.vihar_from && formData.vihar_to) {
      const route = availableRoutes.find(
        r => r.from_name === formData.vihar_from && r.to_name === formData.vihar_to
      );
      if (route) {
        setFormData(prev => ({ ...prev, distance_km: route.distance_km }));
        setDistanceInfo(`${route.distance_km} km`);
      } else {
        setFormData(prev => ({ ...prev, distance_km: 0 }));
        setDistanceInfo("Auto-calc pending");
      }
    } else {
      setDistanceInfo(null);
    }
  }, [formData.vihar_from, formData.vihar_to, availableRoutes]);

  const handleSevakToggle = (username: string) => {
    const current = formData.sevaks || [];
    if (current.includes(username)) {
      setFormData({ ...formData, sevaks: current.filter(s => s !== username) });
    } else {
      setFormData({ ...formData, sevaks: [...current, username] });
      setSevakSearch(''); // Clear search on selection for better UX
    }
  };

  const removeSevak = (username: string) => {
      const current = formData.sevaks || [];
      setFormData({ ...formData, sevaks: current.filter(s => s !== username) });
  };

  const getSevakDetails = (username: string) => {
      return orgSevaks.find(s => s.username === username);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sevaks?.length) {
      showToast("Please assign at least one Sevak", 'warning');
      return;
    }
    
    if (!formData.group_sadhu && !formData.group_sadhvi) {
      showToast("Please select Vihar Of (Sadhu or Sadhvi)", 'warning');
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
        no_sadhubhagwan: formData.group_sadhu && formData.no_sadhubhagwan ? Number(formData.no_sadhubhagwan) : 0,
        no_sadhvijibhagwan: formData.group_sadhvi && formData.no_sadhvijibhagwan ? Number(formData.no_sadhvijibhagwan) : 0,
      };

      await dataService.createViharEntry(entry);
      showToast("Vihar Entry Saved Successfully!", 'success');
      onSubmit(); // Navigate back
    } catch (err: any) {
      console.error(err);
      showToast(`Error saving entry: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredSevaks = sevakSearch.trim() === '' 
    ? [] 
    : orgSevaks.filter(s => 
        s.full_name.toLowerCase().includes(sevakSearch.toLowerCase()) &&
        !formData.sevaks?.includes(s.username)
      );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-3xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-saffron-50 to-white p-6 border-b border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-saffron-100 rounded-xl flex items-center justify-center text-saffron-600 shadow-sm transform -rotate-3">
            <FilePlus size={24} strokeWidth={2.5} />
        </div>
        <div>
            <h2 className="text-2xl font-serif font-bold text-gray-800">New Vihar Entry</h2>
            {/* <p className="text-sm text-gray-500">Log a Vihar for <span className="font-semibold text-saffron-600">{currentUser.organization_id}</span></p> */}
<p className="text-sm text-gray-500">
  Log a Vihar for{' '}
  <span className="font-semibold text-saffron-600">
    {orgDetails ? (
      <>
        {orgDetails.name}
        {orgDetails.city && `, ${orgDetails.city}`}
      </>
    ) : (
      <span className="inline-block h-4 w-40 bg-saffron-100 rounded animate-pulse align-middle"></span>
    )}
  </span>
</p>


        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        
        {/* Date & Type Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</label>
            <input 
              type="date" 
              required
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 focus:bg-white transition-all outline-none font-medium text-gray-700"
              value={formData.vihar_date}
              onChange={e => setFormData({...formData, vihar_date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vihar Type</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['morning', 'evening'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, vihar_type: type as any})}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                    formData.vihar_type === type 
                    ? 'bg-white text-saffron-600 shadow-sm scale-[1.02]' 
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vihar Of Selection */}
        <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vihar Of</label>
            <div className="grid grid-cols-2 gap-4">
                {/* Sadhu Button */}
                <div 
                    onClick={() => setFormData(prev => ({ ...prev, group_sadhu: !prev.group_sadhu }))}
                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all relative ${
                        formData.group_sadhu 
                        ? 'border-saffron-500 bg-saffron-50/50' 
                        : 'border-gray-100 hover:border-saffron-200 bg-white'
                    }`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <Users size={28} className={formData.group_sadhu ? 'text-saffron-600' : 'text-gray-300'} />
                        <span className={`font-bold ${formData.group_sadhu ? 'text-gray-800' : 'text-gray-400'}`}>Sadhubhagwan</span>
                    </div>
                    {formData.group_sadhu && (
                        <div className="mt-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                             <input 
                                type="number" 
                                min="1"
                                placeholder="Count"
                                autoFocus
                                className="w-full text-center p-2 border border-saffron-200 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none text-lg font-bold text-gray-800 bg-white"
                                value={formData.no_sadhubhagwan || ''}
                                onChange={e => setFormData({...formData, no_sadhubhagwan: parseInt(e.target.value)})}
                             />
                        </div>
                    )}
                    {formData.group_sadhu && <div className="absolute top-2 right-2 w-3 h-3 bg-saffron-500 rounded-full"></div>}
                </div>

                {/* Sadhvi Button */}
                <div 
                    onClick={() => setFormData(prev => ({ ...prev, group_sadhvi: !prev.group_sadhvi }))}
                    className={`cursor-pointer border-2 rounded-xl p-4 transition-all relative ${
                        formData.group_sadhvi 
                        ? 'border-pink-500 bg-pink-50/50' 
                        : 'border-gray-100 hover:border-pink-200 bg-white'
                    }`}
                >
                     <div className="flex flex-col items-center gap-2">
                        <Users size={28} className={formData.group_sadhvi ? 'text-pink-600' : 'text-gray-300'} />
                        <span className={`font-bold ${formData.group_sadhvi ? 'text-gray-800' : 'text-gray-400'}`}>Sadhvijibhagwan</span>
                    </div>
                    {formData.group_sadhvi && (
                        <div className="mt-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                             <input 
                                type="number" 
                                min="1"
                                placeholder="Count"
                                autoFocus
                                className="w-full text-center p-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-lg font-bold text-gray-800 bg-white"
                                value={formData.no_sadhvijibhagwan || ''}
                                onChange={e => setFormData({...formData, no_sadhvijibhagwan: parseInt(e.target.value)})}
                             />
                        </div>
                    )}
                    {formData.group_sadhvi && <div className="absolute top-2 right-2 w-3 h-3 bg-pink-500 rounded-full"></div>}
                </div>
            </div>
        </div>

        {/* Route */}
        <div className="space-y-3">
             <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Route Details</label>
                {distanceInfo && (
                    <span className="text-xs font-bold text-saffron-600 bg-saffron-100 px-2 py-1 rounded-full">
                        {distanceInfo}
                    </span>
                )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                    <MapPin className="absolute left-3 top-3.5 text-gray-400 group-hover:text-saffron-500 transition-colors" size={18} />
                    <select 
                        required
                        className="w-full p-3 pl-10 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 appearance-none bg-white font-medium text-gray-700 outline-none"
                        value={formData.vihar_from}
                        onChange={e => setFormData({...formData, vihar_from: e.target.value, vihar_to: ''})} // Reset To when From changes
                    >
                        <option value="">Start Location (From)</option>
                        {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                </div>
                
                <div className="relative group">
                    <Map className="absolute left-3 top-3.5 text-gray-400 group-hover:text-saffron-500 transition-colors" size={18} />
                    <select 
                        required
                        disabled={!formData.vihar_from}
                        className="w-full p-3 pl-10 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 appearance-none bg-white font-medium text-gray-700 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        value={formData.vihar_to}
                        onChange={e => setFormData({...formData, vihar_to: e.target.value})}
                    >
                        <option value="">End Location (To)</option>
                        {uniqueAreas
                            .filter(a => a !== formData.vihar_from) // Area cannot be same as From
                            .map(a => <option key={a} value={a}>{a}</option>)
                        }
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16} />
                </div>
             </div>
        </div>

        {/* Sevak Selection */}
        <div className="space-y-3 relative z-20">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Assign Sevaks <span className="text-red-500">*</span></span>
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{formData.sevaks?.length || 0} selected</span>
            </label>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                
                {/* Selected Badges */}
                <div className="flex flex-wrap gap-2">
                    {formData.sevaks?.map(username => {
                        const s = getSevakDetails(username);
                        const isFemale = s?.gender?.toLowerCase() === 'female';
                        const badgeStyle = isFemale 
                            ? 'bg-pink-50 text-pink-700 border-pink-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200';
                        
                        return (
                            <div key={username} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${badgeStyle} animate-fade-in`}>
                                <span>{s?.full_name}</span>
                                <button 
                                    type="button" 
                                    onClick={() => removeSevak(username)}
                                    className="hover:bg-white/50 rounded-full p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                    {(!formData.sevaks || formData.sevaks.length === 0) && (
                        <p className="text-xs text-gray-400 italic py-1">No sevaks assigned yet.</p>
                    )}
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search & add sevaks..." 
                        className="w-full p-2.5 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none text-sm bg-white"
                        value={sevakSearch}
                        onChange={e => setSevakSearch(e.target.value)}
                    />
                    
                    {/* Results Dropdown */}
                    {sevakSearch.trim() !== '' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                            {filteredSevaks.length > 0 ? (
                                filteredSevaks.map(s => (
                                    <div 
                                        key={s.username}
                                        onClick={() => handleSevakToggle(s.username)}
                                        className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {s.full_name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">{s.full_name}</span>
                                        </div>
                                        <div className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                            {s.gender || 'Unknown'}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-400">No matching sevaks found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Footer Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Samuday</label>
                <input 
                    type="text" 
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-saffron-500 outline-none text-sm"
                    placeholder="e.g. Labdhi Vikram"
                    value={formData.samuday || ''}
                    onChange={e => setFormData({...formData, samuday: e.target.value})}
                />
             </div>
             <div className="flex items-end pb-1">
                 <label className="flex items-center space-x-3 p-3 w-full bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.wheelchair ? 'bg-saffron-600 border-saffron-600' : 'bg-white border-gray-300'}`}>
                        {formData.wheelchair && <Check size={14} className="text-white" />}
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden"
                        checked={formData.wheelchair}
                        onChange={e => setFormData({...formData, wheelchair: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-gray-700">Wheelchair Provided?</span>
                </label>
             </div>
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-saffron-600 to-saffron-700 hover:from-saffron-700 hover:to-saffron-800 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl flex justify-center items-center space-x-2 text-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
        >
           {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />}
           <span>{loading ? "Saving Entry..." : "Submit Entry"}</span>
        </button>

      </form>
    </div>
  );
};

export default NewEntry;