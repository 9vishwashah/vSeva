import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ContactNumber } from '../types';
import { dataService } from '../services/dataService';
import { Phone, MessageCircle, Loader2, Users2, AlertCircle } from 'lucide-react';
import { EmergencyHelp } from '../components/EmergencyHelp';
import { JainTempleFinder } from '../components/JainTempleFinder';
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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await dataService.getContactNumbers(currentUser.organization_id);
                setContacts(data);
            } catch (e: any) {
                setError('Could not load contacts. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.organization_id]);

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-8">            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-400 p-6 text-white shadow-lg">
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

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="animate-spin text-saffron-500" size={36} />
                    <p className="text-gray-500 text-sm">Loading contacts...</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && contacts.length === 0 && (
                <div className="flex flex-col items-center py-20 text-center gap-4">
                    <div className="p-5 bg-saffron-50 rounded-2xl">
                        <Phone size={36} className="text-saffron-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700 text-lg">No Contacts Yet</p>
                        <p className="text-gray-400 text-sm mt-1">Your admin hasn't added any contacts yet.</p>
                    </div>
                </div>
            )}

            {/* Contact Cards */}
            {!loading && !error && contacts.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {contacts.map((contact, index) => {
                        const gradient = GRADIENTS[index % GRADIENTS.length];
                        const initials = getInitials(contact.label);
                        const phoneHref = `tel:+91${contact.phone}`;
                        const waHref = `https://wa.me/91${contact.phone}`;

                        return (
                            <div
                                key={contact.id}
                                className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                                {/* Accent bar */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${gradient}`} />

                                <div className="flex items-center gap-3 p-3 pl-5">
                                    {/* Avatar */}
                                    <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                                        <span className="text-white font-bold text-sm tracking-wide">{initials}</span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-bold text-gray-900 truncate leading-tight">{contact.label}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <p className="text-xs text-gray-500 font-mono font-medium truncate">+91 {contact.phone}</p>
                                            {contact.description && (
                                                <>
                                                    <span className="text-gray-300 text-[10px] hidden sm:inline">|</span>
                                                    <p className="text-[11px] text-gray-400 truncate hidden sm:inline">{contact.description}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Call */}
                                        <a
                                            href={phoneHref}
                                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-50 hover:bg-green-500 text-green-600 hover:text-white transition-all duration-150 shadow-sm hover:shadow-md active:scale-95"
                                            title={`Call ${contact.label}`}
                                        >
                                            <Phone size={16} strokeWidth={2.5} />
                                        </a>

                                        {/* WhatsApp */}
                                        <a
                                            href={waHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#e8fdf0] hover:bg-[#25D366] text-[#25D366] hover:text-white transition-all duration-150 shadow-sm hover:shadow-md active:scale-95"
                                            title={`WhatsApp ${contact.label}`}
                                        >
                                            <i className="fa-brands fa-whatsapp text-lg leading-none" aria-hidden="true" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer Note */}
            {!loading && contacts.length > 0 && (
                <p className="text-center text-xs text-gray-400 pb-2">
                    Contacts are managed by your organization admin
                </p>
            )}
        </div>
    );
};

export default Contacts;
