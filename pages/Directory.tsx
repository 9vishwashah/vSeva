import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { Search, MapPin, Plus, Map as MapIcon, List as ListIcon, Users, Landmark, Home, Utensils, BookOpen, LayoutGrid } from 'lucide-react';
import { directoryService } from '../services/directoryService';
import { DirectoryListing } from '../types';
import ListingCard from '../components/directory/ListingCard';

// maplibre-gl (~800KB) is deferred into its own chunk so it loads in
// parallel with/after the page shell instead of blocking this page's
// initial parse — the list (the primary content on mobile) can render
// and become interactive before the map finishes downloading.
const DirectoryMap = React.lazy(() => import('../components/directory/DirectoryMap'));
import ShareButton from '../components/directory/ShareButton';
import StatusScreen from '../components/StatusScreen';
import Skeleton from '../components/Skeleton';
import { getListingTags } from '../components/directory/listingTags';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

type CategoryFilterKey = 'all' | 'vihar_group' | 'temple' | 'upashray' | 'bhojanshala' | 'library';

const CATEGORY_FILTERS: { key: CategoryFilterKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <LayoutGrid size={13} /> },
  { key: 'vihar_group', label: 'Vihar Groups', icon: <Users size={13} /> },
  { key: 'temple', label: 'Temples', icon: <Landmark size={13} /> },
  { key: 'upashray', label: 'Upashrays', icon: <Home size={13} /> },
  { key: 'bhojanshala', label: 'Bhojanshalas', icon: <Utensils size={13} /> },
  { key: 'library', label: 'Libraries', icon: <BookOpen size={13} /> },
];

interface DirectoryProps {
  onNavigate: (path: string) => void;
}

const Directory: React.FC<DirectoryProps> = ({ onNavigate }) => {
  const [listings, setListings] = useState<DirectoryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    document.title = 'VSeva Community Directory — Jain Vihar Groups, Temples & More';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Discover Jain Vihar Groups, Temples, Upashrays, Bhojanshalas and Libraries near you — a community-maintained directory by vSeva.');
  }, []);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await directoryService.getApprovedListings();
      setListings(data);
    } catch (err) {
      console.error('Failed to load directory', err);
      setLoadError(navigator.onLine ? 'error' : 'offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (category !== 'all') {
        const tagKeys = getListingTags(l).map((t) => t.key);
        if (!tagKeys.includes(category)) return false;
      }
      if (!term) return true;
      const haystack = [l.name, l.vihar_group_name, l.captain_name, l.city, l.area, l.pincode].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [listings, search, category]);

  const addListingUrl = `${window.location.origin}/directory/add`;

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <StatusScreen variant={loadError} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <img src={vSevaLogo} alt="vSeva" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-lg font-serif font-bold text-[#241C17] leading-tight">VSeva Directory</h1>
              <p className="text-[11px] text-gray-400">Discover Jain Vihar Groups &amp; Community Places</p>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, area..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F7F4F0] border-none text-sm text-[#241C17] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${category === c.key ? 'bg-saffron-600 text-white' : 'bg-[#F7F4F0] text-gray-500 hover:bg-gray-200'}`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* Add Your Derasar CTA — shareable, so members can add/update their own area's records */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-br from-saffron-500 to-orange-500 rounded-2xl p-4 sm:p-5 text-white mb-5">
          <div>
            <p className="font-bold text-sm sm:text-base">Know a Temple, Upashray or Vihar Group not listed here?</p>
            <p className="text-white/80 text-xs sm:text-sm">Add it in a few minutes — no login required. Share this link so others in your area can add or update their own records too.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onNavigate('/directory/add')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white text-saffron-700 font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm active:scale-95 transition-all"
            >
              <Plus size={16} /> Add a Listing
            </button>
            <ShareButton url={addListingUrl} title="Add Your Derasar / Vihar Group to VSeva Directory" text="Help keep our community directory up to date" className="[&>button]:bg-white/20 [&>button]:text-white [&>button:hover]:bg-white/30" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-500">{loading ? 'Loading…' : `${filtered.length} location${filtered.length === 1 ? '' : 's'}`}</p>
          <div className="flex items-center gap-2">
            <div className="md:hidden flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setMobileView('list')} className={`p-1.5 rounded-md ${mobileView === 'list' ? 'bg-white shadow-sm' : ''}`}><ListIcon size={14} /></button>
              <button onClick={() => setMobileView('map')} className={`p-1.5 rounded-md ${mobileView === 'map' ? 'bg-white shadow-sm' : ''}`}><MapIcon size={14} /></button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_1.1fr] gap-5">
          {/* List */}
          <div className={`${mobileView === 'map' ? 'hidden md:block' : ''} space-y-3`}>
            {loading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
                <MapPin className="mx-auto text-gray-300 mb-3" size={28} />
                <p className="text-gray-500 font-semibold">No locations found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search or be the first to add one!</p>
              </div>
            ) : (
              filtered.map((l) => (
                <ListingCard key={l.id} listing={l} selected={selectedId === l.id} onSelect={setSelectedId} onOpen={(slug) => onNavigate(`/directory/${slug}`)} />
              ))
            )}
          </div>

          {/* Map */}
          <div className={`${mobileView === 'list' ? 'hidden md:block' : ''} sticky top-[168px] h-[calc(100vh-200px)] rounded-2xl overflow-hidden border border-gray-100 shadow-sm`}>
            <Suspense fallback={<div className="w-full h-full bg-gray-50 animate-pulse" />}>
              <DirectoryMap listings={filtered} selectedId={selectedId} onSelect={setSelectedId} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Directory;
