import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { dataService } from '../services/dataService';
import { UserProfile } from '../types';
import { LogIn, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

      onLoginSuccess(profile);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-saffron-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-saffron-600 mb-2">vSeva</h1>
          <p className="text-gray-500">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-saffron-600 hover:bg-saffron-700 text-white py-3 rounded-lg font-medium transition-colors flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 mt-4">
          <p>Protected by vSeva Security</p>
        </div>
      </div>
    </div>
  );
};

export default Login;