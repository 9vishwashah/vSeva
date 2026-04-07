import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UserProfile } from '../types';
import { LogIn, Loader2, Instagram, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import vSevaLogo from '../assets/vseva-logo-removebg-preview.png';

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const safeEmail = email.trim().toLowerCase();

    try {
      // 1. Auth with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: safeEmail,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No user found");

      // 2. Fetch Profile to get Role
      const profile = await dataService.getProfile(authData.user.id);

      if (!profile) {
        throw new Error("Profile not found. Contact Admin.");
      }

      if (!profile.is_active) {
        throw new Error("Account is inactive.");
      }

      // Track last login time (fire-and-forget, don't block login on failure)
      supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id)
        .then(({ error }) => {
          if (error) console.warn('Could not update last_login_at:', error.message);
        });

      showToast(`Welcome back, ${profile.full_name}!`, 'success');
      onLoginSuccess(profile);

    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Login failed. Please check credentials.";
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-saffron-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          {/* Lazy load to avoid circular dependency if any, though regular import is fine */}
          <React.Suspense fallback={<Loader2 className="animate-spin" />}>
            <RegisterAdminView onBack={() => setIsRegistering(false)} onSuccess={() => setIsRegistering(false)} />
          </React.Suspense>
        </div>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-saffron-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <React.Suspense fallback={<Loader2 className="animate-spin" />}>
            <ForgotPasswordView onBack={() => setIsForgotPassword(false)} />
          </React.Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-saffron-50 flex flex-col justify-center items-center px-4 pt-24 pb-24 relative">
      <button
        onClick={() => window.location.href = '/'}
        className="absolute top-6 left-4 md:left-8 flex items-center gap-2 text-saffron-600 hover:text-white hover:bg-saffron-600 font-bold transition-all bg-white/100 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-md border border-saffron-200 hover:-translate-y-0.5 z-50 group text-sm"
      >
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        <span>View More</span>
      </button>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 z-10">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="animate-fade-in-up bg-saffron-50 rounded-2xl shadow-sm border border-saffron-100 overflow-hidden">
              <img src={vSevaLogo} alt="vSeva" className="h-24 w-24 md:h-28 md:w-28 object-cover" />
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent mb-2">vSeva</h1>
          <p className="text-gray-500">Sign in to your account</p>
          <p className="text-sm text-saffron-600 mt-2 font-medium">Please enter the username and password given by your Captain.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
              placeholder="name@vjas.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-saffron-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-saffron-600 hover:bg-saffron-700 text-white py-3 rounded-lg font-medium transition-colors flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
          </button>

          {errorMsg && (
            <div className="p-3 mt-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg animate-fade-in-up">
              {errorMsg}
            </div>
          )}
        </form>

        <div className="border-t pt-4 text-center space-y-2">
          <p className="text-sm text-gray-600">Want to use for Vihar Seva Group?</p>
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            className="text-saffron-600 font-medium hover:underline text-sm"
          >
            Create Captain Account
          </button>
        </div>

        <div className="text-center text-xs text-gray-400 mt-4">
          <p>vSeva by VJAS</p>
        </div>
      </div>

      {/* Instagram fixed popup */}
      <a
        href="https://www.instagram.com/the.vseva/"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-slate-200 flex items-center gap-3 w-max z-50 hover:-translate-y-1 hover:shadow-2xl transition-all cursor-pointer group"
      >
        <Instagram size={20} className="text-pink-600 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-medium text-slate-700">Follow us on</span>
        <span className="text-sm font-bold bg-gradient-to-tr from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
          Instagram
        </span>
      </a>
    </div>
  );
};

// Import at the top usually, but for this edit I'll add the components.
// Accessing RegisterAdmin via import
import RegisterAdminView from './RegisterAdmin';
import ForgotPasswordView from './ForgotPassword';

export default Login;