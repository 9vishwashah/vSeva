import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { UserProfile, UserRole, ViharEntry, AreaRoute } from '../types';
import { Save, Loader2, MapPin, Search, X, Users, ChevronDown, Map, ChevronLeft, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Organization } from '../types';


interface NewEntryProps {
  currentUser: UserProfile;
  onSubmit: () => void;
  onCancel?: () => void;  // Go back without saving
  entry?: ViharEntry; // If provided, edit mode
}

const TOTAL_STEPS = 4;

// Defined at module scope (not inside NewEntry) so it's a stable component
// reference across renders — nesting it inside NewEntry caused React to
// remount this whole subtree, including every input, on each keystroke.
const StepCard: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="bg-white rounded-[22px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-full bg-saffron-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">{n}</div>
      <p className="text-sm font-bold text-[#241C17]">{title}</p>
    </div>
    {children}
  </div>
);

const NewEntry: React.FC<NewEntryProps> = ({ currentUser, onSubmit, onCancel, entry: editEntry }) => {

  const isEditing = !!editEntry;
  // A Captain reviewing/correcting a Sevak's pending submission — editing here must
  // NOT flip the approval status; Approve/Reject stays a separate explicit action.
  const isReviewingPending = isEditing && editEntry?.status && editEntry.status !== 'approved';
  // A Sevak creating a brand-new entry always lands as a submission awaiting approval.
  const isSevakSubmission = currentUser.role === UserRole.SEVAK && !isEditing;
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  const [step, setStep] = useState(1);

  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<ViharEntry>>({
    vihar_date: new Date().toISOString().split('T')[0],
    vihar_type: 'morning',
    group_sadhu: false,
    group_sadhvi: false,
    wheelchair: false,
    wheelchair_sevaks: [],
    car_seva: false,
    car_seva_sevaks: [],
    notes: '',
    sevaks: currentUser.role === UserRole.SEVAK ? [currentUser.username] : [],
  });

  const [loading, setLoading] = useState(false);
  const [orgSevaks, setOrgSevaks] = useState<UserProfile[]>([]);
  const [sevakSearch, setSevakSearch] = useState('');
  const [wheelchairSearch, setWheelchairSearch] = useState('');
  const [carSearch, setCarSearch] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState<AreaRoute[]>([]);
  const [uniqueAreas, setUniqueAreas] = useState<string[]>([]);
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);

  // Load Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A Sevak's session can't read other profiles via RLS (by design — keeps
        // mobile/blood group/etc private), so the picker uses the narrow roster
        // endpoint for Sevaks and the full profile list (already permitted) for Admins.
        const [sevaks, routes, org] = await Promise.all([
          currentUser.role === UserRole.SEVAK
            ? dataService.getOrgRoster(currentUser.organization_id)
            : dataService.getAllOrgUsers(currentUser.organization_id),
          dataService.getRoutes(currentUser.organization_id),
          dataService.getOrganization(currentUser.organization_id),
        ]);

        setOrgSevaks(sevaks as UserProfile[]);
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

  // Pre-fill form data when editing
  useEffect(() => {
    if (editEntry) {
      setFormData({
        vihar_date: editEntry.vihar_date,
        vihar_type: editEntry.vihar_type,
        group_sadhu: editEntry.group_sadhu,
        group_sadhvi: editEntry.group_sadhvi,
        no_sadhubhagwan: editEntry.no_sadhubhagwan,
        no_sadhvijibhagwan: editEntry.no_sadhvijibhagwan,
        vihar_from: editEntry.vihar_from,
        vihar_to: editEntry.vihar_to,
        sevaks: editEntry.sevaks || [],
        wheelchair: editEntry.wheelchair,
        wheelchair_sevaks: editEntry.wheelchair_sevaks || [],
        car_seva: editEntry.car_seva || false,
        car_seva_sevaks: editEntry.car_seva_sevaks || [],
        samuday: editEntry.samuday,
        distance_km: editEntry.distance_km,
        notes: editEntry.notes || '',
      });
    }
  }, [editEntry]);


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

  const handleSevakToggle = (username: string, listType: 'sevaks' | 'wheelchair_sevaks' | 'car_seva_sevaks' = 'sevaks') => {
    const current = formData[listType] || [];
    if (current.includes(username)) {
      setFormData({ ...formData, [listType]: current.filter(s => s !== username) });
    } else {
      setFormData({ ...formData, [listType]: [...current, username] });
      if (listType === 'sevaks') setSevakSearch('');
      if (listType === 'wheelchair_sevaks') setWheelchairSearch('');
      if (listType === 'car_seva_sevaks') setCarSearch('');
    }
  };

  const removeSevak = (username: string, listType: 'sevaks' | 'wheelchair_sevaks' | 'car_seva_sevaks' = 'sevaks') => {
    const current = formData[listType] || [];
    setFormData({ ...formData, [listType]: current.filter(s => s !== username) });
  };

  const getSevakDetails = (username: string) => {
    return orgSevaks.find(s => s.username === username);
  };

  // Per-step validation — gates the "Next" button. handleSubmit keeps its own
  // checks too, as a final safety net regardless of how a step was reached.
  const stepError = (s: number): string | null => {
    if (s === 1) {
      if (!formData.vihar_date) return 'Please pick a date';
      return null;
    }
    if (s === 2) {
      if (!formData.group_sadhu && !formData.group_sadhvi) return 'Select Sadhubhagwan or Sadhvijibhagwan';
      if (!formData.vihar_from || !formData.vihar_to) return 'Select both From and To locations';
      return null;
    }
    if (s === 3) {
      if (!formData.sevaks?.length) return 'Assign at least one Sevak';
      return null;
    }
    return null;
  };

  const goNext = () => {
    const err = stepError(step);
    if (err) {
      showToast(err, 'warning');
      return;
    }
    setStep(s => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => {
    if (step === 1) {
      if (onCancel) onCancel();
      return;
    }
    setStep(s => Math.max(1, s - 1));
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
      const entryPayload: ViharEntry = {
        ...formData as ViharEntry,
        organization_id: currentUser.organization_id,
        created_by: isEditing ? editEntry!.created_by : currentUser.id,
        no_sadhubhagwan: formData.group_sadhu && formData.no_sadhubhagwan ? Number(formData.no_sadhubhagwan) : 0,
        no_sadhvijibhagwan: formData.group_sadhvi && formData.no_sadhvijibhagwan ? Number(formData.no_sadhvijibhagwan) : 0,
      };

      if (isEditing && editEntry?.id) {
        // Correcting details only — never touches status. Approve/Reject on the
        // review screen is the only way a pending entry changes state.
        await dataService.updateViharEntry(editEntry.id, entryPayload);
        showToast(isReviewingPending ? "Correction saved. Continue your review below." : "Vihar Entry Updated Successfully!", 'success');
      } else if (isSevakSubmission) {
        await dataService.submitViharEntry(entryPayload);
        showToast("Vihar submitted. Waiting for Captain approval.", 'success');
      } else {
        await dataService.createViharEntry(entryPayload);
        showToast("Vihar Entry Saved Successfully!", 'success');
      }
      onSubmit();
    } catch (err: any) {
      console.error(err);
      showToast(`Error saving entry: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderSevakSelector = (
    title: string,
    listType: 'sevaks' | 'wheelchair_sevaks' | 'car_seva_sevaks',
    searchValue: string,
    setSearchValue: (val: string) => void,
    isRequired: boolean = false
  ) => {
    const assignedSevaks = formData[listType] || [];
    const filtered = searchValue.trim() === ''
      ? []
      : orgSevaks.filter(s =>
        s.full_name.toLowerCase().includes(searchValue.toLowerCase()) &&
        !assignedSevaks.includes(s.username)
      );

    return (
      <div className="space-y-3 relative z-20">
        <label className="text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider flex items-center justify-between">
          <span>{title} {isRequired && <span className="text-red-500">*</span>}</span>
          <span className="text-[10px] font-bold text-saffron-700 bg-saffron-100 px-2 py-0.5 rounded-full">{assignedSevaks.length} selected</span>
        </label>

        <div className="space-y-3">
          {/* Selected Badges */}
          <div className="flex flex-wrap gap-2">
            {assignedSevaks.map(username => {
              const s = getSevakDetails(username);
              const isFemale = s?.gender?.toLowerCase() === 'female';
              const badgeStyle = isFemale
                ? 'bg-pink-50 text-pink-700 border-pink-200'
                : 'bg-blue-50 text-blue-700 border-blue-200';

              return (
                <div key={username} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${badgeStyle}`}>
                  <span>{s?.full_name}</span>
                  <button
                    type="button"
                    onClick={() => removeSevak(username, listType)}
                    className="hover:bg-white/50 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            {assignedSevaks.length === 0 && (
              <p className="text-xs text-[#8A6A57]/70 italic py-1">No sevaks assigned yet.</p>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B7B7AF]" size={16} />
            <input
              type="text"
              placeholder="Search & add sevaks..."
              className="w-full py-2.5 pl-9 pr-3 rounded-xl focus:ring-2 focus:ring-saffron-300 outline-none text-sm bg-[#F7F4F0] border-none"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />

            {/* Results Dropdown */}
            {searchValue.trim() !== '' && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-[60]">
                {filtered.length > 0 ? (
                  filtered.map(s => (
                    <div
                      key={s.username}
                      onClick={() => handleSevakToggle(s.username, listType)}
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
    );
  };

  const inputClass = "w-full py-3 px-3.5 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm";
  const labelClass = "text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider block mb-2";
  const pillWrapClass = "flex bg-[#F7F4F0] p-1 rounded-xl";
  const pillClass = (active: boolean) => `flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? 'bg-white text-saffron-700 shadow-sm' : 'text-[#8A6A57]'}`;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#241C17]">
          {isReviewingPending ? 'Review & Correct Submission' : isEditing ? 'Edit Vihar Entry' : isSevakSubmission ? 'Submit Vihar for Approval' : 'New Vihar Entry'}
        </h2>
        <p className="text-sm text-[#8A6A57] mt-1">
          {isSevakSubmission
            ? 'This will be sent to your Captain for approval before it counts as an official Vihar.'
            : (orgDetails ? `${orgDetails.name}${orgDetails.city ? `, ${orgDetails.city}` : ''}` : 'Loading organization…')}
        </p>
        {isReviewingPending && (
          <span className="mt-2 inline-flex items-center gap-1.5 bg-saffron-100 text-saffron-700 text-xs font-bold px-3 py-1 rounded-full">
            <Clock size={12} /> Pending Captain Approval
          </span>
        )}
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1.5 px-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i < step ? 'bg-saffron-600' : 'bg-saffron-100'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {step === 1 && (
          <StepCard n={1} title="Date & Type">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  required
                  className={inputClass}
                  value={formData.vihar_date}
                  onChange={e => setFormData({ ...formData, vihar_date: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Vihar Type</label>
                <div className={pillWrapClass}>
                  {['morning', 'evening'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, vihar_type: type as any })}
                      className={pillClass(formData.vihar_type === type) + ' capitalize'}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard n={2} title="Vihar Of & Route">
            <div>
              <label className={labelClass}>Vihar Of</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setFormData(prev => ({ ...prev, group_sadhu: !prev.group_sadhu }))}
                  className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all relative ${formData.group_sadhu ? 'border-saffron-500 bg-saffron-50/60' : 'border-transparent bg-[#F7F4F0]'}`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Users size={22} className={formData.group_sadhu ? 'text-saffron-600' : 'text-[#B7B7AF]'} />
                    <span className={`text-sm font-bold ${formData.group_sadhu ? 'text-[#241C17]' : 'text-[#8A6A57]'}`}>Sadhubhagwan</span>
                  </div>
                  {formData.group_sadhu && (
                    <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Count"
                        autoFocus
                        className="w-full text-center py-1.5 rounded-lg outline-none text-base font-extrabold text-[#241C17] bg-white"
                        value={formData.no_sadhubhagwan || ''}
                        onChange={e => setFormData({ ...formData, no_sadhubhagwan: parseInt(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setFormData(prev => ({ ...prev, group_sadhvi: !prev.group_sadhvi }))}
                  className={`cursor-pointer border-2 rounded-xl p-3.5 transition-all relative ${formData.group_sadhvi ? 'border-pink-400 bg-pink-50/60' : 'border-transparent bg-[#F7F4F0]'}`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Users size={22} className={formData.group_sadhvi ? 'text-pink-600' : 'text-[#B7B7AF]'} />
                    <span className={`text-sm font-bold ${formData.group_sadhvi ? 'text-[#241C17]' : 'text-[#8A6A57]'}`}>Sadhvijibhagwan</span>
                  </div>
                  {formData.group_sadhvi && (
                    <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Count"
                        autoFocus
                        className="w-full text-center py-1.5 rounded-lg outline-none text-base font-extrabold text-[#241C17] bg-white"
                        value={formData.no_sadhvijibhagwan || ''}
                        onChange={e => setFormData({ ...formData, no_sadhvijibhagwan: parseInt(e.target.value) })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <label className={labelClass + ' mb-0'}>Route Details</label>
                {distanceInfo && (
                  <span className="text-xs font-bold text-saffron-700 bg-saffron-100 px-2 py-1 rounded-full">{distanceInfo}</span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-[#F7F4F0] rounded-xl p-1.5">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B7B7AF] pointer-events-none" size={15} />
                  <select
                    required
                    className="w-full py-2 pl-8 pr-6 bg-transparent appearance-none font-semibold text-sm text-[#241C17] outline-none"
                    value={formData.vihar_from}
                    onChange={e => setFormData({ ...formData, vihar_from: e.target.value, vihar_to: '' })}
                  >
                    <option value="">From</option>
                    {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <ChevronDown className="rotate-[-90deg] text-[#B7B7AF] shrink-0" size={14} />
                <div className="relative flex-1">
                  <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B7B7AF] pointer-events-none" size={15} />
                  <select
                    required
                    disabled={!formData.vihar_from}
                    className="w-full py-2 pl-8 pr-6 bg-transparent appearance-none font-semibold text-sm text-[#241C17] outline-none disabled:text-gray-400"
                    value={formData.vihar_to}
                    onChange={e => setFormData({ ...formData, vihar_to: e.target.value })}
                  >
                    <option value="">To</option>
                    {uniqueAreas.filter(a => a !== formData.vihar_from).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard n={3} title="Seva Requirements">
            {renderSevakSelector('Assign Sevaks', 'sevaks', sevakSearch, setSevakSearch, true)}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-gray-100">
              <div className="space-y-3">
                <label className={labelClass}>Wheelchair Provided?</label>
                <div className={pillWrapClass}>
                  <button type="button" onClick={() => setFormData({ ...formData, wheelchair: true })} className={pillClass(formData.wheelchair === true)}>Yes</button>
                  <button type="button" onClick={() => setFormData({ ...formData, wheelchair: false, wheelchair_sevaks: [] })} className={pillClass(formData.wheelchair === false)}>No</button>
                </div>
                {formData.wheelchair && renderSevakSelector('Assign Wheelchair Sevaks', 'wheelchair_sevaks', wheelchairSearch, setWheelchairSearch, false)}
              </div>

              <div className="space-y-3">
                <label className={labelClass}>Car Seva (Updhi)</label>
                <div className={pillWrapClass}>
                  <button type="button" onClick={() => setFormData({ ...formData, car_seva: true })} className={pillClass(formData.car_seva === true)}>Yes</button>
                  <button type="button" onClick={() => setFormData({ ...formData, car_seva: false, car_seva_sevaks: [] })} className={pillClass(formData.car_seva === false)}>No</button>
                </div>
                {formData.car_seva && renderSevakSelector('Assign Car Sevaks', 'car_seva_sevaks', carSearch, setCarSearch, false)}
              </div>
            </div>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard n={4} title="Instructions & Review">
            <div>
              <label className={labelClass}>Samuday</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Labdhi Vikram"
                value={formData.samuday || ''}
                onChange={e => setFormData({ ...formData, samuday: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Notes / Remark (Optional)</label>
              <textarea
                className={inputClass + ' min-h-[80px] resize-none'}
                placeholder="Add any specific instructions or observations…"
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </StepCard>
        )}

        {/* Bottom nav */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl bg-white border border-gray-200 text-[#241C17] font-bold text-sm active:scale-95 transition-all"
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 py-3.5 rounded-xl bg-saffron-600 hover:bg-saffron-700 text-white font-extrabold text-sm shadow-lg active:scale-[0.98] transition-all"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-saffron-600 hover:bg-saffron-700 text-white font-extrabold text-sm shadow-lg active:scale-[0.98] transition-all disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {loading
                ? (isReviewingPending ? 'Saving Correction…' : isEditing ? 'Updating…' : isSevakSubmission ? 'Submitting…' : 'Saving…')
                : (isReviewingPending ? 'Save Correction' : isEditing ? 'Update Entry' : isSevakSubmission ? 'Submit for Approval' : 'Submit Entry')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default NewEntry;
