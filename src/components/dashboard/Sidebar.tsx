import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Briefcase,
  LineChart,
  Brain,
  Settings,
  ChevronDown,
  BarChart3,
  AlertTriangle,
  Layers,
  Wallet,
  Building,
  Network,
  History
} from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Portfolio',
    href: '/dashboard/portfolio',
    icon: Briefcase,
  },
  {
    name: 'Strategies',
    href: '/dashboard/strategies',
    icon: Network,
  },
  {
    name: 'Farms',
    href: '/dashboard/farms',
    icon: Building,
  },
  {
    name: 'Agents',
    href: '/dashboard/agents',
    icon: Brain,
  },
  {
    name: 'Vault',
    href: '/dashboard/vault',
    icon: Wallet,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'Risk',
    href: '/dashboard/risk',
    icon: AlertTriangle,
  },
  {
    name: 'Memory',
    href: '/dashboard/memory',
    icon: Layers,
  },
  {
    name: 'Performance',
    href: '/dashboard/performance',
    icon: LineChart,
  },
  {
    name: 'History',
    href: '/dashboard/history',
    icon: History,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { farms, selectedFarmId, selectFarm } = useDashboard();
  
  return (
    <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-10 md:w-64 md:bg-white md:dark:bg-gray-800 md:border-r md:border-gray-200 md:dark:border-gray-700">
      <div className="h-16 flex items-center px-6 border-b dark:border-gray-700">
        <h1 className="text-xl font-semibold">Trading Farm</h1>
      </div>
      
      {farms.length > 0 && (
        <div className="px-4 py-2 border-b dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Selected Farm
          </label>
          <select
            value={selectedFarmId || ''}
            onChange={(e) => selectFarm(e.target.value || null)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md py-1.5 px-3 text-sm"
          >
            <option value="">Select a farm</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md',
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? 'bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-foreground'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-50'
                )}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center">
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Trading Farm</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}