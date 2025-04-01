import { useState, useEffect } from 'react';
import { Bell, Moon, Sun, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/contexts/DashboardContext';

interface DashboardHeaderProps {
  toggleSidebar?: () => void;
}

export function DashboardHeader({ toggleSidebar }: DashboardHeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { selectedFarmId, farms } = useDashboard();
  
  // Find the currently selected farm
  const selectedFarm = selectedFarmId 
    ? farms.find(farm => String(farm.id) === String(selectedFarmId))
    : null;

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newTheme);
  };

  // Initialize theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <header className="sticky top-0 z-10 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden mr-2"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">
            {selectedFarm ? `${selectedFarm.name}` : 'Trading Farm Dashboard'}
          </h2>
          {selectedFarm && selectedFarm.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedFarm.description}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          title="User settings"
        >
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}