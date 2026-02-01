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
            // Updated Flow: Submit Request to 'registration_requests' table
            const { error } = await supabase
                .from('registration_requests')
                .insert({
                    org_name: formData.orgName,
                    city: formData.city,
                    full_name: formData.fullName,
                    mobile: formData.mobile,
                    email: formData.email,
                    password: formData.password // Storing temporarily for approval process
                });

            if (error) throw error;

            setIsSuccess(true);
            showToast("Request submitted successfully!", 'success');

        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Request failed.", 'error');
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        const uniqueId = `REQ-${Date.now().toString().slice(-4)}`;
        const waMessage = `Jai Jinendra! I have submitted a vSeva organization request.\n\nOrg: ${formData.orgName}\nName: ${formData.fullName}\nCity: ${formData.city}\nMobile: ${formData.mobile}\n\nPlease review and approve.`;
        const waLink = `https://wa.me/919594503214?text=${encodeURIComponent(waMessage)}`;

        return (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300 py-8 px-4">
                <div className="w-20 h-20 bg-saffron-100 text-saffron-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-saffron-100">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-serif font-bold text-gray-800">Request Submitted!</h2>
                    <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
                        Thank you for registering <strong>{formData.orgName}</strong>. <br />
                        We verify every organization manually to ensure authenticity.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 max-w-sm mx-auto">
                        <p className="text-sm text-blue-800 font-medium">
                            Please allow 24-48 hours for review. Since this is a manual process, you can speed it up by chatting with us.
                        </p>
                    </div>
                </div>

                <div className="space-y-3 max-w-sm mx-auto pt-4">
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                        Approve via WhatsApp
                    </a>

                    <button
                        onClick={onSuccess}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-medium transition-colors border border-gray-200"
                    >
                        Back to Login
                    </button>
                </div>
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
