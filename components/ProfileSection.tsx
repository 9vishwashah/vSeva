import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { Trophy, Printer, ArrowLeft, Edit2, X, Check, Loader2, Save } from 'lucide-react';
import IDCardBadge from './IDCardBadge';
import { useToast } from '../context/ToastContext';

interface ProfileSectionProps {
    user: UserProfile;
    orgName: string;
    onProfileUpdated?: () => Promise<void>;
}

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const ProfileSection: React.FC<ProfileSectionProps> = ({ user, orgName, onProfileUpdated }) => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<{ male: any[], female: any[], overall: any[] }>({ male: [], female: [], overall: [] });
    const [stats, setStats] = useState<any>(null);
    const [orgDetails, setOrgDetails] = useState<any>(null);
    const [showIdCard, setShowIdCard] = useState(false);
    const [isActive, setIsActive] = useState(true);

    // Edit state (sevak self-edit)
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        age: user.age !== undefined && user.age !== null ? String(user.age) : '',
        blood_group: user.blood_group || '',
        emergency_number: user.emergency_number || '',
        address: user.address || '',
    });

    // Reset form when user prop changes (after parent refreshes)
    useEffect(() => {
        setEditForm({
            age: user.age !== undefined && user.age !== null ? String(user.age) : '',
            blood_group: user.blood_group || '',
            emergency_number: user.emergency_number || '',
            address: user.address || '',
        });
    }, [user]);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const [lb, org, allEntries] = await Promise.all([
                    dataService.getTopSevaks(user.organization_id),
                    dataService.getOrganization(user.organization_id),
                    dataService.getEntries(user.organization_id),
                ]);
                setLeaderboard(lb);
                setOrgDetails(org);

                const myEntries = allEntries.filter(e => (e.sevaks || []).includes(user.username));
                const s = dataService.calculateStats(myEntries, user.username);
                const [rankRes, totalRes] = await Promise.all([
                    dataService.getSevakRank(user.organization_id, user.username),
                    dataService.getTotalOrgSevaks(user.organization_id),
                ]);
                s.vRank = rankRes;
                s.totalOrgSevaks = totalRes ?? undefined;
                setStats(s);

                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const recentCount = myEntries.filter(e => new Date(e.vihar_date) >= thirtyDaysAgo).length;
                setIsActive(recentCount >= 1);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [user]);

    const getInitials = (name: string) => {
        if (!name) return 'VS';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const handleSave = async () => {
        if (editForm.emergency_number && editForm.emergency_number.replace(/\D/g, '').length !== 10) {
            showToast('Emergency number must be 10 digits', 'error');
            return;
        }
        const ageNum = editForm.age ? parseInt(editForm.age, 10) : undefined;
        if (editForm.age && (isNaN(ageNum!) || ageNum! < 1 || ageNum! > 120)) {
            showToast('Please enter a valid age (1–120)', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await dataService.updateOwnProfile({
                age: ageNum,
                bloodGroup: editForm.blood_group,
                emergencyNumber: editForm.emergency_number,
                address: editForm.address,
            });
            showToast('Profile updated successfully!', 'success');
            setIsEditing(false);
            if (onProfileUpdated) await onProfileUpdated();
        } catch (err: any) {
            showToast(err.message || 'Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditForm({
            age: user.age !== undefined && user.age !== null ? String(user.age) : '',
            blood_group: user.blood_group || '',
            emergency_number: user.emergency_number || '',
            address: user.address || '',
        });
        setIsEditing(false);
    };

    const isSevak = user.role === UserRole.SEVAK;

    const EmptyBadge = () => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-100">
            Not filled
        </span>
    );

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 shrink-0 bg-saffron-100 rounded-full flex items-center justify-center text-2xl font-bold text-saffron-600">
                            {getInitials(user.full_name)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-1">{user.full_name}</h2>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-gray-500 uppercase text-xs tracking-wider font-semibold">{user.role}</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                    {isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Edit / Save / Cancel buttons — sevak only, visible on sm+ in header */}
                    {isSevak && (
                        <div className="hidden sm:flex flex-wrap items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleCancel}
                                        disabled={isSaving}
                                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <X size={15} /> Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-saffron-600 hover:bg-saffron-700 rounded-lg shadow-sm shadow-saffron-200 transition-all active:scale-95 disabled:opacity-60"
                                    >
                                        {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                        {isSaving ? 'Saving…' : 'Save'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-saffron-700 bg-saffron-50 hover:bg-saffron-100 border border-saffron-200 rounded-lg transition-colors"
                                >
                                    <Edit2 size={15} /> Update My Details
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile-only: full-width Update My Details button — sevak only */}
                {isSevak && (
                    <div className="sm:hidden mb-5">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <X size={15} /> Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-white bg-saffron-600 hover:bg-saffron-700 rounded-lg shadow-sm shadow-saffron-200 transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                    {isSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-saffron-700 bg-saffron-50 hover:bg-saffron-100 border border-saffron-200 rounded-lg transition-colors"
                            >
                                <Edit2 size={15} /> Update My Details
                            </button>
                        )}
                    </div>
                )}

                {/* Edit mode banner */}
                {isEditing && (
                    <div className="mb-6 px-4 py-3 bg-saffron-50 border border-saffron-200 rounded-lg flex items-center gap-3 text-sm text-saffron-800 font-medium leading-snug">
                        <Edit2 size={18} className="shrink-0 text-saffron-600" />
                        <span>You are editing your profile. Update Age, Blood Group, Emergency Number, and Address below.</span>
                    </div>
                )}

                {/* Profile Incomplete Info Badge */}
                {isSevak && (!user.blood_group || !user.emergency_number || !user.address) && !isEditing && (
                    <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                        <div className="mt-0.5 text-blue-600 shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-900 mb-0.5">Please Complete Your Profile</p>
                            <p className="text-xs text-blue-800 leading-relaxed">Updating your Blood Group, Emergency Number, and Address ensures we can assist you promptly during an incident. It is also required to generate your complete Vihar Sevak Card.</p>
                        </div>
                        <button onClick={() => setIsEditing(true)} className="ml-auto mt-0.5 text-xs font-bold text-blue-700 hover:text-blue-900 underline whitespace-nowrap shrink-0">
                            Edit Now
                        </button>
                    </div>
                )}

                {/* Fields — ordered per mobile UX: Username, Mobile, Blood Group, Age, Emergency Number, Address, Gender, Organisation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-sm border-t border-gray-100 pt-6">

                    {/* Username — read-only */}
                    <div>
                        <p className="text-gray-500 mb-1">Username</p>
                        <p className="font-medium text-lg">{user.username}</p>
                    </div>

                    {/* Mobile Number — read-only */}
                    <div>
                        <p className="text-gray-500 mb-1">Mobile Number</p>
                        <p className="font-medium text-lg">{user.mobile}</p>
                    </div>

                    {/* Blood Group */}
                    <div>
                        <p className="text-gray-500 mb-1">Blood Group</p>
                        {isEditing ? (
                            <select
                                value={editForm.blood_group}
                                onChange={e => setEditForm({ ...editForm, blood_group: e.target.value })}
                                className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none bg-white font-semibold transition-shadow"
                            >
                                <option value="">— Select —</option>
                                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        ) : user.blood_group ? (
                            <p className="font-medium text-lg text-red-600 font-bold">{user.blood_group}</p>
                        ) : (
                            isSevak
                                ? <EmptyBadge />
                                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-100">Ask Captain to update</span>
                        )}
                    </div>

                    {/* Age */}
                    <div>
                        <p className="text-gray-500 mb-1">Age</p>
                        {isEditing ? (
                            <input
                                type="number"
                                min={1}
                                max={120}
                                value={editForm.age}
                                onChange={e => setEditForm({ ...editForm, age: e.target.value })}
                                placeholder="Your age"
                                className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none transition-shadow"
                            />
                        ) : user.age ? (
                            <p className="font-medium text-lg">{user.age} yrs</p>
                        ) : (
                            isSevak
                                ? <EmptyBadge />
                                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-100">Ask Captain to update</span>
                        )}
                    </div>

                    {/* Emergency Number */}
                    <div>
                        <p className="text-gray-500 mb-1">Emergency Number</p>
                        {isEditing ? (
                            <input
                                type="tel"
                                maxLength={10}
                                value={editForm.emergency_number}
                                onChange={e => setEditForm({ ...editForm, emergency_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                placeholder="10-digit family number"
                                className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none font-mono transition-shadow"
                            />
                        ) : user.emergency_number ? (
                            <p className="font-medium text-lg">{user.emergency_number}</p>
                        ) : (
                            isSevak
                                ? <EmptyBadge />
                                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-100">Ask Captain to update</span>
                        )}
                    </div>

                    {/* Address */}
                    <div>
                        <p className="text-gray-500 mb-1">Address</p>
                        {isEditing ? (
                            <textarea
                                value={editForm.address}
                                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder="Your full address"
                                rows={3}
                                className="w-full p-2.5 border-2 border-saffron-400 rounded-lg text-sm focus:ring-4 focus:ring-saffron-100 outline-none resize-none transition-shadow"
                            />
                        ) : user.address ? (
                            <p className="font-medium text-lg">{user.address}</p>
                        ) : (
                            isSevak
                                ? <EmptyBadge />
                                : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-100">Ask Captain to update</span>
                        )}
                    </div>

                    {/* Gender — read-only */}
                    <div>
                        <p className="text-gray-500 mb-1">Gender</p>
                        <p className={`font-medium text-lg ${user.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>
                            {user.gender || 'Not specified'}
                        </p>
                    </div>

                    {/* Organization — read-only */}
                    <div>
                        <p className="text-gray-500 mb-1">Organization</p>
                        <p className="font-medium text-lg">{orgName || user.organization_id}</p>
                    </div>
                </div>

                {/* Vihar Seva Card — placed after fields */}
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg gap-3">
                    <div>
                        <p className="font-bold text-gray-900 text-sm">Your Vihar Sevak Card</p>
                        <p className="text-xs text-gray-500 mt-0.5">View and print your ID card with QR code</p>
                    </div>
                    <button
                        onClick={() => setShowIdCard(true)}
                        className="px-4 py-2 bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-transform flex items-center justify-center gap-2 shrink-0"
                    >
                        <Printer size={16} /> View Card
                    </button>
                </div>

                {/* Bottom Save button for mobile convenience */}
                {isEditing && (
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 py-3 bg-saffron-600 hover:bg-saffron-700 text-white font-bold rounded-xl shadow-lg shadow-saffron-200 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            {isSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {/* App Settings */}
                <div className="mt-8 border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">App Settings</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg gap-3">
                        <div>
                            <p className="font-medium text-gray-900 text-sm">Push Notifications</p>
                            <p className="text-xs text-gray-500 mt-0.5">Receive updates about new entries and approvals</p>
                        </div>
                        <button
                            onClick={() => {
                                // @ts-ignore
                                window.OneSignalDeferred = window.OneSignalDeferred || [];
                                // @ts-ignore
                                window.OneSignalDeferred.push(async function(OneSignal: any) {
                                  try {
                                    await OneSignal.Slidedown.prompt();
                                    if (user.username) {
                                      await OneSignal.login(user.username);
                                    }
                                  } catch (e) {
                                    console.error("OneSignal prompt failed", e);
                                    if (Notification.permission !== 'granted') {
                                      Notification.requestPermission();
                                    }
                                  }
                                });
                            }}
                            className="px-4 py-2 bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-transform shrink-0"
                        >
                            Enable
                        </button>
                    </div>
                </div>
            </div>

            {/* ID Card Modal */}
            {showIdCard && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col pt-16 items-center p-4 print:pt-0 pb-16 overflow-y-auto">
                    <div className="w-full max-w-md print:hidden flex items-center justify-between mb-8 pr-4">
                        <button onClick={() => setShowIdCard(false)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
                            <ArrowLeft size={20} /> Back to Profile
                        </button>
                    </div>
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                        <IDCardBadge user={user} orgName={orgName} />
                        <p className="text-sm text-gray-500 mt-8 text-center max-w-sm print:hidden">
                            Print this badge on an ID card printer or standard A4 paper and cut it out. Scanning the QR code will open your verified profile.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSection;
