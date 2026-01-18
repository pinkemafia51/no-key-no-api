import React, { useState, useMemo } from 'react';
import { AppState, Appointment, Service, Employee } from '../types';
import { X, ChevronLeft, ChevronRight, Clock, User, Check, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { DEFAULT_BUSINESS_HOURS } from '../constants';

interface BookingFlowProps {
  state: AppState;
  onComplete: (apt: Appointment) => void;
  onCancel: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({ state, onComplete, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const businessHours = state.businessHours || DEFAULT_BUSINESS_HOURS;

  // Generate dates for the next 90 days, filtering out closed days
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
        // If overridden and isOpen is false, don't push (Day Off)
      } else {
        // Fallback to weekly schedule
        const dayOfWeek = d.getDay(); 
        if (businessHours[dayOfWeek]?.isOpen) {
          dates.push(dateStr);
        }
      }
    }
    return dates;
  }, [businessHours, state.dateOverrides]);

  // Group dates by month for better UI
  const groupedDates = useMemo(() => {
    const groups: { [key: string]: string[] } = {};
    availableDates.forEach(date => {
      const month = new Date(date).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(date);
    });
    return groups;
  }, [availableDates]);

  // Calculate valid employees for the selected service
  // Logic: 
  // 1. Try to find employees assigned to this service.
  // 2. If none, check if there are ANY employees in the system, show all of them.
  // 3. If NO employees exist in system at all, return a dummy "General Staff" employee so booking isn't blocked.
  const availableEmployees = useMemo(() => {
      if (!selectedService) return [];
      
      // 1. Specific assignment
      const assigned = state.employees.filter(e => e.services.includes(selectedService.id));
      if (assigned.length > 0) return assigned;

      // 2. Fallback to all employees (if unassigned)
      if (state.employees.length > 0) return state.employees;

      // 3. Absolute fallback if employee list is empty
      return [{ id: 'default', name: 'צוות המכון', services: [selectedService.id] }];
  }, [state.employees, selectedService]);

  const hasActiveBookingForService = (serviceId: string) => {
    if (!state.currentUser) return false;
    const now = new Date();
    return state.appointments.some(apt => 
      apt.clientId === state.currentUser?.id && 
      apt.serviceId === serviceId && 
      (apt.status === 'pending' || apt.status === 'confirmed') &&
      new Date(apt.startTime) > now
    );
  };

  const handleServiceSelect = (service: Service) => {
    if (hasActiveBookingForService(service.id)) {
      alert(`כבר קיים לך תור עתידי ל${service.name}. ניתן לקבוע תור חדש רק לאחר סיום התור הקיים.`);
      return;
    }
    setSelectedService(service);
    setStep(2);
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setStep(3);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep(4);
  };

  const isTimeSlotOccupied = (date: string, time: string) => {
    if (!selectedEmployee || !selectedService) return false;
    
    // Proper date construction to avoid timezone issues
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    const checkStart = new Date(y, m - 1, d, h, min);
    const checkEnd = new Date(checkStart.getTime() + selectedService.duration * 60000);

    return state.appointments.some(apt => {
      if (apt.status === 'cancelled') return false;
      // If we are using the default dummy employee, we still check availability generally
      // but if we have a real employee ID, we check against that specific ID.
      const isSameEmployee = selectedEmployee.id === 'default' ? true : apt.employeeId === selectedEmployee.id;
      if (!isSameEmployee) return false;
      
      const aptStart = new Date(apt.startTime).getTime();
      const aptEnd = new Date(apt.endTime).getTime();
      const newStart = checkStart.getTime();
      const newEnd = checkEnd.getTime();
      
      return (newStart < aptEnd) && (newEnd > aptStart);
    });
  };

  const handleFinish = () => {
    if (!selectedService || !selectedEmployee || !selectedDate || !selectedTime || !state.currentUser) return;

    // Proper date construction to avoid timezone issues
    const [y, m, d] = selectedDate.split('-').map(Number);
    const [h, min] = selectedTime.split(':').map(Number);
    const startTime = new Date(y, m - 1, d, h, min);

    const endTime = new Date(startTime.getTime() + selectedService.duration * 60000);

    const newApt: Appointment = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: state.currentUser.id,
      serviceId: selectedService.id,
      employeeId: selectedEmployee.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: 'pending',
      confirmedByClient: false,
      priceAtBooking: selectedService.price,
    };

    onComplete(newApt);
    onCancel();
  };

  // Generate dynamic time slots based on selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    // Check override first
    let config;
    if (state.dateOverrides && state.dateOverrides[selectedDate]) {
        config = state.dateOverrides[selectedDate];
    } else {
        const dayOfWeek = new Date(selectedDate).getDay();
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
  }, [selectedDate, businessHours, state.dateOverrides]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between bg-slate-50">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
          <div className="text-right">
            <h3 className="text-xl font-bold">קביעת תור</h3>
            <div className="flex gap-2 mt-1 justify-end">
              <div className={`h-1.5 w-8 rounded-full ${step >= 4 ? 'bg-pink-500' : 'bg-slate-200'}`}></div>
              <div className={`h-1.5 w-8 rounded-full ${step >= 3 ? 'bg-pink-500' : 'bg-slate-200'}`}></div>
              <div className={`h-1.5 w-8 rounded-full ${step >= 2 ? 'bg-pink-500' : 'bg-slate-200'}`}></div>
              <div className={`h-1.5 w-8 rounded-full ${step >= 1 ? 'bg-pink-500' : 'bg-slate-200'}`}></div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-right">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 justify-end">
                <h4 className="font-bold text-slate-800 text-lg">איזה טיפול תרצי לעשות היום?</h4>
                <Check className="text-pink-500" size={20} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.services.map(service => {
                  const isBlocked = hasActiveBookingForService(service.id);
                  return (
                    <button 
                      key={service.id} 
                      onClick={() => handleServiceSelect(service)} 
                      className={`p-5 border-2 rounded-2xl text-right transition-all group relative overflow-hidden ${
                        isBlocked 
                        ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60' 
                        : 'border-slate-100 hover:border-pink-300 hover:bg-pink-50'
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <span className="text-pink-600 font-bold">₪{service.price}</span>
                        <span className="font-bold text-lg group-hover:text-pink-700">{service.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 justify-end"><Clock size={14} />{service.duration} דקות</div>
                      {isBlocked && (
                        <div className="absolute inset-0 bg-white/40 flex items-center justify-center">
                          <span className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg font-bold">כבר קבוע תור לטיפול זה</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <button onClick={() => setStep(1)} className="text-slate-400 text-sm flex items-center gap-1 mb-4 hover:text-pink-600 justify-end w-full">חזרה לשירותים <ChevronRight size={16} /></button>
              <h4 className="font-bold text-slate-800 text-lg mb-4">עם מי תרצי לעבור את הטיפול?</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableEmployees.map(employee => (
                  <button key={employee.id} onClick={() => handleEmployeeSelect(employee)} className="p-5 border-2 border-slate-100 rounded-2xl flex items-center gap-4 hover:border-pink-300 hover:bg-pink-50 transition-all justify-end">
                    <div className="text-right flex-1"><span className="font-bold text-lg block">{employee.name}</span><span className="text-xs text-slate-500">בחירה מעולה</span></div>
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500"><User /></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <button onClick={() => setStep(2)} className="text-slate-400 text-sm flex items-center gap-1 mb-4 hover:text-pink-600 justify-end w-full">חזרה לעובדים <ChevronRight size={16} /></button>
              <div className="space-y-8">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg mb-4">באיזה יום תרצי להגיע?</h4>
                  <div className="space-y-6 px-1">
                    {(Object.entries(groupedDates) as [string, string[]][]).map(([month, dates]) => (
                      <div key={month} className="space-y-3">
                        <h5 className="font-black text-slate-400 text-xs border-b pb-1 uppercase tracking-widest">{month}</h5>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {dates.map(date => (
                            <button 
                              key={date} 
                              onClick={() => handleDateSelect(date)} 
                              className={`p-2 rounded-xl border-2 flex flex-col items-center gap-0.5 transition-all ${selectedDate === date ? 'border-pink-500 bg-pink-50' : 'border-slate-50 hover:border-slate-200'}`}
                            >
                              <span className="text-[9px] text-slate-400 font-bold">{new Date(date).toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                              <span className="text-xs font-bold">{new Date(date).getDate()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && selectedDate && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <button onClick={() => setStep(3)} className="text-slate-400 text-sm flex items-center gap-1 mb-4 hover:text-pink-600 justify-end w-full">חזרה לבחירת תאריך <ChevronRight size={16} /></button>
              <div className="animate-in fade-in duration-500">
                <h4 className="font-bold text-slate-800 text-lg mb-4">באיזו שעה ביום {new Date(selectedDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}?</h4>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(time => {
                    const occupied = isTimeSlotOccupied(selectedDate, time);
                    return (
                      <button 
                        key={time} 
                        disabled={occupied}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                          occupied ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed' :
                          selectedTime === time ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'border-slate-200 text-slate-600 hover:border-pink-300'
                        }`}
                      >
                        {time}
                        {occupied && <span className="text-[8px]">תפוס</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 4 && (
          <div className="p-6 border-t bg-slate-50">
            <button disabled={!selectedDate || !selectedTime} onClick={handleFinish} className="w-full bg-pink-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-pink-100 disabled:opacity-50 hover:bg-pink-700 transition-all">
              {selectedDate && selectedTime 
                ? `שלחי בקשה לתור ב-${selectedTime}`
                : 'בחרי שעה להמשך'
              }
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">התור כפוף לאישור סופי של המנהלת</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingFlow;