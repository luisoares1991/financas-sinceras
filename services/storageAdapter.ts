import { db } from "./firebase";
import { 
  collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc 
} from "firebase/firestore";
import { Transaction, MarketItem, User } from "../types";

// Helper para saber se é convidado
const isGuest = (user: User) => user.isGuest;

// --- TRANSACTIONS ---

export const subscribeTransactions = (user: User, callback: (data: Transaction[]) => void) => {
  if (isGuest(user)) {
    // Modo Convidado: Lê do LocalStorage
    const saved = localStorage.getItem('fs_transactions');
    callback(saved ? JSON.parse(saved) : []);
    return () => {}; // Retorna função de limpeza vazia
  } else {
    // Modo Nuvem: Ouve o Firestore em tempo real
    const q = query(collection(db, `users/${user.id}/transactions`));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      callback(data);
    });
  }
};

export const addTransaction = async (user: User, transaction: Transaction) => {
  if (isGuest(user)) {
    const saved = JSON.parse(localStorage.getItem('fs_transactions') || '[]');
    const newData = [transaction, ...saved];
    localStorage.setItem('fs_transactions', JSON.stringify(newData));
  } else {
    // Remove o ID gerado localmente para o Firestore gerar um novo, ou usa setDoc se quiser manter o ID
    const { id, ...rest } = transaction;
    // Usamos setDoc com o ID que geramos no front para consistência, ou addDoc
    await setDoc(doc(db, `users/${user.id}/transactions`, transaction.id), transaction);
  }
};

export const updateTransaction = async (user: User, transaction: Transaction) => {
  if (isGuest(user)) {
    const saved = JSON.parse(localStorage.getItem('fs_transactions') || '[]');
    const newData = saved.map((t: Transaction) => t.id === transaction.id ? transaction : t);
    localStorage.setItem('fs_transactions', JSON.stringify(newData));
  } else {
    await updateDoc(doc(db, `users/${user.id}/transactions`, transaction.id), { ...transaction });
  }
};

export const deleteTransactionAdapter = async (user: User, id: string) => {
  if (isGuest(user)) {
    const saved = JSON.parse(localStorage.getItem('fs_transactions') || '[]');
    const newData = saved.filter((t: Transaction) => t.id !== id);
    localStorage.setItem('fs_transactions', JSON.stringify(newData));
  } else {
    await deleteDoc(doc(db, `users/${user.id}/transactions`, id));
  }
};

// --- MARKET ITEMS ---

export const subscribeMarketItems = (user: User, callback: (data: MarketItem[]) => void) => {
  if (isGuest(user)) {
    const saved = localStorage.getItem('fs_market_items');
    callback(saved ? JSON.parse(saved) : []);
    return () => {};
  } else {
    const q = query(collection(db, `users/${user.id}/market_items`));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketItem));
      callback(data);
    });
  }
};

export const addMarketItemsBatch = async (user: User, items: MarketItem[]) => {
  if (isGuest(user)) {
    const saved = JSON.parse(localStorage.getItem('fs_market_items') || '[]');
    const newData = [...items, ...saved];
    localStorage.setItem('fs_market_items', JSON.stringify(newData));
  } else {
    const batchPromises = items.map(item => 
      setDoc(doc(db, `users/${user.id}/market_items`, item.id), item)
    );
    await Promise.all(batchPromises);
  }
};

// --- SETTINGS (Categories & Theme) ---

export const loadUserSettings = async (user: User): Promise<{
  incomeCategories?: string[], 
  expenseCategories?: string[],
  theme?: 'light' | 'dark' | 'system'
}> => {
  if (isGuest(user)) {
    return {
      incomeCategories: JSON.parse(localStorage.getItem('fs_income_cats') || 'null'),
      expenseCategories: JSON.parse(localStorage.getItem('fs_expense_cats') || 'null'),
      theme: localStorage.getItem('fs_theme') as any
    };
  } else {
    const docRef = doc(db, 'users', user.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as any;
    }
    return {};
  }
};

export const saveUserSettings = async (user: User, settings: any) => {
  if (isGuest(user)) {
    if (settings.incomeCategories) localStorage.setItem('fs_income_cats', JSON.stringify(settings.incomeCategories));
    if (settings.expenseCategories) localStorage.setItem('fs_expense_cats', JSON.stringify(settings.expenseCategories));
    if (settings.theme) localStorage.setItem('fs_theme', settings.theme);
  } else {
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, settings, { merge: true });
  }
};

export const clearAllData = async (user: User) => {
  if (isGuest(user)) {
    localStorage.removeItem('fs_transactions');
    localStorage.removeItem('fs_market_items');
  } else {
    // Note: Deleting collections in Firestore client-side is hard (requires cloud functions or looping).
    // For simplicity, we won't implement recursive delete here to avoid complexity, 
    // but in a real app you'd call a Cloud Function.
    alert("No modo nuvem, por segurança, a exclusão em massa via web foi desabilitada temporariamente. Exclua os itens individualmente.");
  }
};