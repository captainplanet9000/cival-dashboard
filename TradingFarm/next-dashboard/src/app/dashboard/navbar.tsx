'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  LineChart, 
  Wallet, 
  Bot, 
  Flag, 
  Briefcase,
  TerminalSquare
} from 'lucide-react';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Strategies',
    href: '/dashboard/strategies',
    icon: LineChart,
  },
  {
    title: 'Farms',
    href: '/dashboard/farms',
    icon: Briefcase,
  },
  {
    title: 'Goals',
    href: '/dashboard/goals',
    icon: Flag,
  },
  {
    title: 'Agents',
    href: '/dashboard/agents',
    icon: Bot,
  },
  {
    title: 'Banking',
    href: '/dashboard/banking',
    icon: Wallet,
  },
  {
    title: 'ElizaOS Center',
    href: '/dashboard/elizaos',
    icon: TerminalSquare,
  },
];

export function Navbar() {
  const pathname = usePathname();
  
  return (
    <nav className="flex items-center gap-6 lg:gap-8 overflow-x-auto pb-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground",
              isActive
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            {item.href === '/dashboard/elizaos' && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                New
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
