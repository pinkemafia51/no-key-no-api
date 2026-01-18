import React, { useState, useMemo } from 'react';
import { AppState, Appointment, Service, DayConfig, Employee } from '../types';
import { Calendar, Users, Settings, Bell, Clock, Trash2, Edit2, Search, FileText, Check, X, ChevronLeft, ChevronRight, Grid, List, CalendarDays, Plus, UserCog, CheckSquare, Square, AlertCircle } from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  updateService: (service: Service) => void;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

type Tab = 'appointments' | 'clients' | 'services' | 'employees' | 'settings';
type ViewMode = 'day' | 'week' | 'month' | 'year';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, updateAppointment, updateService, setAppState }) => {
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [searchTerm, setSearchTerm] = useState('');

  const notifications = state.adminNotifications || [];
  const unreadNotifications = notifications.filter(n => !n.read).length;
  
  const pendingAppointments = useMemo(() => {
      return state.appointments.filter(a => a.status === 'pending').sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [state.appointments]);

  const handleMarkAsRead = (id: string) => {
    setAppState(prev => ({
      ...prev,
      adminNotifications: prev.adminNotifications?.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  };

  // --- Helper Functions for Calendar Logic ---

  const handleNavigate = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
        d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'year') {
        d.setFullYear(d.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const filteredAppointments = useMemo(() => {
    // Only used for the 'day' list view mostly, but good for filtering generally
    return state.appointments.filter(a => {
        if (viewMode === 'day') return a.startTime.startsWith(selectedDate);
        return true; 
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [state.appointments, selectedDate, viewMode]);

  const handleUpdateStatus = (id: string, status: 'confirmed' | 'cancelled') => {
      updateAppointment(id, { status });
  };

  const handleBusinessHourChange = (day: number, field: keyof DayConfig, value: any) => {
      setAppState(prev => ({
          ...prev,
          businessHours: {
              ...prev.businessHours,
              [day]: {
                  ...(prev.businessHours?.[day] || { isOpen: false, start: '09:00', end: '17:00' }),
                  [field]: value
              }
          }
      }));
  };

  const toggleOverride = (date: string) => {
      setAppState(prev => {
          const current = prev.dateOverrides?.[date];
          const newOverrides = { ...prev.dateOverrides };
          
          if (current) {
              delete newOverrides[date];
          } else {
              newOverrides[date] = { isOpen: false, start: '09:00', end: '17:00' };
          }
          return { ...prev, dateOverrides: newOverrides };
      });
  };

  const handleAddService = () => {
    const newService: Service = {
        id: Math.random().toString(36).substr(2, 9),
        name: 'שירות חדש',
        duration: 60,
        price: 100,
        color: '#f472b6',
        category: 'nail'
    };
    setAppState(prev => ({
        ...prev,
        services: [...prev.services, newService]
    }));
  };

  const handleDeleteService = (id: string) => {
      if (confirm('האם את בטוחה שברצונך למחוק שירות זה?')) {
          setAppState(prev => ({
              ...prev,
              services: prev.services.filter(s => s.id !== id)
          }));
      }
  };

  // --- Employee Management Functions ---

  const handleAddEmployee = () => {
    const newEmp: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'עובדת חדשה',
      services: state.services.map(s => s.id) // Default to all services
    };
    setAppState(prev => ({
      ...prev,
      employees: [...prev.employees, newEmp]
    }));
  };

  const updateEmployee = (emp: Employee) => {
    setAppState(prev => ({
      ...prev,
      employees: prev.employees.map(e => e.id === emp.id ? emp : e)
    }));
  };

  const deleteEmployee = (id: string) => {
     if(confirm('האם את בטוחה שברצונך למחוק עובדת זו?')) {
       setAppState(prev => ({
         ...prev,
         employees: prev.employees.filter(e => e.id !== id)
       }));
     }
  };

  const toggleEmployeeService = (emp: Employee, serviceId: string) => {
      const hasService = emp.services.includes(serviceId);
      const newServices = hasService 
        ? emp.services.filter(s => s !== serviceId)
        : [...emp.services, serviceId];
      
      updateEmployee({ ...emp, services: newServices });
  };

  // --- Renderers for Different Views ---

  const renderDayView = () => {
    const dateStrip = [];
    const base = new Date(selectedDate);
    base.setDate(base.getDate() - 2);
    for(let i=0; i<7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dateStrip.push(d);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
             {/* Date Strip Calendar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                         <button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={20}/></button>
                         <h3 className="font-bold text-lg text-slate-800">
                             {new Date(selectedDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                         </h3>
                         <button onClick={() => handleNavigate('next')} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={20}/></button>
                    </div>
                </div>
                <div className="flex justify-between items-center gap-2 overflow-x-auto pb-2">
                    {dateStrip.map((date, idx) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = dateStr === selectedDate;
                        const hasAppointments = state.appointments.some(a => a.startTime.startsWith(dateStr) && a.status !== 'cancelled');
                        
                        return (
                            <button 
                                key={idx}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`flex flex-col items-center justify-center min-w-[3.5rem] p-2 rounded-xl border-2 transition-all ${
                                    isSelected 
                                    ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-md transform scale-105' 
                                    : 'border-transparent hover:bg-slate-50'
                                }`}
                            >
                                <span className="text-[10px] font-bold text-slate-400">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                                <span className={`text-lg font-black ${isSelected ? 'text-pink-600' : 'text-slate-700'}`}>{date.getDate()}</span>
                                {hasAppointments && <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-1"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid gap-4">
                {filteredAppointments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-dashed border-slate-200">
                    <Calendar className="mx-auto text-slate-300 mb-2" size={48} />
                    <p className="text-slate-400 font-medium">אין תורים ביום זה</p>
                </div>
                ) : (
                filteredAppointments.map(apt => {
                    const client = state.clients.find(c => c.id === apt.clientId);
                    const service = state.services.find(s => s.id === apt.serviceId);
                    
                    return (
                        <div key={apt.id} className={`bg-white p-6 rounded-2xl shadow-sm border-r-4 ${apt.status === 'confirmed' ? 'border-green-500' : apt.status === 'cancelled' ? 'border-red-500' : 'border-amber-500'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm`} style={{backgroundColor: service?.color || '#cbd5e1'}}>
                                        {client?.name?.[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{client?.name || 'לקוח לא ידוע'}</h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{service?.name}</span>
                                            <span>•</span>
                                            <span>{service?.duration} דק׳</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-2xl text-slate-800">{new Date(apt.startTime).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl p-3 mb-4 flex justify-between items-center">
                                <span className="font-bold text-slate-600">מחיר: ₪{apt.priceAtBooking}</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {apt.status === 'confirmed' ? 'מאושר' : apt.status === 'cancelled' ? 'מבוטל' : 'ממתין לאישור'}
                                </span>
                            </div>

                            <div className="flex gap-3">
                                {apt.status !== 'confirmed' && (
                                    <button onClick={() => handleUpdateStatus(apt.id, 'confirmed')} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-100 flex items-center justify-center gap-2">
                                        <Check size={18} /> אישור
                                    </button>
                                )}
                                {apt.status !== 'cancelled' && (
                                    <button onClick={() => handleUpdateStatus(apt.id, 'cancelled')} className="flex-1 bg-white border border-red-100 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 flex items-center justify-center gap-2">
                                        <X size={18} /> ביטול
                                    </button>
                                )}
                                <a href={`tel:${client?.phone}`} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200">
                                    <Users size={20} />
                                </a>
                            </div>
                            
                            {apt.receiptRequested && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-pink-600 font-bold bg-pink-50 px-3 py-2 rounded-lg">
                                    <FileText size={14} /> הלקוחה ביקשה קבלה עבור טיפול זה
                                </div>
                            )}
                        </div>
                    );
                })
                )}
            </div>
        </div>
    );
  };

  const renderWeekView = () => {
    // Calculate start of week (Sunday)
    const current = new Date(selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day; // adjust when day is sunday
    const startOfWeek = new Date(current.setDate(diff));
    const days = [];
    for(let i=0; i<7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
    }

    return (
        <div className="animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm">
                <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
                <h3 className="font-bold text-lg">שבוע: {startOfWeek.toLocaleDateString('he-IL')} - {days[6].toLocaleDateString('he-IL')}</h3>
                <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 md:gap-2 h-[600px] overflow-y-auto">
                {days.map((d, i) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const dayApts = state.appointments.filter(a => a.startTime.startsWith(dateStr) && a.status !== 'cancelled').sort((a,b) => a.startTime.localeCompare(b.startTime));
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                        <div key={i} className={`bg-white rounded-xl shadow-sm flex flex-col h-full border ${isToday ? 'border-pink-300' : 'border-transparent'}`}>
                            <div className={`text-center py-2 border-b text-xs font-bold ${isToday ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-500'}`}>
                                <div>{d.toLocaleDateString('he-IL', {weekday: 'short'})}</div>
                                <div className="text-lg">{d.getDate()}</div>
                            </div>
                            <div className="flex-1 p-1 space-y-1 overflow-y-auto" onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}>
                                {dayApts.map(apt => {
                                     const service = state.services.find(s => s.id === apt.serviceId);
                                     return (
                                         <div key={apt.id} className="text-[9px] p-1 rounded bg-slate-100 truncate border-r-2 border-pink-400">
                                             <span className="font-bold">{new Date(apt.startTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</span> {service?.name}
                                         </div>
                                     )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
  };

  const renderMonthView = () => {
    const current = new Date(selectedDate);
    const year = current.getFullYear();
    const month = current.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday

    const days = [];
    // Fill empty slots for previous month
    for(let i=0; i<startDayOfWeek; i++) {
        days.push(null);
    }
    // Fill days
    for(let i=1; i<=daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    return (
        <div className="animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm">
                <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
                <h3 className="font-bold text-lg">{new Date(selectedDate).toLocaleDateString('he-IL', {month: 'long', year: 'numeric'})}</h3>
                <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
            </div>

            <div className="grid grid-cols-7 gap-2 bg-white p-4 rounded-3xl shadow-sm">
                {['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'].map(d => (
                    <div key={d} className="text-center font-bold text-slate-400 text-sm mb-2">{d}</div>
                ))}
                {days.map((d, idx) => {
                    if (!d) return <div key={idx} className="aspect-square"></div>;
                    
                    const dateStr = d.toISOString().split('T')[0];
                    const aptCount = state.appointments.filter(a => a.startTime.startsWith(dateStr) && a.status !== 'cancelled').length;
                    const isSelected = dateStr === selectedDate;

                    return (
                        <button 
                            key={idx} 
                            onClick={() => { setSelectedDate(dateStr); setViewMode('day'); }}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative hover:bg-slate-50 transition-colors ${isSelected ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-50'}`}
                        >
                            <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{d.getDate()}</span>
                            {aptCount > 0 && (
                                <div className="flex gap-0.5 mt-1">
                                    {[...Array(Math.min(aptCount, 3))].map((_, i) => (
                                        <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-pink-500' : 'bg-pink-400'}`}></div>
                                    ))}
                                    {aptCount > 3 && <span className="text-[8px] leading-none">+</span>}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderYearView = () => {
    const year = new Date(selectedDate).getFullYear();
    const months = Array.from({length: 12}, (_, i) => new Date(year, i, 1));

    return (
        <div className="animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm">
                <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
                <h3 className="font-bold text-lg">{year}</h3>
                <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {months.map((m, idx) => {
                    const monthStr = m.toLocaleDateString('he-IL', {month: 'long'});
                    const monthApts = state.appointments.filter(a => new Date(a.startTime).getMonth() === idx && new Date(a.startTime).getFullYear() === year && a.status !== 'cancelled').length;
                    
                    return (
                        <button 
                            key={idx}
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setMonth(idx);
                                d.setFullYear(year);
                                setSelectedDate(d.toISOString().split('T')[0]);
                                setViewMode('month');
                            }}
                            className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center"
                        >
                            <h4 className="font-bold text-lg text-slate-800 mb-1">{monthStr}</h4>
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{monthApts} תורים</span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
  };

  const renderClients = () => (
      <div className="space-y-4">
          <div className="relative">
              <Search className="absolute right-3 top-3 text-slate-400" size={20} />
              <input 
                  type="text" 
                  placeholder="חיפוש לפי שם או טלפון..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-4 bg-white border rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-pink-500"
              />
          </div>
          <div className="grid gap-3">
              {state.clients.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm)).map(client => (
                  <div key={client.id} className="bg-white p-5 rounded-2xl shadow-sm flex justify-between items-center group hover:border-pink-200 border border-transparent transition-all">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                              {client.name[0]}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg">{client.name}</h3>
                              <p className="text-sm text-slate-500 font-mono">{client.phone}</p>
                          </div>
                      </div>
                      <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                           <a href={`tel:${client.phone}`} className="p-2 bg-green-50 rounded-full text-green-600 hover:scale-110 transition-transform"><Users size={18} /></a>
                           <button className="p-2 bg-slate-50 rounded-full text-slate-600 hover:bg-pink-50 hover:text-pink-600 hover:scale-110 transition-transform"><FileText size={18} /></button>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderServices = () => (
      <div className="space-y-6">
          <button onClick={handleAddService} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:border-pink-500 hover:text-pink-500 transition-colors flex items-center justify-center gap-2">
              <Plus size={20} /> הוספת שירות חדש
          </button>
          
          <div className="grid gap-4">
            {state.services.map(service => (
                <div key={service.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-50 relative group">
                    <button 
                        onClick={() => handleDeleteService(service.id)} 
                        className="absolute top-4 left-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        title="מחיקת שירות"
                    >
                        <Trash2 size={20} />
                    </button>

                    <div className="flex items-start gap-4 mb-6 pl-12">
                        <div className="relative group/color cursor-pointer">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold shadow-md text-2xl transition-transform group-hover/color:scale-105" style={{backgroundColor: service.color}}>
                                {service.name[0]}
                            </div>
                            <input 
                                type="color" 
                                value={service.color}
                                onChange={(e) => updateService({...service, color: e.target.value})}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="absolute -bottom-6 w-full text-center text-[10px] text-slate-400 opacity-0 group-hover/color:opacity-100 transition-opacity">שינוי צבע</div>
                        </div>
                        <div className="flex-1 pt-2">
                            <input 
                                type="text" 
                                value={service.name} 
                                onChange={(e) => updateService({...service, name: e.target.value})}
                                className="font-bold text-xl bg-transparent border-b-2 border-transparent focus:border-slate-200 outline-none w-full placeholder-slate-300 text-slate-800 transition-colors pb-1"
                                placeholder="שם השירות"
                            />
                            <p className="text-xs text-slate-400 mt-1">לחצי על הטקסט לעריכה</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 font-bold block mb-2">מחיר (₪)</label>
                            <input 
                                type="number" 
                                value={service.price} 
                                onChange={(e) => updateService({...service, price: parseInt(e.target.value) || 0})}
                                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold block mb-2">משך (דקות)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={service.duration} 
                                    onChange={(e) => updateService({...service, duration: parseInt(e.target.value) || 0})}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-500 transition-all pl-10"
                                />
                                <Clock className="absolute left-3 top-3.5 text-slate-400" size={16} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
          </div>
      </div>
  );

  const renderEmployees = () => (
    <div className="space-y-6">
      <button onClick={handleAddEmployee} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:border-pink-500 hover:text-pink-500 transition-colors flex items-center justify-center gap-2">
          <Plus size={20} /> הוספת עובדת חדשה
      </button>

      <div className="grid gap-6">
        {state.employees.map(emp => (
          <div key={emp.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-50 relative">
             <button 
                onClick={() => deleteEmployee(emp.id)} 
                className="absolute top-4 left-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="מחיקת עובדת"
             >
                <Trash2 size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                {emp.name[0]}
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  value={emp.name}
                  onChange={(e) => updateEmployee({ ...emp, name: e.target.value })}
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-slate-200 focus:border-pink-500 outline-none w-full"
                />
                <p className="text-xs text-slate-400 mt-1">ערוך שם</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-sm text-slate-700 mb-3">שירותים שהיא מבצעת:</p>
              <div className="flex flex-wrap gap-2">
                {state.services.map(service => {
                  const isActive = emp.services.includes(service.id);
                  return (
                    <button 
                      key={service.id}
                      onClick={() => toggleEmployeeService(emp, service.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${
                        isActive 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isActive ? <CheckSquare size={14}/> : <Square size={14}/>}
                      {service.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800"><Clock size={22} className="text-pink-500" /> שעות פעילות קבועות</h3>
            <div className="space-y-1">
                {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const config = state.businessHours?.[day] || { isOpen: false, start: '09:00', end: '17:00' };
                    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
                    
                    return (
                        <div key={day} className={`flex items-center justify-between py-3 px-2 rounded-xl border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!config.isOpen ? 'opacity-50' : ''}`}>
                            <span className="w-16 font-bold text-slate-700">{dayNames[day]}</span>
                            <div className="flex items-center gap-4">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={config.isOpen} onChange={(e) => handleBusinessHourChange(day, 'isOpen', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                                </label>
                                {config.isOpen ? (
                                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border">
                                        <input type="time" value={config.start} onChange={(e) => handleBusinessHourChange(day, 'start', e.target.value)} className="bg-transparent text-sm outline-none font-bold" />
                                        <span className="text-slate-300">|</span>
                                        <input type="time" value={config.end} onChange={(e) => handleBusinessHourChange(day, 'end', e.target.value)} className="bg-transparent text-sm outline-none font-bold" />
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400 italic w-[130px] text-center">יום מנוחה</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar size={20} className="text-pink-500"/> חריגות ושינויים חד פעמיים</h3>
             <div className="flex gap-3 mb-6 bg-slate-50 p-3 rounded-2xl">
                 <input type="date" className="flex-1 bg-white border-0 rounded-xl px-4 py-2 shadow-sm outline-none" id="override-date" />
                 <button 
                    onClick={() => {
                        const d = (document.getElementById('override-date') as HTMLInputElement).value;
                        if(d) toggleOverride(d);
                    }} 
                    className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-slate-800"
                 >
                     הוספה
                 </button>
             </div>
             <div className="space-y-3">
                 {Object.entries(state.dateOverrides || {}).map(([date, config]) => (
                     <div key={date} className="flex justify-between items-center bg-white border p-4 rounded-xl shadow-sm">
                         <span className="font-bold flex items-center gap-2">
                             <Calendar size={16} className="text-slate-400"/>
                             {new Date(date).toLocaleDateString('he-IL')}
                         </span>
                         <div className="flex items-center gap-3">
                             <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${config.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                 {config.isOpen ? 'פתוח מיוחד' : 'סגור'}
                             </span>
                             <button onClick={() => toggleOverride(date)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={18} /></button>
                         </div>
                     </div>
                 ))}
                 {Object.keys(state.dateOverrides || {}).length === 0 && (
                     <p className="text-center text-slate-400 text-sm py-4">לא הוגדרו חריגות</p>
                 )}
             </div>
        </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 text-right px-4 md:px-0">
       <div className="flex flex-col md:flex-row gap-6 mb-8">
           {/* Summary Cards */}
           <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-x-10 -translate-y-10"></div>
               <div className="flex justify-between items-start relative z-10">
                   <div>
                       <p className="text-slate-400 font-bold mb-1 text-sm">תורים להיום</p>
                       <h2 className="text-5xl font-black">
                           {state.appointments.filter(a => a.startTime.startsWith(new Date().toISOString().split('T')[0]) && a.status !== 'cancelled').length}
                       </h2>
                   </div>
                   <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm"><Calendar size={24} /></div>
               </div>
           </div>

            {/* Pending Requests Card */}
           <div className="flex-1 bg-amber-50 p-6 rounded-3xl shadow-sm border border-amber-100 relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                   <div>
                       <p className="text-amber-600 font-bold mb-1 text-sm">ממתינים לאישור</p>
                       <h2 className="text-4xl font-black text-amber-800">{pendingAppointments.length}</h2>
                   </div>
                   <div className="p-3 bg-white rounded-2xl text-amber-500"><Clock size={24} /></div>
               </div>
               {pendingAppointments.length > 0 && <p className="text-xs text-amber-700 font-bold">יש לאשר בקשות חדשות</p>}
           </div>
           
           <div className="flex-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
               <div className="flex justify-between items-start mb-4">
                   <div>
                       <p className="text-slate-500 font-bold mb-1 text-sm">התראות מערכת</p>
                       <h2 className="text-4xl font-black text-slate-800">{unreadNotifications}</h2>
                   </div>
                   <div className={`p-3 rounded-2xl ${unreadNotifications > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}><Bell size={24} /></div>
               </div>
               {unreadNotifications > 0 && (
                   <p className="text-xs text-rose-500 font-bold cursor-pointer hover:underline" onClick={() => setActiveTab('settings')}>לחצי לצפייה בהתראות</p>
               )}
           </div>
       </div>

        {/* Pending Appointments Section */}
       {pendingAppointments.length > 0 && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-amber-500" />
                <h3 className="font-bold text-xl text-slate-800">בקשות תורים הממתינות לאישור ({pendingAppointments.length})</h3>
             </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingAppointments.map(apt => {
                    const client = state.clients.find(c => c.id === apt.clientId);
                    const service = state.services.find(s => s.id === apt.serviceId);
                    
                    return (
                        <div key={apt.id} className="bg-white border-r-4 border-amber-400 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg">{client?.name}</h4>
                                    <p className="text-xs text-slate-500">{service?.name}</p>
                                </div>
                                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-lg font-bold">ממתין</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl text-xs font-bold text-slate-600 flex justify-between">
                                <span>{new Date(apt.startTime).toLocaleDateString('he-IL')}</span>
                                <span>{new Date(apt.startTime).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex gap-2 mt-1">
                                <button onClick={() => handleUpdateStatus(apt.id, 'confirmed')} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-green-600 shadow-lg shadow-green-100">
                                    אישור
                                </button>
                                <button onClick={() => handleUpdateStatus(apt.id, 'cancelled')} className="flex-1 bg-white border border-red-100 text-red-500 py-2 rounded-xl text-xs font-bold hover:bg-red-50">
                                    דחייה
                                </button>
                            </div>
                        </div>
                    )
                })}
             </div>
          </div>
       )}

       {/* Navigation Tabs */}
       <div className="bg-white p-1.5 rounded-2xl shadow-sm border inline-flex mb-8 overflow-x-auto max-w-full">
           <button onClick={() => setActiveTab('appointments')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'appointments' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
               <Calendar size={18} /> יומן ולו"ז
           </button>
           <button onClick={() => setActiveTab('clients')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'clients' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
               <Users size={18} /> מאגר לקוחות
           </button>
           <button onClick={() => setActiveTab('services')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
               <Settings size={18} /> שירותים
           </button>
           <button onClick={() => setActiveTab('employees')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'employees' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
               <UserCog size={18} /> צוות
           </button>
           <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
               <Clock size={18} /> הגדרות
           </button>
       </div>

       {/* Sub-View Switcher for Appointments */}
       {activeTab === 'appointments' && (
           <div className="mb-6 flex gap-2">
               <button onClick={() => setViewMode('day')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-pink-100 text-pink-700' : 'bg-white text-slate-500'}`}>יומי</button>
               <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-pink-100 text-pink-700' : 'bg-white text-slate-500'}`}>שבועי</button>
               <button onClick={() => setViewMode('month')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-pink-100 text-pink-700' : 'bg-white text-slate-500'}`}>חודשי</button>
               <button onClick={() => setViewMode('year')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'year' ? 'bg-pink-100 text-pink-700' : 'bg-white text-slate-500'}`}>שנתי</button>
           </div>
       )}

       {/* Tab Content */}
       <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[400px]">
           {activeTab === 'appointments' && (
               <>
                   {viewMode === 'day' && renderDayView()}
                   {viewMode === 'week' && renderWeekView()}
                   {viewMode === 'month' && renderMonthView()}
                   {viewMode === 'year' && renderYearView()}
               </>
           )}
           {activeTab === 'clients' && renderClients()}
           {activeTab === 'services' && renderServices()}
           {activeTab === 'employees' && renderEmployees()}
           {activeTab === 'settings' && renderSettings()}
       </div>
    </div>
  );
};

export default AdminDashboard;