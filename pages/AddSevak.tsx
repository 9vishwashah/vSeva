import React, { useState } from 'react';
import { UserProfile } from '../types';
import { dataService } from '../services/dataService';
import { UserPlus, Loader2, CheckCircle } from 'lucide-react';

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
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to add sevak. Ensure backend functions are deployed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
    </div>
  );
};

export default AddSevak;