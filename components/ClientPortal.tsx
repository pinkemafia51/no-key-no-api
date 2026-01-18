
import React, { useState, useMemo } from 'react';
import { AppState, Appointment, Role, Service, Product, AppNotification, Employee, DayConfig } from '../types';
import { Calendar as CalendarIcon, Clock, CreditCard, Heart, ShoppingBag, MapPin, Phone, MessageCircle, Plus, Scissors, Star, AlertCircle, FileText, ChevronRight, Eye, Send, X, Bell, RefreshCw, Check, Info, ArrowLeftRight, Lock, Timer } from 'lucide-react';
import { CONTACT_INFO, DEFAULT_BUSINESS_HOURS } from '../constants';
import BookingFlow from './BookingFlow';

interface ClientPortalProps {
  state: AppState;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

const ClientPortal: React.FC<ClientPortalProps> = ({ state, addAppointment, updateAppointment, setAppState }) => {
  const [showBooking, setShowBooking] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const [cart, setCart] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  
  const myAppointments = state.appointments.filter(a => a.clientId === state.currentUser?.id);
  const myHistory = myAppointments.filter(a => a.status === 'confirmed').sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  const unreadNotifications = (state.currentUser?.notifications || []).filter(n => !n.read).length;

  const mySwapRequests = state.appointments.filter(a => a.clientId === state.currentUser?.id && a.incomingSwapRequest);
  const businessHours = state.businessHours || DEFAULT_BUSINESS_HOURS;

  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 90; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60 * 1000));
      const dateStr = localDate.toISOString().split('T')[0];

      // Check for specific override first
      if (state.dateOverrides && state.dateOverrides[dateStr]) {
        if (state.dateOverrides[dateStr].isOpen) {
          dates.push(dateStr);
        }
      } else {
        const dayOfWeek = d.getDay();
        if (businessHours[dayOfWeek]?.isOpen) {
           dates.push(dateStr);
        }
      }
    }
    return dates;
  }, [businessHours, state.dateOverrides]);

  const groupedDates = useMemo(() => {
    const groups: { [key: string]: string[] } = {};
    availableDates.forEach(date => {
      const month = new Date(date).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(date);
    });
    return groups;
  }, [availableDates]);

  const markAllRead = () => {
    setAppState(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === prev.currentUser?.id 
        ? { ...c, notifications: (c.notifications || []).map(n => ({ ...n, read: true })) }
        : c
      )
    }));
  };

  const handleApproveProposal = (apt: Appointment) => {
    if (!apt.changeProposal) return;
    updateAppointment(apt.id, { 
      startTime: apt.changeProposal.startTime, 
      endTime: apt.changeProposal.endTime, 
      priceAtBooking: apt.changeProposal.priceAtBooking, 
      status: 'confirmed', 
      changeProposal: undefined 
    });
    alert('השינוי אושר ועודכן!');
  };

  const handleSendSwapRequest = (targetApt: Appointment, myApt: Appointment) => {
    // 1. Update appointment
    updateAppointment(targetApt.id, {
      incomingSwapRequest: { fromAppointmentId: myApt.id, requestingClientId: myApt.clientId }
    });

    // 2. Add notification to target client
    setAppState(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === targetApt.clientId ? {
        ...c,
        notifications: [
          ...(c.notifications || []),
          {
            id: Math.random().toString(36).substr(2, 9),
            message: `קיבלת בקשת החלפה לתור! היכנסי לתיק האישי לצפייה בפרטים.`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'info'
          }
        ]
      } : c)
    }));

    alert('בקשת החלפה נשלחה ללקוחה!');
    setReschedulingApt(null);
  };

  const handleAcceptSwap = (targetApt: Appointment) => {
    const swapData = targetApt.incomingSwapRequest;
    const fromApt = state.appointments.find(a => a.id === swapData?.fromAppointmentId);
    if (!fromApt || !swapData) return;

    const targetService = state.services.find(s => s.id === targetApt.serviceId);
    const fromService = state.services.find(s => s.id === fromApt.serviceId);
    if (!targetService || !fromService) return;

    // Calculate new times
    const newFromStart = new Date(targetApt.startTime); // Requester gets Target's time
    const newFromEnd = new Date(newFromStart.getTime() + fromService.duration * 60000);
    
    const newTargetStart = new Date(fromApt.startTime); // Target gets Requester's time
    const newTargetEnd = new Date(newTargetStart.getTime() + targetService.duration * 60000);

    // Update appointments
    updateAppointment(fromApt.id, { startTime: newFromStart.toISOString(), endTime: newFromEnd.toISOString(), incomingSwapRequest: undefined });
    updateAppointment(targetApt.id, { startTime: newTargetStart.toISOString(), endTime: newTargetEnd.toISOString(), incomingSwapRequest: undefined });

    // Send notifications to Requester and Admin
    const requestingClient = state.clients.find(c => c.id === fromApt.clientId);
    const targetClient = state.clients.find(c => c.id === targetApt.clientId);

    setAppState(prev => {
      const adminMsg = `בוצעה החלפת תורים: ${requestingClient?.name} עברה ל-${newFromStart.toLocaleString('he-IL')} ו-${targetClient?.name} עברה ל-${newTargetStart.toLocaleString('he-IL')}.`;
      const userMsg = `בקשת ההחלפה שלך אושרה! התור החדש שלך נקבע ל-${newFromStart.toLocaleString('he-IL')}.`;

      return {
        ...prev,
        // Notify Admin
        adminNotifications: [
          ...(prev.adminNotifications || []),
          {
            id: Math.random().toString(36).substr(2, 9),
            message: adminMsg,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'info'
          }
        ],
        // Notify Requester (User A)
        clients: prev.clients.map(c => {
          if (c.id === requestingClient?.id) {
            return {
              ...c,
              notifications: [
                ...(c.notifications || []),
                {
                  id: Math.random().toString(36).substr(2, 9),
                  message: userMsg,
                  timestamp: new Date().toISOString(),
                  read: false,
                  type: 'success'
                }
              ]
            };
          }
          return c;
        })
      };
    });

    alert('ההחלפה בוצעה בהצלחה!');
  };

  const handleRequestReceipt = (apt: Appointment) => {
    updateAppointment(apt.id, { receiptRequested: true });
    
    // Notify Admin
    const clientName = state.currentUser?.name;
    const dateStr = new Date(apt.startTime).toLocaleDateString('he-IL');
    setAppState(prev => ({
        ...prev,
        adminNotifications: [
            ...(prev.adminNotifications || []),
            {
                id: Math.random().toString(36).substr(2, 9),
                message: `הלקוחה ${clientName} ביקשה קבלה עבור הטיפול מתאריך ${dateStr}`,
                timestamp: new Date().toISOString(),
                read: false,
                type: 'info'
            }
        ]
    }));
    alert('הבקשה נשלחה למנהלת!');
  };

  const isWithin48Hours = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diffHours = (start - now) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 48;
  };

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getDate() === d2.getDate();

  const handleRescheduleSubmit = (newDate: string, newTime: string) => {
    if (!reschedulingApt) return;
    const service = state.services.find(s => s.id === reschedulingApt.serviceId);
    const startTime = new Date(newDate);
    const [h, m] = newTime.split(':');
    startTime.setHours(parseInt(h), parseInt(m));
    const endTime = new Date(startTime.getTime() + (service?.duration || 60) * 60000);

    updateAppointment(reschedulingApt.id, { startTime: startTime.toISOString(), endTime: endTime.toISOString(), status: 'pending', confirmedByClient: false });
    setReschedulingApt(null);
    alert('בקשת השינוי נשלחה למנהלת וממתינה לאישור מחדש.');
  };

  const getDuration = (apt: Appointment) => {
    return Math.round((new Date(apt.endTime).getTime() - new Date(apt.startTime).getTime()) / 60000);
  };

  if (showBooking) return <BookingFlow state={state} onComplete={addAppointment} onCancel={() => setShowBooking(false)} />;

  if (showFile) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 text-right animate-in fade-in">
        <button onClick={() => setShowFile(false)} className="text-slate-400 mb-8 flex items-center gap-1 justify-end w-full font-black"><ChevronRight size={18} /> חזרה</button>
        <h2 className="text-3xl font-black mb-10">התיק האישי שלי</h2>
        
        {mySwapRequests.map(apt => {
           const swapData = apt.incomingSwapRequest;
           const offeredApt = state.appointments.find(a => a.id === swapData?.fromAppointmentId);
           const offeredService = state.services.find(s => s.id === offeredApt?.serviceId);
           
           if (!offeredApt) return null;

           return (
             <div key={apt.id} className="bg-white p-6 rounded-3xl border-2 border-pink-100 shadow-lg mb-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-2 h-full bg-pink-500"></div>
               <div className="flex items-center gap-3 mb-4 text-pink-600">
                 <ArrowLeftRight size={24} />
                 <h3 className="font-black text-lg">בקשת החלפה חדשה!</h3>
               </div>
               
               <div className="bg-slate-50 p-4 rounded-2xl mb-4 grid grid-cols-2 gap-4 text-center">
                 <div>
                   <p className="text-[10px] text-slate-400 font-bold mb-1">התור הנוכחי שלך</p>
                   <p className="font-black text-slate-800">{new Date(apt.startTime).toLocaleDateString('he-IL')}</p>
                   <p className="text-xs font-bold text-slate-500">{new Date(apt.startTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</p>
                 </div>
                 <div className="border-r border-slate-200">
                   <p className="text-[10px] text-pink-500 font-bold mb-1">התור המוצע לך</p>
                   <p className="font-black text-slate-800">{new Date(offeredApt.startTime).toLocaleDateString('he-IL')}</p>
                   <p className="text-xs font-bold text-slate-500">{new Date(offeredApt.startTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</p>
                   <p className="text-[9px] text-slate-400 mt-1">{offeredService?.name}</p>
                 </div>
               </div>

               <button onClick={() => handleAcceptSwap(apt)} className="w-full bg-pink-600 text-white py-3 rounded-2xl font-black shadow-md hover:bg-pink-700 transition-colors">
                 אשרי החלפה
               </button>
             </div>
           );
        })}

        <div className="space-y-6">
          <h3 className="font-black text-xl mb-4">היסטוריית טיפולים</h3>
          {myHistory.map(apt => (
            <div key={apt.id} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4">
               <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <p className="font-black text-lg">{state.services.find(s => s.id === apt.serviceId)?.name}</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">{new Date(apt.startTime).toLocaleDateString('he-IL')}</p>
                  </div>
                  <span className="text-pink-600 font-black text-xl">₪{apt.priceAtBooking}</span>
               </div>
               <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-pink-500" />
                    {new Date(apt.startTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer size={14} className="text-pink-500" />
                    {getDuration(apt)} דקות
                  </div>
               </div>
               
               {/* Receipt Section */}
               <div className="mt-2 pt-4 border-t border-slate-100 flex justify-between items-center">
                   {apt.receiptImage ? (
                     <button 
                       onClick={() => { const w = window.open(); if(w) { w.document.write(`<img src="${apt.receiptImage}" style="max-width:100%"/>`); } }} 
                       className="text-pink-600 text-xs font-black flex items-center gap-1 hover:underline"
                     >
                       <FileText size={14} /> צפייה בקבלה
                     </button>
                   ) : (
                     <div className="flex items-center gap-3 w-full justify-between">
                       <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                         <AlertCircle size={10} /> עדיין אין קבלה
                       </span>
                       {apt.receiptRequested ? (
                          <span className="text-[10px] bg-slate-100 text-slate-400 px-3 py-1 rounded-full font-bold">בקשה נשלחה</span>
                       ) : (
                          <button onClick={() => handleRequestReceipt(apt)} className="text-[10px] bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-black hover:bg-pink-100 transition-colors">
                            בקשי קבלה
                          </button>
                       )}
                     </div>
                   )}
               </div>
            </div>
          ))}
          {myHistory.length === 0 && (
            <p className="text-center text-slate-400 font-bold py-10">אין היסטוריית טיפולים עדיין</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 text-right">
      {showNotifications && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">התראות שלי</h3>
              <button onClick={() => setShowNotifications(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X /></button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {(state.currentUser?.notifications || []).slice().reverse().map(n => (
                <div key={n.id} className={`p-4 rounded-2xl border ${n.read ? 'bg-slate-50 opacity-60' : 'bg-pink-50 border-pink-100'}`}>
                  <p className="text-sm font-bold">{n.message}</p>
                </div>
              ))}
            </div>
            <button onClick={markAllRead} className="w-full mt-6 py-3 bg-pink-50 text-pink-600 rounded-xl font-black">סמן הכל כנקרא</button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 text-right">
          <div className="flex items-center gap-4 justify-end mb-6">
            <button onClick={() => setShowNotifications(true)} className="relative p-3 bg-white/20 rounded-xl">
              <Bell size={24} />
              {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">{unreadNotifications}</span>}
            </button>
            <button onClick={() => setShowFile(true)} className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black">התיק שלי</button>
            <h2 className="text-4xl font-black">היי, {state.currentUser?.name}!</h2>
          </div>
          <button onClick={() => setShowBooking(true)} className="bg-white text-rose-600 px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-transform flex items-center gap-3 text-lg mr-auto">
            <CalendarIcon size={24} /> קביעת תור מהירה
          </button>
        </div>
      </div>

      <section>
        <h3 className="text-2xl font-black mb-6">התורים שלי</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myAppointments.filter(a => a.status !== 'cancelled' && new Date(a.startTime).getTime() > Date.now()).map(apt => {
            
            const isConfirmedByAdmin = apt.status === 'confirmed';
            const isPending = apt.status === 'pending';
            const hasConfirmedArrival = apt.confirmedByClient;
            const adminOverride = state.currentUser?.canRescheduleConfirmed;

            const canReschedule = isPending || (isConfirmedByAdmin && !hasConfirmedArrival) || (isConfirmedByAdmin && hasConfirmedArrival && adminOverride);
            const canConfirm = isWithin48Hours(apt.startTime) && isConfirmedByAdmin;

            return (
              <div key={apt.id} className="bg-white border-2 rounded-[2.5rem] p-6 shadow-sm relative text-right">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-black px-4 py-1.5 rounded-full ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{apt.status === 'confirmed' ? 'מאושר' : 'ממתין לאישור'}</span>
                  <h4 className="font-black text-xl">{state.services.find(s => s.id === apt.serviceId)?.name}</h4>
                </div>
                
                {/* Details Section */}
                <div className="bg-slate-50 p-4 rounded-2xl mb-4 space-y-2">
                   <div className="flex justify-between text-sm font-bold text-slate-600">
                     <span>{new Date(apt.startTime).toLocaleDateString('he-IL')}</span>
                     <span>{new Date(apt.startTime).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                     <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Timer size={12}/> {getDuration(apt)} דקות</span>
                     <span className="font-black text-pink-600">₪{apt.priceAtBooking}</span>
                   </div>
                </div>

                {apt.changeProposal && (
                   <div className="mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                     <p className="text-[10px] font-black text-amber-700 mb-2">אורלי הציעה שינוי:</p>
                     <p className="text-xs font-bold text-slate-600 mb-3">{new Date(apt.changeProposal.startTime).toLocaleString('he-IL')}</p>
                     <button onClick={() => handleApproveProposal(apt)} className="w-full py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black">אשרי שינוי</button>
                   </div>
                )}
                <div className="flex flex-col gap-3">
                  {apt.status === 'confirmed' && !apt.confirmedByClient && (
                    <button disabled={!canConfirm} onClick={() => updateAppointment(apt.id, { confirmedByClient: true })} className={`w-full py-3 rounded-2xl font-black text-xs ${canConfirm ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                      {canConfirm ? 'אישור הגעה' : 'אישור הגעה (נפתח 48 שעות לפני)'}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => canReschedule && setReschedulingApt(apt)} 
                    disabled={!canReschedule}
                    className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 ${canReschedule ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  >
                    {canReschedule ? <RefreshCw size={14} /> : <Lock size={14} />}
                    {canReschedule ? 'שינוי מועד' : 'שינוי ננעל לאחר אישור הגעה'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {reschedulingApt && (
        <RescheduleModal 
          apt={reschedulingApt} 
          onClose={() => setReschedulingApt(null)} 
          onSave={handleRescheduleSubmit}
          onSendSwapRequest={(target) => handleSendSwapRequest(target, reschedulingApt)}
          groupedDates={groupedDates}
          businessHours={businessHours}
          dateOverrides={state.dateOverrides}
          getCollidingAppointment={(d, t) => state.appointments.find(a => isSameDay(new Date(a.startTime), new Date(d)) && a.employeeId === reschedulingApt.employeeId && a.status !== 'cancelled' && new Date(a.startTime).getHours() === parseInt(t.split(':')[0]) && new Date(a.startTime).getMinutes() === parseInt(t.split(':')[1]))}
        />
      )}
    </div>
  );
};

const RescheduleModal: React.FC<{
  apt: Appointment;
  onClose: () => void;
  onSave: (date: string, time: string) => void;
  onSendSwapRequest: (targetApt: Appointment) => void;
  groupedDates: { [key: string]: string[] };
  businessHours: { [key: number]: DayConfig };
  getCollidingAppointment: (date: string, time: string) => Appointment | undefined;
  dateOverrides?: { [date: string]: DayConfig };
}> = ({ onClose, onSave, onSendSwapRequest, groupedDates, businessHours, getCollidingAppointment, dateOverrides }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [collidingApt, setCollidingApt] = useState<Appointment | null>(null);
  const [selTime, setSelTime] = useState<string | null>(null);

  // Generate dynamic time slots for rescheduling
  const timeSlots = useMemo(() => {
    if (!selDate) return [];
    
    // Check override first
    let config;
    if (dateOverrides && dateOverrides[selDate]) {
        config = dateOverrides[selDate];
    } else {
        const dayOfWeek = new Date(selDate).getDay();
        config = businessHours[dayOfWeek];
    }
    
    if (!config || !config.isOpen) return [];

    const slots: string[] = [];
    const [startH, startM] = config.start.split(':').map(Number);
    const [endH, endM] = config.end.split(':').map(Number);
    
    let currentH = startH;
    let currentM = startM;

    while (currentH < endH || (currentH === endH && currentM < endM)) {
        slots.push(`${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`);
        currentM += 30;
        if (currentM >= 60) {
            currentH++;
            currentM = 0;
        }
    }
    return slots;
  }, [selDate, businessHours, dateOverrides]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[250] flex items-center justify-center p-4 text-right">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black">שינוי מועד</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6">
          {step === 1 && (
             <div className="space-y-4">
                <p className="font-bold">בחרי יום חדש:</p>
                {(Object.entries(groupedDates) as [string, string[]][]).map(([month, dates]) => (
                  <div key={month} className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400">{month}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {dates.map(d => (
                        <button key={d} onClick={() => { setSelDate(d); setStep(2); }} className="p-2 border-2 rounded-xl text-center font-bold text-xs">{new Date(d).getDate()}</button>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          )}
          {step === 2 && selDate && (
            <div className="space-y-4">
              <button onClick={() => { setStep(1); setCollidingApt(null); }} className="text-xs text-slate-400">חזרה לתאריך</button>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map(t => {
                  const collision = getCollidingAppointment(selDate, t);
                  return (
                    <button key={t} onClick={() => { if(collision) setCollidingApt(collision); else { setSelTime(t); setCollidingApt(null); } }} className={`p-3 border rounded-xl text-xs font-bold ${collision ? 'bg-slate-50 text-slate-300' : 'hover:border-pink-300'}`}>{t}</button>
                  );
                })}
                {timeSlots.length === 0 && <p className="col-span-4 text-center text-slate-400">אין תורים פנויים ביום זה</p>}
              </div>
              {collidingApt && (
                <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100 mt-6">
                  <p className="text-xs font-bold text-pink-600 mb-4">השעה תפוסה. תרצי לשלוח בקשת החלפה ללקוחה אחרת?</p>
                  <button onClick={() => onSendSwapRequest(collidingApt)} className="w-full bg-pink-600 text-white py-3 rounded-xl font-black text-xs">שלחי בקשת החלפה</button>
                </div>
              )}
              {selTime && !collidingApt && (
                <button onClick={() => onSave(selDate, selTime)} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black">עדכון ל-{selTime}</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
