import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { Printer, ArrowLeft, ChevronLeft, Check, Loader2, Bell, BellOff, AlertTriangle, RefreshCw, CreditCard, LogOut } from 'lucide-react';
import IDCardBadge from './IDCardBadge';
import { useToast } from '../context/ToastContext';

interface ProfileSectionProps {
    user: UserProfile;
    orgName: string;
    onProfileUpdated?: () => Promise<void>;
    onLogout?: () => void;
}

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const fieldLabelClass = "text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider block mb-1.5";
const fieldInputClass = "w-full py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm";

const ProfileSection: React.FC<ProfileSectionProps> = ({ user, orgName, onProfileUpdated, onLogout }) => {
    const { showToast } = useToast();
    const [showIdCard, setShowIdCard] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [yearlyGoal, setYearlyGoal] = useState(25);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        dataService.getYearlyGoal(user.id).then(setYearlyGoal);
    }, [user.id]);

    // Every field here is the current user editing their OWN profile — there's no
    // "ask your captain" case: an admin has no one above them to ask, so this is
    // editable for every role, not just sevaks.
    const [editForm, setEditForm] = useState({
        age: user.age !== undefined && user.age !== null ? String(user.age) : '',
        blood_group: user.blood_group || '',
        emergency_number: user.emergency_number || '',
        address: user.address || '',
        yearly_goal: String(yearlyGoal),
    });

    useEffect(() => {
        setEditForm({
            age: user.age !== undefined && user.age !== null ? String(user.age) : '',
            blood_group: user.blood_group || '',
            emergency_number: user.emergency_number || '',
            address: user.address || '',
            yearly_goal: String(yearlyGoal),
        });
    }, [user, yearlyGoal]);

    useEffect(() => {
        const load = async () => {
            try {
                const allEntries = await dataService.getEntries(user.organization_id);
                const myEntries = allEntries.filter(e => (e.sevaks || []).includes(user.username));
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const recentCount = myEntries.filter(e => new Date(e.vihar_date) >= thirtyDaysAgo).length;
                setIsActive(recentCount >= 1);
            } catch (e) {
                console.warn('Could not compute active status', e);
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
        const yearlyGoalNum = editForm.yearly_goal ? parseInt(editForm.yearly_goal, 10) : undefined;
        if (editForm.yearly_goal && (isNaN(yearlyGoalNum!) || yearlyGoalNum! < 1 || yearlyGoalNum! > 365)) {
            showToast('Please enter a valid yearly Vihar goal (1–365)', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await dataService.updateOwnProfile({
                age: ageNum,
                bloodGroup: editForm.blood_group,
                emergencyNumber: editForm.emergency_number,
                address: editForm.address,
                yearlyGoal: yearlyGoalNum,
            });
            if (yearlyGoalNum !== undefined) setYearlyGoal(yearlyGoalNum);
            showToast('Profile updated successfully!', 'success');
            if (onProfileUpdated) await onProfileUpdated();
        } catch (err: any) {
            showToast(err.message || 'Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Push notification permission — the browser is the source of truth; the app can
    // only ask once. If it comes back 'denied', no in-app button can undo that.
    const [pushPermission, setPushPermission] = useState<'checking' | 'granted' | 'denied' | 'default' | 'unsupported'>('checking');
    const [pushBusy, setPushBusy] = useState(false);

    const readPushPermission = () => {
        if (typeof Notification === 'undefined') {
            setPushPermission('unsupported');
            return;
        }
        setPushPermission(Notification.permission as 'granted' | 'denied' | 'default');
    };

    useEffect(() => {
        readPushPermission();
        // Re-check on focus in case the user changed the site permission from
        // outside the app (e.g. Chrome's own site settings) and came back.
        const onFocus = () => readPushPermission();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    const handleEnablePush = async () => {
        if (pushBusy) return;
        setPushBusy(true);
        try {
            // @ts-ignore
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            await new Promise<void>((resolve) => {
                // @ts-ignore
                window.OneSignalDeferred.push(async function (OneSignal: any) {
                    try {
                        await OneSignal.Slidedown.prompt();
                        if (user.username) {
                            await OneSignal.login(user.username);
                        }
                    } catch (e) {
                        console.error('OneSignal prompt failed', e);
                    } finally {
                        resolve();
                    }
                });
            });

            // Give the browser a moment to settle the permission change before re-reading it.
            await new Promise(r => setTimeout(r, 400));
            readPushPermission();

            if (Notification.permission === 'granted') {
                showToast('Notifications enabled on this device!', 'success');
            } else if (Notification.permission === 'denied') {
                showToast('Notifications are blocked for vSeva in your browser settings.', 'error');
            } else {
                showToast('Notification setup was not completed.', 'info');
            }
        } catch (e) {
            console.error('Failed to enable notifications', e);
            showToast('Could not enable notifications. Please try again.', 'error');
        } finally {
            setPushBusy(false);
        }
    };

    const isSevak = user.role === UserRole.SEVAK;

    return (
        <div className="max-w-xl mx-auto space-y-5 pb-10">
            {/* Top bar */}
            <div className="flex items-center gap-3">
                <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
                    <ChevronLeft size={16} className="text-[#241C17]" />
                </button>
                <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17]">Profile & Settings</h1>
            </div>

            {/* Avatar card */}
            <div className="bg-white rounded-[22px] py-7 px-5 flex flex-col items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div
                    className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[28px] font-extrabold text-white"
                    style={{ background: 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)' }}
                >
                    {getInitials(user.full_name)}
                </div>
                <div className="text-center mt-1">
                    <p className="m-0 text-lg font-extrabold text-[#241C17]">{user.full_name}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <p className="m-0 text-xs font-semibold text-[#8A6A57] uppercase tracking-wide">{user.role}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Profile Incomplete nudge */}
            {isSevak && (!user.blood_group || !user.emergency_number || !user.address) && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                    <div className="mt-0.5 text-blue-600 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-blue-900 mb-0.5">Please Complete Your Profile</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Filling in your Blood Group, Emergency Number, and Address ensures we can assist you promptly during an incident, and is required for your Vihar Sevak Card.</p>
                    </div>
                </div>
            )}

            {/* Your Details */}
            <div className="bg-white rounded-[22px] p-5 sm:p-6 flex flex-col gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="m-0 text-sm font-bold text-[#241C17]">Your Details</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Username — read-only */}
                    <div>
                        <label className={fieldLabelClass}>Username</label>
                        <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">{user.username}</p>
                    </div>

                    {/* Mobile Number — read-only */}
                    <div>
                        <label className={fieldLabelClass}>Mobile Number</label>
                        <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm">{user.mobile}</p>
                    </div>

                    {/* Blood Group */}
                    <div>
                        <label className={fieldLabelClass}>Blood Group</label>
                        <select
                            value={editForm.blood_group}
                            onChange={e => setEditForm({ ...editForm, blood_group: e.target.value })}
                            className={fieldInputClass}
                        >
                            <option value="">— Select —</option>
                            {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                    </div>

                    {/* Age */}
                    <div>
                        <label className={fieldLabelClass}>Age</label>
                        <input
                            type="number"
                            min={1}
                            max={120}
                            value={editForm.age}
                            onChange={e => setEditForm({ ...editForm, age: e.target.value })}
                            placeholder="Your age"
                            className={fieldInputClass}
                        />
                    </div>

                    {/* Yearly Sankalp Goal */}
                    <div>
                        <label className={fieldLabelClass}>Yearly Sankalp Goal</label>
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={editForm.yearly_goal}
                            onChange={e => setEditForm({ ...editForm, yearly_goal: e.target.value })}
                            placeholder="e.g. 25"
                            className={fieldInputClass}
                        />
                    </div>

                    {/* Emergency Number */}
                    <div>
                        <label className={fieldLabelClass}>Emergency Number</label>
                        <input
                            type="tel"
                            maxLength={10}
                            value={editForm.emergency_number}
                            onChange={e => setEditForm({ ...editForm, emergency_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            placeholder="10-digit family number"
                            className={fieldInputClass}
                        />
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                        <label className={fieldLabelClass}>Address</label>
                        <textarea
                            value={editForm.address}
                            onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                            placeholder="Your full address"
                            rows={2}
                            className={fieldInputClass + ' resize-none'}
                        />
                    </div>

                    {/* Gender — read-only */}
                    <div>
                        <label className={fieldLabelClass}>Gender</label>
                        <p className={`m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-sm ${user.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}>
                            {user.gender || 'Not specified'}
                        </p>
                    </div>

                    {/* Organization — read-only */}
                    <div>
                        <label className={fieldLabelClass}>Vihar Seva Group</label>
                        <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">{orgName || user.organization_id}</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-3.5 bg-saffron-600 hover:bg-saffron-700 text-white font-extrabold rounded-2xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>

            {/* Vihar Seva ID Card */}
            <div className="bg-white rounded-[22px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF0E5' }}>
                        <CreditCard size={18} style={{ color: '#DE6B38' }} />
                    </div>
                    <div>
                        <p className="font-bold text-[#241C17] text-sm">Vihar Seva ID Card</p>
                        <p className="text-xs text-[#8A6A57] mt-0.5">View and print your ID card with QR code</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowIdCard(true)}
                    className="px-4 py-2 bg-[#F7F4F0] text-sm font-bold text-[#241C17] rounded-xl hover:bg-gray-100 active:scale-95 transition-transform flex items-center justify-center gap-2 shrink-0"
                >
                    <Printer size={16} /> View Card
                </button>
            </div>

            {/* App Settings */}
            <div className="bg-white rounded-[22px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="m-0 mb-4 text-sm font-bold text-[#241C17]">App Settings</p>

                {pushPermission === 'denied' ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium text-red-900 text-sm">Notifications are blocked in your browser</p>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                Your browser is blocking notifications for vSeva, so nothing inside the app can turn them back on.
                                In Chrome: tap the <strong>lock / info icon</strong> next to the address bar → <strong>Permissions</strong> (or Site settings) →
                                set <strong>Notifications</strong> to <strong>Allow</strong> → then reload the app.
                            </p>
                        </div>
                    </div>
                ) : pushPermission === 'unsupported' ? (
                    <div className="p-4 rounded-2xl text-xs text-[#8A6A57]" style={{ background: '#F7F4F0' }}>
                        This browser doesn't support push notifications.
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 rounded-2xl gap-3" style={{ background: '#F7F4F0' }}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF0E5' }}>
                                {pushPermission === 'granted' ? (
                                    <Bell size={18} style={{ color: '#DE6B38' }} />
                                ) : (
                                    <BellOff size={18} style={{ color: '#B5602C' }} />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-[#241C17] text-sm">Push Notifications</p>
                                {pushPermission === 'granted' ? (
                                    <p className="text-xs mt-0.5 text-green-700 font-medium">Enabled on this device</p>
                                ) : (
                                    <p className="text-xs mt-0.5 text-[#8A6A57]">Receive updates about Vihar alerts and more</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleEnablePush}
                            disabled={pushBusy}
                            className="px-4 py-2 bg-white shadow-sm text-sm font-bold text-[#241C17] rounded-xl hover:bg-gray-50 active:scale-95 transition-transform shrink-0 disabled:opacity-60 flex items-center gap-1.5"
                        >
                            {pushBusy && <Loader2 size={14} className="animate-spin" />}
                            {!pushBusy && pushPermission === 'granted' && <RefreshCw size={14} />}
                            {pushBusy ? 'Working…' : pushPermission === 'granted' ? 'Re-sync' : 'Enable'}
                        </button>
                    </div>
                )}
            </div>

            {/* Sign Out */}
            {onLogout && (
                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white rounded-2xl shadow-sm border border-gray-100 text-red-500 font-bold text-sm hover:bg-red-50 active:scale-[0.98] transition-all"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            )}

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
