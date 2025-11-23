import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Camera, ShoppingBasket, Search, Loader2, Check, Trash2, ChevronDown, ChevronUp, Calendar, ShoppingBag } from 'lucide-react';
import { MarketItem, Transaction } from '../types';
import { analyzeItemizedReceipt } from '../services/geminiService';

interface MarketSubAppProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveReceipt: (transaction: Transaction, items: MarketItem[]) => void;
  items: MarketItem[];
}

const MarketSubApp: React.FC<MarketSubAppProps> = ({ isOpen, onClose, onSaveReceipt, items }) => {
  const [view, setView] = useState<'list' | 'scan' | 'confirm'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [scannedData, setScannedData] = useState<{
    merchant: string;
    date: string;
    total: number;
    items: Partial<MarketItem>[];
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date());
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Memoized Data Logic ---

  // 1. Filter items by date (month/year)
  const dateFilteredItems = useMemo(() => {
    return items.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getMonth() === filterDate.getMonth() && 
             itemDate.getFullYear() === filterDate.getFullYear();
    });
  }, [items, filterDate]);

  // 2. Group items by Receipt ID
  const groupedReceipts = useMemo(() => {
    const groups: Record<string, { 
      receiptId: string; 
      merchant: string; 
      date: string; 
      total: number; 
      items: MarketItem[] 
    }> = {};

    dateFilteredItems.forEach(item => {
      const key = item.receiptId || 'legacy'; // Fallback for old items
      if (!groups[key]) {
        groups[key] = {
          receiptId: key,
          merchant: item.merchant || 'Desconhecido',
          date: item.date,
          total: 0,
          items: []
        };
      }
      groups[key].items.push(item);
      groups[key].total += item.price || 0;
    });

    // Sort receipts by date desc
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dateFilteredItems]);

  // 3. Search filtering (applies to expanded items or just search highlighting)
  // For simplicity, if searching, we might want to show all matching items, 
  // but the requirement asks for grouping. We will filter the *items inside the groups* if searching.
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedReceipts;
    
    return groupedReceipts.map(group => ({
      ...group,
      items: group.items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.items.length > 0);
  }, [groupedReceipts, searchTerm]);


  if (!isOpen) return null;

  // --- Handlers ---

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = e.target.value.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    setFilterDate(newDate);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setView('scan'); 
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      const mimeType = file.type || 'image/png';

      try {
        const result = await analyzeItemizedReceipt(base64Data, mimeType);
        setScannedData(result);
        setView('confirm');
      } catch (error) {
        alert("Erro ao analisar nota fiscal. Tente novamente.");
        setView('list');
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSave = () => {
    if (!scannedData) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      description: scannedData.merchant || 'Mercado',
      amount: scannedData.total || 0,
      type: 'expense',
      category: 'Mercado',
      date: scannedData.date || new Date().toISOString()
    };

    const newItems: MarketItem[] = scannedData.items.map(i => ({
      id: crypto.randomUUID(),
      receiptId: '', // Will be assigned in App.tsx
      name: i.name || 'Item desconhecido',
      category: i.category || 'Geral',
      price: i.price || 0,
      quantity: i.quantity || 1,
      unit: 'un',
      date: scannedData.date || new Date().toISOString(),
      merchant: scannedData.merchant || 'Mercado'
    }));

    onSaveReceipt(newTransaction, newItems);
    setScannedData(null);
    setView('list');
  };

  const removeItemFromScan = (idx: number) => {
    if (!scannedData) return;
    const newItems = [...scannedData.items];
    newItems.splice(idx, 1);
    setScannedData({ ...scannedData, items: newItems });
  };

  const toggleReceipt = (id: string) => {
    if (expandedReceiptId === id) setExpandedReceiptId(null);
    else setExpandedReceiptId(id);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 animate-in slide-in-from-right duration-300 flex flex-col">
      
      {/* Header */}
      <div className="bg-orange-600 text-white p-4 shadow-md shrink-0">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-orange-700 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBasket className="w-6 h-6" />
                Mercadinho
            </h2>
            </div>
            {view === 'list' && (
                <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-orange-600 px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-orange-50 transition-colors flex items-center gap-2"
                >
                <Camera className="w-4 h-4" />
                Escanear
                </button>
            )}
        </div>
        
        {/* Filter Bar (Only in list view) */}
        {view === 'list' && (
            <div className="flex items-center gap-2 bg-orange-700/50 p-2 rounded-lg">
                 <Calendar className="w-4 h-4 text-orange-200" />
                 <input 
                    type="month" 
                    value={`${filterDate.getFullYear()}-${String(filterDate.getMonth() + 1).padStart(2, '0')}`}
                    onChange={handleMonthChange}
                    className="bg-transparent border-none text-sm text-white font-medium focus:ring-0 cursor-pointer outline-none w-full"
                />
            </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        
        {view === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
               <div className="relative">
                 <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                 <input 
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
                 />
               </div>
            </div>

            {/* Receipt Blocks List */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950/30">
               {filteredGroups.length === 0 ? (
                 <div className="text-center text-gray-400 mt-10">
                    <ShoppingBasket className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <div className="text-lg font-medium">Nenhuma compra encontrada</div>
                    <div className="text-sm">Mude a data ou escaneie uma nota.</div>
                 </div>
               ) : (
                 <div className="space-y-4">
                    {filteredGroups.map(receipt => (
                      <div key={receipt.receiptId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                         {/* Receipt Header (Block) */}
                         <div 
                            onClick={() => toggleReceipt(receipt.receiptId)}
                            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center justify-between"
                         >
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-600">
                                     <ShoppingBag className="w-5 h-5" />
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-gray-900 dark:text-white">{receipt.merchant}</h3>
                                     <div className="text-xs text-gray-500">{new Date(receipt.date).toLocaleDateString('pt-BR')}</div>
                                 </div>
                             </div>
                             <div className="flex items-center gap-4">
                                 <div className="text-right">
                                     <div className="text-xs text-gray-500">Total</div>
                                     <div className="font-bold text-gray-900 dark:text-white">R$ {receipt.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                 </div>
                                 {expandedReceiptId === receipt.receiptId ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                             </div>
                         </div>

                         {/* Expanded Items List */}
                         {expandedReceiptId === receipt.receiptId && (
                             <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 p-2">
                                 {receipt.items.map(item => (
                                     <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                         <div>
                                             <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{item.name}</div>
                                             <div className="text-xs text-orange-500">{item.category}</div>
                                         </div>
                                         <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                             R$ {item.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        )}

        {view === 'scan' && isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-16 h-16 text-orange-600 animate-spin mb-6" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Lendo Nota Fiscal...</h3>
            <div className="text-gray-500">Estamos extraindo item por item. Isso pode levar alguns segundos.</div>
          </div>
        )}

        {view === 'confirm' && scannedData && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 shrink-0">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{scannedData.merchant}</h3>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>Data: {scannedData.date}</span>
                    <span className="font-bold text-lg">Total: R$ {scannedData.total?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Itens Detectados ({scannedData.items.length})</h4>
                {scannedData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex-1">
                            <input 
                                value={item.name || ''} 
                                onChange={(e) => {
                                    const newItems = [...scannedData.items];
                                    newItems[idx].name = e.target.value;
                                    setScannedData({...scannedData, items: newItems});
                                }}
                                className="w-full bg-transparent font-medium text-gray-900 dark:text-white outline-none"
                            />
                            <span className="text-xs text-gray-500">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900 dark:text-white">
                                R$ {(item.price || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </span>
                            <button onClick={() => removeItemFromScan(idx)} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0 bg-white dark:bg-gray-900">
                <button 
                    onClick={() => setView('list')}
                    className="flex-1 py-3 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirmSave}
                    className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                >
                    <Check className="w-5 h-5" />
                    Confirmar e Salvar
                </button>
            </div>
          </div>
        )}

      </div>

      {/* Hidden Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,application/pdf"
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default MarketSubApp;