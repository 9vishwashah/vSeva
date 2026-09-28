import React, { useState } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertTriangle, Image as ImageIcon, X } from 'lucide-react';
import { DirectoryCardFields, DirectoryListing, DirectoryTrustee, DirectoryMemberContact, DirectoryRoute, DirectoryPhoto } from '../../types';
import { directoryService } from '../../services/directoryService';
import { useToast } from '../../context/ToastContext';
import RepeaterField from './RepeaterField';
import DirectoryMap from './DirectoryMap';

const emptyFields = (): DirectoryCardFields => ({
  name: '',
  mulnayak: '',
  google_maps_url: '',
  latitude: null,
  longitude: null,
  pincode: '',
  area: '',
  city: '',
  state: '',
  full_address: '',
  trustees: [],
  vihar_group_name: '',
  captain_name: '',
  captain_mobile: '',
  vice_captain_name: '',
  vice_captain_mobile: '',
  member_contacts: [],
  upashray: null,
  bhojanshala: null,
  library: null,
  routes: [],
  contact_name: '',
  contact_phone: '',
  contact_phone_public: false,
  website: '',
  timings: { morning: '', evening: '' },
  photos: [],
  notes: '',
});

// Downscale + re-encode client-side before upload — same rationale as
// AvatarCropModal's canvas export, just without the crop UI (a rectangle
// cover/gallery photo doesn't need one).
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

const SectionCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <h3 className="text-[15px] font-bold text-[#241C17] mb-0.5">{title}</h3>
    {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
    <div className={description ? 'mt-4' : 'mt-3'}>{children}</div>
  </div>
);

const inputClass = "w-full py-2.5 px-3 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 text-sm text-[#241C17] transition-shadow placeholder:text-gray-400";
const labelClass = "block text-xs font-bold text-gray-500 mb-1.5";

interface DirectoryListingFormProps {
  // 'edit' = public "Suggest an Edit" (produces a change request needing
  // approval). 'admin-edit' = Super Admin editing a published listing
  // directly — no contributor section, no approval round trip.
  mode: 'add' | 'edit' | 'admin-edit';
  initialValues?: DirectoryCardFields;
  listingId?: string;
  adminId?: string;
  onSubmitted: () => void;
  onCancel?: () => void;
}

