import React, { useState } from 'react';
import { Loader2, MapPin, X, Navigation, Phone, Search } from 'lucide-react';

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
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const JainTempleFinder: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [temples, setTemples] = useState<Place[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchTemples = async (lat: number, lng: number) => {
        try {
            const response = await fetch(`/.netlify/functions/nearby?lat=${lat}&lng=${lng}&type=jain_temple`);
            if (!response.ok) throw new Error('Failed to fetch nearby temples');
            const data = await response.json();
            return data.places || [];
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        if (temples.length > 0) return; // Already loaded

        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const templesData = await fetchTemples(latitude, longitude);

                    const injectDistanceAndSort = (places: Place[]) => {
                        return places
                            .map(p => ({ ...p, distance: calculateDistance(latitude, longitude, p.lat, p.lng) }))
                            .sort((a, b) => (a.distance || 0) - (b.distance || 0));
                    };

                    setTemples(injectDistanceAndSort(templesData));
                } catch (err) {
                    setError('Failed to fetch nearby temples. Please try again.');
                } finally {
                    setLoading(false);
                }
            },
            (err) => {
                setError(
                    err.code === 1
                        ? 'Location access denied. Please enable location services.'
                        : 'Could not determine your location.'
                );
                setLoading(false);
            },
            { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
        );
    };

    const openDirections = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    return (
        <div className="w-full">
            <button
                onClick={handleOpen}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-saffron-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg shadow-saffron-500/20 hover:shadow-xl hover:shadow-saffron-500/30 hover:-translate-y-0.5 transition-all text-center flex items-center justify-center gap-3 font-bold text-lg"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span>Nearby Jain Derasar</span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex flex-col md:items-center justify-end md:justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-50 w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom md:fade-in-up">
                        <div className="bg-gradient-to-r from-saffron-500 to-orange-500 text-white p-5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <MapPin size={20} />
                                </div>
                                <h2 className="text-xl font-bold font-serif">Nearby Jain Temples</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="animate-spin text-saffron-500" size={40} />
                                    <p className="text-gray-600 font-medium font-serif">Searching for Derasars...</p>
                                    <p className="text-xs text-gray-400 text-center px-4">Finding sacred places within 10km of your location...</p>
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center space-y-2 py-8">
                                    <MapPin className="mx-auto text-red-400" size={32} />
                                    <p className="font-semibold">{error}</p>
                                    <button
                                        onClick={handleOpen}
                                        className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : temples.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Search className="text-gray-300 mb-3" size={48} />
                                    <p className="text-gray-500 font-medium">No temples found nearby.</p>
                                    <p className="text-xs text-gray-400 mt-1">Try expanding your search or ensuring GPS is on.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {temples.map((temple, index) => (
                                        <div key={index} className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                            <div className="p-3 pb-2">
                                                <div className="flex gap-3 mb-2">
                                                    {/* Title & Distance */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h4 className="font-bold text-gray-800 font-serif text-base leading-tight">{temple.name}</h4>
                                                            {temple.distance !== undefined && (
                                                                <span className="shrink-0 bg-saffron-50 text-saffron-600 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-bold border border-saffron-100">
                                                                    {temple.distance.toFixed(1)} km
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Small Photo Thumb */}
                                                    {temple.photo ? (
                                                        <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-100 shadow-inner bg-gray-50 mt-0.5">
                                                            <img 
                                                                src={temple.photo} 
                                                                alt={temple.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).parentElement?.classList.add('hidden');
                                                                }}
                                                            />
                                                        </div>
                                                    ) : temple.icon && (
                                                        <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-orange-50 p-1 border border-orange-100">
                                                            <img src={temple.icon} alt="Icon" className="w-full h-full object-contain opacity-50 grayscale" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Full Width Address - Tight spacing */}
                                                <div className="flex items-start gap-1.5 text-gray-500 text-[11px] leading-snug">
                                                    <MapPin size={12} className="shrink-0 mt-0.5 text-saffron-400" />
                                                    <span>{temple.address}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons - Compact */}
                                            <div className="flex items-center gap-2 px-3 pb-3">
                                                {temple.phone && (
                                                    <a
                                                        href={`tel:${temple.phone.replace(/\D/g, '')}`}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 active:scale-95"
                                                    >
                                                        <Phone size={12} />
                                                        Call
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => openDirections(temple.lat, temple.lng)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all bg-saffron-50 text-saffron-600 hover:bg-saffron-100 border border-saffron-100 active:scale-95"
                                                >
                                                    <img src="/google-maps.svg" alt="Maps" className="w-[14px] h-[14px] drop-shadow-sm" />
                                                    Directions
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-[10px] text-gray-400 text-center pt-4 italic">
                                        * Photos and data provided by Google Places API
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
