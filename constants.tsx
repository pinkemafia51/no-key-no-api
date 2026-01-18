import React from 'react';
import { Service, Employee, Product, Role, DayConfig } from './types';

export const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'מניקור ג׳ל', duration: 60, price: 150, color: '#fca5a5', category: 'nail' },
  { id: '2', name: 'פדיקור רפואי', duration: 90, price: 200, color: '#93c5fd', category: 'nail' },
  { id: '3', name: 'טיפול פנים קלאסי', duration: 75, price: 350, color: '#d8b4fe', category: 'facial' },
  { id: '4', name: 'לייזר גוף מלא', duration: 120, price: 500, color: '#86efac', category: 'laser' },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'אורלי (בעלת העסק)', services: ['1', '2', '3', '4'] },
  { id: 'e2', name: 'רוני', services: ['1', '2'] },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'שמן הזנה לציפורניים', price: 45, image: 'https://picsum.photos/seed/nailoil/200/200', description: 'שמן טבעי לחיזוק הציפורן' },
  { id: 'p2', name: 'קרם ידיים יוקרתי', price: 80, image: 'https://picsum.photos/seed/handcream/200/200', description: 'לחות אינטנסיבית בניחוח וניל' },
  { id: 'p3', name: 'ערכת שיוף ביתית', price: 30, image: 'https://picsum.photos/seed/filekit/200/200', description: 'כל מה שצריך לתחזוקה בבית' },
];

export const DEFAULT_BUSINESS_HOURS: { [key: number]: DayConfig } = {
  0: { isOpen: true, start: '09:00', end: '17:00' }, // Sunday
  1: { isOpen: true, start: '09:00', end: '20:00' }, // Monday
  2: { isOpen: true, start: '09:00', end: '20:00' }, // Tuesday
  3: { isOpen: true, start: '09:00', end: '20:00' }, // Wednesday
  4: { isOpen: true, start: '09:00', end: '20:00' }, // Thursday
  5: { isOpen: false, start: '09:00', end: '13:00' }, // Friday
  6: { isOpen: false, start: '20:00', end: '23:00' }, // Saturday
};

export const BUSINESS_HOURS = {
  start: 9,
  end: 20,
};

export const CONTACT_INFO = {
  phone: '0509023220',
  address: 'הכרמל 21, אור עקיבא',
  wazeLink: 'https://waze.com/ul/hsvbbfx9sr',
  instagram: 'https://instagram.com/hakasem_she_be_yofi',
  facebook: 'https://facebook.com/hakasem_she_be_yofi',
  whatsapp: 'https://wa.me/972509023220',
};