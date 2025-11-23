import React from 'react';
import { User, Calendar, Settings, ShoppingBasket } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenMarket: () => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenMarket, currentDate, setCurrentDate }) => {
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = e.target.value.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    setCurrentDate(newDate);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            $
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
            Finanças Sinceras
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-1 justify-end">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <input 
              type="month" 
              value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
              onChange={handleMonthChange}
              className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer outline-none min-w-[10rem]"
            />
          </div>

          <button
            onClick={onOpenMarket}
            className="p-2 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors shrink-0"
            title="Mercadinho"
          >
            <ShoppingBasket className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors shrink-0"
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-white cursor-pointer shrink-0">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;