const DirectoryListingForm: React.FC<DirectoryListingFormProps> = ({ mode, initialValues, listingId, adminId, onSubmitted, onCancel }) => {
  const { showToast } = useToast();
  const [fields, setFields] = useState<DirectoryCardFields>(initialValues || emptyFields());
  const [mapsUrl, setMapsUrl] = useState(initialValues?.google_maps_url || '');
  const [resolving, setResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [duplicates, setDuplicates] = useState<DirectoryListing[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [contributorName, setContributorName] = useState('');
  const [contributorMobile, setContributorMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof DirectoryCardFields>(key: K, value: DirectoryCardFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  const resolveLocation = async (url: string) => {
    if (!url.trim()) return;
    setResolving(true);
    setResolveFailed(false);
    try {
      const result = await directoryService.resolveGoogleMapsLink(url.trim());
      if (!result.resolved) {
        setResolveFailed(true);
        return;
      }
      setFields((f) => ({
        ...f,
        google_maps_url: url.trim(),
        latitude: result.latitude,
        longitude: result.longitude,
        full_address: result.formatted_address || f.full_address,
        pincode: result.pincode || f.pincode,
        area: result.area || f.area,
        city: result.city || f.city,
        state: result.state || f.state,
      }));

      if (fields.name.trim() && result.city) {
        const dups = await directoryService.findPossibleDuplicates(fields.name, result.city, result.latitude, result.longitude);
        setDuplicates(dups);
      }
    } catch (err) {
      console.error('Location resolve failed', err);
      setResolveFailed(true);
    } finally {
      setResolving(false);
    }
  };

  const handleFacilityToggle = (key: 'upashray' | 'bhojanshala' | 'library', enabled: boolean) => {
    set(key, enabled ? { name: '', google_maps_url: '', latitude: null, longitude: null, contact_name: '', contact_phone: '' } : null);
  };

  const resolveFacilityLocation = async (key: 'upashray' | 'bhojanshala' | 'library', url: string) => {
    if (!url.trim()) return;
    try {
      const result = await directoryService.resolveGoogleMapsLink(url.trim());
      if (result.resolved) {
        setFields((f) => ({
          ...f,
          [key]: { ...(f[key] as any), google_maps_url: url.trim(), latitude: result.latitude, longitude: result.longitude },
        }));
      }
    } catch (err) {
      console.error('Facility location resolve failed', err);
    }
  };

  const handlePhotoUpload = async (file: File, isCover: boolean) => {
    if (fields.photos.length >= 5) {
      showToast('Up to 5 photos only (1 cover + 4 more)', 'warning');
      return;
    }
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const folderKey = listingId || `pending-${Date.now()}`;
      const url = await directoryService.uploadDirectoryPhoto(compressed, folderKey);
      const photo: DirectoryPhoto = { url, is_cover: isCover };
      set('photos', isCover ? [photo, ...fields.photos.filter((p) => !p.is_cover)] : [...fields.photos, photo]);
    } catch (err) {
      console.error('Photo upload failed', err);
      showToast('Could not upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (url: string) => set('photos', fields.photos.filter((p) => p.url !== url));

  const validate = (): string | null => {
    if (!fields.name.trim()) return 'Please enter a name.';
    if (!mapsUrl.trim()) return 'Please add the Google Maps link for the exact location.';
    if (!fields.city?.trim()) return 'Please confirm the city.';
    if (mode !== 'admin-edit' && !contributorName.trim()) return 'Please enter your name.';
    return null;
  };

  // Drives the submit button's disabled state directly, so a contributor
  // can never click through with required fields missing in the first
  // place — the toast-on-click validate() above stays as a backstop.
  const isFormValid = !!(
    fields.name.trim() && mapsUrl.trim() && fields.city?.trim() && (mode === 'admin-edit' || contributorName.trim())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      showToast(error, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'add') {
        await directoryService.submitListing(
          { ...fields, google_maps_url: mapsUrl.trim() },
          contributorName.trim(),
          contributorMobile.trim() || undefined,
          duplicates[0]?.id
        );
      } else if (mode === 'admin-edit' && listingId && adminId) {
        // Full replace — the admin sees and can change every field at once,
        // not a sparse diff — and needs no one else's approval to save it.
        await directoryService.adminUpdateListing(listingId, adminId, { ...fields, google_maps_url: mapsUrl.trim() });
      } else if (listingId) {
        // Sparse diff — only fields that actually changed from initialValues,
        // so the admin's diff view is meaningful and unrelated fields never
        // get silently re-stamped with identical values.
        const proposed: Partial<DirectoryCardFields> = {};
        const base = initialValues || emptyFields();
        (Object.keys(fields) as (keyof DirectoryCardFields)[]).forEach((key) => {
          if (JSON.stringify(fields[key]) !== JSON.stringify(base[key])) {
            (proposed as any)[key] = fields[key];
          }
        });
        if (mapsUrl.trim() !== base.google_maps_url) proposed.google_maps_url = mapsUrl.trim();

        await directoryService.submitChangeRequest(listingId, proposed, base, contributorName.trim(), contributorMobile.trim() || undefined);
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Submission failed', err);
      showToast('Could not submit — please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} />
        </div>
        <h3 className="text-lg font-bold text-[#241C17] mb-2">
          {mode === 'add' ? 'Thank you for contributing!' : mode === 'admin-edit' ? 'Listing updated' : 'Thanks — your suggestion was submitted!'}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'add'
            ? 'Your listing has been submitted for review. Once approved by the VSeva team, it will appear in the public directory.'
            : mode === 'admin-edit'
              ? 'The public listing has been updated.'
              : 'Your change has been submitted for review. The public listing will update once approved.'}
        </p>
        <button onClick={onSubmitted} className="px-6 py-2.5 bg-saffron-600 hover:bg-saffron-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 text-sm">
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto pb-10">
      <SectionCard title="Place / Temple" description="This is one universal card — fill in whichever sections apply. A listing can be a temple, a Vihar Group, or both, and can carry an Upashray/Bhojanshala/Library too.">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label className={labelClass}>Name *</label>
            <input className={inputClass} value={fields.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Shri Mahavir Jain Derasar" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Mulnayak Bhagwan</label>
            <input className={inputClass} value={fields.mulnayak || ''} onChange={(e) => set('mulnayak', e.target.value)} placeholder="e.g. Bhagwan Mahavir" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Location" description="Paste the exact Google Maps link — we'll detect the pin and try to fill in the address below.">
        <label className={labelClass}>Google Maps Link of Exact Location *</label>
        <div className="flex gap-2 mb-3">
          <input
            className={inputClass}
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            onBlur={(e) => resolveLocation(e.target.value)}
            placeholder="https://maps.google.com/..."
          />
          <button
            type="button"
            onClick={() => resolveLocation(mapsUrl)}
            disabled={resolving || !mapsUrl.trim()}
            className="shrink-0 px-4 rounded-xl bg-saffron-600 hover:bg-saffron-700 text-white text-xs font-bold disabled:opacity-50 transition-colors"
          >
            {resolving ? <Loader2 size={15} className="animate-spin" /> : 'Detect'}
          </button>
        </div>

        {resolving && <p className="text-xs text-gray-400 mb-3">Detecting location…</p>}
        {resolveFailed && (
          <div className="flex items-start gap-2 bg-amber-50 text-amber-700 text-xs font-medium p-3 rounded-xl mb-3">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              Location could not be detected automatically from this link. On Google Maps, open the place, tap Share → Copy link
              (or use the link from your browser's address bar) and paste that instead — it's more reliable than a link shared
              directly from search results. You can also fill in the address fields below manually.
            </span>
          </div>
        )}
        {fields.latitude != null && fields.longitude != null && (
          <div className="mb-3 rounded-xl overflow-hidden border border-gray-100">
            <DirectoryMap
              listings={[{ id: 'preview', slug: 'preview', latitude: fields.latitude, longitude: fields.longitude, status: 'approved', created_at: '', updated_at: '', name: fields.name || 'Location', trustees: [], member_contacts: [], routes: [], photos: [], contact_phone_public: false } as any]}
              height={180}
            />
            <p className="text-[11px] text-gray-400 px-3 py-1.5 bg-gray-50">
              ✓ Location detected — Lat: {fields.latitude.toFixed(5)}, Lng: {fields.longitude.toFixed(5)}
            </p>
          </div>
        )}

        {duplicates.length > 0 && !duplicateAcknowledged && (
          <div className="bg-blue-50 rounded-xl p-3 mb-3 text-xs text-blue-800">
            <p className="font-bold mb-1">Similar listing already exists nearby</p>
            <p className="mb-2">{duplicates[0].name} — {duplicates[0].city}</p>
            <div className="flex gap-2">
              <a href={`/directory/${duplicates[0].slug}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white rounded-lg font-bold border border-blue-200">View Existing</a>
              <button type="button" onClick={() => setDuplicateAcknowledged(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold">Continue Anyway</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Pincode</label><input className={inputClass} value={fields.pincode || ''} onChange={(e) => set('pincode', e.target.value)} /></div>
          <div><label className={labelClass}>Area / Locality</label><input className={inputClass} value={fields.area || ''} onChange={(e) => set('area', e.target.value)} /></div>
          <div><label className={labelClass}>City *</label><input className={inputClass} value={fields.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
          <div><label className={labelClass}>State</label><input className={inputClass} value={fields.state || ''} onChange={(e) => set('state', e.target.value)} /></div>
          <div className="col-span-2"><label className={labelClass}>Full Address</label><input className={inputClass} value={fields.full_address || ''} onChange={(e) => set('full_address', e.target.value)} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Trustee / Management">
        <RepeaterField
          rows={fields.trustees as any}
          onChange={(rows) => set('trustees', rows as DirectoryTrustee[])}
          addLabel="Add another trustee"
          columns={[
            { key: 'name', label: 'Trustee Name' },
            { key: 'mobile', label: 'Mobile', type: 'tel' },
          ]}
        />
      </SectionCard>

      <SectionCard title="Vihar Group">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2"><label className={labelClass}>Vihar Group Name</label><input className={inputClass} value={fields.vihar_group_name || ''} onChange={(e) => set('vihar_group_name', e.target.value)} placeholder="e.g. Vihar Seva Group — Vashi" /></div>
          <div><label className={labelClass}>Captain Name</label><input className={inputClass} value={fields.captain_name || ''} onChange={(e) => set('captain_name', e.target.value)} /></div>
          <div><label className={labelClass}>Captain Mobile</label><input type="tel" className={inputClass} value={fields.captain_mobile || ''} onChange={(e) => set('captain_mobile', e.target.value)} /></div>
          <div><label className={labelClass}>Vice Captain Name</label><input className={inputClass} value={fields.vice_captain_name || ''} onChange={(e) => set('vice_captain_name', e.target.value)} /></div>
          <div><label className={labelClass}>Vice Captain Mobile</label><input type="tel" className={inputClass} value={fields.vice_captain_mobile || ''} onChange={(e) => set('vice_captain_mobile', e.target.value)} /></div>
        </div>
        <label className={labelClass}>Important Member Contacts</label>
        <RepeaterField
          rows={fields.member_contacts as any}
          onChange={(rows) => set('member_contacts', rows as DirectoryMemberContact[])}
          addLabel="Add contact"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role / Purpose' },
            { key: 'mobile', label: 'Mobile', type: 'tel', span: 2 },
          ]}
        />
      </SectionCard>

      <SectionCard title="Community Facilities">
        {(['upashray', 'bhojanshala', 'library'] as const).map((key) => {
          const label = key === 'upashray' ? 'Upashray' : key === 'bhojanshala' ? 'Bhojanshala' : 'Library';
          const facility = fields[key];
          return (
            <div key={key} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-[#241C17]">{label} Available?</label>
                <button
                  type="button"
                  onClick={() => handleFacilityToggle(key, !facility)}
                  aria-pressed={!!facility}
                  className="appearance-none shrink-0 w-11 h-6 p-0 border-0 outline-none rounded-full transition-colors relative cursor-pointer"
                  style={{ backgroundColor: facility ? '#EA580C' : '#E5E7EB' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: facility ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>
              {facility && (
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputClass} placeholder={`${label} Name *`} value={facility.name} onChange={(e) => set(key, { ...facility, name: e.target.value })} />
                  <input
                    className={inputClass}
                    placeholder="Google Maps Link *"
                    value={facility.google_maps_url || ''}
                    onChange={(e) => set(key, { ...facility, google_maps_url: e.target.value })}
                    onBlur={(e) => resolveFacilityLocation(key, e.target.value)}
                  />
                  <input className={inputClass} placeholder="Contact Name" value={facility.contact_name || ''} onChange={(e) => set(key, { ...facility, contact_name: e.target.value })} />
                  <input type="tel" className={inputClass} placeholder="Contact Phone" value={facility.contact_phone || ''} onChange={(e) => set(key, { ...facility, contact_phone: e.target.value })} />
                </div>
              )}
            </div>
          );
        })}
      </SectionCard>

      <SectionCard title="Vihar Routes" description="What routes does this Vihar Group support? e.g. Sector 9 → Wadhva">
        <RepeaterField
          rows={fields.routes as any}
          onChange={(rows) => set('routes', rows as DirectoryRoute[])}
          addLabel="Add another route"
          columns={[
            { key: 'from', label: 'From' },
            { key: 'to', label: 'To' },
            { key: 'distance_km', label: 'Approx. Distance (km)', type: 'number' },
            { key: 'notes', label: 'Notes (optional)', span: 2 },
          ]}
        />
      </SectionCard>

      <SectionCard title="Additional Information">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={labelClass}>Contact Name</label><input className={inputClass} value={fields.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} /></div>
          <div><label className={labelClass}>Contact Phone</label><input type="tel" className={inputClass} value={fields.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} /></div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <input type="checkbox" checked={fields.contact_phone_public} onChange={(e) => set('contact_phone_public', e.target.checked)} className="accent-saffron-600" />
              Show Call/WhatsApp publicly
            </label>
          </div>
          <div className="col-span-2"><label className={labelClass}>Website</label><input className={inputClass} value={fields.website || ''} onChange={(e) => set('website', e.target.value)} /></div>
          <div><label className={labelClass}>Morning Timing</label><input className={inputClass} placeholder="6:30 AM – 12 PM" value={fields.timings?.morning || ''} onChange={(e) => set('timings', { ...fields.timings, morning: e.target.value })} /></div>
          <div><label className={labelClass}>Evening Timing</label><input className={inputClass} placeholder="4 PM – 9 PM" value={fields.timings?.evening || ''} onChange={(e) => set('timings', { ...fields.timings, evening: e.target.value })} /></div>
          <div className="col-span-2"><label className={labelClass}>Notes</label><textarea className={inputClass} rows={2} value={fields.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Contact the Captain before planning Vihar in this area." /></div>
        </div>
      </SectionCard>

      <SectionCard title="Photos" description="Optional — 1 cover photo + up to 4 more.">
        <div className="flex flex-wrap gap-2">
          {fields.photos.map((p) => (
            <div key={p.url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              {p.is_cover && <span className="absolute top-1 left-1 text-[9px] font-bold bg-saffron-600 text-white px-1.5 py-0.5 rounded">COVER</span>}
              <button type="button" onClick={() => removePhoto(p.url)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          ))}
          {fields.photos.length < 5 && (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-saffron-300 hover:text-saffron-500 transition-colors">
              {uploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              <span className="text-[9px] font-bold mt-1">{fields.photos.length === 0 ? 'COVER' : 'ADD'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, fields.photos.length === 0); e.target.value = ''; }}
              />
            </label>
          )}
        </div>
      </SectionCard>

      {mode !== 'admin-edit' && (
        <SectionCard title="Contributor Information" description="We may contact you if clarification is required. Your mobile number will not be displayed publicly.">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelClass}>Your Name *</label><input className={inputClass} value={contributorName} onChange={(e) => setContributorName(e.target.value)} /></div>
            <div className="col-span-2"><label className={labelClass}>Your Mobile Number</label><input type="tel" className={inputClass} value={contributorMobile} onChange={(e) => setContributorMobile(e.target.value)} /></div>
          </div>
        </SectionCard>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl">Cancel</button>
        )}
        <button
          type="submit"
          disabled={submitting || !isFormValid}
          title={!isFormValid ? 'Fill in the required fields marked with *' : undefined}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-saffron-600 hover:bg-saffron-700 text-white font-extrabold rounded-xl shadow-lg shadow-saffron-100 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
          {submitting ? (mode === 'admin-edit' ? 'Saving…' : 'Submitting…') : mode === 'admin-edit' ? 'Save Changes' : 'Submit for Review'}
        </button>
      </div>
    </form>
  );
};

export default DirectoryListingForm;
