import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { UserProfile, AreaRoute } from '../types';
import { Plus, Trash2, Save, Map, Search, ArrowRight, Table, Pencil, X, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ManageRoutesProps {
    currentUser: UserProfile;
}

interface TempRoute {
    id: number;
    from_name: string;
    to_name: string;
    distance_km: string; // string for input handling
}

const ManageRoutes: React.FC<ManageRoutesProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');

    // List State
    const [existingRoutes, setExistingRoutes] = useState<AreaRoute[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Add State
    const [rowCount, setRowCount] = useState<number>(3);
    const [tempRoutes, setTempRoutes] = useState<TempRoute[]>([]);
    const [knownAreas, setKnownAreas] = useState<string[]>([]);

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Partial<AreaRoute>>({});

    const loadRoutes = async () => {
        setLoading(true);
        try {
            const routes = await dataService.getRoutes(currentUser.organization_id);
            setExistingRoutes(routes);

            // Extract known areas for suggestions
            const areas = new Set<string>();
            routes.forEach(r => {
                areas.add(r.from_name);
                areas.add(r.to_name);
            });
            setKnownAreas(Array.from(areas).sort());
        } catch (err) {
            showToast("Failed to load routes", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoutes();
    }, [currentUser]);

    // Initial Rows
    useEffect(() => {
        generateRows(rowCount);
    }, []);

    const generateRows = (count: number) => {
        const newRows: TempRoute[] = [];
        for (let i = 0; i < count; i++) {
            newRows.push({
                id: Date.now() + i,
                from_name: '',
                to_name: '',
                distance_km: ''
            });
        }
        setTempRoutes(newRows);
    };

    const handleSetRows = () => {
        if (rowCount > 0 && rowCount <= 20) {
            generateRows(rowCount);
        } else {
            showToast("Please enter a number between 1 and 20", "warning");
        }
    };

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

        setLoading(true);
        let successCount = 0;

        try {
            for (const r of validRoutes) {
                await dataService.addRoute({
                    organization_id: currentUser.organization_id,
                    from_name: r.from_name.trim(),
                    to_name: r.to_name.trim(),
                    distance_km: parseFloat(r.distance_km),
                    note: ''
                });
                successCount++;
            }
            showToast(`Successfully added ${successCount} routes!`, "success");
            setTempRoutes([]); // Clear
            generateRows(3); // Reset
            loadRoutes(); // Refresh list
            setActiveTab('list'); // Switch to list view
        } catch (err: any) {
            const msg = err.message || "Unknown error";
            if (msg.includes("unique constrain")) {
                showToast(`Some routes already exist! Added ${successCount}.`, "warning");
            } else {
                showToast("Failed to save some routes", "error");
            }
            loadRoutes();
        } finally {
            setLoading(false);
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
            distance_km: route.distance_km
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValues({});
    };

    const saveEdit = async () => {
        if (!editingId) return;

        try {
            await dataService.updateRoute(editingId, {
                from_name: editValues.from_name,
                to_name: editValues.to_name,
                distance_km: Number(editValues.distance_km)
            });

            showToast("Route updated successfully", "success");

            // Update local state
            setExistingRoutes(prev => prev.map(r =>
                r.id === editingId
                    ? { ...r, ...editValues, distance_km: Number(editValues.distance_km) } as AreaRoute
                    : r
            ));

            setEditingId(null);
        } catch (err) {
            console.error(err);
            showToast("Failed to update route", "error");
        }
    };

    // Filtered List
    const filteredRoutes = existingRoutes.filter(r =>
        r.from_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.to_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 font-serif">Manage Routes</h1>
                    <p className="text-gray-500 mt-1">Configure area distances for Vihar calculations</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'add' ? 'bg-white shadow text-saffron-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2"><Plus size={16} /> Add Routes</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white shadow text-saffron-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2"><Table size={16} /> View All</div>
                    </button>
                </div>
            </div>

            {activeTab === 'add' && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-saffron-50/50 p-6 border-b border-gray-100">
                        <label className="text-sm font-bold text-gray-700 mb-2 block">How many routes do you want to add?</label>
                        <div className="flex gap-3 max-w-sm">
                            <input
                                type="number"
                                min="1"
                                max="20"
                                className="flex-1 p-2 border border-gray-300 rounded-lg"
                                value={rowCount}
                                onChange={e => setRowCount(parseInt(e.target.value) || 0)}
                            />
                            <button
                                onClick={handleSetRows}
                                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700"
                            >
                                Generate Fields
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="space-y-4">
                            {/* Headers */}
                            {/* Headers - Hidden on Mobile */}
                            <div className="hidden md:grid grid-cols-12 gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                <div className="col-span-5 md:col-span-4">From Area</div>
                                <div className="col-span-1 hidden md:block text-center"></div>
                                <div className="col-span-5 md:col-span-4">To Area</div>
                                <div className="col-span-2">Km</div>
                                <div className="col-span-1"></div>
                            </div>

                            {tempRoutes.map((route, index) => (
                                <div key={route.id} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 items-stretch md:items-center bg-gray-50 p-4 md:p-2 rounded-xl group hover:bg-white hover:shadow-md transition-all border border-gray-100 md:border-transparent hover:border-gray-100 relative">

                                    {/* Mobile helper label */}
                                    <div className="md:hidden absolute top-2 right-2 text-xs text-gray-300 font-mono">#{index + 1}</div>

                                    {/* From */}
                                    <div className="w-full md:col-span-4 relative">
                                        <label className="text-xs font-bold text-gray-400 mb-1 block md:hidden">From</label>
                                        <div className="relative">
                                            <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Start Location"
                                                list="area-suggestions"
                                                className="w-full pl-9 p-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                                                value={route.from_name}
                                                onChange={e => updateRow(route.id, 'from_name', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Arrow (Desktop) */}
                                    <div className="hidden md:flex col-span-1 justify-center text-gray-400">
                                        <ArrowRight size={16} />
                                    </div>

                                    {/* To */}
                                    <div className="w-full md:col-span-4 relative">
                                        <label className="text-xs font-bold text-gray-400 mb-1 block md:hidden">To</label>
                                        <div className="relative">
                                            <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="End Location"
                                                list="area-suggestions"
                                                className="w-full pl-9 p-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                                                value={route.to_name}
                                                onChange={e => updateRow(route.id, 'to_name', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Km */}
                                    <div className="w-full md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 mb-1 block md:hidden">Distance (Km)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="0.0"
                                            className="w-full p-2 text-center rounded-lg border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-saffron-500 outline-none"
                                            value={route.distance_km}
                                            onChange={e => updateRow(route.id, 'distance_km', e.target.value)}
                                        />
                                    </div>

                                    {/* Delete */}
                                    <div className="flex md:col-span-1 justify-end md:justify-center mt-2 md:mt-0">
                                        <button
                                            onClick={() => removeRow(route.id)}
                                            className="text-red-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 flex items-center gap-2"
                                            tabIndex={-1}
                                        >
                                            <span className="md:hidden text-xs font-bold uppercase">Remove</span>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleSaveAll}
                                disabled={loading || tempRoutes.length === 0}
                                className="flex items-center space-x-2 bg-saffron-600 hover:bg-saffron-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search routes..."
                                className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {/* Mobile Card List */}
                        <div className="md:hidden space-y-3 p-4">
                            {filteredRoutes.length > 0 ? filteredRoutes.map(route => (
                                <div key={route.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3 relative">
                                    {editingId === route.id ? (
                                        // Mobile Edit Mode
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-400">From</label>
                                                <input
                                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                                    value={editValues.from_name}
                                                    onChange={e => setEditValues({ ...editValues, from_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-400">To</label>
                                                <input
                                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                                    value={editValues.to_name}
                                                    onChange={e => setEditValues({ ...editValues, to_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-gray-400">KM</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                                    value={editValues.distance_km}
                                                    onChange={e => setEditValues({ ...editValues, distance_km: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={cancelEditing} className="p-2 border rounded-lg text-sm">Cancel</button>
                                                <button onClick={saveEdit} className="p-2 bg-saffron-600 text-white rounded-lg text-sm font-bold">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Mobile View Mode
                                        <>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-gray-800 font-medium">
                                                    <MapPin size={16} className="text-saffron-500" />
                                                    <span>{route.from_name}</span>
                                                </div>
                                                <ArrowRight size={14} className="text-gray-300" />
                                                <div className="flex items-center gap-2 text-gray-800 font-medium">
                                                    <span>{route.to_name}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                                                <span className="bg-saffron-50 text-saffron-700 px-3 py-1 rounded-full text-xs font-bold">
                                                    {route.distance_km} km
                                                </span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => startEditing(route)} className="p-2 text-gray-400 hover:text-saffron-600">
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(route.id)} className="p-2 text-gray-400 hover:text-red-500">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-8 text-gray-400">
                                    No routes found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <table className="hidden md:table w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">From</th>
                                    <th className="p-4">To</th>
                                    <th className="p-4 text-center">Distance (Km)</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
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
                                                <td className="p-4 text-center">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        className="w-20 p-2 border rounded-lg text-sm text-center"
                                                        value={editValues.distance_km}
                                                        onChange={e => setEditValues({ ...editValues, distance_km: parseFloat(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={saveEdit}
                                                            className="text-green-600 hover:text-green-700 p-2 rounded-full hover:bg-green-50"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditing}
                                                            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 font-medium text-gray-800">{route.from_name}</td>
                                                <td className="p-4 font-medium text-gray-800">{route.to_name}</td>
                                                <td className="p-4 text-center">
                                                    <span className="bg-saffron-50 text-saffron-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        {route.distance_km} km
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => startEditing(route)}
                                                            className="text-gray-400 hover:text-saffron-600 p-2 rounded-full hover:bg-saffron-50 transition-colors"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(route.id)}
                                                            className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
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
                                        <td colSpan={4} className="p-8 text-center text-gray-400">
                                            No routes found. Switch to the "Add Routes" tab to create some!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
