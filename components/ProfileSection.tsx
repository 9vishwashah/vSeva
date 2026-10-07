import React, { useState, useEffect, useRef } from 'react';
import { BRAND } from '@brand';
import { UserProfile, UserRole, Organization } from '../types';
import { dataService } from '../services/dataService';
import { Printer, ArrowLeft, Check, Loader2, Bell, BellOff, AlertTriangle, RefreshCw, CreditCard, LogOut, Camera, BadgeCheck, CalendarDays, ChevronRight } from 'lucide-react';
import IDCardBadge from './IDCardBadge';
import Avatar from './Avatar';
import AvatarCropModal from './AvatarCropModal';
import { useToast } from '../context/ToastContext';
import { getViharYearBounds } from '../services/viharYear';
import SosButton from './SosButton';
import ChangePasswordCard from './ChangePasswordCard';
import SankalpSettingsCard from './SankalpSettingsCard';
import { OCCUPATIONS } from '../services/occupations';
import { getAccountBadge } from '../services/specialAccounts';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

interface ProfileSectionProps {
    user: UserProfile;
    orgDetails: Organization | null;
    onProfileUpdated?: () => Promise<void>;
    onLogout?: () => void;
    onOpenSos?: (sosId: string) => void;
}

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const fieldLabelClass = "text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider block mb-1.5";
const fieldInputClass = "w-full py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm";

