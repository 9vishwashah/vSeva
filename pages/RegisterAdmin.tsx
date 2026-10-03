import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BRAND } from '@brand';

interface RegisterAdminProps {
    onBack: () => void;
    onSuccess: () => void;
}

const RegisterAdmin: React.FC<RegisterAdminProps> = ({ onBack, onSuccess }) => {
    const [formData, setFormData] = useState({
        captainName: '',
        viceCaptainName: '',
        mobile: '',
        email: '',
        address: '',
        city: '',
        town: '',
        pincode: '',
        state: 'Maharashtra',
        viharGroupName: 'Vihar Seva Group',
        sanghName: ''
    });
    const [pinLoading, setPinLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { showToast } = useToast();

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Handle Pincode Auto-fill
        if (name === 'pincode' && value.length === 6) {
            handlePinLookup(value);
        }
    };

    const handlePinLookup = async (pin: string) => {
        setPinLoading(true);
        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
            const data = await response.json();

            if (data[0].Status === 'Success') {
                const details = data[0].PostOffice[0];
                setFormData(prev => ({
                    ...prev,
                    city: details.District,
                    town: details.Name,
                    state: details.State
                }));
                showToast(`Location Loaded: ${details.Name}`, 'info');
            }
        } catch (err) {
            console.warn("PIN lookup failed:", err);
        } finally {
            setPinLoading(false);
        }
    };

    // Brands that don't ask for a group name use "<Brand>, <Town>" (e.g. "Shraman Seva Group, Vashi").
    // The app shows an organisation as "<name>, <city>", so exports and headers read
    // "Shraman Seva Group, Vashi, Navi Mumbai".
    const resolveGroupName = () =>
        BRAND.registration.askGroupName
            ? (formData.viharGroupName.trim() === '' ? 'Vihar Seva Group' : formData.viharGroupName.trim())
            : [BRAND.name, formData.town.trim()].filter(Boolean).join(', ');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const finalViharGroupName = resolveGroupName();

        try {
            // Updated Flow: Submit Request to 'registration_requests' table
            const { error } = await supabase
                .from('registration_requests')
                .insert({
                    captain_name: formData.captainName,
                    vice_captain_name: formData.viceCaptainName,
                    mobile: formData.mobile,
                    email: formData.email,
                    full_address: formData.address,
                    city: formData.city,
                    town: formData.town,
                    pin_code: formData.pincode,
                    state: formData.state,
                    vihar_group_name: finalViharGroupName,
                    sangh_name: formData.sanghName,
                    password: formData.mobile, // Setting Mobile Number as Password per requirement
                    // Only branded deployments tag the request (vSeva rows keep brand NULL).
                    ...(BRAND.dbBrand ? { brand: BRAND.dbBrand } : {})
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
        const finalViharGroupName = resolveGroupName();
        const waMessage =
`I have submitted a ${BRAND.name} Captain account request.

Captain: ${formData.captainName}
Mobile: ${formData.mobile}
Group: ${finalViharGroupName}
City: ${formData.city}
State: ${formData.state}

Kindly review and Approve.`;
        const waLink = `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(waMessage)}`;

        return (
            <div className="text-center space-y-5 animate-in fade-in zoom-in duration-300 py-4">
                <div className="w-20 h-20 bg-saffron-100 text-saffron-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-saffron-100">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-serif font-bold text-gray-800">Request Submitted!</h2>
                    <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
                        Thank you for registering <strong>{finalViharGroupName}</strong>. <br />
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

    const inputCls = 'h-11 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-saffron-400 focus:bg-white focus:ring-4 focus:ring-saffron-100';
    const field = (label: React.ReactNode, input: React.ReactNode, wide = false) => (
        <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
            {input}
        </label>
    );

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-4 flex items-center gap-3">
                <button type="button" onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-saffron-600">
                    <ArrowLeft size={20} />
                </button>
                <img src={BRAND.logo} alt={BRAND.name} className="h-9 w-9 shrink-0 object-contain" />
                <div className="min-w-0">
                    <h2 className="text-xl font-serif font-bold leading-tight text-gray-900 sm:text-2xl">Create Captain Account</h2>
                    <p className="text-xs text-gray-500">Your request is reviewed by our team before the account is created.</p>
                </div>
            </div>

            <form onSubmit={handleRegister}>
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    {field('Captain Name',
                        <input name="captainName" type="text" required className={inputCls} placeholder="Vijay Mehta" value={formData.captainName} onChange={handleChange} />)}
                    {field('Vice Captain Name (Optional)',
                        <input name="viceCaptainName" type="text" className={inputCls} value={formData.viceCaptainName} onChange={handleChange} />)}
                    {field('Captain Mobile Number',
                        <input name="mobile" type="tel" inputMode="numeric" required pattern="[0-9]{10}" className={inputCls} placeholder={BRAND.examples.mobile} value={formData.mobile} onChange={handleChange} />)}
                    {field('Captain Email ID',
                        <input name="email" type="email" required className={inputCls} placeholder="youremail@gmail.com" value={formData.email} onChange={handleChange} />)}
                    {field('Full Address',
                        <input name="address" type="text" required className={inputCls} placeholder="Full Address" value={formData.address} onChange={handleChange} />, true)}
                    {field(
                        <span className="flex items-center justify-between">Pin Code {pinLoading && <Loader2 size={12} className="animate-spin text-saffron-600" />}</span>,
                        <input name="pincode" type="text" inputMode="numeric" required maxLength={6} className={`${inputCls} ${pinLoading ? 'animate-pulse' : ''}`} placeholder="6 Digit PIN" value={formData.pincode} onChange={handleChange} />)}
                    {field('State',
                        <input name="state" type="text" required className={inputCls} placeholder="Maharashtra" value={formData.state} onChange={handleChange} />)}
                    {field('City',
                        <input name="city" type="text" required className={inputCls} placeholder="City" value={formData.city} onChange={handleChange} />)}
                    {field('Town / Area',
                        <input name="town" type="text" required className={inputCls} placeholder="Town/Area Name" value={formData.town} onChange={handleChange} />)}
                    {BRAND.registration.askSanghName && field('Sangh Name',
                        <input name="sanghName" type="text" required className={inputCls} placeholder="Sangh Name" value={formData.sanghName} onChange={handleChange} />)}
                    {BRAND.registration.askGroupName && field(
                        <>Vihar Group Name <span className="font-normal text-gray-400">(optional)</span></>,
                        <input name="viharGroupName" type="text" className={inputCls} placeholder="Vihar Seva Group" value={formData.viharGroupName} onChange={handleChange} />)}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-base font-semibold text-white shadow-lg shadow-saffron-300/50 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Captain Account'}
                </button>
            </form>
        </div>
    );
};

export default RegisterAdmin;
