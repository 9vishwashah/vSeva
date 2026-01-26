import React, { useState, useEffect } from 'react';
import { PRELISTED_AREAS } from '../constants';
import { MOCK_ROUTES } from '../constants';
import { dataService } from '../services/dataService';
import { UserProfile, ViharEntry } from '../types';
import { Save, AlertCircle } from 'lucide-react';

interface NewEntryProps {
  currentUser: UserProfile;
  onSubmit: (entry: ViharEntry) => void;
}

const NewEntry: React.FC<NewEntryProps> = ({ currentUser, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<ViharEntry>>({
    vihar_date: new Date().toISOString().split('T')[0],
    vihar_type: 'Morning',
    group_sadhu: false,
    group_sadhvi: false,
    wheelchair: false,
    sevaks: [],
  });
  
  const [orgSevaks, setOrgSevaks] = useState<UserProfile[]>([]);
  const [sevakSearch, setSevakSearch] = useState('');
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);

  useEffect(() => {
    // Load sevaks for this admin's org
    const sevaks = dataService.getSevaks(currentUser.organization_id);
    setOrgSevaks(sevaks);
  }, [currentUser]);

  // Distance Trigger Simulation
  useEffect(() => {
    if (formData.vihar_from && formData.vihar_to) {
      const route = MOCK_ROUTES.find(
        r => r.from_name === formData.vihar_from && r.to_name === formData.vihar_to
      );
      if (route) {
        setFormData(prev => ({ ...prev, distance_km: route.distance_km }));
        setDistanceInfo(`${route.distance_km} km`);
      } else {
        setFormData(prev => ({ ...prev, distance_km: 0 }));
        setDistanceInfo("Distance not pre-calculated (will be 0 or manual)");
      }
    }
  }, [formData.vihar_from, formData.vihar_to]);

  const handleSevakToggle = (name: string) => {
    const current = formData.sevaks || [];
    if (current.includes(name)) {
      setFormData({ ...formData, sevaks: current.filter(s => s !== name) });
    } else {
      setFormData({ ...formData, sevaks: [...current, name] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sevaks?.length) {
      alert("Please select at least one Sevak");
      return;
    }
    // Final validations would go here
    onSubmit(formData as ViharEntry);
  };

  const filteredSevaks = orgSevaks.filter(s => 
    s.name.toLowerCase().includes(sevakSearch.toLowerCase())
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500"
              value={formData.vihar_date}
              onChange={e => setFormData({...formData, vihar_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vihar Type</label>
            <div className="flex space-x-4">
              {['Morning', 'Evening'].map(type => (
                <label key={type} className={`flex-1 cursor-pointer p-3 text-center rounded-lg border ${
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

        {/* Group Selection */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Group Composition</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200">
                <input 
                  type="checkbox" 
                  checked={formData.group_sadhu}
                  onChange={e => setFormData({...formData, group_sadhu: e.target.checked})}
                  className="h-5 w-5 text-saffron-600 focus:ring-saffron-500 rounded"
                />
                <span>Sadhubhagwan</span>
              </label>
              <label className="flex items-center space-x-3 p-3 bg-white rounded-md border border-gray-200">
                <input 
                  type="checkbox" 
                  checked={formData.group_sadhvi}
                  onChange={e => setFormData({...formData, group_sadhvi: e.target.checked})}
                  className="h-5 w-5 text-saffron-600 focus:ring-saffron-500 rounded"
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
            <select 
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-saffron-500"
              value={formData.vihar_from}
              onChange={e => setFormData({...formData, vihar_from: e.target.value})}
            >
              <option value="">Select Location</option>
              {PRELISTED_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <select 
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-saffron-500"
              value={formData.vihar_to}
              onChange={e => setFormData({...formData, vihar_to: e.target.value})}
            >
              <option value="">Select Location</option>
              {PRELISTED_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          
          {/* Distance Indicator */}
          {distanceInfo && (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 mt-4 md:mt-0 bg-saffron-100 text-saffron-800 text-xs px-2 py-1 rounded-full font-bold shadow-sm z-10">
              {distanceInfo}
            </div>
          )}
        </div>

        {/* Sevak Selection */}
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Select Sevaks <span className="text-red-500">*</span></label>
           <input 
             type="text" 
             placeholder="Search sevak..." 
             className="w-full p-2 mb-2 border rounded text-sm"
             value={sevakSearch}
             onChange={e => setSevakSearch(e.target.value)}
           />
           <div className="h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50 grid grid-cols-2 gap-2">
              {filteredSevaks.map(sevak => (
                <div 
                  key={sevak.id}
                  onClick={() => handleSevakToggle(sevak.name)}
                  className={`p-2 rounded cursor-pointer flex items-center justify-between text-sm transition-colors ${
                    formData.sevaks?.includes(sevak.name) 
                      ? 'bg-saffron-500 text-white shadow-md' 
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{sevak.name}</span>
                  {formData.sevaks?.includes(sevak.name) && <span className="font-bold">✓</span>}
                </div>
              ))}
              {filteredSevaks.length === 0 && <p className="col-span-2 text-center text-gray-400 py-4">No sevaks found.</p>}
           </div>
           <p className="text-xs text-gray-500 mt-1">
             Selected: {formData.sevaks?.length || 0}
           </p>
        </div>

        {/* Additional Options */}
        <div className="flex items-center space-x-2">
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

        <button type="submit" className="w-full bg-saffron-600 hover:bg-saffron-700 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center space-x-2 text-lg">
           <Save size={24} />
           <span>Submit Entry</span>
        </button>

      </form>
    </div>
  );
};

export default NewEntry;