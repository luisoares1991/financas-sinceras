import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ChatWidget from './components/ChatWidget';
import SettingsModal from './components/SettingsModal';
import BatchEntryModal from './components/BatchEntryModal';
import MarketSubApp from './components/MarketSubApp';
import LoginScreen from './components/LoginScreen';
import { Transaction, DashboardStats, MarketItem, User } from './types';
import { Plus, Filter, AlertTriangle, ListPlus, X, Loader2 } from 'lucide-react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  subscribeTransactions, addTransaction, updateTransaction, deleteTransactionAdapter,
  subscribeMarketItems, addMarketItemsBatch, loadUserSettings, saveUserSettings, clearAllData
} from './services/storageAdapter';

const DEFAULT_INCOME_CATS = ['Salário', 'Investimentos', 'Presente', 'Outros'];
const DEFAULT_EXPENSE_CATS = ['Alimentação', 'Mercado', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Compras', 'Outros'];

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATS);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATS);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // --- Auth & Data Subscriptions ---

  useEffect(() => {
    // Escuta mudanças na autenticação do Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Usuário Logado
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Usuário',
          email: firebaseUser.email || undefined,
          photoUrl: firebaseUser.photoURL || undefined,
          isGuest: false
        };
        setUser(newUser);
      } else {
        // Verifica se estava como convidado antes
        const guestSaved = localStorage.getItem('fs_user');
        if (guestSaved) {
           const parsed = JSON.parse(guestSaved);
           if (parsed.isGuest) setUser(parsed);
           else setUser(null);
        } else {
           setUser(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Persistência local do usuário (apenas para Guest mode)
  useEffect(() => {
    if (user?.isGuest) localStorage.setItem('fs_user', JSON.stringify(user));
    if (!user) localStorage.removeItem('fs_user');
  }, [user]);

  // Carregar dados quando o usuário muda
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setMarketItems([]);
      return;
    }

    // 1. Carregar Configurações (Categorias/Tema)
    loadUserSettings(user).then(settings => {
      if (settings.incomeCategories) setIncomeCategories(settings.incomeCategories);
      if (settings.expenseCategories) setExpenseCategories(settings.expenseCategories);
      if (settings.theme) setTheme(settings.theme);
    });

    // 2. Inscrever nas Transações (Sync Real-time)
    const unsubTrans = subscribeTransactions(user, (data) => {
      // Ordenar localmente para evitar necessidade de índice complexo no Firestore
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(sorted);
    });

    // 3. Inscrever no Mercadinho
    const unsubMarket = subscribeMarketItems(user, (data) => {
      setMarketItems(data);
    });

    return () => {
      unsubTrans();
      unsubMarket();
    };
  }, [user]);

  // --- Theme Effect ---
  useEffect(() => {
    // Salvar tema na nuvem/local
    if (user) saveUserSettings(user, { theme });

    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && systemDark)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    applyTheme();
  }, [theme, user]);

  // --- Computed Values (Same as before) ---
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentDate.getMonth() && 
             tDate.getFullYear() === currentDate.getFullYear();
    });
  }, [transactions, currentDate]);

  const filteredTransactions = useMemo(() => {
      return monthlyTransactions.filter(t => {
          const matchesType = typeFilter === 'all' ? true : t.type === typeFilter;
          const matchesCategory = categoryFilter === 'all' ? true : t.category === categoryFilter;
          return matchesType && matchesCategory;
      });
  }, [monthlyTransactions, typeFilter, categoryFilter]);

  const usedCategories = useMemo(() => {
      const cats = new Set(monthlyTransactions.map(t => t.category));
      return Array.from(cats).sort();
  }, [monthlyTransactions]);

  const calculateStats = (data: Transaction[]): DashboardStats => {
    const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  };

  const viewStats = useMemo(() => calculateStats(filteredTransactions), [filteredTransactions]);
  const fullMonthStats = useMemo(() => calculateStats(monthlyTransactions), [monthlyTransactions]);
  
  const topCategory = useMemo(() => {
      const catMap: Record<string, number> = {};
      monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
          catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });
      const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? sorted[0][0] : "Nenhuma";
  }, [monthlyTransactions]);

  // --- Handlers ---

  const handleLogin = (userData: User) => setUser(userData);
  const handleLogout = () => { setUser(null); setIsSettingsOpen(false); };

  const handleSaveTransaction = async (t: Transaction) => {
    if (!user) return;
    if (editingTransaction) {
       await updateTransaction(user, t);
    } else {
       await addTransaction(user, t);
    }
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const handleSaveBatch = async (newTransactions: Transaction[]) => {
    if (!user) return;
    for (const t of newTransactions) {
      await addTransaction(user, t);
    }
  };

  const handleSaveMarketReceipt = async (transaction: Transaction, items: MarketItem[]) => {
    if (!user) return;
    const receiptId = crypto.randomUUID();
    const transWithId = { ...transaction, id: receiptId }; // Use same ID for linking if needed
    
    await addTransaction(user, transWithId);
    
    const itemsWithId = items.map(item => ({ ...item, receiptId: receiptId }));
    await addMarketItemsBatch(user, itemsWithId);
    
    alert("Nota fiscal salva com sucesso!");
    setIsMarketOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    await deleteTransactionAdapter(user, id);
  };

  const handleClearAllData = async () => {
    if (!user) return;
    await clearAllData(user);
    setIsClearAllConfirmOpen(false);
    setIsSettingsOpen(false);
  };

  // Category Management
  const handleAddCategory = (type: 'income' | 'expense', name: string) => {
    if (!user) return;
    let newCats;
    if (type === 'income') {
      if (incomeCategories.includes(name)) return;
      newCats = [...incomeCategories, name];
      setIncomeCategories(newCats);
      saveUserSettings(user, { incomeCategories: newCats });
    } else {
      if (expenseCategories.includes(name)) return;
      newCats = [...expenseCategories, name];
      setExpenseCategories(newCats);
      saveUserSettings(user, { expenseCategories: newCats });
    }
  };

  const handleRemoveCategory = (type: 'income' | 'expense', name: string) => {
    if (!user) return;
    if (type === 'income') {
       const newCats = incomeCategories.filter(c => c !== name);
       setIncomeCategories(newCats);
       saveUserSettings(user, { incomeCategories: newCats });
    } else {
       const newCats = expenseCategories.filter(c => c !== name);
       setExpenseCategories(newCats);
       saveUserSettings(user, { expenseCategories: newCats });
    }
  };

  const handleRenameCategory = (type: 'income' | 'expense', oldName: string, newName: string) => {
    if (!user) return;
    // 1. Update List
    if (type === 'income') {
       const newCats = incomeCategories.map(c => c === oldName ? newName : c);
       setIncomeCategories(newCats);
       saveUserSettings(user, { incomeCategories: newCats });
    } else {
       const newCats = expenseCategories.map(c => c === oldName ? newName : c);
       setExpenseCategories(newCats);
       saveUserSettings(user, { expenseCategories: newCats });
    }
    // 2. Update Transactions (This is heavy in Firestore, might want to limit or warn)
    // For now, let's assume the user edits transactions manually or we implement a batch update later.
    // In local mode it was easy, in Firestore it requires fetching all matching docs and updating them.
    alert("Nota: As transações antigas manterão o nome da categoria anterior por enquanto.");
  };

  // CSV Export/Import (Keep logic mostly same, but use current transactions state)
  const handleExportCSV = () => {
    if (transactions.length === 0) { alert("Sem dados."); return; }
    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor"];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      t.type === 'income' ? 'Entrada' : 'Saída',
      t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    ]);
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_financas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const text = evt.target?.result as string;
        const lines = text.split('\n');
        const newTrans: Transaction[] = [];
        lines.forEach((line, idx) => {
            if (idx === 0) return; 
            const separator = line.includes(';') ? ';' : ',';
            const cols = line.split(separator);
            if (cols.length >= 3) {
                 let valStr = cols[cols.length - 1]; 
                 if (valStr && valStr.includes(',')) valStr = valStr.replace(/\./g, '').replace(',', '.');
                 const amount = Math.abs(parseFloat(valStr));
                 const isExpense = parseFloat(valStr) < 0 || (cols[3] && cols[3].toLowerCase().includes('saída'));
                 if (!isNaN(amount)) {
                     newTrans.push({
                         id: crypto.randomUUID(),
                         date: cols[0] ? new Date().toISOString() : new Date().toISOString(),
                         description: cols[1]?.replace(/"/g, '') || 'Importado',
                         category: cols[2]?.replace(/"/g, '') || 'Importado',
                         type: isExpense ? 'expense' : 'income',
                         amount: amount
                     });
                 }
            }
        });
        if (newTrans.length > 0) {
            await handleSaveBatch(newTrans); // Use adapter
            alert(`${newTrans.length} transações importadas com sucesso!`);
            setIsSettingsOpen(false);
        } else alert("Erro ao ler arquivo.");
    };
    reader.readAsText(file);
  };

  // --- Render ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans text-gray-900 dark:text-gray-100 pb-24">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMarket={() => setIsMarketOpen(true)}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      {user.isGuest && showGuestBanner && (
        <div className="bg-orange-100 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-800 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm">
             <AlertTriangle className="w-4 h-4" />
             <span>Modo Convidado: Dados salvos apenas neste navegador. Faça login para salvar na nuvem.</span>
          </div>
          <button onClick={() => setShowGuestBanner(false)} className="text-orange-700 dark:text-orange-300 hover:text-orange-900 p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section>
          <Dashboard transactions={filteredTransactions} stats={viewStats} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-3">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <h2 className="text-xl font-bold">Transações</h2>
                  <div className="flex gap-2 flex-1 sm:flex-none w-full sm:w-auto">
                     <button onClick={() => setIsBatchOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20">
                        <ListPlus className="w-5 h-5" /> Em Lote / Extrato
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-green-600/20">
                        <Plus className="w-5 h-5" /> Adicionar
                    </button>
                  </div>
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Filter className="w-5 h-5" /><span className="text-sm font-medium">Filtrar por:</span>
                  </div>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="w-full sm:w-auto bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2.5 outline-none">
                      <option value="all">Todos os Tipos</option>
                      <option value="income">Entradas (+)</option>
                      <option value="expense">Saídas (-)</option>
                  </select>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-auto bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg p-2.5 min-w-[150px] outline-none">
                      <option value="all">Todas as Categorias</option>
                      {usedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {(typeFilter !== 'all' || categoryFilter !== 'all') && (
                      <button onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); }} className="text-sm text-red-500 hover:text-red-700 hover:underline ml-auto sm:ml-0 font-medium">Limpar Filtros</button>
                  )}
              </div>

              <TransactionList transactions={filteredTransactions} onDelete={handleDeleteTransaction} onEdit={(t) => { setEditingTransaction(t); setIsFormOpen(true); }} />
           </div>
        </section>
      </main>

      <ChatWidget stats={{...fullMonthStats, topCategory}} marketItems={marketItems} />
      
      {isFormOpen && (
        <TransactionForm 
          onSave={handleSaveTransaction} onClose={() => setIsFormOpen(false)} 
          initialData={editingTransaction} incomeCategories={incomeCategories} expenseCategories={expenseCategories} onAddCategory={handleAddCategory}
        />
      )}

      <BatchEntryModal 
         isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)} onSaveBatch={handleSaveBatch}
         incomeCategories={incomeCategories} expenseCategories={expenseCategories} onAddCategory={handleAddCategory}
      />

      <MarketSubApp 
         isOpen={isMarketOpen} onClose={() => setIsMarketOpen(false)} onSaveReceipt={handleSaveMarketReceipt} items={marketItems}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        theme={theme} setTheme={setTheme}
        incomeCategories={incomeCategories} expenseCategories={expenseCategories}
        onAddCategory={handleAddCategory} onRemoveCategory={handleRemoveCategory} onRenameCategory={handleRenameCategory}
        onExport={handleExportCSV} onImport={handleImportCSV} onClearAll={() => setIsClearAllConfirmOpen(true)}
        user={user} onLogout={handleLogout}
      />

      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600"><AlertTriangle className="w-6 h-6" /></div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Apagar TUDO?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{user?.isGuest ? "Isso limpará os dados do navegador." : "A exclusão em massa na nuvem está desativada por segurança."}</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setIsClearAllConfirmOpen(false)} className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors">Cancelar</button>
                <button onClick={handleClearAllData} className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 transition-colors">Sim, Limpar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;