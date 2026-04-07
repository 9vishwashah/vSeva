import React, { useState, useEffect } from 'react';
import { UserProfile, ContactNumber } from '../types';
import { dataService } from '../services/dataService';
import { PhoneCall, PlusCircle, Trash2, Loader2, Phone } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { EmergencyHelp } from '../components/EmergencyHelp';

interface AdminContactsProps {
    currentUser: UserProfile;
}

const AdminContacts: React.FC<AdminContactsProps> = ({ currentUser }) => {
    const { showToast } = useToast();
    const [contacts, setContacts] = useState<ContactNumber[]>([]);
    const [loading, setLoading] = useState(true);
    const [contactForm, setContactForm] = useState({ label: '', phone: '', description: '' });
    const [addingContact, setAddingContact] = useState(false);
    const [deletingContactId, setDeletingContactId] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await dataService.getContactNumbers(currentUser.organization_id);
                setContacts(data);
            } catch (e: any) {
                showToast('Could not load contacts', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser.organization_id]);

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactForm.label.trim() || !contactForm.phone.trim()) return;
        setAddingContact(true);
        try {
            const newContact = await dataService.addContactNumber({
                organization_id: currentUser.organization_id,
                label: contactForm.label.trim(),
                phone: contactForm.phone.trim(),
                description: contactForm.description.trim() || undefined,
            });
            setContacts(prev => [...prev, newContact]);
            setContactForm({ label: '', phone: '', description: '' });
            showToast('Contact added successfully!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to add contact', 'error');
        } finally {
            setAddingContact(false);
        }
    };

    const handleDeleteContact = async (id: number) => {
        if (!window.confirm('Remove this contact?')) return;
        setDeletingContactId(id);
        try {
            await dataService.deleteContactNumber(id);
            setContacts(prev => prev.filter(c => c.id !== id));
            showToast('Contact removed.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to remove contact', 'error');
        } finally {
            setDeletingContactId(null);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saffron-500 via-orange-500 to-amber-400 p-6 text-white shadow-lg">
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />
                <div className="relative">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <PhoneCall size={22} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Manage Contacts</h1>
                    </div>
                    <p className="text-white/80 text-sm mt-1">
                        Contacts added here appear on every Sevak's Contacts page
                    </p>
                    {!loading && (
                        <span className="mt-3 inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                            {contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}
                        </span>
                    )}
                </div>
            </div>

            <EmergencyHelp />

            {/* Add Contact Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/60">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <PlusCircle size={18} className="text-saffron-600" />
                        Add New Contact
                    </h2>
                </div>
                <form onSubmit={handleAddContact} className="p-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Contact Name / Role
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Vijay Mehta"
                                value={contactForm.label}
                                onChange={e => setContactForm({ ...contactForm, label: e.target.value })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Mobile Number (10 digits)
                            </label>
                            <input
                                type="tel"
                                required
                                maxLength={10}
                                placeholder="9876543210"
                                value={contactForm.phone}
                                onChange={e =>
                                    setContactForm({ ...contactForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                                }
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 outline-none font-mono"
                            />
                        </div>
                    </div>
                    {/* Description row */}
                    <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description / Note <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. For route queries, upcoming vihar schedule..."
                            value={contactForm.description}
                            onChange={e => setContactForm({ ...contactForm, description: e.target.value })}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                        />
                    </div>
                    {/* Add button */}
                    <button
                        type="submit"
                        disabled={addingContact}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-saffron-600 hover:bg-saffron-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm shadow-sm"
                    >
                        {addingContact ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                        Add Contact
                    </button>
                </form>
            </div>

            {/* Contacts List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/60">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <Phone size={18} className="text-saffron-600" />
                        Current Contacts
                    </h2>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12 gap-3">
                        <Loader2 className="animate-spin text-saffron-500" size={28} />
                        <span className="text-sm text-gray-500">Loading...</span>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="flex flex-col items-center py-14 text-center gap-3">
                        <div className="p-4 bg-saffron-50 rounded-2xl">
                            <Phone size={28} className="text-saffron-400" />
                        </div>
                        <p className="text-sm text-gray-400">No contacts yet. Add one above.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {contacts.map((contact, index) => (
                            <div
                                key={contact.id}
                                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/80 transition-colors group"
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="text-white text-xs font-bold">
                                        {contact.label.substring(0, 2).toUpperCase()}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{contact.label}</p>
                                    <p className="text-xs text-gray-500 font-mono">+91 {contact.phone}</p>
                                    {contact.description && (
                                        <p className="text-xs text-gray-400 mt-0.5 italic truncate">{contact.description}</p>
                                    )}
                                </div>

                                {/* Index badge */}
                                <span className="text-xs font-medium text-gray-300 hidden sm:block">#{index + 1}</span>

                                {/* Delete */}
                                <button
                                    onClick={() => handleDeleteContact(contact.id)}
                                    disabled={deletingContactId === contact.id}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                    title="Remove contact"
                                >
                                    {deletingContactId === contact.id ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={15} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-gray-400">
                Sevaks will see these contacts on their Contacts page with Call &amp; WhatsApp options
            </p>
        </div>
    );
};

export default AdminContacts;
