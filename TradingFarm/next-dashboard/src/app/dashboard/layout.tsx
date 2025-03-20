"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { 
  Home, 
  LineChart, 
  Gift, 
  BarChart2, 
  Settings, 
  Menu, 
  X,
  Wallet,
  Sun,
  Moon,
  Database,
  Bot
} from "lucide-react"

// Navigation items for both top and side navigation
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Strategies', href: '/dashboard/strategies', icon: LineChart },
  { name: 'Trades', href: '/dashboard/trades', icon: Gift },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { name: 'Farm Management', href: '/dashboard/farm-management', icon: Database },
  { name: 'Agents', href: '/dashboard/agents', icon: Bot },
  { name: 'Banking', href: '/dashboard/banking', icon: Wallet },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    
    // Toggle dark mode class on document element
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };
  
  return (
    <div className="flex h-screen">
      {/* Mobile Navigation Toggle */}
      <label htmlFor="sidebar-toggle" className="fixed bottom-4 right-4 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg md:hidden">
        <Menu className="block h-6 w-6 md:hidden" />
      </label>
      <input type="checkbox" id="sidebar-toggle" className="peer hidden" />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 -translate-x-full border-r border-border bg-card px-4 py-6 transition-transform duration-200 peer-checked:translate-x-0 md:static md:translate-x-0 md:transition-none">
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="rounded-md bg-primary p-2 text-primary-foreground">
                <LineChart className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">Trading Farm</span>
            </div>
            
            {/* Close Button (Mobile Only) */}
            <label htmlFor="sidebar-toggle" className="absolute right-4 top-4 block cursor-pointer md:hidden">
              <X className="h-6 w-6" />
            </label>
            
            {/* Navigation */}
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <Link 
                  key={item.name}
                  href={item.href} 
                  className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
          
          {/* User Profile */}
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">JD</span>
              </div>
              <div>
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">Trader</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Navigation */}
        <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Page Title */}
            <h1 className="text-lg font-semibold">Trading Farm Dashboard</h1>
            
            {/* Top Navigation */}
            <nav className="hidden space-x-4 md:flex">
              {navigationItems.map((item) => (
                <Link 
                  key={item.name}
                  href={item.href} 
                  className="text-sm font-medium hover:text-primary"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            
            {/* Theme Toggle */}
            <div className="flex items-center space-x-2">
              <button 
                className="rounded-md border border-border p-2 hover:bg-muted"
                onClick={toggleTheme}
              >
                <span className="sr-only">Toggle theme</span>
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
