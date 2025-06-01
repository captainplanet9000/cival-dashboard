'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, BarChart, LineChart, PieChart, Wallet, 
  Settings, Users, Bell, Search, LogOut, CreditCard,
  BarChart2, Activity, Calculator, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NAVIGATION, NavigationItem as ConfigNavItem } from '@/config/navigation';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  name: string;
  isActive: boolean;
}

// Individual navigation item component
function NavItem({ href, icon: Icon, name, isActive }: NavItemProps) {
  return (
    <Link href={href} className="flex">
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        className={cn(
          "w-full justify-start gap-2 px-2",
          isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{name}</span>
      </Button>
    </Link>
  );
}

export function FixedSidebar() {
  const pathname = usePathname();

  // Process NAVIGATION into main and bottom items
  const mainNavItems: ConfigNavItem[] = [];
  const bottomNavItems: ConfigNavItem[] = [];

  NAVIGATION.forEach(group => {
    if (group.group === 'settings') {
      bottomNavItems.push(...group.items);
    } else {
      mainNavItems.push(...group.items);
    }
  });
  
  return (
    <div className="fixed inset-y-0 left-0 w-64 border-r bg-background h-screen flex flex-col">
      {/* Sidebar header with logo */}
      <div className="border-b h-14 flex items-center px-4">
        <h1 className="font-bold text-xl flex items-center">
          <BarChart2 className="mr-2 h-5 w-5 text-primary" />
          Trading Farm
        </h1>
      </div>
      
      {/* Scrollable navigation area */}
      <ScrollArea className="flex-1 px-2 py-3">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              name={item.name}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </div>
      </ScrollArea>
      
      {/* Bottom navigation items */}
      <div className="border-t mt-auto p-2">
        <div className="space-y-1">
          {bottomNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              name={item.name}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
