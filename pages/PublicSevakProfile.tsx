import React, { useEffect, useState } from 'react';
import { dataService } from '../services/dataService';
import { Loader2, ShieldCheck, AlertCircle, MapPin, Phone, Activity, User, Building2, Map } from 'lucide-react';
import { BRAND } from '@brand';

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
        const data = await dataService.getPublicProfile(decoded) as any;
        if (data) {
          setProfile(data);
          
          if (data.org_name && data.org_city) {
              setOrgName(data.org_name);
              setOrgDetails({ city: data.org_city });
          } else {
             // Fallback for logged-in preview if RPC isn't deployed
             const org = await dataService.getOrganization(data.organization_id);
             if (org) {
                 setOrgName(org.name);
                 setOrgDetails(org);
             }
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
      <div className="min-h-screen bg-brand flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-brand-700 mb-4" size={48} />
        <p className="text-ink-2 font-medium tracking-wide">Securely Verifying Identity...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-sunken/60 flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-err-soft text-err rounded-full flex items-center justify-center mb-6 shadow-sm border border-err-soft">
            <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2 tracking-tight">Verification Failed</h2>
        <p className="text-ink-2 text-center max-w-sm font-medium">{error}</p>
        <a href="/" className="mt-8 px-8 py-3 bg-brand text-ink rounded-xl font-bold shadow-md hover:bg-brand-600 transition-colors">Return to Home</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center font-sans">
      <div className="max-w-md w-full bg-surface rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(234,88,12,0.25)] overflow-hidden border border-orange-100/50">
        
        {/* Header Section */}
        <div className="bg-brand px-6 pt-10 pb-16 text-center relative overflow-hidden">
          {/* Abstract patterns */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
             <div className="absolute -top-10 -left-10 w-40 h-40 bg-surface rounded-full blur-2xl"></div>
             <div className="absolute bottom-10 -right-10 w-40 h-40 bg-surface rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl p-2 mb-4 border border-white/30 shadow-lg flex items-center justify-center">
                 <ShieldCheck className="text-white drop-shadow-sm" size={36} />
             </div>
             <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Identity Confirmed</h1>
             <p className="text-orange-50 font-bold tracking-widest uppercase text-xs mt-2 border-t border-white/20 pt-2">Official {BRAND.name} Volunteer</p>
          </div>
        </div>

        {/* Profile Info overlaps header */}
        <div className="px-6 pb-8 relative z-20 -mt-10">
          <div className="bg-surface rounded-2xl shadow-xl border border-line p-6 text-center">
             <h2 className="text-2xl font-bold text-ink leading-tight">{profile.full_name}</h2>
             <div className="flex justify-center items-center mt-3 gap-2">
                 <span className="px-3 py-1 bg-brand-50 text-brand-700 font-extrabold text-[11px] tracking-widest uppercase rounded-lg border border-brand-200">
                     {profile.role}
                 </span>
                 {profile.is_active ? (
                    <span className="px-3 py-1 bg-ok-soft text-ok font-extrabold text-[11px] tracking-widest uppercase rounded-lg border border-ok-soft">
                        Active Profile
                    </span>
                 ) : (
                    <span className="px-3 py-1 bg-err-soft text-err font-extrabold text-[11px] tracking-widest uppercase rounded-lg border border-err-soft">
                        Inactive
                    </span>
                 )}
             </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest pl-1 mb-2">Volunteer Details</h3>
              <div className="bg-sunken/60 rounded-2xl p-4 border border-line space-y-4">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-brand-100 flex justify-center items-center text-brand-700 shrink-0 shadow-inner">
                          <User size={22} />
                      </div>
                      <div>
                          <p className="text-[11px] text-ink-2 font-bold uppercase tracking-wider">Gender & Blood Group</p>
                          <p className="text-ink font-semibold mt-0.5">{profile.gender || 'Not Specified'} <span className="text-ink-3 mx-1">•</span> <span className="text-err font-bold">{profile.blood_group || 'O+'}</span></p>
                      </div>
                  </div>

                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-info-soft flex justify-center items-center text-info shrink-0 shadow-inner">
                          <Phone size={22} />
                      </div>
                      <div>
                          <p className="text-[11px] text-ink-2 font-bold uppercase tracking-wider">Mobile Number</p>
                          <p className="text-ink font-medium font-mono text-lg tracking-tight mt-0.5">{profile.mobile}</p>
                      </div>
                  </div>

                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-err-soft flex justify-center items-center text-err shrink-0 shadow-inner">
                          <Activity size={22} />
                      </div>
                      <div>
                          <p className="text-[11px] text-ink-2 font-bold uppercase tracking-wider">Family Emergency Contact{profile.emergency_contact_name ? ` · ${profile.emergency_contact_name}` : ''}</p>
                          <p className="text-ink font-medium font-mono text-lg tracking-tight mt-0.5">
                              {profile.emergency_number || <span className="text-ink-3 text-sm italic font-sans font-medium hover:text-ink-2">Not Provided</span>}
                          </p>
                      </div>
                  </div>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-widest pl-1 mb-2">Location & Organization</h3>
              <div className="bg-sunken/60 rounded-2xl p-4 border border-line space-y-4">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex justify-center items-center text-purple-600 shrink-0 shadow-inner">
                          <Building2 size={22} />
                      </div>
                      <div>
                          <p className="text-[11px] text-ink-2 font-bold uppercase tracking-wider">Organization</p>
                          <p className="text-ink font-semibold leading-snug mt-0.5">{orgName}</p>
                      </div>
                  </div>

                  {orgDetails?.city && (
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex justify-center items-center text-indigo-600 shrink-0 shadow-inner">
                          <Map size={22} />
                      </div>
                      <div>
                          <p className="text-[11px] text-ink-2 font-bold uppercase tracking-wider">City Base</p>
                          <p className="text-ink font-semibold mt-0.5">{orgDetails.city}</p>
                      </div>
                  </div>
                  )}

                  <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex justify-center items-center text-teal-600 shrink-0 self-start shadow-inner">
                          <MapPin size={22} />
                      </div>
                      <div className="pt-1 flex-1">
                          <p className="text-[11px] text-ink-2 font-bold uppercase tracking-wider">Full Address</p>
                          <div className="text-ink font-semibold leading-relaxed mt-1.5 bg-surface p-3.5 rounded-xl border border-line w-full min-h-[3rem]">
                              {profile.address ? profile.address : <span className="text-ink-3 italic font-normal text-sm">No address on file</span>}
                          </div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-brand-50 px-6 py-4 flex justify-center items-center gap-3">
            <img src={BRAND.logo} alt={BRAND.name} className="h-5 w-auto opacity-60 grayscale brightness-75 mix-blend-multiply" />
            <p className="text-[11px] text-ink-2 font-bold uppercase tracking-widest">Secured Platform</p>
        </div>
      </div>
    </div>
  );
};

export default PublicSevakProfile;
