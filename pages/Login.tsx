import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UserProfile } from '../types';
import { LogIn, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import vSevaLogo from '../assets/vseva-logo.png';

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Auth with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
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

      showToast(`Welcome back, ${profile.full_name}!`, 'success');
      onLoginSuccess(profile);

    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Login failed. Please check credentials.", 'error');
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
    <div className="min-h-screen bg-saffron-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-saffron-400/20 blur-xl rounded-full"></div>
              <img
                src={vSevaLogo}
                alt="vSeva Logo"
                className="relative h-20 w-20 object-contain drop-shadow-lg"
              />
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold bg-gradient-to-r from-saffron-600 to-orange-600 bg-clip-text text-transparent mb-2">vSeva</h1>
          <p className="text-gray-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email / Username</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-saffron-500 focus:outline-none"
              placeholder="admin@org.com or name@vsevak.in"
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
        </form>

        <div className="border-t pt-4 text-center space-y-2">
          <p className="text-sm text-gray-600">Want to create a new Organization?</p>
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            className="text-saffron-600 font-medium hover:underline text-sm"
          >
            Create Admin Account
          </button>
        </div>

        <div className="text-center text-xs text-gray-400 mt-4">
          <p>Protected by vSeva Security</p>
        </div>
      </div>
    </div>
  );
};

// Import at the top usually, but for this edit I'll add the components.
// Accessing RegisterAdmin via import
import RegisterAdminView from './RegisterAdmin';
import ForgotPasswordView from './ForgotPassword';

export default Login;