"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigation, UserRole } from '@/utils/NavigationService';
import { FARM_NAVIGATION } from '@/config/navigation';
import { 
  Terminal, Bot, Lightbulb, Target, BarChart, LayoutDashboard, LineChart, 
  Wallet, Shield, Settings, Brain, Database, Briefcase, Factory, ChevronDown, ChevronRight,
  ArrowRightLeft, PiggyBank, CreditCard, BarChart2, PieChart, RefreshCw, Calendar, Cpu, Zap,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MetaMaskConnector from '@/components/wallet/metamask-connector';
import { Badge } from '@/components/ui/badge';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string | number;
}

interface SidebarProps {
  farmId?: string;
  userRole?: UserRole;
}

interface NavItemProps {
  item: NavigationItem;
  isActive: (path: string) => boolean;
  onClick?: () => void;
}

// NavItem component for consistent rendering of navigation items
function NavItem({ item, isActive, onClick }: NavItemProps) {
  const href = item.href;
  const active = isActive(href);
  
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out',
          active
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-muted hover:text-accent-foreground'
        )}
        onClick={onClick}
      >
        <div className="flex items-center">
          <item.icon
            className={cn(
              'mr-3 h-5 w-5 flex-shrink-0',
              active
                ? 'text-primary-foreground'
                : 'text-muted-foreground group-hover:text-accent-foreground'
            )}
            aria-hidden="true"
          />
          <span>{item.name}</span>
        </div>
        {item.badge && (
          <Badge variant="outline" className={active ? 'bg-primary-foreground text-primary' : ''}>
            {item.badge}
          </Badge>
        )}
      </Link>
    </li>
  );
}

// Mock farm data until context is available
const mockFarms = [
  { id: 'farm-1', name: 'Alpha Farm' },
  { id: 'farm-2', name: 'Beta Farm' },
  { id: 'farm-3', name: 'Gamma Farm' },
];

