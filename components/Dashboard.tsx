import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Transaction, DashboardStats } from '../types';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  stats: DashboardStats;
}

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, stats }) => {
  
  // Prepare data for Bar Chart (Daily Income vs Expense)
  const dailyData = React.useMemo(() => {
    const data: Record<string, { day: string; income: number; expense: number }> = {};
    transactions.forEach(t => {
        const day = new Date(t.date).getDate().toString();
        if (!data[day]) data[day] = { day, income: 0, expense: 0 };
        if (t.type === 'income') data[day].income += t.amount;
        else data[day].expense += t.amount;
    });
    return Object.values(data).sort((a, b) => parseInt(a.day) - parseInt(b.day));
  }, [transactions]);

  // Prepare data for Pie Chart (Categories)
  const categoryData = React.useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Atual</p>
              <h3 className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>
                R$ {formatCurrency(stats.balance)}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Entradas</p>
              <h3 className="text-2xl font-bold text-green-600">
                R$ {formatCurrency(stats.income)}
              </h3>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saídas</p>
              <h3 className="text-2xl font-bold text-red-500">
                R$ {formatCurrency(stats.expense)}
              </h3>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Fluxo do Mês</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff', borderRadius: '8px' }}
                  formatter={(value: number) => [`R$ ${formatCurrency(value)}`, 'Valor']}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Entrada" />
                <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Saída" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Gastos por Categoria</h4>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                     contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff', borderRadius: '8px' }}
                     formatter={(value: number) => [`R$ ${formatCurrency(value)}`, 'Valor']}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Sem dados de gastos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;