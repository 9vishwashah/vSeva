import React, { useState, useEffect } from 'react';
import {
    MapPin, Users, Shield, BarChart3,
    CheckCircle2, Sparkles, UserCheck,
    Lock, Activity, FileText, Download, Menu, X, Instagram, LogIn
} from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';
import vashiImg from '../assets/vashi.png';
import { InstallPWA } from '../components/InstallPWA';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMobileMenuOpen(false);
    };

    const NavLink = ({ to, label }: { to: string, label: string }) => (
        <button
            onClick={() => scrollToSection(to)}
            className="text-slate-600 hover:text-saffron-600 font-medium transition-colors"
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">

            {/* HEADER */}
            <header
                className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-2' : 'bg-transparent py-4'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                            <img src={vSevaLogo} alt="vSeva" className="h-10 w-10 object-contain" />
                            <span className="font-serif font-bold text-xl text-slate-800">vSeva</span>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8">
                            <NavLink to="about" label="About" />
                            <NavLink to="features" label="Features" />
                            <NavLink to="how-it-works" label="How it Works" />
                            <NavLink to="nearby-derasar" label="Nearby Derasar" />
                            <button
                                onClick={onGetStarted}
                                className="px-6 py-2 bg-saffron-600 hover:bg-saffron-700 text-white rounded-full font-bold shadow-md transition-all hover:-translate-y-0.5"
                            >
                                Login
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-slate-600"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-lg py-4 px-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
                        <NavLink to="about" label="About" />
                        <NavLink to="features" label="Features" />
                        <NavLink to="how-it-works" label="How it Works" />
                        <NavLink to="nearby-derasar" label="Nearby Derasar" />
                        <button
                            onClick={onGetStarted}
                            className="w-full py-3 bg-saffron-600 text-white rounded-lg font-bold"
                        >
                            Login
                        </button>
                    </div>
                )}
            </header>

            {/* 1️⃣ HERO SECTION */}
            <div className="relative overflow-hidden bg-white pt-16">
                {/* Abstract Background */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-saffron-50 to-transparent pointer-events-none"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-saffron-100/50 rounded-full blur-3xl opacity-60"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Logo: only vSeva */}
                        <div className="flex justify-center mb-8">
                            <div className="flex items-center gap-4 animate-fade-in-up">
                                <div className="bg-saffron-50 rounded-2xl shadow-sm border border-saffron-100 overflow-hidden">
                                    <img src={vSevaLogo} alt="vSeva" className="h-24 w-24 md:h-28 md:w-28 object-cover" />
                                </div>
                            </div>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-serif font-bold text-saffron-600 mb-6 leading-tight">
                            vSeva
                        </h1>

                        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                            A modern platform to record, manage, and honor Jain Vihar Seva activities.
                            Bridging tradition with technology.
                        </p>

                        <div className="flex flex-col gap-3 justify-center items-center w-full max-w-xs mx-auto">
                            {/* Primary: Install App */}
                            <button
                                onClick={() => {
                                    // Scroll to bottom or trigger install banner click
                                    const banner = document.getElementById('pwa-install-btn');
                                    if (banner) banner.click();
                                    else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                }}
                                className="px-8 py-4 bg-saffron-600 hover:bg-saffron-700 text-white rounded-full font-bold text-lg shadow-lg shadow-saffron-200 hover:shadow-xl transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 w-full justify-center"
                            >
                                <Download size={20} />
                                Install App
                            </button>
                            {/* Secondary: Login */}
                            <button
                                onClick={onGetStarted}
                                className="px-8 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-medium text-base shadow-sm transition-all duration-300 flex items-center gap-2 w-full justify-center hover:-translate-y-0.5"
                            >
                                <LogIn size={18} />
                                Login to vSeva
                            </button>
                        </div>

                        {/* Minimal Illustration: Footsteps/Path */}
                        <div className="mt-20 flex justify-center opacity-20">
                            <svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 30 Q 50 10, 80 30 T 140 30 T 200 30" stroke="#EA580C" strokeWidth="2" strokeDasharray="8 8" />
                                <circle cx="20" cy="30" r="4" fill="#EA580C" />
                                <circle cx="80" cy="30" r="4" fill="#EA580C" />
                                <circle cx="140" cy="30" r="4" fill="#EA580C" />
                                <circle cx="200" cy="30" r="4" fill="#EA580C" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2️⃣ WHAT IS vSeva? */}
            <div id="about" className="py-20 bg-white border-y border-slate-100 scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-saffron-600 font-bold tracking-wider text-sm uppercase">About the Platform</span>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mt-2">What is vSeva?</h2>
                        <p className="text-lg text-slate-600 mt-4 max-w-3xl mx-auto">
                            vSeva is a centralized platform designed for Jain organizations to digitally log Vihar journeys,
                            assign sevaks, track distances, analyze participation, and generate meaningful reports —
                            all while maintaining spiritual discipline and transparency.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: "Vihar Entry Logging", desc: "Digital records of daily vihar journeys." },
                            { title: "Sevak Assignment", desc: "Organized allocation of seva duties." },
                            { title: "Distance & Route Tracking", desc: "Precise km tracking for every vihar." },
                            { title: "Sadhu / Sadhvi Count", desc: "Keep accurate count of Gurubhagwants." },
                            { title: "Analytics & Rankings", desc: "Motivate sevaks with performance insights." },
                            { title: "Secure Access", desc: "Organization-based data isolation." }
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="mt-1">
                                    <CheckCircle2 className="text-saffron-500" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{item.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3️⃣ FEATURES SECTION */}
            <div id="features" className="py-24 bg-slate-50 scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900">Platform Features</h2>
                        <p className="text-slate-500 mt-2">Everything you need to manage Vihar Seva effectively</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: MapPin, title: "Vihar Tracking", desc: "Log daily vihars with date, route, and distance." },
                            { icon: Users, title: "Sevak Management", desc: "Add, assign, and manage sevaks per organization." },
                            { icon: Activity, title: "Analytics Dashboard", desc: "Total Km, Vihars, Streaks, Synergy & Rankings." },
                            { icon: FileText, title: "Reports & Exports", desc: "Download CSV / PDF reports instantly." },
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                                <div className="w-12 h-12 bg-saffron-50 rounded-lg flex items-center justify-center text-saffron-600 mb-6">
                                    <feature.icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4️⃣ HOW IT WORKS */}
            <div id="how-it-works" className="py-24 bg-white overflow-hidden scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900">How vSeva Works</h2>
                    </div>

                    <div className="relative">
                        {/* Line */}
                        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
                            {[
                                { step: 1, title: "Org Setup", desc: "Admin logs in & creates organization" },
                                { step: 2, title: "Add Sevaks", desc: "Sevaks are added securely" },
                                { step: 3, title: "Log Vihar", desc: "Vihar entries are logged daily" },
                                { step: 4, title: "Analysis", desc: "System calculates stats & rankings" },
                                { step: 5, title: "Reports", desc: "Reports and insights generated" },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-saffron-600 text-white flex items-center justify-center font-bold text-lg border-4 border-white shadow-lg mb-4">
                                        {item.step}
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                                    <p className="text-sm text-slate-500 max-w-[150px]">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 5️⃣ WHO IS IT FOR? */}
            <div className="py-24 bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        {/* Organizations */}
                        <div className="space-y-6">
                            <div className="inline-block p-3 rounded-lg bg-white/10 text-saffron-300">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-3xl font-serif font-bold">For Organizations</h3>
                            <ul className="space-y-4 text-slate-300">
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-saffron-400"></div> Jain Sanghs
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-saffron-400"></div> Vihar Committees
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-saffron-400"></div> Trusts & Mandals
                                </li>
                            </ul>
                        </div>

                        {/* Sevaks */}
                        <div className="space-y-6 md:border-l md:border-white/10 md:pl-16">
                            <div className="inline-block p-3 rounded-lg bg-white/10 text-saffron-300">
                                <UserCheck size={32} />
                            </div>
                            <h3 className="text-3xl font-serif font-bold">For Sevaks</h3>
                            <ul className="space-y-4 text-slate-300">
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-saffron-400"></div> Daily Vihar Sevaks
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-saffron-400"></div> Route Coordinators
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-saffron-400"></div> Record Keepers
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>

            {/* 6️⃣ SECURITY & TRUST */}
            <div className="py-16 bg-white border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="flex justify-center text-saffron-600 mb-4"><Lock size={32} /></div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Built with Trust & Security</h2>
                    <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600 font-medium">
                        <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Secure Authentication</span>
                        <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Org-Isolated Data</span>
                        <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Role-Based Permissions</span>
                        <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Audit-Friendly</span>
                    </div>
                </div>
            </div>

            {/* 7️⃣ NEARBY DERASAR SECTION */}
            <div id="nearby-derasar" className="py-24 bg-white scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

                        {/* Left: Info */}
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 text-saffron-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-orange-50 border border-orange-200">
                                <MapPin size={14} />
                                Free for Everyone · No Login Needed
                            </div>
                            <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 leading-tight">
                                Find Nearby<br />Jain Derasar
                            </h2>
                            <p className="text-slate-600 text-lg leading-relaxed">
                                Instantly discover Jain temples and Tirths near your location — with GPS-powered directions, contact info, and a search range up to 100 KM.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    'GPS-powered live location detection',
                                    'One-tap Google Maps directions',
                                    'Phone numbers where available',
                                    'Share temple info via WhatsApp',
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-3 text-slate-600">
                                        <CheckCircle2 size={18} className="text-saffron-500 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <a
                                href="/nearby-derasar"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-saffron-600 hover:bg-saffron-700 text-white rounded-full font-bold text-lg shadow-lg shadow-saffron-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <MapPin size={20} />
                                Find Derasar Near Me
                            </a>
                        </div>

                        {/* Right: Visual Card */}
                        <div className="relative flex justify-center">
                            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
                                {/* Card header */}
                                <div className="bg-gradient-to-br from-orange-500 to-amber-400 p-6 text-white relative overflow-hidden">
                                    <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin size={20} className="text-white" />
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-80">Nearby Derasar</span>
                                        </div>
                                        <p className="text-white/80 text-sm">Your location detected · 3 Derasars Found</p>
                                    </div>
                                </div>
                                {/* Mock results */}
                                <div className="p-4 space-y-3">
                                    {[
                                        { name: 'Shri Mahavir Swami Derasar', dist: '0.8 km', area: 'Nearby' },
                                        { name: 'Jain Mandir, Sector 17', dist: '2.3 km', area: '2 km' },
                                        { name: 'Shantinath Derasar', dist: '4.7 km', area: '5 km' },
                                    ].map((t, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex-1 min-w-0 mr-2">
                                                <p className="text-sm font-bold text-slate-800 truncate">{t.name}</p>
                                                <p className="text-xs text-slate-400">{t.area}</p>
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-full whitespace-nowrap flex-shrink-0">{t.dist}</span>
                                        </div>
                                    ))}
                                    <a href="/nearby-derasar" className="block w-full text-center py-3 bg-saffron-600 text-white rounded-xl font-bold text-sm hover:bg-saffron-700 transition-colors mt-2">
                                        Open Full Finder →
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* 8️⃣ FINAL CTA */}
            <div className="py-24 bg-gradient-to-br from-saffron-50 to-orange-50">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-8">
                        Create Your Organization
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href={`https://wa.me/919594503214?text=${encodeURIComponent('प्रेरणादाता: प. पु. महाबोधि सुरीश्वरजी महाराजा vSeva Team! 🙏\n\nWe would like to register our Jain organization on the vSeva platform to start logging our daily Vihars.\n\nOrganization Name: \nContact Person: \nCity: \n\nPlease guide us with the next steps.\n\nThank You.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full font-bold text-lg shadow-xl shadow-green-200 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Contact Us on WhatsApp
                        </a>
                    </div>
                </div>
            </div>

            {/* 🌟 FIRST CLIENT — SLIDING CARDS SECTION */}
            <div className="py-20 relative overflow-hidden" style={{ background: '#fdf4e7' }}>
                {/* Subtle blobs */}
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(251,191,36,0.15)' }} />
                <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(234,88,12,0.08)' }} />

                <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col items-center">
                    {/* Label pill */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 text-saffron-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-2"
                            style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.2)' }}>
                            <Sparkles size={13} />
                            Our First Vihar Organization
                        </div>
                        <p className="text-slate-500 text-sm mt-2">Proudly serving and growing together</p>
                    </div>

                    {/* Sliding card track - changed to a single centered vertical card layout */}
                    <div className="w-full max-w-md pb-4 pt-2">
                        <div className="w-full flex-shrink-0 transition-transform hover:-translate-y-2 duration-500" style={{
                            background: '#ffffff',
                            borderRadius: '28px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                            border: '1px solid rgba(234,88,12,0.12)',
                        }}>
                            <div className="flex flex-col gap-0 overflow-hidden rounded-[28px]">
                                
                                {/* TOP: Navi Mumbai Map Image */}
                                <div className="w-full h-[280px] flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6 relative overflow-hidden">
                                    {/* Map decorative grid */}
                                    <div className="absolute inset-0 opacity-[0.07]" style={{
                                        backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                                        backgroundSize: '20px 20px'
                                    }} />
                                    <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
                                        <p className="text-center text-[10px] text-white/50 uppercase tracking-widest mb-5 font-bold">Navi Mumbai</p>
                                        <div className="flex-1 w-full flex items-center justify-center h-full">
                                            <img src={vashiImg} alt="Vashi Map" className="w-full h-full max-h-[160px] max-w-[200px] object-contain drop-shadow-2xl" />
                                        </div>
                                        <div className="mt-4 flex items-center justify-center gap-2">
                                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: '#ea580c' }}></div>
                                            <span className="text-[10px] text-white/70 font-medium">Vashi, Navi Mumbai</span>
                                        </div>
                                    </div>
                                </div>

                                {/* BOTTOM: Info */}
                                <div className="p-8 flex flex-col bg-white">
                                    <div>
                                        <p style={{ color: '#EA580C' }} className="text-xs font-bold uppercase tracking-widest mb-3">With Deepest Gratitude</p>
                                        <h3 className="text-slate-900 text-2xl font-serif font-bold mb-3 leading-snug">
                                            Navi Mumbai Vihar<br />Seva Group, Vashi
                                        </h3>
                                        <p className="text-slate-500 text-sm leading-relaxed">
                                            Thank you for trusting vSeva as your digital Vihar Seva partner — and for being our very first! 🧡
                                        </p>
                                    </div>

                                    {/* Managed by */}
                                    <div className="mt-8" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                        <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Managed by</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['Vijay Mehta', 'Rakhi Jain', 'Namya Mehta'].map((name) => (
                                                <span key={name} style={{
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                }} className="px-4 py-1.5 text-slate-700 text-sm font-medium rounded-full">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="mt-8 text-sm italic text-center w-full" style={{ color: 'rgba(120,80,20,0.6)' }}>
                        "Every great journey begins with one step — and one organization."
                    </p>
                </div>
            </div>



            {/* 9️⃣ SOCIAL FOLLOW */}
            <div className="py-12 bg-white text-center border-t border-slate-100">
                <p className="text-gray-400 mb-4">Join our community for user guides and updates</p>
                <a
                    href="https://instagram.com/the.vseva"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-tr from-purple-600 to-pink-600 text-white rounded-full font-bold shadow-lg hover:shadow-pink-500/30 transition-all hover:-translate-y-1"
                >
                    <Instagram size={20} className="stroke-2" />
                    Follow @the.vseva
                </a>
            </div>

            {/* 9️⃣ FOOTER */}
            <footer className="bg-white py-8 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 opacity-80">
                        <img src={vSevaLogo} alt="vSeva" className="h-6 w-6 object-contain grayscale" />
                        <span className="font-serif font-bold text-slate-700">vSeva</span>
                    </div>
                    <p className="text-slate-400 text-sm">Built with devotion & technology</p>
                    <div className="text-right">
                        <p className="text-slate-400 text-sm">Copyright 2026 VJAS – All Rights Reserved</p>
                        <p className="text-slate-500 text-xs mt-1">vSeva by VJAS</p>
                    </div>
                </div>
            </footer>

            <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>

            {/* Persistent sticky install banner (Android + iOS) */}
            <InstallPWA />
        </div>
    );
};

export default LandingPage;
