import React from "react";
import Link from "next/link";
import { WebSocketProvider, ConnectionStatus } from "@/components/websocket-provider";
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
  Bot as Bot2
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // WebSocket URL would typically come from environment variables
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://trading-farm-api.example.com/ws';

  return (
    <WebSocketProvider url={wsUrl} debug={false}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Trading Farm</h1>
          </div>
          
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/dashboard" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/farms" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <Factory className="w-5 h-5 mr-3" />
                  Farms
                </Link>
              </li>
              <p className="text-xs text-muted-foreground px-4 py-2">Trading</p>
              <li>
                <Link 
                  href="/dashboard/orders" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <BookOpen className="w-5 h-5 mr-3" />
                  Orders
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/trades" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <Repeat className="w-5 h-5 mr-3" />
                  Trades
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/strategies" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <LineChart className="w-5 h-5 mr-3" />
                  Strategies
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/strategies/builder" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <Brain className="w-5 h-5 mr-3" />
                  Strategy Builder
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
                  href="/dashboard/analytics" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Analytics
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/performance" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <LineChart className="w-5 h-5 mr-3" />
                  Performance
                </Link>
              </li>
              <p className="text-xs text-muted-foreground px-4 py-2">System</p>
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
                  href="/dashboard/guides/eliza-integration" 
                  className="flex items-center p-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <Bot2 className="w-5 h-5 mr-3" />
                  ElizaOS Guide
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="absolute bottom-4 left-4 right-4 p-4">
            <ConnectionStatus />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </WebSocketProvider>
  );
}