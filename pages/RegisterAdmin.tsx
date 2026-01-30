import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import vSevaLogo from '../assets/vseva-logo.png';

interface RegisterAdminProps {
    onBack: () => void;
    onSuccess: () => void;
}

const RegisterAdmin: React.FC<RegisterAdminProps> = ({ onBack, onSuccess }) => {
    const [formData, setFormData] = useState({
        orgName: '',
        city: '',
        fullName: '',
        email: '',
        password: '',
        mobile: ''
    });
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { showToast } = useToast();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: window.location.origin, // redirects back to this app
                    data: {
                        full_name: formData.fullName,
                        mobile: formData.mobile,
                        org_name: formData.orgName,
                        city: formData.city,
                        role: 'admin' // Explicitly asking for admin role, trusted by Trigger
                    }
                }
            });

            if (error) throw error;

            setIsSuccess(true);
            showToast("Registration successful!", 'success');

        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Registration failed.", 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300 py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <div>
                    <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">Registration Successful!</h2>
                    <p className="text-gray-600 max-w-sm mx-auto">
                        Your organization <strong>{formData.orgName}</strong> has been created.
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                        You can now login with your credentials.
                    </p>
                </div>

                <button
                    onClick={onSuccess}
                    className="w-full bg-saffron-600 hover:bg-saffron-700 text-white py-3 rounded-lg font-medium transition-colors border border-transparent"
                >
                    Proceed to Login
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
                <img src={vSevaLogo} alt="vSeva" className="h-8 w-8 object-contain" />
                <h2 className="text-2xl font-serif font-bold text-gray-800">Create Admin Account</h2>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                        <input
                            name="orgName"
                            type="text"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                            placeholder="e.g. Jain Sangh Vashi"
                            value={formData.orgName}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                            name="city"
                            type="text"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                            placeholder="e.g. Mumbai"
                            value={formData.city}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                        <input
                            name="mobile"
                            type="tel"
                            required
                            pattern="[0-9]{10}"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                            placeholder="9876543210"
                            value={formData.mobile}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                            name="fullName"
                            type="text"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                            placeholder="e.g. Rahul Shah"
                            value={formData.fullName}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                            placeholder="admin@sangh.com"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-saffron-600 hover:bg-saffron-700 text-white py-3 rounded-lg font-medium transition-colors flex justify-center items-center mt-4"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Organization"}
                </button>
            </form>
        </div>
    );
};

export default RegisterAdmin;