const ProfileSection: React.FC<ProfileSectionProps> = ({ user, orgDetails, onProfileUpdated, onLogout, onOpenSos }) => {
    const orgName = orgDetails?.name || user.organization_id;
    // A Sevak sees who their Captain is (read-only).
    const [myCaptain, setMyCaptain] = useState('');
    useEffect(() => {
        if (user.role === UserRole.SEVAK) dataService.getMyCaptainName().then(setMyCaptain);
    }, [user.role, user.organization_id]);
    const currentVY = getViharYearBounds();
    const { showToast } = useToast();
    const [showIdCard, setShowIdCard] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        dataService.getAvatarUrl(user.id).then(url => { if (url) setAvatarUrl(url); });
    }, [user.id]);

    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow picking the same file again later
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please choose an image file', 'error');
            return;
        }
        if (file.size > MAX_AVATAR_BYTES) {
            showToast('Image is too large — please choose one under 5MB', 'error');
            return;
        }

        setCropFile(file);
    };

    const handleCropConfirm = async (blob: Blob) => {
        setCropFile(null);
        setUploadingAvatar(true);
        try {
            const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            const url = await dataService.uploadAvatar(user.id, croppedFile);
            setAvatarUrl(url);
            showToast('Profile photo updated!', 'success');
            if (onProfileUpdated) await onProfileUpdated();
        } catch (err: any) {
            console.error('Avatar upload failed', err);
            showToast(err.message || 'Failed to upload photo. Has scripts/add_avatar_url.sql been run?', 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Every field here is the current user editing their OWN profile — there's no
    // "ask your captain" case: an admin has no one above them to ask, so this is
    // editable for every role, not just sevaks.
    const [editForm, setEditForm] = useState({
        age: user.age !== undefined && user.age !== null ? String(user.age) : '',
        blood_group: user.blood_group || '',
        emergency_number: user.emergency_number || '',
        emergency_contact_name: user.emergency_contact_name || '',
        occupation: user.occupation || '',
        occupation_details: user.occupation_details || '',
        address: user.address || '',
    });

    useEffect(() => {
        setEditForm({
            age: user.age !== undefined && user.age !== null ? String(user.age) : '',
            blood_group: user.blood_group || '',
            emergency_number: user.emergency_number || '',
            emergency_contact_name: user.emergency_contact_name || '',
            occupation: user.occupation || '',
            occupation_details: user.occupation_details || '',
            address: user.address || '',
        });
    }, [user]);

    // Captain (ORG_ADMIN) fields — this profile represents the org's leadership,
    // not a personal sevak, so it edits captain/vice-captain names instead of
    // age/blood group/etc.
    const [captainName, setCaptainName] = useState(user.full_name);
    const [viceCaptainName, setViceCaptainName] = useState(orgDetails?.vice_captain_name || '');

    useEffect(() => {
        setCaptainName(user.full_name);
        setViceCaptainName(orgDetails?.vice_captain_name || '');
    }, [user.full_name, orgDetails?.vice_captain_name]);

    const handleSave = async () => {
        if (editForm.emergency_number && editForm.emergency_number.replace(/\D/g, '').length !== 10) {
            showToast('Family emergency number must be 10 digits', 'error');
            return;
        }
        if (editForm.emergency_number && !editForm.emergency_contact_name.trim()) {
            showToast('Please enter whose number the family emergency number is', 'error');
            return;
        }
        if (editForm.occupation === 'Other' && !editForm.occupation_details.trim()) {
            showToast('Please specify your occupation', 'error');
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
                // the name belongs to the number: clearing the number clears the name too
                emergencyContactName: editForm.emergency_number ? editForm.emergency_contact_name.trim() : '',
                address: editForm.address,
                occupation: editForm.occupation,
                occupationDetails: editForm.occupation ? editForm.occupation_details.trim() : '',
            });
            showToast('Profile updated successfully!', 'success');
            if (onProfileUpdated) await onProfileUpdated();
        } catch (err: any) {
            showToast(err.message || 'Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Save stays grey until something actually differs from what is stored.
    const hasChanges = user.role === UserRole.SEVAK
        ? (editForm.age.trim() !== (user.age !== undefined && user.age !== null ? String(user.age) : '')
            || editForm.blood_group !== (user.blood_group || '')
            || editForm.emergency_number !== (user.emergency_number || '')
            || editForm.emergency_contact_name.trim() !== (user.emergency_contact_name || '')
            || editForm.occupation !== (user.occupation || '')
            || editForm.occupation_details.trim() !== (user.occupation_details || '')
            || editForm.address.trim() !== (user.address || '').trim())
        : (captainName.trim() !== user.full_name.trim()
            || viceCaptainName.trim() !== (orgDetails?.vice_captain_name || '').trim());

    const handleSaveOrgDetails = async () => {
        if (!captainName.trim()) {
            showToast('Captain name is required', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await dataService.updateOrgLeadership({
                captainName: captainName.trim(),
                viceCaptainName: viceCaptainName.trim(),
            });
            showToast('Organization details updated!', 'success');
            if (onProfileUpdated) await onProfileUpdated();
        } catch (err: any) {
            showToast(err.message || 'Failed to update organization details. Has scripts/add_vice_captain_name.sql been run?', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Push notification permission. Native (Android/Capacitor) and web are
    // genuinely different permission models — this used to check only the
    // browser's window.Notification API, which doesn't exist in the Capacitor
    // WebView, so every native install permanently saw "this browser doesn't
    // support push notifications" even though OneSignal's native plugin (see
    // services/oneSignalService.ts) was working correctly the whole time.
    const isNativePlatform = (): boolean => {
        const capacitor = (globalThis as any).Capacitor;
        return !!capacitor && typeof capacitor.isNativePlatform === 'function' && capacitor.isNativePlatform();
    };

    const [pushPermission, setPushPermission] = useState<'checking' | 'granted' | 'denied' | 'default' | 'unsupported'>('checking');
    const [pushBusy, setPushBusy] = useState(false);

    const readPushPermission = async () => {
        if (isNativePlatform()) {
            try {
                const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
                const hasPermission = await OneSignal.Notifications.hasPermission();
                if (hasPermission) {
                    setPushPermission('granted');
                    return;
                }
                // Android only re-prompts if it hasn't asked yet (or the user
                // hasn't permanently denied it) — that's the closest native
                // equivalent to the browser's 'default' vs 'denied' split.
                const canAskAgain = await OneSignal.Notifications.canRequestPermission();
                setPushPermission(canAskAgain ? 'default' : 'denied');
            } catch (e) {
                console.error('Failed to read native push permission', e);
                setPushPermission('unsupported');
            }
            return;
        }
        if (typeof Notification === 'undefined') {
            setPushPermission('unsupported');
            return;
        }
        setPushPermission(Notification.permission as 'granted' | 'denied' | 'default');
    };

    useEffect(() => {
        readPushPermission();
        if (isNativePlatform()) {
            // Re-check when the app resumes, in case the user changed the
            // permission from Android's own system Settings and came back.
            let listenerHandle: { remove: () => void } | undefined;
            let cancelled = false;
            import('@capacitor/app').then(({ App: CapacitorApp }) => {
                if (cancelled) return;
                CapacitorApp.addListener('resume', () => readPushPermission()).then(h => { listenerHandle = h; });
            });
            return () => { cancelled = true; listenerHandle?.remove(); };
        }
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
            if (isNativePlatform()) {
                const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
                // true = fall back to Android's system settings screen if the
                // user already denied it once and the OS won't re-prompt.
                const granted = await OneSignal.Notifications.requestPermission(true);
                if (granted && user.username) {
                    await OneSignal.login(user.username);
                }
                await readPushPermission();
                if (granted) {
                    showToast('Notifications enabled on this device!', 'success');
                } else {
                    showToast('Notification permission was not granted.', 'info');
                }
                return;
            }

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
            await readPushPermission();

            if (Notification.permission === 'granted') {
                showToast('Notifications enabled on this device!', 'success');
            } else if (Notification.permission === 'denied') {
                showToast(`Notifications are blocked for ${BRAND.name} in your browser settings.`, 'error');
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

    const accountBadge = getAccountBadge(user.username);
    const joinedLabel = user.created_at && !isNaN(new Date(user.created_at).getTime())
        ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="max-w-xl mx-auto space-y-5 pb-10">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <h1 className="text-lg sm:text-xl font-extrabold text-[#241C17] truncate">Profile & Settings</h1>
                </div>
                {onOpenSos && <SosButton currentUser={user} onOpenDetail={onOpenSos} />}
            </div>

            {/* Avatar card */}
            <div className="bg-white rounded-[22px] py-5 px-5 flex items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="relative w-[88px] h-[88px] shrink-0">
                    <Avatar name={user.full_name} url={avatarUrl} size={88} variant="gradient" className="text-[28px]" />
                    {uploadingAvatar && (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                            <Loader2 size={22} className="animate-spin text-white" />
                        </div>
                    )}
                    <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        title="Change photo"
                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#241C17] border-2 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
                    >
                        <Camera size={13} className="text-white" />
                    </button>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="m-0 flex items-center gap-1.5 text-lg font-extrabold text-[#241C17]">
                        <span className="truncate">{user.full_name}</span>
                        {accountBadge && <BadgeCheck size={20} className="shrink-0 fill-[#1D9BF0] text-white" aria-label="Verified" />}
                    </p>
                    <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[#8A6A57] uppercase tracking-wide">
                        <span>{user.role === UserRole.ORG_ADMIN ? 'Captain' : 'Sevak'}</span>
                        {accountBadge && (
                            <span className="rounded-full bg-[#E8F4FD] px-2 py-0.5 text-[10px] font-extrabold normal-case tracking-normal text-[#1D7FC4]">{accountBadge.title}</span>
                        )}
                    </p>
                    {joinedLabel && (
                        <p className="m-0 mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#8A6A57]">
                            <CalendarDays size={13} className="shrink-0" /> Joined {joinedLabel}
                        </p>
                    )}
                </div>
            </div>

            {/* Sankalp: a Sevak's own target / the Captain's Group Sankalp + "Sevaks can edit" switch */}
            <SankalpSettingsCard user={user} />

            {/* Profile Incomplete nudge */}
            {isSevak && (!user.blood_group || !user.emergency_number || !user.emergency_contact_name || !user.occupation || !user.address) && (
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                    <div className="mt-0.5 text-blue-600 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-blue-900 mb-0.5">Please Complete Your Profile</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Filling in your Blood Group, Family Emergency Number (and whose it is), Occupation, and Address ensures we can assist you promptly during an incident, and is required for your Vihar Sevak Card.</p>
                    </div>
                </div>
            )}

            {/* Your Details */}
            <div className="bg-white rounded-[22px] p-5 sm:p-6 flex flex-col gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="m-0 text-sm font-bold text-[#241C17]">{isSevak ? 'Your Details' : 'Organization Details'}</p>

                {isSevak ? (
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

                        {/* Family Emergency Number + whose number it is */}
                        <div>
                            <label className={fieldLabelClass}>Family Emergency Contact Name</label>
                            <input
                                type="text"
                                maxLength={80}
                                value={editForm.emergency_contact_name}
                                onChange={e => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                                placeholder="Whose number? e.g. Father, Spouse, Brother"
                                className={fieldInputClass}
                            />
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Family Emergency Number</label>
                            <input
                                type="tel"
                                maxLength={10}
                                value={editForm.emergency_number}
                                onChange={e => setEditForm({ ...editForm, emergency_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                placeholder="10-digit family number"
                                className={fieldInputClass}
                            />
                        </div>

                        {/* Occupation / Profession (recommended) */}
                        <div>
                            <label className={fieldLabelClass}>Occupation / Profession <span className="ml-1 rounded-full bg-saffron-50 px-1.5 py-0.5 text-[9px] font-extrabold normal-case tracking-normal text-saffron-700">Recommended</span></label>
                            <select
                                value={editForm.occupation}
                                onChange={e => setEditForm({ ...editForm, occupation: e.target.value, occupation_details: e.target.value ? editForm.occupation_details : '' })}
                                className={fieldInputClass}
                            >
                                <option value="">Select occupation</option>
                                {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        {editForm.occupation && (
                            <div>
                                <label className={fieldLabelClass}>{editForm.occupation === 'Other' ? 'Specify Occupation' : 'Occupation Details (optional)'}</label>
                                <input
                                    type="text"
                                    maxLength={120}
                                    value={editForm.occupation_details}
                                    onChange={e => setEditForm({ ...editForm, occupation_details: e.target.value })}
                                    placeholder={editForm.occupation === 'Other' ? 'Enter occupation' : 'e.g. Textile trader, Software engineer'}
                                    className={fieldInputClass}
                                />
                            </div>
                        )}

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
                            <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">{orgName}</p>
                        </div>

                        {/* Captain — read-only */}
                        <div>
                            <label className={fieldLabelClass}>Captain</label>
                            <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">{myCaptain || '—'}</p>
                        </div>
                        {orgDetails?.vice_captain_name && (
                            <div>
                                <label className={fieldLabelClass}>Vice Captain</label>
                                <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">{orgDetails.vice_captain_name}</p>
                            </div>
                        )}
                    </div>
                ) : (
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

                        {/* Captain Name */}
                        <div>
                            <label className={fieldLabelClass}>Captain Name</label>
                            <input
                                type="text"
                                value={captainName}
                                onChange={e => setCaptainName(e.target.value)}
                                placeholder="Captain's full name"
                                className={fieldInputClass}
                            />
                        </div>

                        {/* Vice Captain Name */}
                        <div>
                            <label className={fieldLabelClass}>Vice Captain Name</label>
                            <input
                                type="text"
                                value={viceCaptainName}
                                onChange={e => setViceCaptainName(e.target.value)}
                                placeholder="Optional"
                                className={fieldInputClass}
                            />
                        </div>

                        {/* Vihar Seva Group — read-only */}
                        <div>
                            <label className={fieldLabelClass}>Vihar Seva Group</label>
                            <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">{orgName}</p>
                        </div>

                        {/* City / Town — read-only */}
                        <div>
                            <label className={fieldLabelClass}>City</label>
                            <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">
                                {orgDetails?.city || '—'}{orgDetails?.town ? `, ${orgDetails.town}` : ''}
                            </p>
                        </div>

                        {/* Vihar Year duration — read-only, current VY */}
                        <div className="sm:col-span-2">
                            <label className={fieldLabelClass}>Vihar Year Duration</label>
                            <p className="m-0 py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] font-semibold text-[#241C17] text-sm truncate">
                                {currentVY.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {' – '}
                                {currentVY.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                <span className="text-[#8A6A57] font-bold ml-1.5">({currentVY.label})</span>
                            </p>
                        </div>
                    </div>
                )}

                <button
                    onClick={isSevak ? handleSave : handleSaveOrgDetails}
                    disabled={isSaving || !hasChanges}
                    className={`w-full py-3.5 font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 mt-1 ${hasChanges ? 'bg-saffron-600 hover:bg-saffron-700 text-white shadow-sm active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} ${isSaving ? 'opacity-60' : ''}`}
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

                {pushPermission === 'denied' && !isNativePlatform() ? (
                    // Web only — once a browser blocks a site's notification permission,
                    // no in-app button can undo that, unlike native (see below).
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium text-red-900 text-sm">Notifications are blocked in your browser</p>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                Your browser is blocking notifications for {BRAND.name}, so nothing inside the app can turn them back on.
                                In Chrome: tap the <strong>lock / info icon</strong> next to the address bar → <strong>Permissions</strong> (or Site settings) →
                                set <strong>Notifications</strong> to <strong>Allow</strong> → then reload the app.
                            </p>
                        </div>
                    </div>
                ) : pushPermission === 'unsupported' ? (
                    <div className="p-4 rounded-2xl text-xs text-[#8A6A57]" style={{ background: '#F7F4F0' }}>
                        Push notifications aren't available on this device.
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

            {/* Safety: a visible way to report a child-safety / safety concern */}
            <a
                href="/child-safety"
                className="flex items-center justify-between gap-3 rounded-[22px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            >
                <span>
                    <span className="block text-sm font-bold text-[#241C17]">Report a safety concern</span>
                    <span className="block text-xs text-[#8A6A57]">Child safety standards and how to reach us</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-[#8A6A57]" />
            </a>

            {/* Captains choose their own password (Sevaks' passwords are managed by their Captain) */}
            {user.role === UserRole.ORG_ADMIN && <ChangePasswordCard />}

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

            {/* Avatar Crop Modal */}
            {cropFile && (
                <AvatarCropModal
                    file={cropFile}
                    onCancel={() => setCropFile(null)}
                    onConfirm={handleCropConfirm}
                />
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
