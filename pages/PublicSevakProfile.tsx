import React, { useEffect, useState } from 'react';
import { dataService } from '../services/dataService';
import { Loader2, ShieldCheck, AlertCircle, MapPin, Phone, Activity, User, Building2, Map } from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

const PublicSevakProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgDetails, setOrgDetails] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const pathParts = window.location.pathname.split('/');
      const username = pathParts[pathParts.length - 1];

      if (!username) {
        setError('Invalid Profile Link');
        setLoading(false);
        return;
      }

      try {
        const decoded = decodeURIComponent(username);
        const data = await dataService.getPublicProfile(decoded);
        if (data) {
          setProfile(data);
          const org = await dataService.getOrganization(data.organization_id);
          if (org) {
              setOrgName(org.name);
              setOrgDetails(org);
          }
        } else {
          setError('Sevak profile not found.');
        }
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-saffron-50 to-orange-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-saffron-600 mb-4" size={48} />
        <p className="text-gray-600 font-medium tracking-wide">Securely Verifying Identity...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
            <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Verification Failed</h2>
        <p className="text-gray-500 text-center max-w-sm font-medium">{error}</p>
        <a href="/" className="mt-8 px-8 py-3 bg-saffron-600 text-white rounded-xl font-bold shadow-md hover:bg-saffron-700 transition-colors">Return to Home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-saffron-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center font-sans">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(234,88,12,0.25)] overflow-hidden border border-orange-100/50">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-500 px-6 pt-10 pb-16 text-center relative overflow-hidden">
          {/* Abstract patterns */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
             <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-2xl"></div>
             <div className="absolute bottom-10 -right-10 w-40 h-40 bg-white rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl p-2 mb-4 border border-white/30 shadow-lg flex items-center justify-center">
                 <ShieldCheck className="text-white drop-shadow-sm" size={36} />
             </div>
             <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Identity Confirmed</h1>
             <p className="text-orange-50 font-bold tracking-widest uppercase text-xs mt-2 border-t border-white/20 pt-2">Official vSeva Volunteer</p>
          </div>
        </div>

        {/* Profile Info overlaps header */}
        <div className="px-6 pb-8 relative z-20 -mt-10">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center">
             <h2 className="text-2xl font-bold text-gray-900 leading-tight">{profile.full_name}</h2>
             <div className="flex justify-center items-center mt-3 gap-2">
                 <span className="px-3 py-1 bg-saffron-50 text-saffron-700 font-extrabold text-[10px] tracking-widest uppercase rounded-lg border border-saffron-200">
                     {profile.role}
                 </span>
                 {profile.is_active ? (
                    <span className="px-3 py-1 bg-green-50 text-green-700 font-extrabold text-[10px] tracking-widest uppercase rounded-lg border border-green-200">
                        Active Profile
                    </span>
                 ) : (
                    <span className="px-3 py-1 bg-red-50 text-red-700 font-extrabold text-[10px] tracking-widest uppercase rounded-lg border border-red-200">
                        Inactive
                    </span>
                 )}
             </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Volunteer Details</h3>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex justify-center items-center text-orange-600 shrink-0 shadow-inner">
                          <User size={22} />
                      </div>
                      <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Gender & Blood Group</p>
                          <p className="text-gray-900 font-semibold mt-0.5">{profile.gender || 'Not Specified'} <span className="text-gray-300 mx-1">•</span> <span className="text-red-600 font-bold">{profile.blood_group || 'O+'}</span></p>
                      </div>
                  </div>

                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex justify-center items-center text-blue-600 shrink-0 shadow-inner">
                          <Phone size={22} />
                      </div>
                      <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mobile Number</p>
                          <p className="text-gray-900 font-medium font-mono text-lg tracking-tight mt-0.5">{profile.mobile}</p>
                      </div>
                  </div>

                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex justify-center items-center text-red-600 shrink-0 shadow-inner">
                          <Activity size={22} />
                      </div>
                      <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Emergency Contact</p>
                          <p className="text-gray-900 font-medium font-mono text-lg tracking-tight mt-0.5">
                              {profile.emergency_number || <span className="text-gray-400 text-sm italic font-sans font-medium hover:text-gray-500">Not Provided</span>}
                          </p>
                      </div>
                  </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Location & Organization</h3>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex justify-center items-center text-purple-600 shrink-0 shadow-inner">
                          <Building2 size={22} />
                      </div>
                      <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Organization</p>
                          <p className="text-gray-900 font-semibold leading-snug mt-0.5">{orgName}</p>
                      </div>
                  </div>

                  {orgDetails?.city && (
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex justify-center items-center text-indigo-600 shrink-0 shadow-inner">
                          <Map size={22} />
                      </div>
                      <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">City Base</p>
                          <p className="text-gray-900 font-semibold mt-0.5">{orgDetails.city}</p>
                      </div>
                  </div>
                  )}

                  <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex justify-center items-center text-teal-600 shrink-0 self-start shadow-inner">
                          <MapPin size={22} />
                      </div>
                      <div className="pt-1 flex-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Full Address</p>
                          <div className="text-gray-900 font-semibold leading-relaxed mt-1.5 bg-white p-3.5 rounded-xl border border-gray-200 w-full min-h-[3rem]">
                              {profile.address ? profile.address : <span className="text-gray-400 italic font-normal text-sm">No address on file</span>}
                          </div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 px-6 py-4 flex justify-center items-center gap-3">
            <img src={vSevaLogo} alt="vSeva" className="h-5 w-auto opacity-60 grayscale brightness-75 mix-blend-multiply" />
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Secured Platform</p>
        </div>
      </div>
    </div>
  );
};

export default PublicSevakProfile;
