import React, { useState } from 'react';
import { Role, Client } from '../types';
import { User, ShieldCheck, Lock, Phone, UserPlus, ChevronRight, AlertCircle, MapPin, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { CONTACT_INFO } from '../constants';

interface LandingPageProps {
  onLogin: (role: Role, user?: Client) => void;
  onRegister: (client: Client) => void;
  existingClients: Client[];
}

type View = 'role-selection' | 'client-login' | 'client-register' | 'admin-login';

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister, existingClients }) => {
  const [view, setView] = useState<View>('role-selection');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const ADMIN_PASSWORD = '12345';

  const resetForm = () => {
    setPhone('');
    setPassword('');
    setName('');
    setError('');
  };

  const handleClientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const client = existingClients.find(c => c.phone === phone && c.password === password);
    if (client) {
      onLogin(Role.CLIENT, client);
    } else {
      setError('מספר טלפון או סיסמה לא נכונים');
    }
  };

  const handleClientRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    
    if (existingClients.some(c => c.phone.trim() === cleanPhone)) {
      setError('מספר הטלפון כבר רשום במערכת');
      return;
    }
    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      phone: cleanPhone,
      password,
      healthDeclarationSigned: false,
      notes: []
    };
    onRegister(newClient);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLogin(Role.ADMIN);
    } else {
      setError('סיסמת מנהלת שגויה');
    }
  };

  const ContactDetails = () => (
    <div className="mt-8 pt-6 border-t border-slate-100 space-y-3 text-slate-500 text-sm">
      <a href={CONTACT_INFO.wazeLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 hover:text-pink-600 transition-colors">
        <span>{CONTACT_INFO.address}</span>
        <MapPin size={16} className="text-pink-500" />
      </a>
      <div className="flex items-center justify-center gap-2">
        <a href={`tel:${CONTACT_INFO.phone}`} className="hover:text-pink-600 transition-colors">{CONTACT_INFO.phone}</a>
        <Phone size={16} className="text-pink-500" />
      </div>
      <div className="flex items-center justify-center gap-6 pt-4">
        <a href={CONTACT_INFO.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 rounded-full shadow-sm hover:text-pink-600 transition-all hover:scale-110">
          <Instagram size={20} />
        </a>
        <a href={CONTACT_INFO.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 rounded-full shadow-sm hover:text-blue-600 transition-all hover:scale-110">
          <Facebook size={20} />
        </a>
        <a href={CONTACT_INFO.whatsapp} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 rounded-full shadow-sm hover:text-green-500 transition-all hover:scale-110">
          <MessageCircle size={20} />
        </a>
      </div>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => { setView('client-login'); resetForm(); }}
            className="bg-slate-50 border-2 border-transparent hover:border-pink-500 p-8 rounded-3xl transition-all flex flex-col items-center group"
          >
            <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center text-pink-500 mb-4 group-hover:scale-110 transition-transform">
              <User size={28} />
            </div>
            <span className="text-xl font-bold text-slate-800">אני לקוחה</span>
            <span className="text-xs text-slate-400 mt-2">לקביעת תורים וניהול תיק אישי</span>
          </button>

          <button 
            onClick={() => { setView('admin-login'); resetForm(); }}
            className="bg-slate-50 border-2 border-transparent hover:border-slate-800 p-8 rounded-3xl transition-all flex flex-col items-center group"
          >
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={28} />
            </div>
            <span className="text-xl font-bold text-slate-800">מנהלת</span>
            <span className="text-xs text-slate-400 mt-2">ניהול יומן, לקוחות ושירותים</span>
          </button>
        </div>
        <ContactDetails />
      </div>
    </div>
  );

  const renderClientLogin = () => (
    <div className="w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-xl">
        <button onClick={() => setView('role-selection')} className="text-slate-400 mb-6 flex items-center gap-1 hover:text-pink-600 transition-colors text-sm font-medium">
          <ChevronRight size={18} /> חזרה לבחירה
        </button>
        <h2 className="text-2xl font-bold mb-6 text-right">כניסת לקוחות</h2>
        <form onSubmit={handleClientLogin} className="space-y-4">
          <div className="relative text-right">
            <Phone className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="tel" 
              placeholder="מספר טלפון" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-right"
              required
            />
          </div>
          <div className="relative text-right">
            <Lock className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="password" 
              placeholder="סיסמה" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-right"
              required
            />
          </div>
          {error && <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl"><AlertCircle size={14} />{error}</div>}
          <button type="submit" className="w-full bg-pink-600 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-pink-700 transition-colors">התחברי</button>
          <button 
            type="button" 
            onClick={() => { setView('client-register'); resetForm(); }}
            className="w-full text-pink-600 text-sm font-bold mt-2 hover:underline"
          >
            עוד לא רשומה? הירשמי כאן
          </button>
        </form>
        <ContactDetails />
      </div>
    </div>
  );

  const renderClientRegister = () => (
    <div className="w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-xl">
        <button onClick={() => setView('client-login')} className="text-slate-400 mb-6 flex items-center gap-1 hover:text-pink-600 transition-colors text-sm font-medium">
          <ChevronRight size={18} /> חזרה לכניסה
        </button>
        <h2 className="text-2xl font-bold mb-6 text-right">הרשמת לקוחה חדשה</h2>
        <form onSubmit={handleClientRegister} className="space-y-4">
          <div className="relative text-right">
            <UserPlus className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="שם מלא" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-right"
              required
            />
          </div>
          <div className="relative text-right">
            <Phone className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="tel" 
              placeholder="מספר טלפון" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-right"
              required
            />
          </div>
          <div className="relative text-right">
            <Lock className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="password" 
              placeholder="בחרי סיסמה" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-pink-500 outline-none text-right"
              required
            />
          </div>
          {error && <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl"><AlertCircle size={14} />{error}</div>}
          <button type="submit" className="w-full bg-pink-600 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-pink-700 transition-colors">הרשמה וכניסה</button>
        </form>
        <ContactDetails />
      </div>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-xl">
        <button onClick={() => setView('role-selection')} className="text-slate-400 mb-6 flex items-center gap-1 hover:text-slate-800 transition-colors text-sm font-medium">
          <ChevronRight size={18} /> חזרה לבחירה
        </button>
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold">כניסת מנהלת</h2>
        </div>
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="relative text-right">
            <Lock className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="password" 
              placeholder="סיסמת מנהלת" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-slate-800 outline-none text-right"
              required
              autoFocus
            />
          </div>
          {error && <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl"><AlertCircle size={14} />{error}</div>}
          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-colors">כניסה למערכת</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 flex flex-col items-center">
        <img src="logo-orly.jpg" alt="הקסם שביופי" className="w-24 h-24 rounded-3xl shadow-2xl mb-4 object-cover" />
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">הקסם שביופי</h1>
        <p className="text-slate-500 max-w-xs mt-2">היופי שלך בידיים טובות</p>
      </div>

      {view === 'role-selection' && renderRoleSelection()}
      {view === 'client-login' && renderClientLogin()}
      {view === 'client-register' && renderClientRegister()}
      {view === 'admin-login' && renderAdminLogin()}

      <p className="mt-12 text-slate-400 text-[10px] font-medium uppercase tracking-widest">Powered by הקסם שביופי v1.0</p>
    </div>
  );
};

export default LandingPage;