import React, { useState, useEffect } from 'react';
import { UserProfile, ContactNumber } from '../types';
import { dataService } from '../services/dataService';
import { PhoneCall, PlusCircle, Trash2, Loader2, Phone, Crown, X as XIcon } from 'lucide-react';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import SevakDirectorySection from '../components/SevakDirectorySection';
import ContactActionButtons from '../components/ContactActionButtons';
import StatusScreen from '../components/StatusScreen';

interface AdminContactsProps {
    currentUser: UserProfile;
}

const AdminContacts: React.FC<AdminContactsProps> = ({ currentUser }) => {
    const { showToast } = useToast();
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
    const [loadError, setLoadError] = useState<'offline' | 'error' | null>(null);
    const [contactForm, setContactForm] = useState({ label: '', phone: '', description: '' });
    const [addingContact, setAddingContact] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [deletingContactId, setDeletingContactId] = useState<number | null>(null);

    const load = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const data = await dataService.getContactNumbers(currentUser.organization_id);
                setContacts(data);
            } catch (e: any) {
                showToast('Could not load contacts', 'error');
                setLoadError(navigator.onLine ? 'error' : 'offline');
            } finally {
                setLoading(false);
            }
    };

    useEffect(() => {
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
            setAddOpen(false);
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
            <div>
                <h1 className="display text-[1.7rem] sm:text-[2.3rem] font-extrabold text-ink flex items-center gap-2">
                    <PhoneCall size={20} className="text-brand-700" />
                    Manage Contacts
                </h1>
                <p className="text-xs text-ink-2">Contacts added here appear on every Sevak's Contacts page</p>
            </div>

            {/* Add Contact pop-up (opened from the button beside "Emergency Contacts List") */}
            <Modal open={addOpen} onClose={() => !addingContact && setAddOpen(false)} maxWidth="max-w-md" closeOnBackdrop={!addingContact}>
                <div className="p-5 flex justify-between items-start gap-3 shrink-0 border-b border-line">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-2xl bg-brand text-ink flex items-center justify-center shrink-0"><PlusCircle size={20} /></span>
                        <div className="min-w-0">
                            <h3 className="display text-[1.4rem] font-bold text-ink">Add Contact</h3>
                            <p className="text-[13px] text-ink-2 mt-0.5">Shown to every Sevak on their Contacts page</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setAddOpen(false)} disabled={addingContact} aria-label="Close" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-ink hover:bg-line transition-colors shrink-0 disabled:opacity-50">
                        <XIcon size={18} />
                    </button>
                </div>
                <form onSubmit={handleAddContact} className="p-5 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="contact-label" className="block text-sm font-medium text-ink-2 mb-1.5">Contact Name / Role</label>
                        <input
                            id="contact-label"
                            type="text"
                            required
                            autoFocus
                            placeholder="e.g. Vijay Mehta"
                            value={contactForm.label}
                            onChange={e => setContactForm({ ...contactForm, label: e.target.value })}
                            className="w-full h-12 rounded-field bg-white ring-1 ring-inset ring-line px-4 text-[16px] text-ink outline-none transition focus:ring-2 focus:ring-brand"
                        />
                    </div>
                    <div>
                        <label htmlFor="contact-phone" className="block text-sm font-medium text-ink-2 mb-1.5">Mobile Number (10 digits)</label>
                        <input
                            id="contact-phone"
                            type="tel"
                            inputMode="numeric"
                            required
                            maxLength={10}
                            placeholder="9876543210"
                            value={contactForm.phone}
                            onChange={e =>
                                setContactForm({ ...contactForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                            }
                            className="num w-full h-12 rounded-field bg-white ring-1 ring-inset ring-line px-4 text-[16px] text-ink outline-none transition focus:ring-2 focus:ring-brand tracking-wide"
                        />
                    </div>
                    <div>
                        <label htmlFor="contact-desc" className="block text-sm font-medium text-ink-2 mb-1.5">
                            Description / Note <span className="text-ink-3 font-normal">(optional)</span>
                        </label>
                        <input
                            id="contact-desc"
                            type="text"
                            placeholder="e.g. Captain, Vice Captain, route queries"
                            value={contactForm.description}
                            onChange={e => setContactForm({ ...contactForm, description: e.target.value })}
                            className="w-full h-12 rounded-field bg-white ring-1 ring-inset ring-line px-4 text-[16px] text-ink outline-none transition focus:ring-2 focus:ring-brand"
                        />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => setAddOpen(false)} disabled={addingContact} className="flex-1 h-12 rounded-full text-[15px] font-semibold bg-surface ring-1 ring-inset ring-line text-ink disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={addingContact} className="flex flex-1 items-center justify-center gap-2 h-12 rounded-full text-[15px] font-semibold bg-brand text-ink hover:bg-brand-600 disabled:opacity-60 active:translate-y-px">
                            {addingContact ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                            Add Contact
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Contacts List */}
            <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                <div className="p-5 border-b border-line bg-gray-50/60 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-ink flex items-center gap-2">
                            <Phone size={18} className="text-brand-700 shrink-0" />
                            Emergency Contacts List
                        </h2>
                        <p className="text-xs text-ink-3 mt-0.5">Added only by the Captain — shown to every Sevak</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-brand hover:bg-brand-600 text-ink text-[14px] font-semibold transition active:translate-y-px"
                    >
                        <PlusCircle size={16} />
                        Add Contact
                    </button>
                </div>

                {loading ? (
                    <div className="p-5 space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-3.5 w-1/3" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : loadError ? (
                    <div className="p-4">
                        <StatusScreen variant={loadError} onRetry={load} compact />
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="flex flex-col items-center py-14 text-center gap-3">
                        <div className="p-4 bg-brand-50 rounded-2xl">
                            <Phone size={28} className="text-brand" />
                        </div>
                        <p className="text-sm text-ink-3">No contacts yet. Tap Add Contact to add one.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-line">
                        {contacts.map((contact, index) => (
                            <div
                                key={contact.id}
                                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 hover:bg-white transition-colors group"
                            >
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

                                {/* Delete — before the logos so they stay flush right; phones have no hover, so it is always shown there */}
                                <button
                                    onClick={() => handleDeleteContact(contact.id)}
                                    disabled={deletingContactId === contact.id}
                                    className="shrink-0 p-1.5 sm:p-2 text-ink-3 hover:text-err hover:bg-err-soft rounded-lg transition-colors disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                                    title="Remove contact"
                                    aria-label={`Remove ${contact.label}`}
                                >
                                    {deletingContactId === contact.id ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={15} />
                                    )}
                                </button>

                                <ContactActionButtons phone={contact.phone} name={contact.label} logos />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sevak Contact Directory — every sevak's own number, read-only */}
            <SevakDirectorySection currentUser={currentUser} />

            <p className="text-center text-xs text-ink-3">
                Sevaks will see these contacts on their Contacts page with Call &amp; WhatsApp options
            </p>
        </div>
    );
};

export default AdminContacts;
