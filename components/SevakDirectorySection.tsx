import React, { useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { Users2, Search } from 'lucide-react';
import Avatar from './Avatar';
import ContactActionButtons from './ContactActionButtons';
import Skeleton from './Skeleton';
import StatusScreen from './StatusScreen';

interface SevakDirectorySectionProps {
    currentUser: UserProfile;
}

interface DirectoryEntry {
    id: string;
    full_name: string;
    mobile: string;
    avatar_url?: string | null;
}

// Every Sevak's own number, taken straight from what they entered at account
// creation (profiles.mobile) — distinct from the Captain-curated Emergency
// Contacts List below it. Shared by both AdminContacts and Contacts pages.
const SevakDirectorySection: React.FC<SevakDirectorySectionProps> = ({ currentUser }) => {
    const [sevaks, setSevaks] = useState<DirectoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
    const [search, setSearch] = useState('');

    const load = React.useCallback(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        dataService.getOrgSevakContacts(currentUser.organization_id).then(map => {
            if (cancelled) return;
            const list = Object.entries(map)
                .filter(([id, p]) => id !== currentUser.id && p.role === UserRole.SEVAK && p.is_active !== false && p.mobile)
                .map(([id, p]) => ({ id, full_name: p.full_name, mobile: p.mobile, avatar_url: p.avatar_url }))
                .sort((a, b) => a.full_name.localeCompare(b.full_name));
            setSevaks(list);
            setLoading(false);
        }).catch(err => {
            if (cancelled) return;
            console.error('Failed to load sevak directory', err);
            setLoadError(navigator.onLine ? 'error' : 'offline');
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [currentUser.organization_id, currentUser.id]);

    useEffect(() => load(), [load]);

    const filteredSevaks = search.trim()
        ? sevaks.filter(s => s.full_name.toLowerCase().includes(search.trim().toLowerCase()))
        : sevaks;
    // Each Sevak keeps their own number (position in the full A to Z list), so searching doesn't renumber them
    const serialById: Record<string, number> = Object.fromEntries(sevaks.map((s, i) => [s.id, i + 1]));

    return (
        <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
            <div className="p-5 border-b border-line bg-gray-50/60 space-y-3">
                <div>
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                        <Users2 size={18} className="text-brand-700" />
                        Sevak Contact Directory
                    </h2>
                    <p className="text-xs text-ink-3 mt-0.5">Every Sevak's number, as entered when their account was created</p>
                </div>
                {!loading && !loadError && sevaks.length > 0 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" size={15} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search sevaks..."
                            className="w-full pl-9 pr-3 py-2 rounded-full bg-surface border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="p-5 space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                            <Skeleton className="h-3.5 flex-1" />
                        </div>
                    ))}
                </div>
            ) : loadError ? (
                <div className="p-4">
                    <StatusScreen variant={loadError} onRetry={load} compact />
                </div>
            ) : sevaks.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center gap-2">
                    <p className="text-sm text-ink-3">No other Sevaks in your organization yet.</p>
                </div>
            ) : filteredSevaks.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center gap-2">
                    <p className="text-sm text-ink-3">No sevaks found matching "{search}"</p>
                </div>
            ) : (
                <div className="divide-y divide-line">
                    {filteredSevaks.map((s, index) => (
                        <div key={s.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 hover:bg-white transition-colors">
                            <span className="num text-[11px] font-semibold text-ink-3 bg-sunken h-5 px-1.5 min-w-[34px] inline-flex items-center justify-center rounded-full whitespace-nowrap shrink-0">#{serialById[s.id] ?? index + 1}</span>
                            <Avatar name={s.full_name} url={s.avatar_url} size={36} className="text-[11px]" />
                            <p className="flex-1 min-w-0 text-[15px] font-semibold text-ink leading-snug line-clamp-2 break-words">{s.full_name}</p>
                            <ContactActionButtons phone={s.mobile} name={s.full_name} logos />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SevakDirectorySection;
