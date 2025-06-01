"use client";

import dynamic from 'next/dynamic';

// Dynamically import the components to avoid SSR issues with client hooks
const MonitoringDashboard = dynamic(() => 
  import('@/components/monitoring/MonitoringDashboard').then(m => m.MonitoringDashboard), {
  ssr: false,
});

const TradingDashboard = dynamic(() => 
  import('@/components/monitoring/TradingDashboard').then(m => m.TradingDashboard), {
  ssr: false,
});

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Activity, LayoutDashboard, BarChart } from 'lucide-react';

export default function MonitoringPage() {
  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col">
        <h2 className="text-3xl font-bold tracking-tight">Monitoring & Operations</h2>
        <p className="text-muted-foreground">Real-time monitoring, analytics, and trading operations dashboard</p>
      </div>
      
      <Separator />
      
      <Tabs defaultValue="trading" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="trading" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Live Trading Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Operations Center</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trading" className="space-y-4">
          <TradingDashboard />
        </TabsContent>
        
        <TabsContent value="operations" className="space-y-4">
          <MonitoringDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
