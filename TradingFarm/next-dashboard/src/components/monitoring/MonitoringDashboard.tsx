/**
 * Monitoring Dashboard
 * 
 * Comprehensive operations dashboard with real-time monitoring, alerts,
 * performance metrics, audit logs, exchange connections, and WebSocket management.
 */

import * as React from 'react';
const { useState, useEffect } = React;
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { monitoringService } from '@/utils/trading/monitoring-service';
import AlertsPanel from './AlertsPanel';
import PerformanceMetricsPanel from './PerformanceMetricsPanel';
import { AuditLogViewer } from './AuditLogViewer';
import { ConnectionHealthDashboard } from './ConnectionHealthDashboard';
import NotificationSettingsPanel from './NotificationSettingsPanel';
import { WebSocketStatusPanel } from './WebSocketStatusPanel';
import { Loader2, Bell, Activity, BarChart, FileText, Settings, Link, Shield } from 'lucide-react';
import { createBrowserClient } from '@/utils/supabase/client';
import { WebSocketManager } from '@/utils/websocket/websocket-manager';

export interface MonitoringDashboardProps {
  userId?: string;
}

export function MonitoringDashboard({ userId }: MonitoringDashboardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);
  const [activeTab, setActiveTab] = useState('alerts');
  const [webSocketManager, setWebSocketManager] = useState<WebSocketManager | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!currentUserId) {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setCurrentUserId(session.user.id);
        } else {
          toast({
            title: "Authentication Required",
            description: "Please sign in to view monitoring data",
            variant: "destructive",
          });
        }
      }
      
      // Initialize WebSocket manager
      const wsManager = WebSocketManager.getInstance();
      wsManager.initialize();
      setWebSocketManager(wsManager);
      
      setIsLoading(false);
    };
    
    loadUser();
    
    // Cleanup WebSocket connections when component unmounts
    return () => {
      // Don't fully destroy the singleton, just clean up connections
      webSocketManager?.cleanup();
    };
  }, [currentUserId, toast]);

  if (isLoading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Please sign in to access the monitoring dashboard
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Monitoring & Operations</h1>
        <p className="text-muted-foreground">
          Monitor your trading operations, configure alerts, and track performance metrics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-8">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Trading Audit</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            <span>Exchange Health</span>
          </TabsTrigger>
          <TabsTrigger value="websockets" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>WebSockets</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <AlertsPanel userId={currentUserId} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMetricsPanel userId={currentUserId} />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditLogViewer farmId={undefined} limit={15} />
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <ConnectionHealthDashboard />
        </TabsContent>
        
        <TabsContent value="websockets" className="space-y-4">
          {webSocketManager && (
            <WebSocketStatusPanel webSocketPool={webSocketManager.getPool()} />
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <NotificationSettingsPanel userId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
