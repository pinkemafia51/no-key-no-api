
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Role, AppState, Client, Appointment, Service, Employee, AppNotification } from './types';
import { readDataFile, writeDataFile, loadDatabase } from './db';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import ClientPortal from './components/ClientPortal';
import LandingPage from './components/LandingPage';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => loadDatabase());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // מעקב אחרי זמן השינוי האחרון המקומי כדי למנוע דריסה ע"י סנכרון
  const lastLocalUpdate = useRef<number>(0);
  const isFirstLoad = useRef(true);

  // פונקציה לסינכרון נתונים מהקובץ המרכזי
  const syncFromFile = useCallback(async () => {
    // אם המשתמש ביצע שינוי ב-5 שניות האחרונות, נדלג על הסנכרון הזה
    // כדי לתת לשינוי שלו להישמר בענן קודם, וכדי למנוע "קפיצות" בממשק
    if (Date.now() - lastLocalUpdate.current < 5000) {
      return;
    }

    const cloudData = await readDataFile();
    
    setAppState(prevState => {
      // אם אני אדמין, אני המקור האמין להגדרות (שירותים, שעות וכו')
      // לכן לא נדרוס את ההגדרות המקומיות שלי עם מה שיש בענן (שיכול להיות ישן יותר)
      // אלא נמשוך רק נתונים שמשתמשים אחרים יוצרים (תורים, לקוחות)
      if (prevState.role === Role.ADMIN) {
        return {
          ...prevState,
          // מיזוג חכם: לוקחים תורים מהענן אבל שומרים על המבנה המקומי
          appointments: cloudData.appointments, 
          clients: cloudData.clients,
          waitingList: cloudData.waitingList,
          adminNotifications: cloudData.adminNotifications, // אולי לקוח שלח הודעה
          // משאירים את ההגדרות המקומיות כפי שהן כדי לא לשבש עריכה
        };
      }

      // אם אני לקוח, אני רוצה לקבל את כל ההגדרות העדכניות מהאדמין
      const newState = { 
        ...cloudData, 
        role: prevState.role,
        currentUser: prevState.currentUser
      };

      // עדכון נתוני המשתמש המחובר
      if (prevState.currentUser) {
        const updatedUser = cloudData.clients.find(c => c.id === prevState.currentUser?.id);
        if (updatedUser) {
          newState.currentUser = updatedUser;
        }
      }

      return newState;
    });
  }, []);

  // בדיקת עדכונים כל 5 שניות
  useEffect(() => {
    syncFromFile();
    const intervalId = setInterval(syncFromFile, 5000); 
    return () => clearInterval(intervalId);
  }, [syncFromFile]);

  // שמירה בעת שינוי
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    
    // עדכון הזמן האחרון שבו בוצע שינוי מקומי
    lastLocalUpdate.current = Date.now();

    const timeoutId = setTimeout(() => {
      writeDataFile(appState);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [appState]);

  const handleLogin = async (role: Role, user?: Client) => {
    await syncFromFile();
    setAppState(prev => ({ ...prev, role, currentUser: user || null }));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAppState(prev => ({ ...prev, currentUser: null, role: Role.CLIENT }));
  };

  const registerClient = async (newClient: Client) => {
    try {
        // קריאה מהענן כדי לוודא שאין כפילויות ושאנחנו עובדים עם המידע העדכני ביותר
        const currentCloudData = await readDataFile();
        
        if (currentCloudData.clients.some(c => c.phone === newClient.phone)) {
            alert('המשתמש כבר קיים במערכת!');
            return;
        }

        const clientWithNotifs = { ...newClient, notifications: [] };
        
        // יצירת אובייקט מידע חדש עם הלקוח הנוסף
        const newState = {
          ...currentCloudData,
          clients: [...currentCloudData.clients, clientWithNotifs]
        };
        
        // עדכון ה-State המקומי מיידית לחוויית משתמש מהירה
        setAppState({
            ...newState,
            role: Role.CLIENT,
            currentUser: clientWithNotifs
        });
        
        // שמירה מפורשת לענן (JSONBin) לוודא שהלקוח נשמר
        await writeDataFile(newState);
        console.log('User registered and saved to cloud successfully');
        
        setIsLoggedIn(true);
    } catch (error) {
        console.error('Failed to register client to cloud:', error);
        alert('אירעה שגיאה בשמירת ההרשמה בענן. אנא נסי שנית.');
    }
  };

  const addAppointment = (appointment: Appointment) => {
    setAppState(prev => {
        const client = prev.clients.find(c => c.id === appointment.clientId);
        const service = prev.services.find(s => s.id === appointment.serviceId);
        
        const newNotification: AppNotification = {
            id: Math.random().toString(36).substr(2, 9),
            message: `בקשה לתור חדש: ${client?.name || 'לקוחה'} לטיפול ${service?.name || ''}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'alert'
        };

        return {
            ...prev,
            appointments: [...prev.appointments, appointment],
            adminNotifications: [...(prev.adminNotifications || []), newNotification]
        };
    });
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppState(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const updateService = (updatedService: Service) => {
    setAppState(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === updatedService.id ? updatedService : s)
    }));
  };

  const setGlobalState = (updater: (prev: AppState) => AppState) => {
    setAppState(prev => updater(prev));
  };

  if (!isLoggedIn) {
    return (
      <LandingPage 
        onLogin={handleLogin} 
        onRegister={registerClient}
        existingClients={appState.clients}
      />
    );
  }

  return (
    <Layout 
      role={appState.role} 
      onLogout={handleLogout} 
      userName={appState.currentUser?.name || (appState.role === Role.ADMIN ? 'אורלי' : 'אורח')}
    >
      {appState.role === Role.ADMIN ? (
        <AdminDashboard 
          state={appState} 
          updateAppointment={updateAppointment}
          updateService={updateService}
          setAppState={setGlobalState as any}
        />
      ) : (
        <ClientPortal 
          state={appState} 
          addAppointment={addAppointment}
          updateAppointment={updateAppointment}
          setAppState={setGlobalState as any}
        />
      )}
    </Layout>
  );
};

export default App;
