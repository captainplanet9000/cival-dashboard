import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ChartLineUp,
  LayoutDashboard,
  Settings,
  Bot,
  CandlestickChart,
  CreditCard,
  Users,
  CircleDollarSign,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button-standardized';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  isActive?: boolean;
  isPro?: boolean;
}

function NavItem({ href, icon, title, badge, isActive, isPro }: NavItemProps) {
  const router = useRouter();
  
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="lg"
      className={cn(
        'w-full justify-start gap-2 pl-2 mb-1',
        isActive && 'bg-secondary/50'
      )}
      onClick={() => router.push(href)}
    >
      {icon}
      <span className="flex-1 text-left">{title}</span>
      {badge && (
        <Badge variant="outline" className="ml-auto">
          {badge}
        </Badge>
      )}
      {isPro && (
        <Badge variant="default" className="ml-auto text-xs">
          PRO
        </Badge>
      )}
    </Button>
  );
}

/**
 * Main Dashboard Layout
 * Provides navigation and layout structure for the dashboard
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  
  // Navigation items with active state tracking
  const navigationItems = [
    {
      href: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      title: 'Dashboard',
      isActive: pathname === '/dashboard'
    },
    {
      href: '/dashboard/trading',
      icon: <CandlestickChart size={18} />,
      title: 'Trading Terminal',
      isActive: pathname === '/dashboard/trading'
    },
    {
      href: '/dashboard/analytics',
      icon: <BarChart3 size={18} />,
      title: 'Analytics',
      isActive: pathname === '/dashboard/analytics'
    },
    {
      href: '/dashboard/agents',
      icon: <Bot size={18} />,
      title: 'Agents',
      badge: '3',
      isActive: pathname === '/dashboard/agents'
    },
    {
      href: '/dashboard/portfolio',
      icon: <ChartLineUp size={18} />,
      title: 'Portfolio',
      isActive: pathname === '/dashboard/portfolio'
    },
    {
      href: '/dashboard/balances',
      icon: <CircleDollarSign size={18} />,
      title: 'Balances',
      isActive: pathname === '/dashboard/balances'
    },
    {
      href: '/dashboard/exchanges',
      icon: <CreditCard size={18} />,
      title: 'Exchanges',
      isActive: pathname === '/dashboard/exchanges'
    },
    {
      href: '/dashboard/community',
      icon: <Users size={18} />,
      title: 'Community',
      isPro: true,
      isActive: pathname === '/dashboard/community'
    },
    {
      href: '/dashboard/settings',
      icon: <Settings size={18} />,
      title: 'Settings',
      isActive: pathname === '/dashboard/settings'
    },
    {
      href: '/dashboard/terminal',
      icon: <Bot size={18} />,
      title: 'ElizaOS Terminal',
      isActive: pathname === '/dashboard/terminal'
    }
  ];
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center">
            <h1 className="font-bold text-xl">Trading Farm</h1>
            <Badge variant="outline" className="ml-2 bg-primary/10">
              Dashboard
            </Badge>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                  badge={item.badge}
                  isActive={item.isActive}
                  isPro={item.isPro}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 p-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium">{user?.name || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {user?.email || 'user@example.com'}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/dashboard/profile'}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/dashboard/billing'}>
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => signOut()}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
      
      {/* Mobile Navigation */}
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-xl">Trading Farm</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <X size={20} />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4 h-[calc(100vh-64px)]">
            <div className="space-y-4">
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    title={item.title}
                    badge={item.badge}
                    isActive={item.isActive}
                    isPro={item.isPro}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu size={20} />
              </Button>
              
              <div className="text-lg font-semibold lg:hidden">
                Trading Farm
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/dashboard/profile'}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/dashboard/billing'}>
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => signOut()}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
