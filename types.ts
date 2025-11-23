
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string; // ISO string
}

export interface MarketItem {
  id: string;
  receiptId: string; // Grouping Key
  name: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  date: string;
  merchant: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
}

export enum Persona {
  FORMAL = 'formal',
  SINCERO = 'sincero'
}

export interface DashboardStats {
  balance: number;
  income: number;
  expense: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  isGuest: boolean;
}
