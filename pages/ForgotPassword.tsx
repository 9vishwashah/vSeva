import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BRAND } from '@brand';

interface ForgotPasswordProps {
    onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMessage(null);

        try {
            const input = emailOrUsername.trim();
            const lower = input.toLowerCase();
            // A Sevak types their username (e.g. "rameshshah"); older accounts are stored with an
            // internal "@vsevak" / "@vsevak.in" tail. Anything else containing "@" is a Captain's email.
            const hasSevakTail = /@vsevak(\.in)?$/.test(lower);
            const isCaptainEmail = lower.includes('@') && !hasSevakTail;

            if (!isCaptainEmail) {
                // Sevak Flow: notify the Captain(s) of the Sevak's group via RPC. The stored username
                // may or may not carry the internal tail, so try each form until one matches.
                const bare = lower.replace(/@vsevak(\.in)?$/, '').replace(/[^a-z0-9]/g, '');
                const candidates = Array.from(new Set([bare, `${bare}@vsevak.in`, `${bare}@vsevak`, input]));
                let found = false;
                for (const candidate of candidates) {
                    const { data, error } = await supabase.rpc('request_sevak_reset', { username_input: candidate });
                    if (error) throw error;
                    // rpc returns { success: boolean, message?: string }
                    if (!data || data.success !== false) { found = true; break; }
                }
                if (!found) {
                    throw new Error('No Sevak account found with that username. Check the spelling, or ask your Captain.');
                }

                setSuccessMessage(`We have notified your Captain. Your Captain will reset your password for you — remember it is your mobile number, so tell them if your number has changed.`);
            } else {
                // Captain Flow: Standard Supabase Reset
                // Validate it's an email
                if (!input.includes("@")) {
                    throw new Error("Please enter a valid email address for Captain accounts.");
                }

                const { error } = await supabase.auth.resetPasswordForEmail(input, {
                    redirectTo: `${window.location.origin}/update-password`, // pages/UpdatePassword.tsx
                });

                if (error) throw error;

                setSuccessMessage(`Password reset link has been sent to ${input}. Please check your inbox.`);
            }

        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Request failed.", 'error');
        } finally {
            setLoading(false);
        }
    };

    if (successMessage) {
        return (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300 py-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <div>
                    <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">Request Sent</h2>
                    <p className="text-gray-600 max-w-sm mx-auto">
                        {successMessage}
                    </p>
                </div>

                <button
                    onClick={onBack}
                    className="w-full bg-saffron-600 hover:bg-saffron-700 text-white py-3 rounded-lg font-medium transition-colors border border-transparent"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-4">
                <button onClick={onBack} className="text-gray-500 hover:text-saffron-600 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <img src={BRAND.logo} alt={BRAND.name} className="h-8 w-8 object-contain" />
                <h2 className="text-2xl font-serif font-bold text-gray-800">Forgot Password</h2>
            </div>

            <p className="text-gray-600 text-sm">
                <strong>Sevaks:</strong> enter your username — your Captain is notified and resets your password (it is your mobile number, so mention it if your number has changed).<br />
                <strong>Captains:</strong> enter your email to get a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                    <input
                        type="text"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                        placeholder={BRAND.usernameHint}
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-saffron-600 hover:bg-saffron-700 text-white py-3 rounded-lg font-medium transition-colors flex justify-center items-center mt-4"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Reset Password"}
                </button>
            </form>
        </div>
    );
};

export default ForgotPassword;
