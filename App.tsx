import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { UserRole, UserProfile } from './types';
import { dataService } from './services/dataService';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewEntry from './pages/NewEntry';
import AddSevak from './pages/AddSevak';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  useEffect(() => {
    // Check active session on load
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
         try {
             const profile = await dataService.getProfile(session.user.id);
             if (profile) {
                 setUser(profile);
                 // Redirect based on role if at root
                 setCurrentPage(profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
             }
         } catch (e) {
             console.error("Profile load failed", e);
             await supabase.auth.signOut();
         }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    setCurrentPage(profile.role === UserRole.SEVAK ? 'analytics' : 'dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center bg-saffron-50">
              <Loader2 className="animate-spin text-saffron-600" size={48} />
          </div>
      );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const getInitials = (name: string) => name ? name.substring(0,2).toUpperCase() : 'VS';

  return (
    <Layout 
      role={user.role} 
      userInitials={getInitials(user.full_name)} 
      onLogout={handleLogout}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
    >
      {/* Admin Routes */}
      {currentPage === 'dashboard' && user.role === UserRole.ORG_ADMIN && (
        <Dashboard currentUser={user} />
      )}
      
      {currentPage === 'new-entry' && user.role === UserRole.ORG_ADMIN && (
        <NewEntry currentUser={user} onSubmit={() => setCurrentPage('dashboard')} />
      )}

      {currentPage === 'add-sevak' && user.role === UserRole.ORG_ADMIN && (
        <AddSevak currentUser={user} />
      )}

      {/* Sevak Routes */}
      {currentPage === 'analytics' && (
        <Dashboard currentUser={user} />
      )}
      
      {currentPage === 'profile' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
           <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-saffron-100 rounded-full flex items-center justify-center text-2xl font-bold text-saffron-600">
                    {getInitials(user.full_name)}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{user.full_name}</h2>
                    <p className="text-gray-500 uppercase text-xs tracking-wider">{user.role}</p>
                </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t border-gray-100 pt-6">
              <div>
                  <p className="text-gray-500 mb-1">Mobile Number</p>
                  <p className="font-medium text-lg">{user.mobile}</p>
              </div>
              <div>
                  <p className="text-gray-500 mb-1">Username</p>
                  <p className="font-medium text-lg">{user.username}</p>
              </div>
              <div>
                  <p className="text-gray-500 mb-1">Organization ID</p>
                  <p className="font-medium text-lg font-mono bg-gray-50 p-2 rounded inline-block">{user.organization_id}</p>
              </div>
              <div>
                   <p className="text-gray-500 mb-1">Status</p>
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                     Active
                   </span>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;