export function Sidebar({ farmId: propFarmId, userRole = 'user' }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { groups, isActive } = useNavigation(userRole);
  
  // Local state for selected farm until context is available
  const [selectedFarmId, setSelectedFarmId] = React.useState<string | null>(propFarmId || null);
  const [activeFarm, setActiveFarm] = React.useState<{id: string, name: string} | null>(null);
  const [farms] = React.useState(mockFarms);

  // Set active farm when farm ID changes
  React.useEffect(() => {
    if (selectedFarmId) {
      const farm = farms.find((f: {id: string, name: string}) => f.id === selectedFarmId);
      if (farm) {
        setActiveFarm(farm);
      }
    } else {
      setActiveFarm(null);
    }
  }, [selectedFarmId, farms]);

  // Check if the current route is a farm-specific route
  const isFarmRoute = pathname.includes('/dashboard/farms/') && !pathname.endsWith('/dashboard/farms');

  const handleFarmChange = (value: string) => {
    setSelectedFarmId(value);
    router.push(`/dashboard/farms/${value}`);
  };

  return (
    <aside className="h-screen w-64 bg-background border-r flex flex-col fixed z-40 shadow-md" data-component-name="Sidebar">
      {/* Header with logo and farm selector */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Factory className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Trading Farm</h2>
        </div>

        <Select
          value={selectedFarmId || ''}
          onValueChange={handleFarmChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a farm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="placeholder" disabled>
              Select a farm
            </SelectItem>
            {farms.map((farm: {id: string, name: string}) => (
              <SelectItem key={farm.id} value={farm.id}>
                {farm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main navigation area */}
      <div className="flex-grow overflow-y-auto">
        <nav className="px-4 py-4 space-y-5">
          {/* Farms Section */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Farms
            </h3>
            <ul className="space-y-1">
              <NavItem 
                item={{
                  name: 'Farms Overview',
                  href: '/dashboard/farms',
                  icon: Factory,
                  roles: ['user', 'admin'],
                  badge: farms.length
                }}
                isActive={isActive}
              />
              {selectedFarmId && (
                <Collapsible defaultOpen className="mt-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between bg-muted/50 hover:bg-muted">
                      <div className="flex items-center text-sm">
                        <Database className="mr-2 h-4 w-4 text-primary" />
                        <span>{activeFarm?.name || 'Selected Farm'}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1">
                    {FARM_NAVIGATION.map((route) => {
                      const href = route.href.replace(':farmId', selectedFarmId);
                      return (
                        <NavItem
                          key={route.name}
                          item={{ ...route, href }}
                          isActive={isActive}
                        />
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </ul>
          </div>

          {/* Dashboard Overview */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Overview
            </h3>
            <ul className="space-y-1">
              <NavItem 
                item={{
                  name: 'Dashboard',
                  href: '/dashboard',
                  icon: LayoutDashboard,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
            </ul>
          </div>

          {/* Execution Section - Agents, Goals, Strategies */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Execution
            </h3>
            <ul className="space-y-1">
              <NavItem 
                item={{
                  name: 'Agents',
                  href: '/dashboard/agents',
                  icon: Bot,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Goals',
                  href: '/dashboard/goals',
                  icon: Target,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Strategies',
                  href: '/dashboard/strategies',
                  icon: Lightbulb,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
            </ul>
          </div>

          {/* Finance Section - Wallet and Vault */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Finance
            </h3>
            <ul className="space-y-1">
              <NavItem 
                item={{
                  name: 'Wallet',
                  href: '/dashboard/wallet',
                  icon: Wallet,
                  roles: ['user', 'admin'],
                  badge: 'New'
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Vault',
                  href: '/dashboard/vault',
                  icon: PiggyBank,
                  roles: ['user', 'admin'],
                  badge: 'New'
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Transactions',
                  href: '/dashboard/vault/transactions',
                  icon: ArrowRightLeft,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Funding',
                  href: '/dashboard/funding',
                  icon: CreditCard,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
            </ul>
          </div>
          
          {/* Portfolio Management */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Portfolio
            </h3>
            <ul className="space-y-1">
              <NavItem 
                item={{
                  name: 'Dashboard',
                  href: '/dashboard/portfolio',
                  icon: PieChart,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Maintenance',
                  href: '/dashboard/portfolio/maintenance',
                  icon: RefreshCw,
                  roles: ['user', 'admin'],
                  badge: 'New'
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Performance',
                  href: '/dashboard/portfolio/performance',
                  icon: LineChart,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
            </ul>
          </div>
          
          {/* Analytics & Tools */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Analytics & Tools
            </h3>
            <ul className="space-y-1">
              <NavItem 
                item={{
                  name: 'Analytics',
                  href: '/dashboard/analytics',
                  icon: BarChart,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Terminal',
                  href: '/dashboard/terminal',
                  icon: Terminal,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Performance',
                  href: '/dashboard/analytics/performance',
                  icon: BarChart2,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'AI Trading',
                  href: '/dashboard/ai-trading',
                  icon: Brain,
                  roles: ['user', 'admin'],
                  badge: 'NEW'
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Responsive Trading',
                  href: '/dashboard/responsive-trading',
                  icon: Smartphone,
                  roles: ['user', 'admin'],
                  badge: 'NEW'
                }}
                isActive={isActive}
              />
            </ul>
          </div>
          
          {/* Settings & Risk */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Settings
            </h3>
            <ul className="space-y-1">
              <NavItem 
                item={{
                  name: 'Settings',
                  href: '/dashboard/settings',
                  icon: Settings,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
              <NavItem 
                item={{
                  name: 'Risk Management',
                  href: '/dashboard/risk',
                  icon: Shield,
                  roles: ['user', 'admin']
                }}
                isActive={isActive}
              />
            </ul>
          </div>
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <MetaMaskConnector />
        <div className="text-xs text-muted-foreground text-center mt-2">
          <p>Trading Farm v2.5.3</p>
        </div>
      </div>
    </aside>
  );
}