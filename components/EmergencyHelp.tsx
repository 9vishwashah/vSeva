import React, { useState } from 'react';
import { AlertTriangle, Loader2, PlusSquare, Shield, MapPin, X, Navigation, Phone } from 'lucide-react';

interface Place {
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string | null;
    distance?: number;
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

export const EmergencyHelp: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hospitals, setHospitals] = useState<Place[]>([]);
    const [police, setPolice] = useState<Place[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchPlaces = async (lat: number, lng: number, type: 'hospital' | 'police') => {
        try {
            // Mapping /api/nearby to .netlify/functions/nearby works locally if rewritten,
            const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=${type}`);
            if (!response.ok) throw new Error(`Failed to fetch ${type}`);
            const data = await response.json();
            return data.places || [];
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    const handleGetHelp = () => {
        setIsOpen(true);
        if (hospitals.length > 0 || police.length > 0) return; // Already loaded

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
                    const [hospitalsData, policeData] = await Promise.all([
                        fetchPlaces(latitude, longitude, 'hospital'),
                        fetchPlaces(latitude, longitude, 'police')
                    ]);

                    const injectDistanceAndSort = (places: Place[]) => {
                        return places
                            .map(p => ({ ...p, distance: calculateDistance(latitude, longitude, p.lat, p.lng) }))
                            .sort((a, b) => (a.distance || 0) - (b.distance || 0));
                    };

                    setHospitals(injectDistanceAndSort(hospitalsData));
                    setPolice(injectDistanceAndSort(policeData));
                } catch (err) {
                    setError('Failed to fetch nearby emergency services. Please try again.');
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

    const renderPlaces = (title: string, icon: React.ReactNode, places: Place[], colorClass: string) => {
        return (
            <div className="mb-6">
                <div className={`flex items-center gap-2 mb-3 text-lg font-bold ${colorClass}`}>
                    {icon}
                    <span>{title}</span>
                </div>
                {places.length === 0 ? (
                    <p className="text-gray-500 text-sm py-2 px-1">No results found nearby.</p>
                ) : (
                    <div className="space-y-3">
                        {places.map((place, index) => (
                            <div key={index} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-bold text-gray-800 line-clamp-1">{place.name}</h4>
                                    {place.distance !== undefined && (
                                        <span className="shrink-0 bg-gray-100 text-gray-600 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold">
                                            {place.distance.toFixed(1)} km
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-start gap-1 mt-1.5 text-gray-500 text-xs">
                                    <MapPin size={14} className="shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">{place.address}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    {place.phone && (
                                        <a
                                            href={`tel:${place.phone.replace(/\D/g, '')}`}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-colors
                                            ${colorClass === 'text-red-500' ? 'bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer' : 'bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer'}`}
                                        >
                                            <Phone size={16} />
                                            Call
                                        </a>
                                    )}
                                    <button
                                        onClick={() => openDirections(place.lat, place.lng)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-colors
                                        ${colorClass === 'text-red-500' ? 'bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer'}`}
                                    >
                                        <img src="/google-maps.svg" alt="Maps" className="w-[18px] h-[18px] drop-shadow-sm" />
                                        Directions
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full">
            <button
                onClick={handleGetHelp}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl p-4 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all text-center flex items-center justify-center gap-3 font-bold text-lg"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <AlertTriangle size={24} className="animate-pulse" />
                <span>🚨 Get Emergency Help</span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex flex-col md:items-center justify-end md:justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-50 w-full max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom md:fade-in-up">
                        <div className="bg-gradient-to-r from-saffron-500 to-orange-500 text-white p-5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <AlertTriangle size={20} />
                                </div>
                                <h2 className="text-xl font-bold">Emergency Help Nearby</h2>
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
                                    <p className="text-gray-600 font-medium">Fetching nearby help...</p>
                                    <p className="text-xs text-gray-400 text-center px-4">Locating nearest hospitals and police stations...</p>
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center space-y-2 py-8">
                                    <AlertTriangle className="mx-auto" size={32} />
                                    <p className="font-semibold">{error}</p>
                                    <button
                                        onClick={handleGetHelp}
                                        className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {renderPlaces('Hospitals Nearby', <PlusSquare size={20} />, hospitals, 'text-red-500')}
                                    <div className="h-px bg-gray-200 w-full mx-auto my-6" />
                                    {renderPlaces('Police Nearby', <Shield size={20} />, police, 'text-blue-500')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
