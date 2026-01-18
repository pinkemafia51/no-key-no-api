
import React from 'react';
import { Role } from '../types';
import { LogOut, Calendar, ShoppingBag, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  role: Role;
  onLogout: () => void;
  userName: string;
}

const Layout: React.FC<LayoutProps> = ({ children, role, onLogout, userName }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-right">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="logo-orly.jpg" alt="הקסם שביופי" className="w-10 h-10 rounded-full shadow-lg object-cover" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">הקסם שביופי</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-left items-end">
            <span className="text-sm font-semibold">{userName}</span>
            <span className="text-xs text-slate-500">{role === Role.ADMIN ? 'מנהלת מערכת' : 'לקוחה'}</span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            title="התנתק"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Bottom Navigation for Mobile - Hidden for Admin */}
      {role !== Role.ADMIN && (
        <nav className="md:hidden bg-white border-t sticky bottom-0 z-50 px-6 py-3 flex justify-between items-center">
          <NavItem icon={<Calendar size={22} />} label="תורים" active />
          <NavItem icon={<ShoppingBag size={22} />} label="חנות" />
          <NavItem icon={<User size={22} />} label="פרופיל" />
        </nav>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <button className={`flex flex-col items-center gap-1 ${active ? 'text-pink-600' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default Layout;
