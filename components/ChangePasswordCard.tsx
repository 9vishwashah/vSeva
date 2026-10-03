import React, { useState } from 'react';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useToast } from '../context/ToastContext';

export const MIN_PASSWORD_LENGTH = 8;

const inputClass = 'w-full py-2.5 px-3.5 rounded-xl bg-[#F7F4F0] border-none outline-none focus:ring-2 focus:ring-saffron-300 font-semibold text-[#241C17] text-sm';
const labelClass = 'text-[11px] font-bold text-[#8A6A57] uppercase tracking-wider block mb-1.5';

// Captain-only (the caller decides who sees it — see ProfileSection). Asks for the current
// password first, so a Captain account left signed in on a shared phone can't be taken over.
const ChangePasswordCard: React.FC = () => {
    const { showToast } = useToast();
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(null); setShow(false); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (next.length < MIN_PASSWORD_LENGTH) return setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        if (next !== confirm) return setError('New password and confirmation do not match.');
        if (next === current) return setError('New password must be different from the current one.');

        setBusy(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('Please sign in again.');

            // Re-check the current password before allowing a change.
            const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
            if (authError) throw new Error('Current password is incorrect.');

            const { error: updateError } = await supabase.auth.updateUser({ password: next });
            if (updateError) throw updateError;

            showToast('Password changed', 'success');
            reset();
            setOpen(false);
        } catch (err: any) {
            setError(err?.message || 'Could not change the password.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <button
                type="button"
                onClick={() => { setOpen(o => !o); if (open) reset(); }}
                className="w-full flex items-center justify-between gap-3 text-left"
                aria-expanded={open}
            >
                <span className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFF0E5' }}>
                        <KeyRound size={18} style={{ color: '#DE6B38' }} />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-bold text-[#241C17] text-sm">Change password</span>
                        <span className="block text-xs text-[#8A6A57] mt-0.5">Choose your own password instead of your mobile number</span>
                    </span>
                </span>
                <span className="text-sm font-bold text-saffron-700 shrink-0">{open ? 'Cancel' : 'Change'}</span>
            </button>

            {open && (
                <form onSubmit={submit} className="mt-4 space-y-3">
                    <div>
                        <label className={labelClass} htmlFor="cp-current">Current password</label>
                        <input id="cp-current" type={show ? 'text' : 'password'} autoComplete="current-password" required className={inputClass} value={current} onChange={e => setCurrent(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="cp-new">New password</label>
                        <input id="cp-new" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} className={inputClass} value={next} onChange={e => setNext(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass} htmlFor="cp-confirm">Confirm new password</label>
                        <input id="cp-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required className={inputClass} value={confirm} onChange={e => setConfirm(e.target.value)} />
                    </div>
                    <button type="button" onClick={() => setShow(s => !s)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A6A57]">
                        {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide passwords' : 'Show passwords'}
                    </button>
                    {error && <p role="alert" className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-saffron-600 text-white font-bold text-sm disabled:opacity-60"
                    >
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        Save new password
                    </button>
                </form>
            )}
        </div>
    );
};

export default ChangePasswordCard;
