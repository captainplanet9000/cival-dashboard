'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Activity, ChevronRight, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink, Settings } from 'lucide-react';
import AgentsTab from '@/components/agents-tab';

export default function DashboardPage() {
  const router = useRouter();
  
  // Redirect to overview page when dashboard root is accessed
  React.useEffect(() => {
    router.replace('/dashboard/overview');
  }, [router]);
  return (
    <div className="flex flex-col space-y-6 p-8 bg-[#f8fafc]">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between dashboard-header p-4 rounded-lg mb-2">
        <h1 className="text-3xl font-bold tracking-tight trading-accent-gradient bg-clip-text text-transparent">Trading Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="outline-button gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="outline-button">
            <Settings className="h-4 w-4 mr-1" /> Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-10 bg-white shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Status Card */}
          <Card className="w-full dashboard-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>System Status</CardTitle>
                <Badge variant="outline" className="badge badge-green flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  All Systems Operational
                </Badge>
              </div>
              <CardDescription>
                Last updated: {new Date().toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Trading Engine', status: 'operational' },
                  { name: 'Data Feed', status: 'operational' },
                  { name: 'Agent System', status: 'operational' },
                  { name: 'Vault Banking', status: 'operational' }
                ].map((service, index) => (
                  <div key={index} className="flex flex-col p-3 border rounded-lg shadow-sm bg-card">
                    <span className="text-sm font-medium">{service.name}</span>
                    <div className="flex items-center mt-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="ml-2 text-xs text-green-700">
                        Operational
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Trading Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$143,721.50</div>
                <div className="flex items-center mt-1 text-green-600">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span className="text-sm">+2.5% today</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-3">
                <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
                  View details <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Active Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <div className="flex items-center mt-1 text-green-600">
                  <Activity className="h-4 w-4 mr-1" />
                  <span className="text-sm">4 in profit</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-3">
                <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
                  Manage positions <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Available Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$25,430.80</div>
                <div className="flex items-center mt-1 text-muted-foreground">
                  <span className="text-sm">Across 3 accounts</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-3">
                <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
                  Deposit funds <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle>Trading Performance</CardTitle>
              <CardDescription>Your portfolio performance over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center bg-muted/10 chart-container">
              <div className="text-center">
                <Activity className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Performance Charts</p>
                <p className="text-sm text-muted-foreground">Real charts would be displayed here</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Daily P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold positive-change">+$3,241.50</div>
                <div className="flex items-center mt-1">
                  <ArrowUpRight className="h-4 w-4 mr-1 positive-change" />
                  <span className="text-sm">+2.3% today</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Weekly P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold negative-change">-$1,450.70</div>
                <div className="flex items-center mt-1">
                  <ArrowDownRight className="h-4 w-4 mr-1 negative-change" />
                  <span className="text-sm">-0.8% this week</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Monthly Return</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold positive-change">+$12,548.30</div>
                <div className="flex items-center mt-1">
                  <ArrowUpRight className="h-4 w-4 mr-1 positive-change" />
                  <span className="text-sm">+9.5% this month</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* AI Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          <AgentsTab />
        </TabsContent>
      </Tabs>


    </div>
  );
}
