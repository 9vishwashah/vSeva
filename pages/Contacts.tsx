import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ContactNumber } from '../types';
import { dataService } from '../services/dataService';
import { Phone, Loader2, Users2, ShieldAlert } from 'lucide-react';
import { EmergencyHelp } from '../components/EmergencyHelp';
import { JainTempleFinder } from '../components/JainTempleFinder';
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
const GRADIENTS = [
    'from-orange-400 to-saffron-600',
    'from-purple-500 to-indigo-600',
    'from-emerald-400 to-teal-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-sky-400 to-blue-600',
    'from-fuchsia-400 to-purple-600',
    'from-lime-400 to-green-600',
];

const Contacts: React.FC<ContactsProps> = ({ currentUser }) => {
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
        <div className="max-w-2xl mx-auto space-y-6 pb-8">            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-600 p-6 text-white shadow-lg">
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Users2 size={22} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Important Contacts</h1>
                    </div>
                    <p className="text-white/80 text-sm mt-1">Reach out to key personnel anytime</p>
                    {!loading && (
                        <span className="mt-3 inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                            {contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}
                        </span>
                    )}
                </div>
            </div>

            <EmergencyHelp />

            {/* Jain Temple Finder - Location Based */}
            <div className="w-full">
                <JainTempleFinder />
            </div>

            {/* Emergency Contacts List — Captain-curated */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/60">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-saffron-600" />
                        Emergency Contacts List
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Added by your Captain — reach them anytime</p>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                        <Loader2 className="animate-spin text-saffron-500" size={30} />
                        <p className="text-gray-500 text-sm">Loading contacts...</p>
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
                        <div className="p-4 bg-saffron-50 rounded-2xl">
                            <Phone size={28} className="text-saffron-400" />
                        </div>
                        <p className="text-sm text-gray-400">Your Captain hasn't added any contacts yet.</p>
                    </div>
                )}

                {/* Contact Cards */}
                {!loading && !error && contacts.length > 0 && (
                    <div className="divide-y divide-gray-100">
                        {contacts.map((contact, index) => {
                            const gradient = GRADIENTS[index % GRADIENTS.length];
                            const initials = getInitials(contact.label);

                            return (
                                <div key={contact.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                                    {/* Avatar */}
                                    <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                                        <span className="text-white font-bold text-sm tracking-wide">{initials}</span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">{contact.label}</p>
                                        {contact.description && (
                                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{contact.description}</p>
                                        )}
                                    </div>

                                    <ContactActionButtons phone={contact.phone} name={contact.label} />
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
