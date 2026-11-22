import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { UserProfile, AreaRoute } from '../types';
import { Plus, Trash2, Save, Map, Search, ArrowRight, Table, Pencil, X, Check, Navigation, Tag } from 'lucide-react';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { shareTextToWhatsApp } from '../services/shareImage';
import { extractMapsUrl, routeWhatsAppMessage } from '../services/routeShare';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import StatusScreen from '../components/StatusScreen';
import { placeMatches, type PlaceAliases } from '../services/placeAliases';

interface ManageRoutesProps {
    currentUser: UserProfile;
}

interface TempRoute {
    id: number;
    from_name: string;
    to_name: string;
    distance_km: string; // string for input handling
    via: string;         // optional
    maps_url: string;    // optional Google Maps link (pasted)
}

const newRow = (): TempRoute => ({ id: Date.now() + Math.random(), from_name: '', to_name: '', distance_km: '', via: '', maps_url: '' });

// Pasted Google Maps text -> the link, '' for nothing pasted, null for something that is not an https link
const cleanMapsInput = (v: string): string | null => (v.trim() ? extractMapsUrl(v) : '');

const ManageRoutes: React.FC<ManageRoutesProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'add' | 'list' | 'aliases'>('add');

    // List State
    const [existingRoutes, setExistingRoutes] = useState<AreaRoute[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupName, setGroupName] = useState<string | undefined>(undefined);

    // Add State
    const [tempRoutes, setTempRoutes] = useState<TempRoute[]>([newRow()]);
    const [knownAreas, setKnownAreas] = useState<string[]>([]);

    // Short forms (aliases) for long place names, searchable in every From / To picker
    const [aliases, setAliases] = useState<PlaceAliases>({});
    const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});
    const [savingAlias, setSavingAlias] = useState<string | null>(null);

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Partial<AreaRoute>>({});

    const loadRoutes = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const routes = await dataService.getRoutes(currentUser.organization_id);
            setExistingRoutes(routes);
            dataService.getOrganization(currentUser.organization_id).then(o => setGroupName(o?.name)).catch(() => {});

            // Extract known areas for suggestions
            const areas = new Set<string>();
            routes.forEach(r => {
                areas.add(r.from_name);
                areas.add(r.to_name);
            });
            setKnownAreas(Array.from(areas).sort());
            const a = await dataService.getPlaceAliases(currentUser.organization_id);
            setAliases(a);
            setAliasDrafts(a);
        } catch (err) {
            showToast("Failed to load routes", "error");
            setLoadError(navigator.onLine ? 'error' : 'offline');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoutes();
    }, [currentUser]);

    // Initial Rows
    useEffect(() => {
        setTempRoutes([newRow()]);
    }, []);

    const updateRow = (id: number, field: keyof TempRoute, value: string) => {
        setTempRoutes(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const removeRow = (id: number) => {
        setTempRoutes(prev => prev.filter(r => r.id !== id));
    };

    const handleSaveAll = async () => {
        // Validate
        const validRoutes = tempRoutes.filter(r => r.from_name.trim() && r.to_name.trim() && r.distance_km);

        if (validRoutes.length === 0) {
            showToast("Please fill at least one route completely", "warning");
            return;
        }
        if (validRoutes.some(r => cleanMapsInput(r.maps_url) === null)) {
            showToast("The Google Maps link must start with https://", "warning");
            return;
        }

        setLoading(true);
        let successCount = 0;

        try {
            for (const r of validRoutes) {
                const fromUpper = r.from_name.trim().toUpperCase();
                const toUpper = r.to_name.trim().toUpperCase();
                const via = r.via.trim().toUpperCase() || null;
                
                await dataService.addRoute({
                    organization_id: currentUser.organization_id,
                    from_name: fromUpper,
                    to_name: toUpper,
                    distance_km: parseFloat(r.distance_km),
                    note: '',
                    via,
                    maps_url: cleanMapsInput(r.maps_url) || null,
                });
                successCount++;
                
                if (fromUpper !== toUpper) {
                    try {
                        await dataService.addRoute({
                            organization_id: currentUser.organization_id,
                            from_name: toUpper,
                            to_name: fromUpper,
                            distance_km: parseFloat(r.distance_km),
                            note: '',
                            // same road back; the map link is for the forward direction, so it is not copied
                            via,
                        });
                        successCount++;
                    } catch (reverseErr: any) {
                        console.log("Reverse route may already exist", reverseErr);
                    }
                }
            }
            showToast(`Successfully added ${successCount} routes (including reverse)!`, "success");
            setTempRoutes([newRow()]); // Reset
            loadRoutes(); // Refresh list
            setActiveTab('list'); // Switch to list view
        } catch (err: any) {
            const msg = err.message || "Unknown error";
            if (msg.includes("unique constrain") || msg.toLowerCase().includes("already")) {
                showToast(`Some routes already exist! Added ${successCount}.`, "warning");
            } else {
                showToast("Failed to save some routes", "error");
            }
            loadRoutes();
        } finally {
            setLoading(false);
        }
    };

    // WhatsApp opens with the route message typed out; the Captain picks the group or chat.
    const shareRoute = async (route: AreaRoute) => {
        try {
            await shareTextToWhatsApp(routeWhatsAppMessage(route, groupName));
        } catch (err) {
            console.error(err);
            showToast("Could not open WhatsApp", "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this route?")) return;
        try {
            await dataService.deleteRoute(id);
            showToast("Route deleted", "success");
            setExistingRoutes(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            showToast("Failed to delete", "error");
        }
    };

    const startEditing = (route: AreaRoute) => {
        setEditingId(route.id);
        setEditValues({
            from_name: route.from_name,
            to_name: route.to_name,
            distance_km: route.distance_km,
            via: route.via || '',
            maps_url: route.maps_url || '',
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValues({});
    };

    const saveEdit = async () => {
        if (!editingId) return;
        const mapsUrl = cleanMapsInput(editValues.maps_url || '');
        if (mapsUrl === null) {
            showToast("The Google Maps link must start with https://", "warning");
            return;
        }
        const changes = {
            from_name: editValues.from_name,
            to_name: editValues.to_name,
            distance_km: Number(editValues.distance_km),
            via: (editValues.via || '').trim().toUpperCase() || null,
            maps_url: mapsUrl || null,
        };

        try {
            await dataService.updateRoute(editingId, changes);

            showToast("Route updated successfully", "success");

            // Update local state
            setExistingRoutes(prev => prev.map(r =>
                r.id === editingId
                    ? { ...r, ...changes } as AreaRoute
                    : r
            ));

            setEditingId(null);
        } catch (err) {
            console.error(err);
            showToast("Failed to update route", "error");
        }
    };

    const ALIAS_MAX = 12;
    const saveAlias = async (place: string) => {
        const draft = (aliasDrafts[place] || '').trim().toUpperCase();
        if (draft.length > ALIAS_MAX) { showToast(`Keep the short form to ${ALIAS_MAX} characters`, 'warning'); return; }
        const clash = Object.entries(aliases).find(([p, a]) => p !== place && a === draft);
        if (draft && clash) { showToast(`${draft} is already the short form of ${clash[0]}`, 'warning'); return; }
        setSavingAlias(place);
        try {
            await dataService.setPlaceAlias(currentUser.organization_id, place, draft);
            setAliases(prev => { const next = { ...prev }; if (draft) next[place] = draft; else delete next[place]; return next; });
            setAliasDrafts(prev => ({ ...prev, [place]: draft }));
            showToast(draft ? `Saved: ${draft} = ${place}` : 'Short form removed', 'success');
        } catch (err) {
            console.error(err);
            showToast('Could not save the short form', 'error');
        } finally {
            setSavingAlias(null);
        }
    };

    // Filtered List (a place's short form matches too)
    const filteredRoutes = existingRoutes.filter(r =>
        placeMatches(r.from_name, aliases, searchTerm) ||
        placeMatches(r.to_name, aliases, searchTerm) ||
        placeMatches(r.via, aliases, searchTerm)
    );
    const aliasChip = (place: string) =>
        aliases[place] ? <span className="ml-1.5 shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-extrabold tracking-wide text-brand-700">{aliases[place]}</span> : null;
    const filteredPlaces = knownAreas.filter(p => placeMatches(p, aliases, searchTerm));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink flex items-center gap-2">
                        <Map size={20} className="text-brand-700" />
                        Manage Routes
                    </h1>
                    <p className="text-xs text-ink-2">Configure area distances for Vihar calculations</p>
                    {!loading && (
                        <span className="mt-2 inline-block bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1 rounded-full">
                            {existingRoutes.length} {existingRoutes.length === 1 ? 'Route' : 'Routes'}
                        </span>
                    )}
                </div>
                {/* Tab switcher */}
                <div className="flex bg-sunken p-1 rounded-xl shrink-0">
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'add' ? 'bg-brand text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
                    >
                        <div className="flex items-center gap-2"><Plus size={16} /> Add Routes</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'list' ? 'bg-brand text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
                    >
                        <div className="flex items-center gap-2"><Table size={16} /> View All</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('aliases')}
                        className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'aliases' ? 'bg-brand text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
                    >
                        <div className="flex items-center gap-2"><Tag size={16} /> Short Forms</div>
                    </button>
                </div>
            </div>

            {activeTab === 'add' && (
                <div className="bg-surface rounded-2xl shadow-xl border border-line overflow-hidden">

                    <div className="p-6">
                        <div className="space-y-4">
                            {/* Headers */}
                            {/* Headers - Hidden on Mobile */}
                            <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-bold text-ink-3 uppercase tracking-wider mb-2 px-2">
                                <div className="col-span-5 md:col-span-4">From Area</div>
                                <div className="col-span-1 hidden md:block text-center"></div>
                                <div className="col-span-5 md:col-span-4">To Area</div>
                                <div className="col-span-2">Km</div>
                                <div className="col-span-1"></div>
                            </div>

                            {tempRoutes.map((route, index) => (
                                <div key={route.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-stretch md:items-center bg-sunken/60 p-4 md:p-2 rounded-xl group hover:bg-surface hover:shadow-md transition-all border border-line md:border-transparent hover:border-line relative">

                                    {/* Mobile helper label */}
                                    <div className="md:hidden absolute top-2 right-2 text-xs text-ink-3 font-mono">#{index + 1}</div>

                                    {/* From */}
                                    <div className="w-full md:col-span-4 relative">
                                        <label className="text-xs font-bold text-ink-3 mb-1 block md:hidden">From</label>
                                        <div className="relative">
                                            <MapPin size={14} className="absolute left-3 top-3 text-ink-3" />
                                            <input
                                                type="text"
                                                placeholder="Start Location"
                                                list="area-suggestions"
                                                className="w-full pl-9 p-2 rounded-lg border border-line text-sm focus:ring-2 focus:ring-brand outline-none uppercase"
                                                value={route.from_name}
                                                onChange={e => updateRow(route.id, 'from_name', e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>

                                    {/* Arrow (Desktop) */}
                                    <div className="hidden md:flex col-span-1 justify-center text-ink-3">
                                        <ArrowRight size={16} />
                                    </div>

                                    {/* To */}
                                    <div className="w-full md:col-span-4 relative">
                                        <label className="text-xs font-bold text-ink-3 mb-1 block md:hidden">To</label>
                                        <div className="relative">
                                            <MapPin size={14} className="absolute left-3 top-3 text-ink-3" />
                                            <input
                                                type="text"
                                                placeholder="End Location"
                                                list="area-suggestions"
                                                className="w-full pl-9 p-2 rounded-lg border border-line text-sm focus:ring-2 focus:ring-brand outline-none uppercase"
                                                value={route.to_name}
                                                onChange={e => updateRow(route.id, 'to_name', e.target.value.toUpperCase())}
                                            />
                                        </div>
                                    </div>

                                    {/* Km */}
                                    <div className="w-full md:col-span-2">
                                        <label className="text-xs font-bold text-ink-3 mb-1 block md:hidden">Distance (Km)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0.0"
                                            className="w-full p-2 text-center rounded-lg border border-line text-sm font-bold focus:ring-2 focus:ring-brand outline-none"
                                            value={route.distance_km}
                                            onChange={e => updateRow(route.id, 'distance_km', e.target.value)}
                                        />
                                    </div>

                                    {/* Via + Google Maps link (optional) */}
                                    <div className="w-full md:col-span-12 md:order-last grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
                                        <div className="md:col-span-4">
                                            <label className="text-xs font-bold text-ink-3 mb-1 block md:hidden">Via (optional)</label>
                                            <input
                                                type="text"
                                                placeholder="Via (optional)"
                                                list="area-suggestions"
                                                maxLength={200}
                                                className="w-full p-2 rounded-lg border border-line text-sm focus:ring-2 focus:ring-brand outline-none uppercase"
                                                value={route.via}
                                                onChange={e => updateRow(route.id, 'via', e.target.value.toUpperCase())}
                                            />
                                        </div>
                                        <div className="md:col-span-7">
                                            <label className="text-xs font-bold text-ink-3 mb-1 block md:hidden">Google Maps link (optional)</label>
                                            <input
                                                type="url"
                                                inputMode="url"
                                                placeholder="Paste the Google Maps route link (optional)"
                                                className="w-full p-2 rounded-lg border border-line text-sm focus:ring-2 focus:ring-brand outline-none"
                                                value={route.maps_url}
                                                onChange={e => updateRow(route.id, 'maps_url', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Delete */}
                                    <div className="flex md:col-span-1 justify-end md:justify-center mt-2 md:mt-0">
                                        <button
                                            onClick={() => removeRow(route.id)}
                                            className="text-red-400 hover:text-err p-2 rounded-full hover:bg-err-soft flex items-center gap-2"
                                            tabIndex={-1}
                                        >
                                            <span className="md:hidden text-xs font-bold uppercase">Remove</span>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-start">
                            <button
                                onClick={() => setTempRoutes(prev => [...prev, newRow()])}
                                className="flex items-center space-x-2 text-ink-2 hover:text-brand-700 font-bold px-4 py-2 mt-2 rounded-lg hover:bg-brand-50 transition-colors border border-transparent hover:border-brand-100"
                            >
                                <Plus size={18} />
                                <span>Add Another Route</span>
                            </button>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleSaveAll}
                                disabled={loading || tempRoutes.length === 0}
                                className="flex items-center space-x-2 bg-brand hover:bg-brand-600 text-ink px-8 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <span className="animate-pulse">Saving...</span> : <>
                                    <Save size={20} />
                                    <span>Save All Routes</span>
                                </>}
                            </button>
                        </div>

                        {/* Datalist for suggestions */}
                        <datalist id="area-suggestions">
                            {knownAreas.map(area => <option key={area} value={area} />)}
                        </datalist>
                    </div>
                </div>
            )}

            {/* List View */}
            {activeTab === 'list' && (
                <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                    <div className="p-4 border-b border-line flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-ink-3" size={18} />
                            <input
                                type="text"
                                placeholder="Search routes or short forms..."
                                className="w-full pl-10 p-2.5 bg-sunken/60 border border-line rounded-lg focus:ring-2 focus:ring-brand outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : loadError ? (
                        <div className="p-4">
                            <StatusScreen variant={loadError} onRetry={loadRoutes} compact />
                        </div>
                    ) : (
                    <div className="overflow-x-auto">
                        {/* Mobile Card List */}
                        <div className="md:hidden space-y-3 p-4">
                            {filteredRoutes.length > 0 ? filteredRoutes.map(route => (
                                <div key={route.id} className="bg-sunken/60 border border-line rounded-xl p-4 flex flex-col gap-3 relative">
                                    {editingId === route.id ? (
                                        // Mobile Edit Mode
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="text-[11px] uppercase font-bold text-ink-3">From</label>
                                                <input
                                                    className="w-full p-2 border rounded-lg text-sm bg-surface"
                                                    value={editValues.from_name}
                                                    onChange={e => setEditValues({ ...editValues, from_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] uppercase font-bold text-ink-3">To</label>
                                                <input
                                                    className="w-full p-2 border rounded-lg text-sm bg-surface"
                                                    value={editValues.to_name}
                                                    onChange={e => setEditValues({ ...editValues, to_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] uppercase font-bold text-ink-3">KM</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-full p-2 border rounded-lg text-sm bg-surface"
                                                    value={editValues.distance_km}
                                                    onChange={e => setEditValues({ ...editValues, distance_km: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] uppercase font-bold text-ink-3">Via (optional)</label>
                                                <input
                                                    className="w-full p-2 border rounded-lg text-sm bg-surface uppercase"
                                                    value={editValues.via || ''}
                                                    onChange={e => setEditValues({ ...editValues, via: e.target.value.toUpperCase() })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] uppercase font-bold text-ink-3">Google Maps link (optional)</label>
                                                <input
                                                    type="url"
                                                    className="w-full p-2 border rounded-lg text-sm bg-surface"
                                                    placeholder="https://maps.app.goo.gl/..."
                                                    value={editValues.maps_url || ''}
                                                    onChange={e => setEditValues({ ...editValues, maps_url: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={cancelEditing} className="p-2 border rounded-lg text-sm">Cancel</button>
                                                <button onClick={saveEdit} className="p-2 bg-brand text-ink rounded-lg text-sm font-bold">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Mobile View Mode
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-ink font-medium">
                                                    <MapPin size={16} className="text-brand-700" />
                                                    <span className="inline-flex items-center">{route.from_name}{aliasChip(route.from_name)}</span>
                                                </div>
                                                <ArrowRight size={14} className="text-ink-3" />
                                                <div className="flex items-center gap-2 text-ink font-medium">
                                                    <span className="inline-flex items-center">{route.to_name}{aliasChip(route.to_name)}</span>
                                                </div>
                                            </div>
                                            {route.via && <p className="-mt-1.5 text-xs font-semibold text-ink-2">via {route.via}</p>}

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                                                <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold">
                                                    {route.distance_km} km
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {route.maps_url && (
                                                        <a href={route.maps_url} target="_blank" rel="noopener noreferrer" aria-label="Open route in Google Maps" className="p-2 text-info">
                                                            <Navigation size={18} />
                                                        </a>
                                                    )}
                                                    <button onClick={() => shareRoute(route)} aria-label="Share route on WhatsApp" className="p-2 text-[#25D366]">
                                                        <WhatsAppIcon size={18} />
                                                    </button>
                                                    <button onClick={() => startEditing(route)} className="p-2 text-ink-3 hover:text-brand-700">
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(route.id)} className="p-2 text-ink-3 hover:text-err">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-8 text-ink-3">
                                    No routes found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <table className="hidden md:table w-full text-left">
                            <thead className="bg-sunken/60 text-ink-2 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">From</th>
                                    <th className="p-4">To</th>
                                    <th className="p-4">Via</th>
                                    <th className="p-4 text-center">Distance (Km)</th>
                                    <th className="p-4">Map</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {filteredRoutes.length > 0 ? filteredRoutes.map(route => (
                                    <tr key={route.id} className="hover:bg-gray-50/50 transition-colors">
                                        {editingId === route.id ? (
                                            <>
                                                <td className="p-4">
                                                    <input
                                                        className="w-full p-2 border rounded-lg text-sm"
                                                        value={editValues.from_name}
                                                        onChange={e => setEditValues({ ...editValues, from_name: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <input
                                                        className="w-full p-2 border rounded-lg text-sm"
                                                        value={editValues.to_name}
                                                        onChange={e => setEditValues({ ...editValues, to_name: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <input
                                                        className="w-full p-2 border rounded-lg text-sm uppercase"
                                                        placeholder="Optional"
                                                        value={editValues.via || ''}
                                                        onChange={e => setEditValues({ ...editValues, via: e.target.value.toUpperCase() })}
                                                    />
                                                </td>
                                                <td className="p-4 text-center">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="w-20 p-2 border rounded-lg text-sm text-center"
                                                        value={editValues.distance_km}
                                                        onChange={e => setEditValues({ ...editValues, distance_km: parseFloat(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <input
                                                        type="url"
                                                        className="w-full p-2 border rounded-lg text-sm"
                                                        placeholder="Google Maps link"
                                                        value={editValues.maps_url || ''}
                                                        onChange={e => setEditValues({ ...editValues, maps_url: e.target.value })}
                                                    />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={saveEdit}
                                                            className="text-ok hover:text-ok p-2 rounded-full hover:bg-ok-soft"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="text-ink-3 hover:text-ink-2 p-2 rounded-full hover:bg-sunken"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 font-medium text-ink">{route.from_name}{aliasChip(route.from_name)}</td>
                                                <td className="p-4 font-medium text-ink">{route.to_name}{aliasChip(route.to_name)}</td>
                                                <td className="p-4 text-sm font-semibold text-ink-2">{route.via || '-'}</td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        {route.distance_km} km
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {route.maps_url ? (
                                                        <a href={route.maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-info hover:underline">
                                                            <Navigation size={14} /> Open
                                                        </a>
                                                    ) : <span className="text-ink-3">-</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => shareRoute(route)}
                                                            title="Share on WhatsApp"
                                                            className="text-[#25D366] p-2 rounded-full hover:bg-ok-soft transition-colors"
                                                        >
                                                            <WhatsAppIcon size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => startEditing(route)}
                                                            className="text-ink-3 hover:text-brand-700 p-2 rounded-full hover:bg-brand-50 transition-colors"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(route.id)}
                                                            className="text-ink-3 hover:text-err p-2 rounded-full hover:bg-err-soft transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-ink-3">
                                            No routes found. Switch to the "Add Routes" tab to create some!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>
            )}

            {/* Short forms: one alias per place, used to search From / To everywhere */}
            {activeTab === 'aliases' && (
                <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                    <div className="p-4 border-b border-line space-y-3">
                        <p className="text-sm text-ink-2">
                            Give long place names a short form, like <b className="text-ink">SP</b> for <b className="text-ink">SHREE PARSHWANATH ROAD</b>.
                            Typing it in any From / To search (New Entry, Alert Vihar) finds the place. Up to {ALIAS_MAX} characters.
                        </p>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-ink-3" size={18} />
                            <input
                                type="text"
                                placeholder="Search places or short forms..."
                                className="w-full pl-10 p-2.5 bg-sunken/60 border border-line rounded-lg focus:ring-2 focus:ring-brand outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    {loading ? (
                        <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
                    ) : loadError ? (
                        <div className="p-4"><StatusScreen variant={loadError} onRetry={loadRoutes} compact /></div>
                    ) : filteredPlaces.length === 0 ? (
                        <p className="p-8 text-center text-sm text-ink-3">{knownAreas.length ? 'No place matches your search.' : 'Add routes first; their places appear here.'}</p>
                    ) : (
                        <ul className="divide-y divide-line">
                            {filteredPlaces.map(place => {
                                const draft = aliasDrafts[place] ?? '';
                                const changed = draft.trim().toUpperCase() !== (aliases[place] || '');
                                return (
                                    <li key={place} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                                            <MapPin size={15} className="shrink-0 text-brand-700" />
                                            <span className="break-words">{place}</span>
                                        </span>
                                        <div className="flex items-center gap-2 sm:shrink-0">
                                            <input
                                                aria-label={`Short form for ${place}`}
                                                className="w-full sm:w-36 p-2.5 bg-sunken/60 border border-line rounded-lg text-sm font-bold uppercase tracking-wide focus:ring-2 focus:ring-brand outline-none"
                                                placeholder="e.g. SP"
                                                maxLength={ALIAS_MAX}
                                                value={draft}
                                                onChange={e => setAliasDrafts(prev => ({ ...prev, [place]: e.target.value.toUpperCase() }))}
                                                onKeyDown={e => { if (e.key === 'Enter' && changed) saveAlias(place); }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => saveAlias(place)}
                                                disabled={!changed || savingAlias === place}
                                                className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-40 transition-opacity"
                                            >
                                                <Check size={15} /> {savingAlias === place ? 'Saving' : 'Save'}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper Icon Component
const MapPin = ({ size = 16, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

export default ManageRoutes;
