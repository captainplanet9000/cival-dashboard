"use client"

import { useState } from 'react'
import { 
  Activity, 
  TrendingUp, 
  AlertOctagon, 
  Zap, 
  Brain, 
  ShieldAlert, 
  RefreshCw, 
  ArrowUpDown,
  DollarSign,
  Wallet,
  ChevronRight,
  Command,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Dashboard Overview Section
const DashboardOverview = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 flex items-center">
          <div className="p-3 rounded-full bg-primary/10 mr-4">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Active Trades</p>
            <p className="text-2xl font-bold">24</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center">
          <div className="p-3 rounded-full bg-green-500/10 mr-4">
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Performance (24h)</p>
            <p className="text-2xl font-bold text-green-500">+3.8%</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center">
          <div className="p-3 rounded-full bg-yellow-500/10 mr-4">
            <AlertOctagon className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Risk Level</p>
            <p className="text-2xl font-bold">Medium</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center">
          <div className="p-3 rounded-full bg-blue-500/10 mr-4">
            <Wallet className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Total Balance</p>
            <p className="text-2xl font-bold">$12,450</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Master Control Panel Component
const MasterControlPanel = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Master Control Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="font-medium">Risk Management</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <span className="text-sm font-medium">Medium</span>
            </div>
            <Progress value={50} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="font-medium">System Status</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">API</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Database</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm">ML Models</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">ElizaOS</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="font-medium">Exchange Status</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Binance</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">FTX</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Coinbase</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Kraken</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="font-medium">ElizaOS AI Console</div>
            <div className="p-3 rounded-md bg-muted text-muted-foreground text-xs h-24 overflow-auto">
              <div>System initialized and ready</div>
              <div>Market analysis complete</div>
              <div>Strategy optimization running...</div>
              <div>Agent actions scheduled for execution</div>
              <div>Command: /analyze market_sentiment</div>
              <div className="text-primary">Market sentiment: Neutral with bullish bias</div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Open ElizaOS Console
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card className="bg-muted">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 mr-3">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Quick Trade</p>
                  <p className="text-xs text-muted-foreground">Execute trades instantly</p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-muted">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 mr-3">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">AI Assistant</p>
                  <p className="text-xs text-muted-foreground">Get market insights</p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-muted">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 mr-3">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Risk Scanner</p>
                  <p className="text-xs text-muted-foreground">Analyze portfolio risk</p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

// Active Trades Section
const ActiveTradesSection = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Trades</CardTitle>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground">
            <div>Pair</div>
            <div>Type</div>
            <div>Entry</div>
            <div>Current</div>
            <div>P/L</div>
          </div>
          
          {[
            { pair: 'BTC/USD', type: 'Long', entry: 36450, current: 36750, pl: '+0.82%', profit: true },
            { pair: 'ETH/USD', type: 'Short', entry: 2250, current: 2180, pl: '+3.11%', profit: true },
            { pair: 'SOL/USD', type: 'Long', entry: 98.5, current: 97.2, pl: '-1.32%', profit: false },
            { pair: 'MATIC/USD', type: 'Long', entry: 0.65, current: 0.72, pl: '+10.77%', profit: true },
            { pair: 'XRP/USD', type: 'Short', entry: 0.58, current: 0.61, pl: '-5.17%', profit: false },
          ].map((trade, index) => (
            <div key={index} className="grid grid-cols-5 py-3 border-b text-sm">
              <div className="font-medium">{trade.pair}</div>
              <div className={`${trade.type === 'Long' ? 'text-green-500' : 'text-red-500'}`}>
                {trade.type}
              </div>
              <div>${trade.entry}</div>
              <div>${trade.current}</div>
              <div className={`${trade.profit ? 'text-green-500' : 'text-red-500'} font-medium`}>
                {trade.pl}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button variant="link" size="sm" className="text-primary">
            View all trades
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Goal Progress Section
const GoalProgressSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Monthly Income</div>
              <div className="text-sm text-muted-foreground">$2,450 / $3,000</div>
            </div>
            <Progress value={82} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <div>82% Complete</div>
              <div>18 days left</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Portfolio Growth</div>
              <div className="text-sm text-muted-foreground">15% / 25%</div>
            </div>
            <Progress value={60} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <div>60% Complete</div>
              <div>Quarterly Goal</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Risk Reduction</div>
              <div className="text-sm text-muted-foreground">Moderate → Low</div>
            </div>
            <Progress value={40} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <div>40% Complete</div>
              <div>Ongoing</div>
            </div>
          </div>
          
          <Button className="w-full" variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Set New Goal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const pathname = usePathname();
  
  // List of all navigation items for debugging
  const allNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { name: 'Strategies', href: '/dashboard/strategies', icon: 'Briefcase' },
    { name: 'Trades', href: '/dashboard/trades', icon: 'LineChart' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3' },
    { name: 'Banking', href: '/dashboard/banking', icon: 'Wallet' },
    { name: 'Farm Management', href: '/dashboard/farms', icon: 'Network' },
  ];
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Trading Farm Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your trading activity, manage farms, and track performance.
        </p>
      </div>
      
      <DashboardOverview />
      <MasterControlPanel />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ActiveTradesSection />
        </div>
        <div>
          <GoalProgressSection />
        </div>
      </div>
      
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to your Trading Farm dashboard.
          </p>
        </div>
        
        {/* Debug navigation section */}
        <div className="p-4 border rounded-lg bg-muted/20">
          <h2 className="text-xl font-semibold mb-4">Navigation Debug</h2>
          <p className="mb-2">Current pathname: <code className="bg-muted px-1 py-0.5 rounded">{pathname}</code></p>
          <div className="space-y-2">
            <h3 className="font-medium">All Navigation Links:</h3>
            <ul className="space-y-1">
              {allNavItems.map((item) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span className={pathname === item.href ? "text-primary font-bold" : ""}>{item.name}</span>
                  <span className="text-xs text-muted-foreground">({item.href})</span>
                  {pathname === item.href && <span className="text-xs bg-primary/20 text-primary px-1 rounded">Active</span>}
                  <Link href={item.href} className="text-xs text-blue-500 hover:underline ml-auto">Navigate</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Total Balance</div>
            </div>
            <div className="mt-2 text-2xl font-bold">$24,563.45</div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="text-success">+2.5%</span> from last month
            </div>
          </div>
          
          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Active Strategies</div>
            </div>
            <div className="mt-2 text-2xl font-bold">8</div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="text-success">+2</span> new this week
            </div>
          </div>
          
          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Open Trades</div>
            </div>
            <div className="mt-2 text-2xl font-bold">12</div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="text-success">75%</span> profitable
            </div>
          </div>
          
          <div className="dashboard-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Performance</div>
            </div>
            <div className="mt-2 text-2xl font-bold">+18.2%</div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="text-danger">-3.1%</span> from yesterday
            </div>
          </div>
        </div>
        
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Real-Time Command Center
              </CardTitle>
              <Command className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ElizaOS Integration</div>
              <p className="text-xs text-muted-foreground">
                AI-powered trading commands and knowledge base
              </p>
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/real-time-command">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Open Command Console
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
