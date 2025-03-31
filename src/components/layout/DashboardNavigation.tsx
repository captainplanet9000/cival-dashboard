'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: '📊' },
  { path: '/dashboard/farms', label: 'Trading Farms', icon: '🚜' },
  { path: '/dashboard/strategies', label: 'Strategies', icon: '📈' },
  { path: '/dashboard/strategies/backtest', label: 'Backtest', icon: '🧪' },
  { path: '/dashboard/strategies/pinescript/import', label: 'Import PineScript', icon: '📝' },
  { path: '/dashboard/deployments', label: 'Deployments', icon: '🚀' },
  { path: '/dashboard/performance', label: 'Performance', icon: '📊' },
  { path: '/dashboard/risk', label: 'Risk Management', icon: '⚠️' },
  { path: '/dashboard/alerts', label: 'Alerts', icon: '🔔' },
  { path: '/dashboard/memory', label: 'Memory Explorer', icon: '🧠' },
  { path: '/dashboard/analytics', label: 'Analytics', icon: '📉' },
  { path: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export const DashboardNavigation: React.FC = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path || 
           (path !== '/dashboard' && pathname?.startsWith(path));
  };
  
  return (
    <nav className="dashboard-nav w-64 bg-gray-800 text-white h-screen flex flex-col">
      <div className="dashboard-logo p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Trading Farm</h2>
          <p className="text-sm text-gray-400">Intelligent Trading Platform</p>
        </div>
        <NotificationDropdown className="text-white" />
      </div>
      
      <div className="navigation-items flex-grow overflow-y-auto py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="mb-1">
              <Link 
                href={item.path}
                className={`flex items-center px-4 py-2 ${
                  isActive(item.path) 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="user-section p-4 border-t border-gray-700 mt-auto">
        <div className="flex items-center">
          <div className="rounded-full bg-gray-600 w-10 h-10 flex items-center justify-center mr-3">
            👤
          </div>
          <div>
            <p className="font-medium">User Name</p>
            <p className="text-sm text-gray-400">Premium Plan</p>
          </div>
        </div>
      </div>
    </nav>
  );
}; 