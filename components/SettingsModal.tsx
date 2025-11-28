import React, { useState, useRef } from 'react';
import { X, Moon, Sun, Laptop, Plus, Trash2, Download, Upload, AlertTriangle, Pencil, Check, LogOut, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  incomeCategories: string[];
  expenseCategories: string[];
  onAddCategory: (type: 'income' | 'expense', name: string) => void;
  onRemoveCategory: (type: 'income' | 'expense', name: string) => void;
  onRenameCategory: (type: 'income' | 'expense', oldName: string, newName: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAll: () => void;
  user: UserType | null;
  onLogout: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, theme, setTheme,
  incomeCategories, expenseCategories,
  onAddCategory, onRemoveCategory, onRenameCategory,
  onExport, onImport, onClearAll,
  user, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'categories' | 'data'>('profile');
  const [newCat, setNewCat] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentList = catType === 'income' ? incomeCategories : expenseCategories;

  const handleAddCategory = () => {
    if (!newCat.trim()) return;
    onAddCategory(catType, newCat.trim());
    setNewCat('');
  };

  const startEdit = (cat: string) => {
    setEditingCat(cat);
    setEditValue(cat);
  };

  const saveEdit = () => {
    if (editingCat && editValue.trim() && editValue !== editingCat) {
      onRenameCategory(catType, editingCat, editValue.trim());
    }
    setEditingCat(null);
    setEditValue('');
  };

  const performLogout = async () => {
    setShowLogoutConfirm(false);
    if (!user?.isGuest) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Erro ao sair:", error);
      }
    }
    onLogout(); // Chama a função do pai para limpar estado local se necessário
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl h-[650px] shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden relative">
        
        {/* Custom Logout Confirmation Overlay */}
        {showLogoutConfirm && (
          <div className="absolute inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600">
                <LogOut className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sair da Conta?</h3>
             <p className="text-center text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
               {user?.isGuest 
                 ? "Se você estiver como convidado e não fez backup, seus dados locais serão perdidos." 
                 : "Você será desconectado da sua conta Google."}
             </p>
             <div className="flex gap-3 w-full max-w-xs">
               <button 
                 onClick={() => setShowLogoutConfirm(false)}
                 className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={performLogout}
                 className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 transition-colors"
               >
                 Sair Agora
               </button>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurações</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-1/3 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 p-2 space-y-1">
            <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white dark:bg-gray-800 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Perfil</button>
            <button onClick={() => setActiveTab('appearance')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'appearance' ? 'bg-white dark:bg-gray-800 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Aparência</button>
            <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-white dark:bg-gray-800 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Categorias</button>
            <button onClick={() => setActiveTab('data')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-white dark:bg-gray-800 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Dados</button>
          </div>

          {/* Content */}
          <div className="w-2/3 p-6 overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Seu Perfil</h3>
                <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg overflow-hidden">
                    {user?.photoUrl ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" /> : user?.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{user?.email || 'Conta de Convidado'}</p>
                  
                  {user?.isGuest && (
                    <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl mt-2 max-w-xs">
                      <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                      <p className="text-xs text-orange-700 dark:text-orange-300 text-left">Modo Convidado. Dados não sincronizados.</p>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  <LogOut className="w-4 h-4" /> Sair da Conta
                </button>
              </div>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Tema do App</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => setTheme('light')} className={`flex items-center p-4 border rounded-xl ${theme === 'light' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}><Sun className="w-5 h-5 mr-3"/>Claro</button>
                  <button onClick={() => setTheme('dark')} className={`flex items-center p-4 border rounded-xl ${theme === 'dark' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}><Moon className="w-5 h-5 mr-3"/>Escuro</button>
                  <button onClick={() => setTheme('system')} className={`flex items-center p-4 border rounded-xl ${theme === 'system' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}><Laptop className="w-5 h-5 mr-3"/>Sistema</button>
                </div>
              </div>
            )}

            {/* Categories */}
            {activeTab === 'categories' && (
              <div className="space-y-6 flex flex-col h-full">
                <h3 className="font-semibold text-gray-900 dark:text-white">Gerenciar Categorias</h3>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shrink-0">
                  <button onClick={() => setCatType('expense')} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${catType === 'expense' ? 'bg-white dark:bg-gray-700 shadow text-red-500' : 'text-gray-500'}`}>Despesas</button>
                  <button onClick={() => setCatType('income')} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${catType === 'income' ? 'bg-white dark:bg-gray-700 shadow text-green-600' : 'text-gray-500'}`}>Receitas</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 border border-gray-100 dark:border-gray-800 rounded-xl p-2">
                  {currentList.map((cat) => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group">
                      {editingCat === cat ? (
                         <input autoFocus className="bg-white dark:bg-gray-900 border border-green-500 rounded px-2 py-1 text-sm outline-none flex-1 mr-2" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                      ) : <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>}
                      <div className="flex gap-1">
                        {editingCat === cat ? <button onClick={saveEdit} className="p-1 text-green-600"><Check className="w-4 h-4"/></button> : <button onClick={() => startEdit(cat)} className="p-1 text-gray-400 hover:text-blue-500"><Pencil className="w-4 h-4"/></button>}
                        <button onClick={() => onRemoveCategory(catType, cat)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 shrink-0">
                  <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500 dark:text-white" onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} />
                  <button onClick={handleAddCategory} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Plus className="w-5 h-5"/></button>
                </div>
              </div>
            )}

            {/* Data */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Gerenciar Dados</h3>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Backup & Restauração</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">Exporte seus dados em CSV.</p>
                    <div className="flex gap-3">
                      <button onClick={onExport} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 py-2 rounded-lg text-sm font-medium"><Download className="w-4 h-4"/> Exportar CSV</button>
                      <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 py-2 rounded-lg text-sm font-medium"><Upload className="w-4 h-4"/> Importar CSV</button>
                      <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={onImport} />
                    </div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                    <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">Zona de Perigo</h4>
                    <button onClick={onClearAll} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium mt-2"><AlertTriangle className="w-4 h-4"/> Apagar Todos os Dados</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;