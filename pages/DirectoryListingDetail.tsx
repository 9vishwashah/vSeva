import React, { useEffect, useState, Suspense } from 'react';
import { ChevronLeft, MapPin, Navigation, CheckCircle2, Globe, Clock, Pencil, Users, Home, Utensils, BookOpen } from 'lucide-react';
import { directoryService } from '../services/directoryService';
import { DirectoryListing, DirectoryCardFields } from '../types';

// maplibre-gl (~800KB) is deferred so the listing's text/contact info can
// render and become interactive before the map (below the fold on most
// screens) finishes downloading.
const DirectoryMap = React.lazy(() => import('../components/directory/DirectoryMap'));
import ShareButton from '../components/directory/ShareButton';
import ContactActionButtons from '../components/ContactActionButtons';
import Modal from '../components/Modal';
import DirectoryListingForm from '../components/directory/DirectoryListingForm';
import StatusScreen from '../components/StatusScreen';
import { getListingTags } from '../components/directory/listingTags';
import { BRAND } from '@brand';

interface DirectoryListingDetailProps {
  slug: string;
  onNavigate: (path: string) => void;
}

// Opens the exact link the contributor pasted, rather than building our own
// directions deep-link from lat/lng — matches what a visitor already expects
// from a "Open in Google Maps" button, and always reflects the real source.
const openInGoogleMaps = (url?: string | null, lat?: number | null, lng?: number | null) => {
  const target = url || (lat != null && lng != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null);
  if (target) window.open(target, '_blank', 'noopener,noreferrer');
};

