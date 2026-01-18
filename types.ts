
export enum Role {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  color: string;
  category: 'nail' | 'laser' | 'facial';
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  employeeId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmedByClient: boolean;
  priceAtBooking: number; // Added to store customized price
  notes?: string;
  receiptImage?: string; // Base64 image of receipt
  receiptRequested?: boolean; // If client requested receipt
  changeProposal?: {
    startTime: string;
    endTime: string;
    priceAtBooking: number;
  };
  incomingSwapRequest?: {
    fromAppointmentId: string;
    requestingClientId: string;
  };
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'alert';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  password?: string;
  healthDeclarationSigned: boolean;
  lastVisit?: string;
  notes: string[];
  notifications?: AppNotification[];
  canRescheduleConfirmed?: boolean; // New field for admin control
}

export interface Employee {
  id: string;
  name: string;
  services: string[]; // service IDs
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export interface DayConfig {
  isOpen: boolean;
  start: string; // Format "HH:mm" e.g. "09:00"
  end: string;   // Format "HH:mm" e.g. "17:00"
}

export interface AppState {
  role: Role;
  currentUser: Client | null;
  services: Service[];
  appointments: Appointment[];
  clients: Client[];
  employees: Employee[];
  products: Product[];
  waitingList: { clientId: string; serviceId: string; preferredDate: string }[];
  adminNotifications?: AppNotification[];
  businessHours?: { [key: number]: DayConfig }; // 0 (Sunday) to 6 (Saturday)
  dateOverrides?: { [date: string]: DayConfig }; // Specific date overrides "YYYY-MM-DD"
}
