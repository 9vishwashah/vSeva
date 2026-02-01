import React, { useState, useEffect } from 'react';
import {
    MapPin, Users, TrendingUp, Bell, Shield, BarChart3,
    ArrowRight, CheckCircle2, Sparkles, BookOpen, UserCheck,
    Lock, Activity, FileText, Download, Menu, X, Smartphone, Instagram
} from 'lucide-react';
import vSevaLogo from '../assets/vseva-logo.png';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const { install, isInstallable } = usePWAInstall();
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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

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
                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <div className="p-4 bg-saffron-50 rounded-3xl shadow-sm border border-saffron-100 animate-fade-in-up">
                                <img src={vSevaLogo} alt="vSeva" className="h-40 w-40 object-contain" />
                            </div>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 mb-6 leading-tight">
                            Digitizing Vihar Seva<br className="hidden md:block" />
                            <span className="block mt-2 text-3xl md:text-4xl font-light text-slate-600 italic">
                                "Your Steps. Your Seva. Your Legacy."
                            </span>
                        </h1>

                        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                            A modern platform to record, manage, and honor Jain Vihar Seva activities.
                            Bridging tradition with technology.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={onGetStarted}
                                className="px-8 py-4 bg-saffron-600 hover:bg-saffron-700 text-white rounded-full font-medium text-lg shadow-lg shadow-saffron-200 hover:shadow-xl transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 w-full sm:w-auto justify-center"
                            >
                                Login to vSeva
                                <ArrowRight size={20} />
                            </button>

                            {isInstallable && (
                                <button
                                    onClick={install}
                                    className="px-8 py-4 bg-white border border-saffron-200 hover:bg-saffron-50 text-saffron-700 rounded-full font-medium text-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
                                >
                                    <Smartphone size={20} />
                                    Install App
                                </button>
                            )}
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

            {/* 7️⃣ FINAL CTA */}
            <div className="py-24 bg-gradient-to-br from-saffron-50 to-orange-50">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-8">
                        Continue Your Seva, Digitally
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={onGetStarted}
                            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg shadow-xl transition-all duration-300"
                        >
                            Login to vSeva
                        </button>
                        <a
                            href="https://wa.me/919594503214"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-white hover:bg-white/80 text-slate-700 border border-slate-200 rounded-full font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            Contact Admin
                        </a>
                    </div>
                </div>
            </div>

            {/* 8️⃣ SOCIAL FOLLOW */}
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
                        <p className="text-slate-400 text-sm">© 2026 vSeva – All Rights Reserved</p>
                        <p className="text-slate-500 text-xs mt-1">vSeva by Vishwa Alpesh Shah</p>
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
        </div>
    );
};

export default LandingPage;