const DirectoryListingDetail: React.FC<DirectoryListingDetailProps> = ({ slug, onNavigate }) => {
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const data = await directoryService.getListingBySlug(slug);
      if (!data) setNotFound(true);
      else setListing(data);
    } catch (err) {
      console.error('Failed to load listing', err);
      setLoadError(navigator.onLine ? 'error' : 'offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);

  useEffect(() => {
    if (!listing) return;
    const title = `${listing.name} — ${[listing.area, listing.city].filter(Boolean).join(', ')} | ${BRAND.shortName} Directory`;
    document.title = title;
    const tagLabels = getListingTags(listing).map((t) => t.label).join(', ') || 'Community listing';
    const description = `${tagLabels} in ${listing.city || 'your area'}.${listing.vihar_group_name ? ` Vihar Group: ${listing.vihar_group_name}.` : ''}${listing.routes.length ? ` Vihar routes: ${listing.routes.map(r => `${r.from} to ${r.to}`).join(', ')}.` : ''}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);

    const ldJson = {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: listing.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: listing.city || undefined,
        addressRegion: listing.state || undefined,
        postalCode: listing.pincode || undefined,
      },
      geo: listing.latitude != null ? { '@type': 'GeoCoordinates', latitude: listing.latitude, longitude: listing.longitude } : undefined,
    };
    let script = document.getElementById('directory-listing-ld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'directory-listing-ld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ldJson);

    return () => { script?.remove(); };
  }, [listing]);

  if (loading) {
    return <div className="min-h-screen bg-sunken/60 flex items-center justify-center"><div className="animate-pulse text-brand-700 font-bold">Loading…</div></div>;
  }

  if (loadError) {
    return <div className="min-h-screen bg-sunken/60 flex items-center justify-center p-6"><StatusScreen variant={loadError} onRetry={load} /></div>;
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-sunken/60 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-bold text-ink mb-2">Listing not found</p>
        <p className="text-ink-3 text-sm mb-4">It may have been removed, or the link is incorrect.</p>
        <button onClick={() => onNavigate('/directory')} className="px-5 py-2.5 bg-brand text-ink rounded-xl font-bold text-sm">Back to Directory</button>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/directory/${listing.slug}`;

  return (
    <div className="min-h-screen bg-sunken/60 pb-16">
      <header className="bg-surface border-b border-line sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => onNavigate('/directory')} className="flex items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink">
            <ChevronLeft size={18} /> Directory
          </button>
          <img src={BRAND.logo} alt={BRAND.name} className="h-7 w-7 object-contain opacity-80" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {listing.photos.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-line shadow-sm">
            <img
              src={(listing.photos.find((p) => p.is_cover) || listing.photos[0]).url}
              alt={listing.name}
              className="w-full h-56 object-cover"
            />
            {listing.photos.length > 1 && (
              <div className="flex gap-1.5 p-2 bg-surface overflow-x-auto">
                {listing.photos.map((p, i) => (
                  <img key={i} src={p.url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-surface rounded-2xl border border-line shadow-sm p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ok bg-ok-soft px-2 py-0.5 rounded-full">
              <CheckCircle2 size={12} /> VERIFIED BY {BRAND.shortName.toUpperCase()}
            </span>
            <ShareButton url={shareUrl} title={listing.name} text={[listing.area, listing.city].filter(Boolean).join(', ')} />
          </div>
          <h1 className="text-xl display font-bold text-ink mb-1">{listing.name}</h1>
          <p className="text-sm text-ink-2 flex items-center gap-1 mb-3">
            <MapPin size={13} /> {[listing.area, listing.city, listing.state].filter(Boolean).join(', ') || 'Location not specified'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {getListingTags(listing).map((tag) => (
              <span key={tag.key} className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
                {tag.icon} {tag.label}
              </span>
            ))}
          </div>
        </div>

        {listing.latitude != null && listing.longitude != null && (
          <div className="rounded-2xl overflow-hidden border border-line shadow-sm">
            <Suspense fallback={<div style={{ height: 220 }} className="bg-sunken/60 animate-pulse" />}>
              <DirectoryMap listings={[listing]} height={220} />
            </Suspense>
            <button
              onClick={() => openInGoogleMaps(listing.google_maps_url, listing.latitude, listing.longitude)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface hover:bg-sunken/60 text-brand-700 font-bold text-sm border-t border-line"
            >
              <Navigation size={15} /> Open in Google Maps
            </button>
          </div>
        )}

        {listing.mulnayak && (
          <div className="bg-surface rounded-2xl border border-line shadow-sm p-5">
            <h2 className="text-sm font-bold text-ink-3 uppercase tracking-wide mb-1">Mulnayak Bhagwan</h2>
            <p className="text-base font-semibold text-ink">{listing.mulnayak}</p>
          </div>
        )}

        {(listing.vihar_group_name || listing.captain_name || listing.member_contacts.length > 0) && (
          <div className="bg-surface rounded-2xl border border-line shadow-sm p-5">
            <h2 className="text-sm font-bold text-ink-3 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Users size={14} /> Community / Vihar Group</h2>
            {listing.vihar_group_name && <p className="text-base font-bold text-ink mb-3">{listing.vihar_group_name}</p>}

            {listing.captain_name && (
              <div className="flex items-center justify-between mb-2.5">
                <div><p className="text-xs text-ink-3">Captain</p><p className="text-sm font-semibold text-ink">{listing.captain_name}</p></div>
                {listing.captain_mobile && <ContactActionButtons phone={listing.captain_mobile} name={listing.captain_name} size="sm" />}
              </div>
            )}
            {listing.vice_captain_name && (
              <div className="flex items-center justify-between mb-2.5">
                <div><p className="text-xs text-ink-3">Vice Captain</p><p className="text-sm font-semibold text-ink">{listing.vice_captain_name}</p></div>
                {listing.vice_captain_mobile && <ContactActionButtons phone={listing.vice_captain_mobile} name={listing.vice_captain_name} size="sm" />}
              </div>
            )}

            {listing.member_contacts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line space-y-2.5">
                <p className="text-xs font-bold text-ink-3">Important Contacts</p>
                {listing.member_contacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div><p className="text-sm font-semibold text-ink">{c.name}</p>{c.role && <p className="text-xs text-ink-3">{c.role}</p>}</div>
                    {c.mobile && <ContactActionButtons phone={c.mobile} name={c.name} size="sm" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {listing.trustees.length > 0 && (
          <div className="bg-surface rounded-2xl border border-line shadow-sm p-5">
            <h2 className="text-sm font-bold text-ink-3 uppercase tracking-wide mb-3">Trustees</h2>
            <div className="space-y-2.5">
              {listing.trustees.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.name}</p>
                    {t.mobile && <p className="text-xs text-ink-3">{t.mobile}</p>}
                  </div>
                  {t.mobile && <ContactActionButtons phone={t.mobile} name={t.name} size="sm" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {(listing.upashray || listing.bhojanshala || listing.library) && (
          <div className="bg-surface rounded-2xl border border-line shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-ink-3 uppercase tracking-wide">Facilities</h2>
            {([
              { key: 'upashray', label: 'Upashray', icon: <Home size={15} className="text-cyan-600" />, facility: listing.upashray },
              { key: 'bhojanshala', label: 'Bhojanshala', icon: <Utensils size={15} className="text-lime-600" />, facility: listing.bhojanshala },
              { key: 'library', label: 'Library', icon: <BookOpen size={15} className="text-violet-600" />, facility: listing.library },
            ] as const).map(({ key, label, icon, facility }) => facility && (
              <div key={key} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {icon}
                    <div>
                      <p className="text-[11px] font-bold text-ink-3 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-ink">{facility.name || label}</p>
                    </div>
                  </div>
                  {facility.google_maps_url && (
                    <button onClick={() => openInGoogleMaps(facility.google_maps_url, facility.latitude, facility.longitude)} className="text-xs font-bold text-brand-700 shrink-0">
                      Open in Google Maps
                    </button>
                  )}
                </div>
                {(facility.contact_name || facility.contact_phone) && (
                  <div className="flex items-center justify-between pl-6">
                    <div>
                      {facility.contact_name && <p className="text-xs font-semibold text-ink-2">{facility.contact_name}</p>}
                      {facility.contact_phone && <p className="text-xs text-ink-3">{facility.contact_phone}</p>}
                    </div>
                    {facility.contact_phone && <ContactActionButtons phone={facility.contact_phone} name={facility.contact_name || label} size="sm" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {listing.routes.length > 0 && (
          <div className="bg-surface rounded-2xl border border-line shadow-sm p-5">
            <h2 className="text-sm font-bold text-ink-3 uppercase tracking-wide mb-3">Vihar Routes Provided</h2>
            <div className="space-y-2">
              {listing.routes.map((r, i) => (
                <div key={i} className="bg-sunken/60 rounded-xl p-3">
                  <p className="text-sm font-extrabold text-ink">{r.from.toUpperCase()} → {r.to.toUpperCase()}</p>
                  {(r.distance_km || r.notes) && (
                    <p className="text-xs text-ink-3 mt-0.5">{r.distance_km ? `~${r.distance_km} km` : ''}{r.distance_km && r.notes ? ' · ' : ''}{r.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface rounded-2xl border border-line shadow-sm p-5">
          <h2 className="text-sm font-bold text-ink-3 uppercase tracking-wide mb-3">Additional Information</h2>
          {(listing.timings?.morning || listing.timings?.evening) && (
            <div className="flex items-center gap-2 text-sm text-ink-2 mb-2"><Clock size={14} className="text-ink-3" />{[listing.timings?.morning, listing.timings?.evening].filter(Boolean).join(' · ')}</div>
          )}
          {listing.website && (
            <div className="flex items-center gap-2 text-sm mb-2"><Globe size={14} className="text-ink-3" /><a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-brand-700 font-semibold">{listing.website}</a></div>
          )}
          {listing.contact_phone_public && listing.contact_phone && (
            <div className="flex items-center justify-between mt-2">
              <div>
                {listing.contact_name && <p className="text-sm font-semibold text-ink">{listing.contact_name}</p>}
                <p className="text-xs text-ink-3">{listing.contact_phone}</p>
              </div>
              <ContactActionButtons phone={listing.contact_phone} name={listing.contact_name || listing.name} size="sm" />
            </div>
          )}
          {listing.notes && <p className="text-sm text-ink-2 mt-3 italic">{listing.notes}</p>}
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-ink-3">
            {listing.last_verified_at ? `Last verified: ${new Date(listing.last_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </p>
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-700">
            <Pencil size={13} /> Suggest an Edit
          </button>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} maxWidth="max-w-2xl">
        <div className="p-5 overflow-y-auto">
          <h2 className="display text-[1.6rem] font-bold text-ink mb-4">Suggest an Edit</h2>
          <DirectoryListingForm
            mode="edit"
            listingId={listing.id}
            initialValues={listing as DirectoryCardFields}
            onCancel={() => setEditOpen(false)}
            onSubmitted={() => setEditOpen(false)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DirectoryListingDetail;
