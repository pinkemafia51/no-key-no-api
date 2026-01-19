
import { AppState, Role, Client, Appointment } from './types';
import { INITIAL_SERVICES, INITIAL_EMPLOYEES, INITIAL_PRODUCTS, DEFAULT_BUSINESS_HOURS } from './constants';

// --- הגדרות קובץ הנתונים ---
const getEnvVar = (key: string, fallback: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // Ignore
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

// --- Storage Interfaces (המבנה החדש של ה-JSON) ---
interface UserFolder {
  details: Omit<Client, 'notifications'>;
  notifications: any[];
  appointments: Appointment[]; // תורים ששייכים ללקוח הזה
  receipts: Record<string, string>; // מיפוי ID של תור -> תמונת קבלה (base64)
}

interface StructuredStorage {
  version: string;
  system: {
    services: any[];
    employees: any[];
    products: any[];
    businessHours: any;
    dateOverrides: any;
    adminNotifications: any[];
    waitingList: any[];
  };
  users: Record<string, UserFolder>; // ה"תיקייה" של המשתמשים
}

// פונקציית עזר להמיר את המצב השטוח למבנה תיקיות
const convertStateToStorage = (state: AppState): StructuredStorage => {
  const storage: StructuredStorage = {
    version: '2.0',
    system: {
      services: state.services,
      employees: state.employees,
      products: state.products,
      businessHours: state.businessHours,
      dateOverrides: state.dateOverrides,
      adminNotifications: state.adminNotifications || [],
      waitingList: state.waitingList
    },
    users: {}
  };

  // יצירת תיקייה לכל משתמש
  state.clients.forEach(client => {
    // הפרדת תמונות הקבלה מהתורים כדי לשמור אותן ב"קובץ" נפרד
    const clientAppointments = state.appointments.filter(a => a.clientId === client.id);
    const receipts: Record<string, string> = {};
    
    const cleanAppointments = clientAppointments.map(apt => {
      if (apt.receiptImage) {
        receipts[apt.id] = apt.receiptImage;
      }
      // מחזירים עותק של התור ללא התמונה הכבדה (היא נשמרת בנפרד)
      const { receiptImage, ...aptWithoutImage } = apt;
      return aptWithoutImage as Appointment;
    });

    const { notifications, ...clientDetails } = client;

    storage.users[client.id] = {
      details: clientDetails,
      notifications: notifications || [],
      appointments: cleanAppointments,
      receipts: receipts
    };
  });

  return storage;
};

// פונקציית עזר להמיר את מבנה התיקיות חזרה למצב שטוח לאפליקציה
const convertStorageToState = (data: any): AppState => {
  // תמיכה לאחור בגרסה הישנה (אם המבנה הוא שטוח)
  if (!data.users && (data.clients || data.record?.clients)) {
    const legacy = data.record || data;
    return {
      ...INITIAL_DB_STATE,
      ...legacy,
      currentUser: null,
      role: Role.CLIENT
    };
  }

  const storage = (data.record || data) as StructuredStorage;
  
  // שחזור רשימת הלקוחות
  const clients: Client[] = Object.values(storage.users || {}).map(folder => ({
    ...folder.details,
    notifications: folder.notifications || []
  }));

  // שחזור רשימת התורים המלאה + חיבור מחדש של הקבלות
  const appointments: Appointment[] = [];
  Object.values(storage.users || {}).forEach(folder => {
    if (folder.appointments) {
      folder.appointments.forEach(apt => {
        // אם יש קבלה שמורה בתיקיית הקבלות, נחזיר אותה לאובייקט התור
        const receiptImg = folder.receipts?.[apt.id];
        appointments.push({
          ...apt,
          receiptImage: receiptImg || undefined
        });
      });
    }
  });

  return {
    role: Role.CLIENT,
    currentUser: null,
    services: storage.system?.services || INITIAL_SERVICES,
    employees: storage.system?.employees || INITIAL_EMPLOYEES,
    products: storage.system?.products || INITIAL_PRODUCTS,
    businessHours: storage.system?.businessHours || DEFAULT_BUSINESS_HOURS,
    dateOverrides: storage.system?.dateOverrides || {},
    adminNotifications: storage.system?.adminNotifications || [],
    waitingList: storage.system?.waitingList || [],
    clients,
    appointments
  };
};

export const readDataFile = async (): Promise<AppState> => {
  if (CLOUD_FILE_URL) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (CLOUD_API_KEY) {
        headers['X-Master-Key'] = CLOUD_API_KEY;
      }

      const response = await fetch(CLOUD_FILE_URL, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const json = await response.json();
        const validData = convertStorageToState(json);

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

  const local = localStorage.getItem(LOCAL_KEY);
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {}
  }

  return INITIAL_DB_STATE;
};

export const writeDataFile = async (state: AppState): Promise<void> => {
  // שמירה מקומית במבנה שטוח (לביצועים מהירים)
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));

  if (CLOUD_FILE_URL && CLOUD_API_KEY) {
    // המרה למבנה "תיקיות" לפני השמירה בענן
    const structuredData = convertStateToStorage(state);

    try {
      await fetch(CLOUD_FILE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': CLOUD_API_KEY,
          'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify(structuredData)
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
