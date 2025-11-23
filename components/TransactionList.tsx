import React, { useState } from 'react';
import { Transaction } from '../types';
import { Coffee, ShoppingBag, Car, Zap, Home, Gamepad2, Pencil, Trash2, AlertTriangle } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
}

// Helper to guess icon
const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes('comida') || lower.includes('food') || lower.includes('restaurante')) return <Coffee className="w-5 h-5" />;
  if (lower.includes('shopping') || lower.includes('compras')) return <ShoppingBag className="w-5 h-5" />;
  if (lower.includes('transporte') || lower.includes('uber') || lower.includes('gasolina')) return <Car className="w-5 h-5" />;
  if (lower.includes('casa') || lower.includes('aluguel')) return <Home className="w-5 h-5" />;
  if (lower.includes('luz') || lower.includes('internet')) return <Zap className="w-5 h-5" />;
  if (lower.includes('jogo') || lower.includes('steam')) return <Gamepad2 className="w-5 h-5" />;
  return <div className="w-5 h-5 font-bold text-xs flex items-center justify-center">{category.charAt(0).toUpperCase()}</div>;
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico Recente</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma transação encontrada neste período.
            </div>
          ) : (
            transactions.map((t) => (
              <div 
                  key={t.id} 
                  onClick={() => onEdit(t)}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-red-100 text-red-600 dark:bg-red-900/20'}`}>
                    {getCategoryIcon(t.category)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t.description}</p>
                    <div className="flex items-center text-xs text-gray-500 gap-2">
                      <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{t.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {formatCurrency(t.amount)}
                  </span>
                  <div className="flex gap-2">
                       <button
                          onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                       >
                           <Pencil className="w-4 h-4" />
                       </button>
                       <button 
                          onClick={(e) => { e.stopPropagation(); setDeletingId(t.id); }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                       >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Excluir Transação?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tem certeza que deseja apagar esta transação? Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionList;