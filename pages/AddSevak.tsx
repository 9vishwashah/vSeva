import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { dataService } from '../services/dataService';
import { UserPlus, Loader2, CheckCircle, Users } from 'lucide-react';

interface AddSevakProps {
  currentUser: UserProfile;
}

const AddSevak: React.FC<AddSevakProps> = ({ currentUser }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    gender: 'Male',
    age: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{username: string, password: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for the list of existing sevaks
  const [sevaks, setSevaks] = useState<UserProfile[]>([]);
  const [loadingSevaks, setLoadingSevaks] = useState(true);

  const fetchSevaks = async () => {
    try {
      setLoadingSevaks(true);
      const data = await dataService.getOrgSevaks(currentUser.organization_id);
      setSevaks(data);
    } catch (err) {
      console.error("Failed to load sevaks", err);
    } finally {
      setLoadingSevaks(false);
    }
  };

  // Fetch sevaks on mount
  useEffect(() => {
    fetchSevaks();
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
      setFormData({ fullName: '', mobile: '', gender: 'Male', age: '' });
      // Refresh the list after successful addition
      fetchSevaks();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to add sevak. Ensure backend functions are deployed.");
    } finally {
      setLoading(false);
    }
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
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fade-in">
              <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
              <h3 className="text-lg font-bold text-green-800">Sevak Added Successfully!</h3>
              <p className="text-sm text-gray-600 mt-2">Share these credentials with the sevak:</p>
              <div className="mt-4 bg-white p-4 rounded border border-green-100 inline-block text-left">
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
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                placeholder="10 digit number (Used as Password)"
                value={formData.mobile}
                onChange={e => setFormData({...formData, mobile: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none bg-white"
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
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
                        onChange={e => setFormData({...formData, age: e.target.value})}
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
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-saffron-600" />
            Organization Members
          </h2>
          <p className="text-sm text-gray-500">Currently active sevaks in {currentUser.organization_id}</p>
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
                        <th className="p-4">Name</th>
                        <th className="p-4">Username</th>
                        <th className="p-4">Mobile</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sevaks.map(sevak => (
                        <tr key={sevak.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 font-medium text-gray-900">{sevak.full_name}</td>
                            <td className="p-4 font-mono text-xs">{sevak.username}</td>
                            <td className="p-4">{sevak.mobile}</td>
                            <td className="p-4 capitalize">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {sevak.role}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${sevak.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {sevak.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddSevak;