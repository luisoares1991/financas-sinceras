import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Upload, Loader2, Save, FileText, AlertCircle } from 'lucide-react';
import { Transaction } from '../types';
import { analyzeFinancialStatement } from '../services/geminiService';

interface BatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (transactions: Transaction[]) => void;
  incomeCategories: string[];
  expenseCategories: string[];
  onAddCategory: (type: 'income' | 'expense', name: string) => void;
}

interface BatchRow extends Partial<Transaction> {
  tempId: string;
}

const BatchEntryModal: React.FC<BatchEntryModalProps> = ({
  isOpen, onClose, onSaveBatch, incomeCategories, expenseCategories, onAddCategory
}) => {
  const [rows, setRows] = useState<BatchRow[]>([
    { tempId: '1', date: new Date().toISOString().split('T')[0], type: 'expense', description: '', amount: 0, category: expenseCategories[0] }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const addNewRow = () => {
    setRows([...rows, {
      tempId: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      description: '',
      amount: 0,
      category: expenseCategories[0]
    }]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.tempId !== id));
  };

  const updateRow = (id: string, field: keyof Transaction, value: any) => {
    setRows(rows.map(r => {
      if (r.tempId === id) {
        const updated = { ...r, [field]: value };
        // Reset category if type changes to prevent mismatch
        if (field === 'type') {
          updated.category = value === 'income' ? incomeCategories[0] : expenseCategories[0];
        }
        return updated;
      }
      return r;
    }));
  };

  // Função dedicada para processar CSV
  const parseCSV = (text: string) => {
      const lines = text.split('\n');
      const newRows: BatchRow[] = [];

      lines.forEach((line, idx) => {
          // Ignora cabeçalho ou linhas vazias
          if (idx === 0 || !line.trim()) return;

          const separator = line.includes(';') ? ';' : ',';
          const cols = line.split(separator);

          // Espera pelo menos: Data, Descrição, Categoria, Tipo, Valor (5 colunas)
          // Ou adapta se tiver menos
          if (cols.length >= 3) {
               // 1. Tratamento de Data (DD/MM/AAAA -> YYYY-MM-DD para o input date do HTML)
               let dateInputFormat = new Date().toISOString().split('T')[0];
               const rawDate = cols[0]?.trim();

               if (rawDate && rawDate.includes('/')) {
                  const [day, month, year] = rawDate.split('/');
                  // Garante formato YYYY-MM-DD
                  if(year && month && day) {
                      dateInputFormat = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  }
               }

               // 2. Tratamento de Valor (Brasil: 3.200,00 -> Code: 3200.00)
               let valStr = cols[cols.length - 1]?.replace(/"/g, '').trim();
               if (valStr) {
                  valStr = valStr.replace(/\./g, '').replace(',', '.');
               }
               const amount = Math.abs(parseFloat(valStr));

               // 3. Tipo (Tenta adivinhar pelo texto ou sinal negativo)
               const typeRaw = cols[3]?.toLowerCase() || '';
               const isExpense = parseFloat(valStr) < 0 || typeRaw.includes('saída') || typeRaw.includes('débito') || typeRaw.includes('pagamento');
               const type = isExpense ? 'expense' : 'income';

               // 4. Categoria (Tenta achar ou usa 'Outros')
               let category = cols[2]?.replace(/"/g, '').trim() || 'Outros';
               
               // Verifica se a categoria existe nas listas atuais
               const catList = isExpense ? expenseCategories : incomeCategories;
               
               // Normalização simples para comparação
               const match = catList.find(c => c.toLowerCase() === category.toLowerCase());
               
               if (match) {
                   category = match;
               } else if (category !== 'Outros' && category.length > 2) {
                   // Se não existe e não é vazia, adiciona nova (opcional, ou joga pra Outros)
                   // Aqui vamos adicionar para facilitar
                   onAddCategory(type, category);
               } else {
                   category = 'Outros';
               }

               if (!isNaN(amount)) {
                   newRows.push({
                       tempId: crypto.randomUUID(),
                       date: dateInputFormat,
                       description: cols[1]?.replace(/"/g, '') || 'Importado',
                       category: category,
                       type: type,
                       amount: amount
                   });
               }
          }
      });
      return newRows;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    // Lógica para CSV (Processamento Local)
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            try {
                const parsedRows = parseCSV(text);
                if (parsedRows.length > 0) {
                    // Adiciona as novas linhas ao topo ou fim
                    setRows(prev => [...prev, ...parsedRows]);
                } else {
                    alert("Nenhuma transação válida encontrada no CSV.");
                }
            } catch (error) {
                console.error(error);
                alert("Erro ao processar o arquivo CSV.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
        return;
    }

    // Lógica para Imagem/PDF (Processamento via IA Gemini)
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      const mimeType = file.type || 'image/png';

      try {
        const detectedTransactions = await analyzeFinancialStatement(base64Data, mimeType, incomeCategories, expenseCategories);
        
        // Garante que categorias detectadas pela IA existam
        detectedTransactions.forEach(t => {
            if (t.category && t.type) {
                const exists = t.type === 'income' 
                    ? incomeCategories.some(c => c.toLowerCase() === t.category?.toLowerCase())
                    : expenseCategories.some(c => c.toLowerCase() === t.category?.toLowerCase());
                
                if (!exists) {
                    onAddCategory(t.type as 'income' | 'expense', t.category);
                }
            }
        });

        const newRows = detectedTransactions.map(t => ({
          ...t,
          tempId: crypto.randomUUID(),
          date: t.date || new Date().toISOString().split('T')[0],
          amount: t.amount || 0,
          type: (t.type as 'income' | 'expense') || 'expense',
          description: t.description || 'Item Detectado',
          category: t.category || 'Outros'
        }));

        setRows(prev => [...prev, ...newRows]);
      } catch (error) {
        console.error(error);
        alert("Erro ao ler a fatura. Verifique se o arquivo é uma imagem ou PDF válido.");
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    // Filtra linhas vazias
    const validTransactions: Transaction[] = rows
      .filter(r => r.description && r.amount > 0)
      .map(r => ({
        id: crypto.randomUUID(),
        description: r.description!,
        amount: Number(r.amount),
        type: r.type as 'income' | 'expense',
        category: r.category || 'Outros',
        // Converte a data do input (YYYY-MM-DD) para ISO completo
        date: new Date(r.date!).toISOString() 
      }));

    if (validTransactions.length === 0) {
      alert("Preencha pelo menos uma transação com descrição e valor.");
      return;
    }

    onSaveBatch(validTransactions);
    // Reseta o form
    setRows([{ tempId: 'new', date: new Date().toISOString().split('T')[0], type: 'expense', description: '', amount: 0, category: expenseCategories[0] }]); 
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Adição em Lote / Extrato
            </h2>
            <p className="text-xs text-gray-500">Envie uma fatura (PDF/Img) ou Planilha (CSV).</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 shrink-0">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center py-6 text-blue-600 gap-3">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="font-bold text-lg">Processando arquivo...</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full animate-pulse">
                   <AlertCircle className="w-4 h-4" />
                   <span>Lendo seus dados...</span>
                </div>
             </div>
           ) : (
             <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group"
             >
                <Upload className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300 text-center">
                  Clique para enviar Fatura (PDF/Imagem) ou CSV
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf,.csv,text/csv" // Aceita CSV agora
                  onChange={handleFileUpload} 
                />
             </div>
           )}
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="p-2 font-medium">Data</th>
                <th className="p-2 font-medium">Tipo</th>
                <th className="p-2 font-medium">Descrição</th>
                <th className="p-2 font-medium">Categoria</th>
                <th className="p-2 font-medium">Valor (R$)</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => (
                <tr key={row.tempId} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-2">
                    <input 
                      type="date" 
                      value={row.date} 
                      onChange={e => updateRow(row.tempId, 'date', e.target.value)}
                      className="w-full bg-transparent outline-none text-sm dark:text-gray-300"
                    />
                  </td>
                  <td className="p-2">
                     <select 
                        value={row.type}
                        onChange={e => updateRow(row.tempId, 'type', e.target.value)}
                        className={`bg-transparent outline-none text-sm font-medium ${row.type === 'income' ? 'text-green-600' : 'text-red-500'}`}
                     >
                       <option value="expense" className="text-black">Saída</option>
                       <option value="income" className="text-black">Entrada</option>
                     </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      placeholder="Descrição..."
                      value={row.description}
                      onChange={e => updateRow(row.tempId, 'description', e.target.value)}
                      className="w-full bg-transparent outline-none text-sm dark:text-gray-300"
                    />
                  </td>
                  <td className="p-2">
                    <select 
                        value={row.category}
                        onChange={e => updateRow(row.tempId, 'category', e.target.value)}
                        className="w-full bg-transparent outline-none text-sm dark:text-gray-300"
                    >
                        {(row.type === 'income' ? incomeCategories : expenseCategories).map(c => (
                            <option key={c} value={c} className="text-black">{c}</option>
                        ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={row.amount || ''}
                      onChange={e => updateRow(row.tempId, 'amount', e.target.value)}
                      className="w-full bg-transparent outline-none text-sm font-bold dark:text-white"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => removeRow(row.tempId)}
                      className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button 
            onClick={addNewRow}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar Linha Vazia
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
           >
             Cancelar
           </button>
           <button 
             onClick={handleSave}
             className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-colors"
           >
             <Save className="w-4 h-4" /> Salvar Tudo
           </button>
        </div>

      </div>
    </div>
  );
};

export default BatchEntryModal;