import React, { useState } from 'react';
import { UserRole, UserProfile, ViharEntry } from './types';
import { MOCK_USERS } from './constants';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewEntry from './pages/NewEntry';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Navigation State
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  // Simple Login Mock
  const handleLogin = (role: UserRole) => {
    // Find first user of this role for demo
    const mockUser = MOCK_USERS.find(u => u.role === role);
    if (mockUser) {
      setUser(mockUser);
      setCurrentPage(role === UserRole.SEVAK ? 'analytics' : 'dashboard');
    }
  };

  const handleEntrySubmit = (entry: ViharEntry) => {
    console.log("Saving Entry to Supabase...", entry);
    // Here we would push to DB
    alert("Vihar Entry Saved Successfully!");
    setCurrentPage('dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-saffron-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
           <div className="text-center">
              <h1 className="text-4xl font-serif font-bold text-saffron-600 mb-2">vSeva</h1>
              <p className="text-gray-500">Vihar Tracking & Analytics SaaS</p>
           </div>
           
           <div className="space-y-4">
              <button onClick={() => handleLogin(UserRole.ORG_ADMIN)} className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-lg font-medium transition-colors">
                Login as Org Admin
              </button>
              <button onClick={() => handleLogin(UserRole.SEVAK)} className="w-full bg-saffron-500 hover:bg-saffron-600 text-white py-3 rounded-lg font-medium transition-colors">
                Login as Sevak
              </button>
           </div>
           
           <div className="text-center text-xs text-gray-400 mt-8">
              <p>Demo Mode • v1.0.0</p>
           </div>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => name.substring(0,2).toUpperCase();

  return (
    <Layout 
      role={user.role} 
      userInitials={getInitials(user.name)} 
      onLogout={() => setUser(null)}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
    >
      {currentPage === 'dashboard' && user.role === UserRole.ORG_ADMIN && (
        <Dashboard currentUser={user} />
      )}
      {currentPage === 'analytics' && (
        <Dashboard currentUser={user} />
      )}
      {currentPage === 'new-entry' && user.role === UserRole.ORG_ADMIN && (
        <NewEntry currentUser={user} onSubmit={handleEntrySubmit} />
      )}
      {currentPage === 'profile' && (
        <div className="bg-white p-8 rounded-xl shadow-sm">
           <h2 className="text-2xl font-bold text-gray-800 mb-4">My Profile</h2>
           <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-gray-500">Name</div>
              <div className="font-medium">{user.name}</div>
              <div className="text-gray-500">Mobile</div>
              <div className="font-medium">{user.mobile}</div>
              <div className="text-gray-500">Organization ID</div>
              <div className="font-medium">{user.organization_id}</div>
           </div>
        </div>
      )}
       {currentPage === 'add-sevak' && (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center">
           <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Sevak</h2>
           <p className="text-gray-500">Form to create new users goes here.</p>
        </div>
      )}
    </Layout>
  );
};

export default App;