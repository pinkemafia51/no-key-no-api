
import { AppState, Role, Client } from './types';
import { INITIAL_SERVICES, INITIAL_EMPLOYEES, INITIAL_PRODUCTS, DEFAULT_BUSINESS_HOURS } from './constants';

// --- הגדרות קובץ הנתונים ---
// מנסה לטעון משתני סביבה, ואם לא קיים - משתמש בערכים המוטמעים כגיבוי
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // בדיקה בטוחה עבור סביבות שונות (Node, Vite, וכו')
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // התעלמות משגיאות גישה למשתני סביבה
  }
  return fallback;
};

const CLOUD_FILE_URL = getEnvVar('JSONBIN_URL', 'https://api.jsonbin.io/v3/b/6969f86fd0ea881f406f8404');
const CLOUD_API_KEY = getEnvVar('JSONBIN_API_KEY', '$2a$10$l3wvlupcd0Mf9cAdjlxQsOLkB1lL3b7IDjvag7jVb5oizEgSeVhcG');

const LOCAL_KEY = 'beauty_hub_data';

const INITIAL_DB_STATE: AppState = {
  role: Role.CLIENT,
  currentUser: null,
  services: INITIAL_SERVICES,
  appointments: [],
  clients: [
    { 
      id: 'c1', 
      name: 'ישראל ישראלי', 
      phone: '0501234567', 
      password: '123', 
      healthDeclarationSigned: true, 
      notes: ['אלרגיה ללטקס'], 
      notifications: [] 
    },
  ],
  employees: INITIAL_EMPLOYEES,
  products: INITIAL_PRODUCTS,
  waitingList: [],
  adminNotifications: [],
  businessHours: DEFAULT_BUSINESS_HOURS,
  dateOverrides: {},
};

export const readDataFile = async (): Promise<AppState> => {
  if (CLOUD_FILE_URL) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      // שימוש רק במפתח מאסטר כדי למנוע שגיאות הרשאה/CORS
      if (CLOUD_API_KEY) {
        headers['X-Master-Key'] = CLOUD_API_KEY;
      }

      const response = await fetch(CLOUD_FILE_URL, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const json = await response.json();
        const cloudData = json.record || json;
        
        // בדיקה שהמידע תקין - אם הקובץ ריק או חסרים שדות, נשלים מתוך הנתונים ההתחלתיים
        const validData: AppState = {
            ...INITIAL_DB_STATE,
            ...cloudData,
            // מוודאים שהמערכים קיימים (מונע קריסה בקובץ חדש)
            clients: Array.isArray(cloudData.clients) ? cloudData.clients : INITIAL_DB_STATE.clients,
            appointments: Array.isArray(cloudData.appointments) ? cloudData.appointments : [],
            services: Array.isArray(cloudData.services) ? cloudData.services : INITIAL_DB_STATE.services,
            // דריסה של currentUser כדי לא לשמור סשן ישן
            currentUser: null,
            role: Role.CLIENT
        };

        // עדכון גיבוי מקומי
        localStorage.setItem(LOCAL_KEY, JSON.stringify(validData));
        return validData;
      } else {
        console.warn('Cloud read returned status:', response.status);
      }
    } catch (e) {
      console.error('Failed to read from cloud, using local backup', e);
    }
  }

  // Fallback to local
  const local = localStorage.getItem(LOCAL_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {}
  }

  return INITIAL_DB_STATE;
};

export const writeDataFile = async (state: AppState): Promise<void> => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));

  if (CLOUD_FILE_URL && CLOUD_API_KEY) {
    // מנקים מידע מקומי שלא אמור להיות משותף
    const stateToSave = { 
      ...state, 
      role: Role.CLIENT, 
      currentUser: null 
    };

    try {
      await fetch(CLOUD_FILE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': CLOUD_API_KEY,
          'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify(stateToSave)
      });
    } catch (e) {
      console.error('Failed to save to cloud', e);
    }
  }
};

export const loadDatabase = (): AppState => {
  const local = localStorage.getItem(LOCAL_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {}
  }
  return INITIAL_DB_STATE;
};
