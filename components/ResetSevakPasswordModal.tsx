import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { dataService } from '../services/dataService';

interface ResetSevakPasswordModalProps {
    open: boolean;
    sevakId: string | null;
    sevakName: string;
    onClose: () => void;
    // Called after the password (and contact number) were changed.
    onDone: (newMobile: string) => void;
}

// A Sevak's password IS their mobile number. So resetting it means the Captain enters the Sevak's
// new mobile number: it becomes both their contact number and their new password (done through the
// same Captain-only path as editing a Sevak's number).
const ResetSevakPasswordModal: React.FC<ResetSevakPasswordModalProps> = ({ open, sevakId, sevakName, onClose, onDone }) => {
    const [mobile, setMobile] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { if (open) { setMobile(''); setError(null); setBusy(false); } }, [open, sevakId]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sevakId) return;
        if (!/^[0-9]{10}$/.test(mobile)) { setError('Enter a 10-digit mobile number.'); return; }
        setBusy(true);
        setError(null);
        try {
            await dataService.updateSevakDetails(sevakId, { mobile });
            onDone(mobile);
        } catch (err: any) {
            setError(err?.message || 'Could not reset the password.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={open} onClose={() => !busy && onClose()} maxWidth="max-w-sm" closeOnBackdrop={!busy}>
            <form onSubmit={submit} className="p-6">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <KeyRound size={26} />
                </div>
                <h3 className="text-center text-lg font-extrabold text-[#241C17]">Reset password</h3>
                <p className="mt-1 text-center text-sm text-[#8A6A57]">
                    Set <strong className="text-[#241C17]">{sevakName}</strong>'s new mobile number. It becomes their contact number
                    and their new password.
                </p>

                <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-[#8A6A57]" htmlFor="reset-mobile">New mobile number</label>
                <input
                    id="reset-mobile"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                    className="mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 text-[15px] font-semibold tracking-wide text-gray-900 outline-none transition focus:border-saffron-400 focus:bg-white focus:ring-4 focus:ring-saffron-100"
                />
                {error && <p role="alert" className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}

                <div className="mt-5 flex gap-3">
                    <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-[#241C17] disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-saffron-600 py-3 text-sm font-bold text-white hover:bg-saffron-700 disabled:opacity-60">
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        Reset password
                    </button>
                </div>
                <p className="mt-3 text-center text-xs text-[#8A6A57]">Tell the Sevak to sign in with this new number.</p>
            </form>
        </Modal>
    );
};

export default ResetSevakPasswordModal;
