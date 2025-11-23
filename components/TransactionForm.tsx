import React, { useState, useRef } from 'react';
import { Camera, Plus, X, Loader2 } from 'lucide-react';
import { Transaction } from '../types';
import { analyzeReceiptImage } from '../services/geminiService';

interface TransactionFormProps {
  onSave: (t: Transaction) => void;
  onClose: () => void;
  initialData?: Transaction | null;
  incomeCategories: string[];
  expenseCategories: string[];
  onAddCategory: (type: 'income' | 'expense', name: string) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSave, 
  onClose, 
  initialData, 
  incomeCategories, 
  expenseCategories,
  onAddCategory 
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'camera'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Transaction>>(() => {
    if (initialData) {
        return {
            ...initialData,
            date: initialData.date.split('T')[0] // Format for date input
        };
    }
    return {
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        category: expenseCategories[0] || 'Outros',
        description: '',
        amount: 0
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine available categories based on selected type
  const currentCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    
    onSave({
      id: initialData?.id || crypto.randomUUID(),
      description: formData.description,
      amount: Number(formData.amount),
      type: formData.type as 'income' | 'expense',
      category: formData.category || currentCategories[0] || 'Outros',
      date: formData.date || new Date().toISOString()
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        const mimeType = file.type || 'image/png';

        try {
            // Pass current categories to AI to prioritize them
            const analysis = await analyzeReceiptImage(base64Data, mimeType, expenseCategories);
            
            let detectedCategory = analysis.category || 'Outros';
            
            // Check if we need to create this category
            // Normalize for comparison (simple check)
            const exists = expenseCategories.some(c => c.toLowerCase() === detectedCategory.toLowerCase());
            
            if (!exists && detectedCategory !== 'Outros') {
                // Auto-create the category found by AI
                onAddCategory('expense', detectedCategory);
            } else if (exists) {
                // Match exact case from list if exists
                const match = expenseCategories.find(c => c.toLowerCase() === detectedCategory.toLowerCase());
                if (match) detectedCategory = match;
            }

            setFormData(prev => ({
                ...prev,
                description: analysis.description || '',
                amount: analysis.amount || 0,
                date: analysis.date || prev.date,
                category: detectedCategory,
                type: 'expense' 
            }));
            setActiveTab('manual');
        } catch (error) {
            alert("Erro ao analisar a imagem. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Hide if editing */}
        {!initialData && (
            <div className="flex p-2 gap-2 bg-gray-50 dark:bg-gray-800/50">
            <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-gray-700 shadow text-green-600 dark:text-green-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Plus className="w-4 h-4 mr-1" /> Manual
            </button>
            <button 
                onClick={() => setActiveTab('camera')}
                className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'camera' ? 'bg-white dark:bg-gray-700 shadow text-green-600 dark:text-green-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
                <Camera className="w-4 h-4 mr-1" /> Mágico
            </button>
            </div>
        )}

        {/* Content */}
        <div className="p-6">
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button 
                   type="button"
                   onClick={() => setFormData({...formData, type: 'expense', category: expenseCategories[0]})}
                   className={`flex-1 py-2 rounded-lg font-medium border ${formData.type === 'expense' ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                  Saída
                </button>
                <button 
                   type="button"
                   onClick={() => setFormData({...formData, type: 'income', category: incomeCategories[0]})}
                   className={`flex-1 py-2 rounded-lg font-medium border ${formData.type === 'income' ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                >
                  Entrada
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.amount || ''}
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                  className="w-full text-2xl font-bold p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Ex: Almoço, Salário..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                    <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                    >
                        {currentCategories.map(cat => (
                            <option key={cat} value={cat} className="dark:bg-gray-800">{cat}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Data</label>
                    <input 
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all"
              >
                Salvar
              </button>
            </form>
          )}

          {activeTab === 'camera' && !initialData && (
            <div className="text-center py-8">
              {isLoading ? (
                <div className="flex flex-col items-center text-green-600">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-medium">Lendo recibo com IA...</p>
                </div>
              ) : (
                <>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 cursor-pointer hover:border-green-500 transition-colors group"
                  >
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 group-hover:scale-110 transition-transform">
                      <Camera className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tire uma foto ou envie PDF</h3>
                    <p className="text-sm text-gray-500">A IA vai preencher os dados pra você.</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleImageUpload}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;