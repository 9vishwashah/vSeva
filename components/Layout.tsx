import React from 'react';
import { UserRole } from '../types';
import { LogOut, Home, UserPlus, FilePlus, BarChart2 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  userInitials: string;
  onLogout: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, role, userInitials, onLogout, currentPage, setCurrentPage 
}) => {
  
  const NavItem = ({ page, icon: Icon, label }: { page: string, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${
        currentPage === page 
          ? 'bg-saffron-100 text-saffron-700 font-medium' 
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-serif font-bold text-saffron-600">vSeva</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Vihar Tracking</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {role === UserRole.ORG_ADMIN && (
            <>
              <NavItem page="dashboard" icon={BarChart2} label="Dashboard" />
              <NavItem page="new-entry" icon={FilePlus} label="New Entry" />
              <NavItem page="add-sevak" icon={UserPlus} label="Add Sevaks" />
            </>
          )}

          {role === UserRole.SEVAK && (
            <>
              <NavItem page="profile" icon={Home} label="My Profile" />
              <NavItem page="analytics" icon={BarChart2} label="Analytics" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-saffron-100 text-saffron-600 flex items-center justify-center font-bold text-sm">
              {userInitials}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">Account</p>
              <p className="text-xs text-gray-400 capitalize">{role.replace('_', ' ').toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-gray-500 hover:text-red-500 w-full px-2 py-2 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Bottom Nav */}
      <div className="md:hidden fixed top-0 w-full bg-white z-20 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
         <h1 className="text-xl font-serif font-bold text-saffron-600">vSeva</h1>
         <div className="w-8 h-8 rounded-full bg-saffron-100 text-saffron-600 flex items-center justify-center font-bold text-sm">
              {userInitials}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 w-full bg-white z-20 border-t border-gray-200 flex justify-around py-3 pb-safe">
          {role === UserRole.ORG_ADMIN && (
            <>
              <button onClick={() => setCurrentPage('dashboard')} className={`${currentPage === 'dashboard' ? 'text-saffron-600' : 'text-gray-400'}`}>
                <BarChart2 size={24} />
              </button>
              <button onClick={() => setCurrentPage('new-entry')} className={`${currentPage === 'new-entry' ? 'text-saffron-600' : 'text-gray-400'}`}>
                <div className="bg-saffron-500 text-white p-3 rounded-full -mt-8 shadow-lg border-4 border-white">
                  <FilePlus size={24} />
                </div>
              </button>
              <button onClick={() => setCurrentPage('add-sevak')} className={`${currentPage === 'add-sevak' ? 'text-saffron-600' : 'text-gray-400'}`}>
                <UserPlus size={24} />
              </button>
            </>
          )}
           {role === UserRole.SEVAK && (
            <>
               <button onClick={() => setCurrentPage('profile')} className={`flex flex-col items-center ${currentPage === 'profile' ? 'text-saffron-600' : 'text-gray-400'}`}>
                <Home size={24} />
                <span className="text-[10px] mt-1">Home</span>
              </button>
              <button onClick={() => setCurrentPage('analytics')} className={`flex flex-col items-center ${currentPage === 'analytics' ? 'text-saffron-600' : 'text-gray-400'}`}>
                <BarChart2 size={24} />
                <span className="text-[10px] mt-1">Stats</span>
              </button>
              <button onClick={onLogout} className="flex flex-col items-center text-gray-400">
                <LogOut size={24} />
                <span className="text-[10px] mt-1">Exit</span>
              </button>
            </>
           )}
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-0 pb-20 md:pb-0 overflow-y-auto h-screen">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;