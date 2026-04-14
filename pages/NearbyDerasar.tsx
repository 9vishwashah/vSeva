import React, { useState, useEffect, useRef } from 'react';
import { Loader2, MapPin, X, Navigation, Phone, Search, Map, Star, ArrowRight, Footprints, Download, Share2, Plus } from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

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
  const [radius, setRadius] = useState<number>(100000); // Default to Upto 100 KMs

  // PWA Install state
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isAndroidInstallable, setIsAndroidInstallable] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopTip, setShowDesktopTip] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  // ── Swap manifest to manifest-finder.json so PWA install from this page
  //    creates "vSeva Finder" app opening at /nearby-derasar ──
  useEffect(() => {
    const existingLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const originalHref = existingLink?.getAttribute('href') || '';

    if (existingLink) {
      existingLink.setAttribute('href', '/manifest-finder.json');
    } else {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest-finder.json';
      document.head.appendChild(link);
    }

    // Capture beforeinstallprompt for Android
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setIsAndroidInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      // Restore original manifest when leaving the page
      if (existingLink && originalHref) existingLink.setAttribute('href', originalHref);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isAndroidInstallable && deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      await deferredPromptRef.current.userChoice;
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowDesktopTip(true);
      setTimeout(() => setShowDesktopTip(false), 4000);
    }
  };

  // Set page title & meta for SEO
  useEffect(() => {
    document.title = 'Nearby Jain Derasar / Tirths | Find Temples Near You – vSeva';
    
    const setMeta = (name: string, content: string, isProperty = false) => {
      let meta = document.querySelector(`meta[${isProperty ? 'property' : 'name'}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(isProperty ? 'property' : 'name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMeta('description', 'Find Jain Derasar near your current location instantly. Discover nearby temples, get directions, and plan your visit easily with vSeva.');
    setMeta('og:title', 'Find Nearby Jain Derasar Instantly 🙏', true);
    setMeta('og:description', 'Discover Jain temples near your location with live directions. Simple, fast, and useful for every Jain.', true);
    setMeta('og:image', 'https://vseva.vjas.in/derasar-preview.png', true);
    setMeta('og:url', 'https://vseva.vjas.in/nearby-derasar', true);
    setMeta('og:type', 'website', true);

    let script = document.querySelector('script[type="application/ld+json"]#derasar-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.id = 'derasar-jsonld';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Nearby Jain Derasar Finder",
      "url": "https://vseva.vjas.in/nearby-derasar",
      "applicationCategory": "TravelApplication",
      "description": "Find Jain Derasar near your current location with directions and details.",
      "creator": {
        "@type": "Organization",
        "name": "vSeva"
      }
    });
  }, []);

  const fetchTemples = async (lat: number, lng: number) => {
    const response = await fetch(`/.netlify/functions/nearby?lat=${lat}&lng=${lng}&type=jain_temple&radius=${radius}`);
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

  const shareWhatsApp = (temple: Place) => {
    const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${temple.lat},${temple.lng}`;
    const message = `🙏 Jai Jinendra\n\nHere are nearby Derasar locations:\n📍 ${temple.name} - ${mapsLink}\n\nFind yours here:\nhttps://vseva.vjas.in/nearby-derasar`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
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
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-full shadow-md transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}
          >
            About vSeva <ArrowRight size={14} />
          </a>
        </div>
      </header>

      {/* ── Desktop Install Tip ── */}
      {showDesktopTip && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl"
          style={{ background: '#1e293b', border: '1px solid #EA580C', whiteSpace: 'nowrap' }}
        >
          <span>💡</span> Look for the <strong style={{ color: '#F97316', margin: '0 4px' }}>⊕ install icon</strong> in your browser's address bar
        </div>
      )}

      {/* ── iOS Install Guide Modal ── */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[300] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl p-7"
            style={{ paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 16px))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <img src={vSevaLogo} alt="vSeva Finder" className="h-11 w-11 rounded-xl object-contain" />
              <div>
                <h3 className="font-bold text-gray-900 text-base">Install vSeva Finder on iPhone</h3>
                <p className="text-xs text-gray-500">3 quick steps to add to Home Screen</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { step: 1, title: 'Open in Safari', desc: 'Make sure you\'re using Safari — PWA install only works in Safari on iPhone.' },
                { step: 2, title: 'Tap the Share button', desc: 'At the bottom of Safari, tap the Share (□↑) icon.' },
                { step: 3, title: 'Tap "Add to Home Screen"', desc: 'Scroll in the share sheet, tap Add to Home Screen, then tap Add. Done! 🎉' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4">
                  <div className="w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{ background: '#EA580C' }}>{step}</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-sm text-slate-700 transition-colors"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 sm:px-6 pt-10 pb-8 text-center">
        {/* bg blobs */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#fb923c,transparent)' }} />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle,#fdba74,transparent)' }} />

        <div className="relative max-w-3xl mx-auto px-2">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 border"
            style={{ color: '#ea580c', borderColor: '#fed7aa', background: '#fff7ed' }}
          >
            <MapPin size={13} /> Initiative by vSeva
          </div>

          <h1 className="text-[22px] sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-3">
            <span className="inline-block whitespace-nowrap">
              Find{' '}
              <span style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Jain Derasar / Tirths
              </span>
            </span>{' '}
            <span className="inline-block whitespace-nowrap">Near You</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Locate the nearest Jain temples in seconds with directions and contact info, up to <span className="font-extrabold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md shadow-sm">100 KM</span>.
          </p>

          {/* ── CTA Button & Instagram ── */}
          <div className="mt-8 flex items-stretch justify-center gap-3 max-w-[340px] sm:max-w-none mx-auto w-full">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 sm:flex-none relative inline-flex items-center justify-center gap-2 px-4 sm:px-8 py-4 rounded-2xl text-white font-bold text-base sm:text-lg shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', boxShadow: '0 8px 30px rgba(234,88,12,0.35)' }}
            >
              {loading ? (
                <>
                  <Loader2 size={22} className="animate-spin shrink-0" />
                  Locating...
                </>
              ) : (
                <>
                  <MapPin size={22} className="shrink-0" />
                  <span className="whitespace-nowrap">{searched && temples.length === 0 && !error ? 'Search Again' : 'Find Derasar'}</span>
                </>
              )}
            </button>

            <a
              href="https://www.instagram.com/the.vseva/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-14 h-auto rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white shadow-xl transition-all hover:scale-105 active:scale-95 shrink-0"
              aria-label="Follow us on Instagram"
            >
              <i className="fa-brands fa-instagram text-2xl"></i>
            </a>
          </div>

          {/* Install App — secondary CTA, hidden when already running as PWA */}
          {!isStandalone && (
            <button
              onClick={handleInstall}
              className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm"
              style={{
                background: '#fff',
                border: '1.5px solid #fed7aa',
                color: '#ea580c',
                boxShadow: '0 2px 12px rgba(234,88,12,0.10)',
              }}
            >
              <Download size={15} />
              Install vSeva Finder App
            </button>
          )}
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
              <p className="text-xs text-gray-400 mt-1">Finding sacred places within {radius / 1000} km of your location</p>
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
          <div className="mt-8">
            <div className="mb-6 text-center">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Filter by Range</p>
              <div className="flex flex-nowrap overflow-x-auto justify-start sm:justify-center gap-2 pb-2 px-1 max-w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {[
                  { label: '1 KM', val: 1000 },
                  { label: '5 KM', val: 5000 },
                  { label: '10 KM', val: 10000 },
                  { label: 'Upto 100 KMs', val: 100000 }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setRadius(opt.val)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all border ${
                      radius === opt.val
                        ? 'bg-orange-100 text-orange-700 border-orange-300 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm font-bold text-gray-700">
                {temples.filter(t => (t.distance || 0) <= radius / 1000).length} Derasar Found
              </p>
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Sorted by distance</span>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 pb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {temples.filter(t => (t.distance || 0) <= radius / 1000).map((temple, index) => {
                const parts = temple.address ? temple.address.split(',').map(p => p.trim()) : [];
                const cityBadge = parts.length >= 4 ? parts[parts.length - 4] : (parts.length === 3 ? parts[parts.length - 3] : (parts.length === 2 ? parts[0] : null));

                return (
              <div
                key={index}
                className="relative bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all mb-3 overflow-hidden"
              >
                <div 
                  className="absolute top-0 left-0 text-[9px] font-extrabold px-2 py-0.5 rounded-br-lg z-10 shadow-sm"
                  style={{ background: '#fff7ed', color: '#ea580c', borderRight: '1px solid #fed7aa', borderBottom: '1px solid #fed7aa' }}
                >
                  #{index + 1}
                </div>
                <div className="p-4 pt-5 pb-3">
                  <div className="flex gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-sm leading-tight flex-1">{temple.name}</h3>
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

                    {/* Thumbnail & Badge */}
                    <div className="shrink-0 flex flex-col items-center gap-1.5">
                      {temple.photo ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 shrink-0">
                          <img
                            src={temple.photo}
                            alt={temple.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).parentElement?.classList.add('hidden'); }}
                          />
                        </div>
                      ) : temple.icon && (
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 p-1 border border-orange-100 shrink-0">
                          <img src={temple.icon} alt="Icon" className="w-full h-full object-contain opacity-50 grayscale" />
                        </div>
                      )}
                      
                      {cityBadge && (
                        <span className="text-[8px] font-bold px-1.5 py-[2px] rounded whitespace-nowrap bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest text-center shadow-sm max-w-[56px] truncate">
                          {cityBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
                  {temple.phone && (
                    <a
                      href={`tel:${temple.phone.replace(/\D/g, '')}`}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border"
                      style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}
                  <button
                    onClick={() => openDirections(temple.lat, temple.lng)}
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border"
                    style={{ background: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' }}
                  >
                    <img src="/google-maps.svg" alt="Maps" className="w-3.5 h-3.5" />
                    Directions
                  </button>
                  <button
                    onClick={() => shareWhatsApp(temple)}
                    className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border"
                    style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
                  >
                    <i className="fa-brands fa-whatsapp text-sm"></i>
                    Share
                  </button>
                </div>
              </div>
              )})}
            </div>

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
              { icon: <Footprints size={20} />, title: 'Initiative by Vseva', desc: 'Powered by vSeva — the Jain Vihar Seva tracking platform.' },
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

      <section
        className="mx-4 sm:mx-6 mb-8 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)' }}
      >
        {/* Background Decorative Rings */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-orange-900 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start flex-1">
             <div className="flex items-center gap-3 mb-4">
                <div className="bg-white p-2 rounded-xl shadow-md">
                   <img src={vSevaLogo} alt="vSeva Logo" className="w-7 h-7 object-contain" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Planning Vihar?</h2>
             </div>
             
             <p className="text-sm sm:text-base text-orange-100 mb-5 max-w-md font-medium leading-relaxed">
               vSeva is the ultimate platform for tracking, organizing, and coordinating Jain Vihar Seva efficiently.
             </p>
             
             <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
               <span className="flex items-center gap-1.5 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                 <Footprints size={12} /> Live Tracking
               </span>
               <span className="flex items-center gap-1.5 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                 <Star size={12} /> Volunteer Coordination
               </span>
               <span className="flex items-center gap-1.5 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                 <Map size={12} /> Route Management
               </span>
             </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white font-black text-sm px-8 py-4 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
              style={{ color: '#ea580c' }}
            >
              Start Your Seva Journey <ArrowRight size={16} className="text-orange-500" />
            </a>
            <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Join the Community</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 px-4 text-center mt-auto bg-white/50">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-5">
          <div className="flex items-center gap-2">
            <img src={vSevaLogo} alt="vSeva" className="h-6 w-6 object-contain grayscale opacity-60" />
            <span className="font-bold text-gray-400">vSeva</span>
          </div>
          
          <div className="hidden sm:block w-px h-8 bg-gray-200"></div>

          <a
            href="https://wa.me/919594503214?text=Jai%20Jinendra!%20I%20have%20an%20inquiry%20regarding%20vSeva."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold transition-all hover:bg-green-100 hover:scale-105 border border-green-200 shadow-sm"
          >
            <i className="fa-brands fa-whatsapp text-base"></i> Contact Us on WhatsApp
          </a>
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
