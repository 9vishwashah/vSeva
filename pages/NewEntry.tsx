import DateInputDMY from '../components/DateInputDMY';
import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../services/dataService';
import { UserProfile, UserRole, ViharEntry, AreaRoute } from '../types';
import { Save, Loader2, MapPin, Search, X, Users, ChevronDown, Map, ChevronLeft, Clock, ImagePlus } from 'lucide-react';
import { BRAND } from '@brand';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import ThemedSelect from '../components/ThemedSelect';
import { placeOptions, type PlaceAliases } from '../services/placeAliases';
import { toLocalDateKey } from '../services/dateUtils';


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
  <div className="bg-surface rounded-card p-5 sm:p-6 ring-1 ring-inset ring-line space-y-5">
    <div className="flex items-center gap-3">
      <div className="num w-8 h-8 rounded-full bg-brand text-ink text-[14px] font-bold flex items-center justify-center shrink-0">{n}</div>
      <p className="display text-[1.5rem] font-bold text-ink">{title}</p>
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
  const [step, setStep] = useState(1);

  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<ViharEntry>>({
    vihar_date: toLocalDateKey(new Date()),
    vihar_type: 'morning',
    ...(BRAND.viharEntryExtras ? { route_kind: 'internal' as const, no_mumukshu: 0, mukhya_bhagwant: '' } : {}),
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
  // Tick animation after a successful save ("Vihar Added" / "Vihar Submitted" / "Vihar Updated")
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  // Optional Vihar photo (brands with viharEntryPhoto): kept locally and uploaded only on submit
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please choose a photo', 'warning'); return; }
    if (file.size > 20 * 1024 * 1024) { showToast('That photo is too large (max 20 MB)', 'warning'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };
  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, photo_url: null }));
  };
  const [orgSevaks, setOrgSevaks] = useState<UserProfile[]>([]);
  const [sevakSearch, setSevakSearch] = useState('');
  const [wheelchairSearch, setWheelchairSearch] = useState('');
  const [carSearch, setCarSearch] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState<AreaRoute[]>([]);
  const [uniqueAreas, setUniqueAreas] = useState<string[]>([]);
  const [placeAliases, setPlaceAliases] = useState<PlaceAliases>({});
  const [distanceInfo, setDistanceInfo] = useState<string | null>(null);

  // Load Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A Sevak's session can't read other profiles via RLS (by design — keeps
        // mobile/blood group/etc private), so the picker uses the narrow roster
        // endpoint for Sevaks and the full profile list (already permitted) for Admins.
        const [sevaks, routes] = await Promise.all([
          currentUser.role === UserRole.SEVAK
            ? dataService.getOrgRoster(currentUser.organization_id)
            : dataService.getAllOrgUsers(currentUser.organization_id),
          dataService.getRoutes(currentUser.organization_id),
        ]);
        // short forms for long place names, so From / To can be searched by them (never blocks the form)
        dataService.getPlaceAliases(currentUser.organization_id).then(setPlaceAliases).catch(() => {});

        // only Sevaks can be assigned; a Captain (admin) account is never a Vihar Sevak
        setOrgSevaks((sevaks as UserProfile[]).filter(s => s.role !== UserRole.ORG_ADMIN));
        setAvailableRoutes(routes);

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
        ...(BRAND.viharEntryExtras ? { no_mumukshu: editEntry.no_mumukshu || 0, mukhya_bhagwant: editEntry.mukhya_bhagwant || '', route_kind: editEntry.route_kind ?? 'internal' } : {}),
        distance_km: editEntry.distance_km,
        notes: editEntry.notes || '',
        photo_url: editEntry.photo_url ?? null,
      });
    }
  }, [editEntry]);


  // Distance Calculation
  useEffect(() => {
    if (formData.vihar_from && formData.vihar_to) {
      // "A -> B" and "A -> B via C" can both exist: the direct route gives the distance when there is one
      const matches = availableRoutes.filter(
        r => r.from_name === formData.vihar_from && r.to_name === formData.vihar_to
      );
      const route = matches.find(r => !r.via) || matches[0];
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
      if (!formData.group_sadhu && !formData.group_sadhvi && !(formData.no_mumukshu! > 0)) return BRAND.viharEntryExtras ? 'Select Sadhubhagwan, Sadhvijibhagwan or Mumukshu' : 'Select Sadhubhagwan or Sadhvijibhagwan';
      if (!formData.vihar_from || !formData.vihar_to) return 'Select both From and To locations';
      return null;
    }
    if (s === 3) {
      if (!formData.sevaks?.length) return 'Assign at least one Sevak';
      return null;
    }
    return null;
  };

  // On touchscreens, tapping "Next" can fire a duplicate/ghost click right
  // after it (a known mobile-browser quirk). Since Next and Submit occupy the
  // same slot and Submit swaps in the instant the step advances, that ghost
  // click was landing on Submit and saving the entry before step 4 ever
  // rendered. This lock makes handleSubmit ignore any submit that fires in
  // the brief window immediately after a step change.
  const navLockRef = useRef(false);
  // Set synchronously on the first submit, so a fast double tap / double Enter can never save the entry twice
  // (the disabled button only takes effect after the next render).
  const submittingRef = useRef(false);

  const goNext = () => {
    const err = stepError(step);
    if (err) {
      showToast(err, 'warning');
      return;
    }
    navLockRef.current = true;
    setStep(s => Math.min(TOTAL_STEPS, s + 1));
    setTimeout(() => { navLockRef.current = false; }, 400);
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
    // A ghost/duplicate click landed on the Submit button right after Next
    // swapped it into the same spot (see navLockRef above) — ignore it.
    if (navLockRef.current) {
      return;
    }
    // Hard backstop: some browsers/keyboards implicitly submit a form (Enter in
    // a text field, a <select> confirm, autofill) before the keydown guard on
    // the form gets a chance to preventDefault. Whatever fired this submit, it
    // must never actually save the entry before the wizard has reached the
    // final step — just advance instead of silently completing early.
    if (step < TOTAL_STEPS) {
      setStep(TOTAL_STEPS);
      return;
    }
    if (!formData.sevaks?.length) {
      showToast("Please assign at least one Sevak", 'warning');
      return;
    }

    if (!formData.group_sadhu && !formData.group_sadhvi && !(formData.no_mumukshu! > 0)) {
      showToast("Please select Vihar Of (Sadhu or Sadhvi)", 'warning');
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const entryPayload: ViharEntry = {
        ...formData as ViharEntry,
        organization_id: currentUser.organization_id,
        created_by: isEditing ? editEntry!.created_by : currentUser.id,
        no_sadhubhagwan: formData.group_sadhu && formData.no_sadhubhagwan ? Number(formData.no_sadhubhagwan) : 0,
        no_sadhvijibhagwan: formData.group_sadhvi && formData.no_sadhvijibhagwan ? Number(formData.no_sadhvijibhagwan) : 0,
      };
      if (BRAND.viharEntryExtras) {
        entryPayload.no_mumukshu = Math.max(0, Number(formData.no_mumukshu) || 0);
        entryPayload.mukhya_bhagwant = formData.mukhya_bhagwant?.trim() || null;
      }
      if (photoFile) {
        try {
          entryPayload.photo_url = await dataService.uploadViharPhoto(currentUser.organization_id, photoFile);
        } catch (photoErr: any) {
          console.error('Vihar photo upload failed', photoErr);
          showToast('The photo could not be uploaded. Please try again, or remove it to submit without one.', 'error');
          setLoading(false);
          submittingRef.current = false;
          return;
        }
      }

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
      setSavedLabel(isEditing ? 'Vihar Updated' : isSevakSubmission ? 'Vihar Submitted' : 'Vihar Added');
      window.setTimeout(onSubmit, 1500);
    } catch (err: any) {
      console.error(err);
      showToast(`Error saving entry: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      submittingRef.current = false;
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
        <label className="text-sm font-medium text-ink-2 flex items-center justify-between gap-2">
          <span>{title} {isRequired && <span className="text-err">*</span>}</span>
          <span className="num text-[12px] font-semibold text-ok bg-ok-soft px-2.5 h-6 inline-flex items-center rounded-full">{assignedSevaks.length} selected</span>
        </label>

        <div className="space-y-3">
          {/* Selected Badges */}
          <div className="flex flex-wrap gap-2">
            {assignedSevaks.map(username => {
              const s = getSevakDetails(username);
              const isFemale = s?.gender?.toLowerCase() === 'female';
              const badgeStyle = isFemale
                ? 'bg-[#F6DCE8] text-ink'
                : 'bg-[#DCEFF2] text-ink';

              return (
                <div key={username} className={`flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-full text-[14px] font-medium ${badgeStyle}`}>
                  <Avatar name={s?.full_name || username} url={s?.avatar_url} size={22} className="text-[9px]" />
                  <span>{s?.full_name}</span>
                  <button
                    type="button"
                    onClick={() => removeSevak(username, listType)}
                    aria-label="Remove"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/60"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            {assignedSevaks.length === 0 && (
              <p className="text-[14px] text-ink-3 py-1">No sevaks assigned yet.</p>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" size={17} />
            <input
              type="text"
              placeholder="Search & add sevaks..."
              className="w-full h-12 pl-11 pr-4 rounded-full bg-white ring-1 ring-inset ring-line focus:ring-2 focus:ring-ink outline-none text-[16px] text-ink placeholder:text-ink-3/70"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />

            {/* Results Dropdown */}
            {searchValue.trim() !== '' && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface ring-1 ring-line rounded-2xl shadow-xl max-h-56 overflow-y-auto z-[60] py-1">
                {filtered.length > 0 ? (
                  filtered.map(s => (
                    <div
                      key={s.username}
                      onClick={() => handleSevakToggle(s.username, listType)}
                      className="px-3 py-2.5 hover:bg-sunken cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} url={s.avatar_url} size={32} className="text-xs" />
                        <span className="text-[15px] font-medium text-ink">{s.full_name}</span>
                      </div>
                      <div className="text-[12px] text-ink-2 bg-sunken px-2.5 py-0.5 rounded-full">
                        {s.gender || 'Unknown'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[14px] text-ink-2">No matching sevaks found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Design Core (docs/design-core.md): white 16px fields with an inset line, labels above, segmented controls
  const inputClass = "w-full py-3 px-4 rounded-field bg-white ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-ink font-medium text-ink text-[16px] placeholder:text-ink-3/70";
  const labelClass = "text-sm font-medium text-ink-2 block mb-2";
  const pillWrapClass = "flex gap-1 bg-sunken p-1 rounded-full";
  const pillClass = (active: boolean) => `flex-1 min-w-0 h-11 px-1.5 rounded-full text-[14px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${active ? 'bg-brand text-ink' : 'text-ink-2'}`;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24">
      {savedLabel && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-ink/45 p-6 app-modal-backdrop" role="status" aria-live="polite">
          <div className="w-full max-w-[18rem] rounded-[32px] bg-surface px-6 pt-8 pb-7 text-center shadow-[0_24px_64px_rgb(29_29_27/0.25)] app-modal-card">
            <svg className="vs-tick mx-auto" width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
              <circle className="vs-tick-ring" cx="48" cy="48" r="42" fill="#E8730C" />
              <path className="vs-tick-mark" d="M30 49 L43 62 L67 36" fill="none" stroke="#1D1D1B" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="display mt-5 text-[1.9rem] font-extrabold text-ink">{savedLabel}</p>
            <p className="mt-1.5 text-[14px] text-ink-2">
              {savedLabel === 'Vihar Submitted' ? 'Sent to your Captain for approval' : savedLabel === 'Vihar Updated' ? 'Your changes are saved' : 'Saved for your group'}
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="px-1">
        <h2 className="display text-[2.1rem] sm:text-[2.6rem] font-extrabold text-ink">
          {isReviewingPending ? 'Review & Correct Submission' : isEditing ? 'Edit Vihar Entry' : isSevakSubmission ? 'Submit Vihar for Approval' : 'New Vihar Entry'}
        </h2>
        {isSevakSubmission && (
          <p className="text-[15px] text-ink-2 mt-2">
            This will be sent to your Captain for approval before it counts as an official Vihar.
          </p>
        )}
        {isSevakSubmission && step === 1 && (
          <div className="mt-3 rounded-2xl bg-brand-50 px-4 py-3 text-[14px] text-ink-2">
            <p className="m-0 font-semibold text-brand-700">Before you submit</p>
            <ul className="m-0 mt-1 pl-4 list-disc space-y-0.5">
              <li>Select <b>every Sevak who was with you</b> on this Vihar, so it counts for all of them.</li>
              <li>Only <b>one Sevak</b> submits the Vihar, on behalf of everyone. Others should not submit it again.</li>
            </ul>
          </div>
        )}
        {isReviewingPending && (
          <span className="mt-3 inline-flex items-center gap-1.5 bg-warn-soft text-warn text-[13px] font-semibold px-3 h-7 rounded-full">
            <Clock size={12} /> Pending Captain Approval
          </span>
        )}
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1.5 px-1" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i < step ? 'bg-brand' : 'bg-line'}`} />
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={e => {
          // Browsers implicitly submit a form on Enter when it has only one
          // text input — true at step 3 whenever Wheelchair/Car Seva are both
          // off, since "Assign Sevaks" is then the only text field. That was
          // silently jumping straight to submission instead of just filtering
          // the sevak search. Enter should never submit before the final step.
          if (e.key === 'Enter' && step < TOTAL_STEPS) {
            e.preventDefault();
          }
        }}
        className="space-y-5"
      >

        {step === 1 && (
          <StepCard n={1} title="Date & Type">
            <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={labelClass}>Date</label>
                <DateInputDMY
                  required
                  aria-label="Vihar date"
                  className={inputClass + ' min-w-0 px-3'}
                  value={formData.vihar_date}
                  onChange={v => setFormData({ ...formData, vihar_date: v })}
                />
              </div>
              <div className="min-w-0">
                <label className={labelClass}>Vihar Session</label>
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
            {BRAND.viharEntryExtras && (
              <div>
                <label className={labelClass}>Vihar Type</label>
                <div className={pillWrapClass}>
                  {(['internal', 'highway'] as const).map(kind => (
                    <button key={kind} type="button" onClick={() => setFormData({ ...formData, route_kind: kind })} className={pillClass(formData.route_kind === kind) + ' capitalize'}>
                      {kind}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </StepCard>
        )}

        {step === 2 && (
          <StepCard n={2} title="Vihar Of & Route">
            <div>
              <label className={labelClass}>Vihar Of</label>
              <div className={`grid gap-3 ${BRAND.viharEntryExtras ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div
                  onClick={() => setFormData(prev => ({ ...prev, group_sadhu: !prev.group_sadhu }))}
                  className={`cursor-pointer border-2 rounded-2xl p-3.5 transition-colors relative ${formData.group_sadhu ? 'border-ink bg-block-sky' : 'border-transparent bg-sunken'}`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Users size={22} className={formData.group_sadhu ? 'text-ink' : 'text-ink-3'} />
                    <span className={`text-[15px] font-semibold ${formData.group_sadhu ? 'text-ink' : 'text-ink-2'}`}>{BRAND.viharEntryExtras ? 'Sadhu' : 'Sadhubhagwan'}</span>
                  </div>
                  {formData.group_sadhu && (
                    <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Count"
                        autoFocus
                        className="num w-full h-11 text-center rounded-xl outline-none text-[18px] font-bold text-ink bg-white focus:ring-2 focus:ring-ink"
                        value={formData.no_sadhubhagwan || ''}
                        onChange={e => setFormData({ ...formData, no_sadhubhagwan: parseInt(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setFormData(prev => ({ ...prev, group_sadhvi: !prev.group_sadhvi }))}
                  className={`cursor-pointer border-2 rounded-2xl p-3.5 transition-colors relative ${formData.group_sadhvi ? 'border-ink bg-block-pink' : 'border-transparent bg-sunken'}`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <Users size={22} className={formData.group_sadhvi ? 'text-ink' : 'text-ink-3'} />
                    <span className={`text-[15px] font-semibold ${formData.group_sadhvi ? 'text-ink' : 'text-ink-2'}`}>{BRAND.viharEntryExtras ? 'Sadhvi' : 'Sadhvijibhagwan'}</span>
                  </div>
                  {formData.group_sadhvi && (
                    <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Count"
                        autoFocus
                        className="num w-full h-11 text-center rounded-xl outline-none text-[18px] font-bold text-ink bg-white focus:ring-2 focus:ring-ink"
                        value={formData.no_sadhvijibhagwan || ''}
                        onChange={e => setFormData({ ...formData, no_sadhvijibhagwan: parseInt(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                {BRAND.viharEntryExtras && (
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, no_mumukshu: prev.no_mumukshu! > 0 ? 0 : 1 }))}
                    className={`cursor-pointer border-2 rounded-2xl p-3.5 transition-colors relative ${formData.no_mumukshu! > 0 ? 'border-ink bg-block-lavender' : 'border-transparent bg-sunken'}`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <Users size={22} className={formData.no_mumukshu! > 0 ? 'text-ink' : 'text-ink-3'} />
                      <span className={`text-[15px] font-semibold ${formData.no_mumukshu! > 0 ? 'text-ink' : 'text-ink-2'}`}>Mumukshu</span>
                    </div>
                    {formData.no_mumukshu! > 0 && (
                      <div className="mt-2.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          min="1"
                          placeholder="Count"
                          className="num w-full h-11 text-center rounded-xl outline-none text-[18px] font-bold text-ink bg-white focus:ring-2 focus:ring-ink"
                          value={formData.no_mumukshu || ''}
                          onChange={e => setFormData({ ...formData, no_mumukshu: Math.max(1, parseInt(e.target.value) || 1) })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end gap-2 mb-2 flex-wrap">
                <label className={labelClass + ' mb-0'}>Route Details</label>
                {distanceInfo && (
                  <span className="num text-[13px] font-semibold text-ink bg-[#F6E7AE] px-2.5 h-7 inline-flex items-center rounded-full">{distanceInfo}</span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-white ring-1 ring-inset ring-line rounded-field p-1 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <ThemedSelect
                    value={formData.vihar_from || ''}
                    onChange={v => setFormData({ ...formData, vihar_from: v, vihar_to: '' })}
                    options={placeOptions(uniqueAreas, placeAliases)}
                    placeholder="From"
                    title="Vihar From"
                    clearable={false}
                    hideChevron
                    leading={<MapPin className="text-ink-3 shrink-0" size={17} />}
                    className="w-full h-11 px-3 bg-transparent font-medium text-[16px] text-ink outline-none"
                  />
                </div>
                <ChevronDown className="rotate-[-90deg] text-ink-3 shrink-0" size={16} />
                <div className="relative flex-1 min-w-0">
                  <ThemedSelect
                    value={formData.vihar_to || ''}
                    onChange={v => setFormData({ ...formData, vihar_to: v })}
                    options={placeOptions(uniqueAreas.filter(a => a !== formData.vihar_from), placeAliases)}
                    placeholder="To"
                    title="Vihar To"
                    disabled={!formData.vihar_from}
                    clearable={false}
                    hideChevron
                    leading={<Map className="text-ink-3 shrink-0" size={17} />}
                    className="w-full h-11 px-3 bg-transparent font-medium text-[16px] text-ink outline-none"
                  />
                </div>
              </div>
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard n={3} title="Seva Requirements">
            {renderSevakSelector('Assign Sevaks', 'sevaks', sevakSearch, setSevakSearch, true)}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-line">
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
            {BRAND.viharEntryExtras && (
              <div>
                <label className={labelClass}>Mukhya Sadhu Bhagwant / Sadhviji Bhagwant</label>
                <input
                  type="text"
                  maxLength={200}
                  className={inputClass}
                  placeholder="e.g. P.P. Acharya Shri …"
                  value={formData.mukhya_bhagwant || ''}
                  onChange={e => setFormData({ ...formData, mukhya_bhagwant: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>Notes / Remark (Optional)</label>
              <textarea
                className={inputClass + ' min-h-[80px] resize-none'}
                placeholder="Add any specific instructions or observations…"
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            {BRAND.viharEntryPhoto && (
              <div>
                <label className={labelClass}>Vihar Photo (Optional)</label>
                {photoPreview || formData.photo_url ? (
                  <div className="relative rounded-2xl overflow-hidden bg-sunken">
                    <img src={photoPreview || formData.photo_url || ''} alt="Vihar photo" className="w-full max-h-72 object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      aria-label="Remove photo"
                      className="absolute top-2 right-2 w-10 h-10 rounded-full bg-ink/70 text-surface flex items-center justify-center active:scale-95"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line bg-surface py-6 cursor-pointer text-ink active:scale-[0.99] transition">
                    <ImagePlus size={24} />
                    <span className="text-[15px] font-semibold">Add a photo of the Vihar</span>
                    <span className="text-[13px] text-ink-3">From the camera or the gallery</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                )}
              </div>
            )}
          </StepCard>
        )}

        {/* Bottom nav */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center justify-center gap-1.5 h-14 px-5 rounded-full bg-surface ring-1 ring-inset ring-line text-ink font-semibold text-[15px] hover:bg-white active:translate-y-px transition"
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 h-14 rounded-full bg-brand hover:bg-brand-600 text-ink font-semibold text-[16px] active:translate-y-px transition"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 h-14 rounded-full bg-brand hover:bg-brand-600 text-ink font-semibold text-[16px] active:translate-y-px transition disabled:opacity-60"
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
