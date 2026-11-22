import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ContactNumber } from '../types';
import { dataService } from '../services/dataService';
import { Phone, Loader2, Users2, ShieldAlert, Crown } from 'lucide-react';
import Avatar from '../components/Avatar';
import SevakDirectorySection from '../components/SevakDirectorySection';
import ContactActionButtons from '../components/ContactActionButtons';
import StatusScreen, { StatusScreenVariant } from '../components/StatusScreen';
interface ContactsProps {
    currentUser: UserProfile;
}

const getInitials = (label: string) => {
    const parts = label.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return label.substring(0, 2).toUpperCase();
};

// Gradient palettes for contact cards
// Design Core block colours (solid, readable ink text)
const GRADIENTS = [
    'bg-brand text-ink',
    'bg-block-lavender text-ink',
    'bg-block-tea text-block-seashell',
    'bg-block-pink text-ink',
    'bg-block-mustard text-ink',
    'bg-block-sky text-ink',
    'bg-block-lavender text-ink',
    'bg-block-tea text-block-seashell',
];

const Contacts: React.FC<ContactsProps> = ({ currentUser }) => {
    // A contact who is also in this group (same mobile, else same name) shows their own profile photo.
    // Same lookup the Sevak directory below already loads (cached), so no extra request.
    const [people, setPeople] = useState<Record<string, { full_name: string; mobile: string; avatar_url?: string | null }>>({});
    useEffect(() => {
        dataService.getOrgSevakContacts(currentUser.organization_id).then(setPeople).catch(() => undefined);
    }, [currentUser.organization_id]);
    const photoFor = (label: string, phone?: string | null) => {
        const digits = (phone || '').replace(/\D/g, '').slice(-10);
        const name = label.trim().toLowerCase();
        const list = Object.values(people) as { full_name: string; mobile: string; avatar_url?: string | null }[];
        // One person can have two accounts (e.g. Captain + Sevak) on the same number; use whichever has a photo
        const byPhone = digits.length === 10 ? list.filter(p => (p.mobile || '').replace(/\D/g, '').slice(-10) === digits) : [];
        const pool = byPhone.length ? byPhone : list.filter(p => (p.full_name || '').trim().toLowerCase() === name);
        return pool.find(p => p.avatar_url)?.avatar_url || null;
    };

    const [contacts, setContacts] = useState<ContactNumber[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<StatusScreenVariant | null>(null);

    const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await dataService.getContactNumbers(currentUser.organization_id);
                setContacts(data);
            } catch (e: any) {
                setError(navigator.onLine ? 'error' : 'offline');
            } finally {
                setLoading(false);
            }
    };

    useEffect(() => {
        load();
    }, [currentUser.organization_id]);

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-8">
            <div>
                <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink flex items-center gap-2">
                    <Users2 size={20} className="text-brand-700" />
                    Important Contacts
                </h1>
                <p className="text-xs text-ink-2">Reach out to key personnel anytime</p>
            </div>

            {/* Emergency Contacts List — Captain-curated */}
            <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                <div className="p-5 border-b border-line bg-gray-50/60">
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                        <ShieldAlert size={18} className="text-brand-700" />
                        Emergency Contacts List
                    </h2>
                    <p className="text-xs text-ink-3 mt-0.5">Added by your Captain — reach them anytime</p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                        <Loader2 className="animate-spin text-brand-700" size={30} />
                        <p className="text-ink-2 text-sm">Loading contacts...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-4">
                        <StatusScreen variant={error} onRetry={load} compact />
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && contacts.length === 0 && (
                    <div className="flex flex-col items-center py-14 text-center gap-3">
                        <div className="p-4 bg-brand-50 rounded-2xl">
                            <Phone size={28} className="text-brand" />
                        </div>
                        <p className="text-sm text-ink-3">Your Captain hasn't added any contacts yet.</p>
                    </div>
                )}

                {/* Contact Cards */}
                {!loading && !error && contacts.length > 0 && (
                    <div className="divide-y divide-line">
                        {contacts.map((contact, index) => {
                            return (
                                <div key={contact.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 hover:bg-white transition-colors">
                                    {/* Serial number + the same round picture as the Sevak directory */}
                                    <span className="num text-[11px] font-semibold text-ink-3 bg-sunken h-5 px-1.5 min-w-[34px] inline-flex items-center justify-center rounded-full whitespace-nowrap shrink-0">#{index + 1}</span>
                                    <Avatar name={contact.label} url={photoFor(contact.label, contact.phone)} size={36} className="text-[11px]" />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-ink leading-snug line-clamp-2 break-words">{contact.label}</p>
                                        {contact.description && (
                                            <span className="mt-1 inline-flex max-w-full items-center gap-1 h-6 px-2.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 text-[12px] font-semibold">{/captain/i.test(contact.description) && <Crown size={12} className="shrink-0" />}<span className="truncate">{contact.description}</span></span>
                                        )}
                                    </div>

                                    <ContactActionButtons phone={contact.phone} name={contact.label} logos />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sevak Contact Directory — every sevak's own number */}
            <SevakDirectorySection currentUser={currentUser} />
        </div>
    );
};

export default Contacts;
