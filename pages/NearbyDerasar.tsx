import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, X, Navigation, Phone, Search, Map, Star, ArrowRight, Footprints } from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  distance?: number;
  photo?: string | null;
  icon?: string | null;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const NearbyDerasar: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [temples, setTemples] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Set page title & meta for SEO
  useEffect(() => {
    document.title = 'Nearby Jain Derasar — Find Jain Temples Near You | vSeva';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Find Jain Derasars (temples) near your current location instantly. Powered by vSeva — the Jain Vihar Seva platform.');
    }
  }, []);

  const fetchTemples = async (lat: number, lng: number) => {
    const response = await fetch(`/.netlify/functions/nearby?lat=${lat}&lng=${lng}&type=jain_temple`);
    if (!response.ok) throw new Error('Failed to fetch nearby temples');
    const data = await response.json();
    return data.places || [];
  };

  const handleSearch = () => {
    setLoading(true);
    setError(null);
    setSearched(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        try {
          const templesData = await fetchTemples(latitude, longitude);
          const sorted = templesData
            .map((p: Place) => ({ ...p, distance: calculateDistance(latitude, longitude, p.lat, p.lng) }))
            .sort((a: Place, b: Place) => (a.distance || 0) - (b.distance || 0));
          setTemples(sorted);
        } catch {
          setError('Failed to fetch nearby temples. Please try again.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Location access denied. Please enable location permission and try again.'
            : 'Could not determine your location. Please check GPS settings.'
        );
        setLoading(false);
      },
      { timeout: 12000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  const openDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#FDFBF7', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-orange-100"
        style={{ background: 'rgba(253,251,247,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <a href="/" className="flex items-center gap-2 group">
          <img src={vSevaLogo} alt="vSeva" className="h-9 w-9 object-contain drop-shadow-sm" />
          <span
            className="text-xl font-bold"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            vSeva
          </span>
        </a>
        <a
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-full shadow-md transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}
        >
          About vSeva <ArrowRight size={14} />
        </a>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-10 pb-8 text-center">
        {/* bg blobs */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#fb923c,transparent)' }} />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#fdba74,transparent)' }} />

        <div className="relative max-w-xl mx-auto">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 border"
            style={{ color: '#ea580c', borderColor: '#fed7aa', background: '#fff7ed' }}
          >
            <MapPin size={13} /> Free · No Login Required
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-3">
            Find a{' '}
            <span style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Jain Derasar
            </span>
            <br />Near You
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-sm mx-auto leading-relaxed">
            Locate the nearest Jain temples in seconds — with directions and contact info, right from your phone.
          </p>

          {/* ── CTA Button ── */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="mt-8 relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', boxShadow: '0 8px 30px rgba(234,88,12,0.35)' }}
          >
            {loading ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <MapPin size={22} />
                {searched && temples.length === 0 && !error ? 'Search Again' : 'Find Nearby Derasar'}
              </>
            )}
          </button>

          {/* Caution note */}
          <p className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
            Your location is used only to find nearby temples and is never stored.
          </p>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="flex-1 px-4 sm:px-6 pb-12 max-w-2xl mx-auto w-full">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
                <MapPin size={28} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-orange-400 flex items-center justify-center">
                <Loader2 size={11} className="animate-spin text-orange-500" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-700 text-lg">Searching Derasars...</p>
              <p className="text-xs text-gray-400 mt-1">Finding sacred places within 10 km of your location</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-center space-y-3">
            <MapPin className="mx-auto text-red-400" size={32} />
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={handleSearch}
              className="text-sm bg-red-100 hover:bg-red-200 px-4 py-2 rounded-xl font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && searched && temples.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="text-gray-300 mb-3" size={48} />
            <p className="text-gray-600 font-semibold">No Derasars found nearby.</p>
            <p className="text-xs text-gray-400 mt-1">Try again with GPS enabled, or you may be in a remote area.</p>
          </div>
        )}

        {/* Results list */}
        {!loading && temples.length > 0 && (
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-700">
                {temples.length} Derasar{temples.length !== 1 ? 's' : ''} Found
              </p>
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Sorted by distance</span>
            </div>

            {temples.map((temple, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all mb-3 overflow-hidden"
              >
                <div className="p-4 pb-3">
                  <div className="flex gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-sm leading-tight">{temple.name}</h3>
                        {temple.distance !== undefined && (
                          <span
                            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}
                          >
                            {temple.distance.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-1 text-gray-400 text-[11px] leading-snug">
                        <MapPin size={11} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
                        <span>{temple.address}</span>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    {temple.photo ? (
                      <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
                        <img
                          src={temple.photo}
                          alt={temple.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).parentElement?.classList.add('hidden'); }}
                        />
                      </div>
                    ) : temple.icon && (
                      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 p-1 border border-orange-100">
                        <img src={temple.icon} alt="Icon" className="w-full h-full object-contain opacity-50 grayscale" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 px-4 pb-4">
                  {temple.phone && (
                    <a
                      href={`tel:${temple.phone.replace(/\D/g, '')}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border"
                      style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}
                  <button
                    onClick={() => openDirections(temple.lat, temple.lng)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border"
                    style={{ background: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' }}
                  >
                    <img src="/google-maps.svg" alt="Maps" className="w-3.5 h-3.5" />
                    Directions
                  </button>
                </div>
              </div>
            ))}

            <p className="text-[10px] text-gray-400 text-center pt-2 italic">
              * Location data provided by Google Places API
            </p>
          </div>
        )}

        {/* ── Info cards (shown before first search) ── */}
        {!searched && !loading && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <MapPin size={20} />, title: 'GPS Powered', desc: 'Uses your live location to find the closest temples instantly.' },
              { icon: <Navigation size={20} />, title: 'One-Tap Directions', desc: 'Get Google Maps directions to any Derasar with one tap.' },
              { icon: <Footprints size={20} />, title: 'Part of vSeva', desc: 'Powered by vSeva — the Jain Vihar Seva tracking platform.' },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center gap-2"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow"
                  style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}
                >
                  {card.icon}
                </div>
                <p className="font-bold text-gray-800 text-sm">{card.title}</p>
                <p className="text-gray-400 text-xs leading-snug">{card.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Promo Banner ── */}
      <section
        className="mx-4 sm:mx-6 mb-8 rounded-2xl p-6 text-white text-center shadow-xl"
        style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}
      >
        <Footprints className="mx-auto mb-3 opacity-80" size={28} />
        <h2 className="text-lg font-bold mb-1">Doing Vihar Seva?</h2>
        <p className="text-sm text-white/80 mb-4 max-w-xs mx-auto">
          vSeva helps you digitally track every Vihar — distances, sevaks, reports and more.
        </p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 bg-white font-bold text-sm px-6 py-2.5 rounded-xl shadow transition-all hover:scale-105 active:scale-95"
          style={{ color: '#ea580c' }}
        >
          Explore vSeva <ArrowRight size={15} />
        </a>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={vSevaLogo} alt="vSeva" className="h-6 w-6 object-contain" />
          <span className="font-bold text-gray-700">vSeva</span>
        </div>
        <p className="text-xs text-gray-400">
          Designed by <span className="font-semibold text-gray-500">Vishwa Alpesh Shah</span> (VJAS)
        </p>
        <p className="text-[10px] text-gray-300 mt-1">
          © {new Date().getFullYear()} vSeva · All rights reserved
        </p>
      </footer>
    </div>
  );
};

export default NearbyDerasar;
