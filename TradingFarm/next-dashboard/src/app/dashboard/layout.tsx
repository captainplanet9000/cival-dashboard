'use client';

import React from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Factory, 
  Bot, 
  BookOpen, 
  BarChart3, 
  LineChart, 
  BrainCircuit,
  Settings,
  Brain,
  Repeat,
  Bot as Bot2,
  Wallet,
  Target,
  Banknote,
  Shield,
  Briefcase,
  Zap,
  Database,
  Clock,
  Store,
  BarChart,
  CreditCard,
  Building2,
  ArrowRightLeft
} from "lucide-react";
import { websocketConfig } from "@/config/app-config";
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Simple connection status component that doesn't attempt real connections
const ConnectionStatus = () => {
  const [status, setStatus] = React.useState<'connected' | 'disconnected'>('connected');
  
  return (
    <div className="flex items-center">
      <div className={`h-2 w-2 rounded-full mr-2 ${status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-xs text-muted-foreground">
        {status === 'connected' ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Trading Farm</h1>
        </div>
        
        <nav className="p-4 overflow-y-auto">
          <ul className="space-y-1">
            {/* Main Dashboard */}
            <li>
              <Link 
                href="/dashboard" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
            </li>
            
            {/* Portfolio Section */}
            <p className="text-xs text-muted-foreground px-4 py-2 mt-2">Portfolio</p>
            <li>
              <Link 
                href="/dashboard/farms" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Factory className="w-5 h-5 mr-3" />
                Farms
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/agents" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Bot className="w-5 h-5 mr-3" />
                Agents
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/goals" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Target className="w-5 h-5 mr-3" />
                Goals
              </Link>
            </li>
            
            {/* Banking & Vault Section - Updated */}
            <p className="text-xs text-muted-foreground px-4 py-2 mt-2">Banking</p>
            <li>
              <Link 
                href="/dashboard/banking/unified" 
                className={`flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
                  pathname.includes('/dashboard/banking/unified') ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                <Building2 className="w-5 h-5 mr-3" />
                Unified Banking
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/banking" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Wallet className="w-5 h-5 mr-3" />
                Balances
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/banking/vault" 
                className={`flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
                  pathname.includes('/dashboard/banking/vault') ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                <Shield className="w-5 h-5 mr-3" />
                Vault
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/banking/exchange" 
                className={`flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
                  pathname.includes('/dashboard/banking/exchange') ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                <ArrowRightLeft className="w-5 h-5 mr-3" />
                Exchange
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/banking/transactions" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Banknote className="w-5 h-5 mr-3" />
                Transactions
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/banking/flash-loans" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Zap className="w-5 h-5 mr-3" />
                Flash Loans
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/banking/storage" 
                className={`flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
                  pathname.includes('/dashboard/banking/storage') ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                <Store className="w-5 h-5 mr-3" />
                Storage
              </Link>
            </li>
            
            {/* Analytics Section - Updated */}
            <p className="text-xs text-muted-foreground px-4 py-2 mt-2">Analytics</p>
            <li>
              <Link 
                href="/dashboard/analytics" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Performance
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/analytics/risk" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <LineChart className="w-5 h-5 mr-3" />
                Risk Analysis
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/analytics/market-insights" 
                className={`flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
                  pathname.includes('/dashboard/analytics/market-insights') ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                <BarChart className="w-5 h-5 mr-3" />
                Market Insights
              </Link>
            </li>
            
            {/* The Brain Section */}
            <p className="text-xs text-muted-foreground px-4 py-2 mt-2">The Brain</p>
            <li>
              <Link 
                href="/dashboard/brain" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <BrainCircuit className="w-5 h-5 mr-3" />
                AI Command Center
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/brain/knowledge" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <BookOpen className="w-5 h-5 mr-3" />
                Knowledge Base
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/brain/strategies" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Briefcase className="w-5 h-5 mr-3" />
                Strategy Library
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/brain/builder" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Brain className="w-5 h-5 mr-3" />
                Strategy Builder
              </Link>
            </li>
            
            {/* Settings Section */}
            <p className="text-xs text-muted-foreground px-4 py-2 mt-2">System</p>
            <li>
              <Link 
                href="/dashboard/settings" 
                className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="w-5 h-5 mr-3" />
                Settings
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/cache-analytics"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                <Database className="h-5 w-5" />
                Cache Analytics
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/queue-monitor"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                <Clock className="h-5 w-5" />
                Queue Monitor
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4 p-4">
          <ConnectionStatus />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}