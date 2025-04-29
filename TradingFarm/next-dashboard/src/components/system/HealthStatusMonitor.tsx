"use client";

import * as React from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HealthStatus } from '@/types/database.types';

type ServiceHealth = {
  service_name: string;
  status: HealthStatus;
  last_checked: string;
  message: string;
};

export function HealthStatusMonitor() {
  const [health, setHealth] = React.useState<ServiceHealth[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const supabase = createBrowserClient();

  const fetchHealthStatus = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('health_check')
        .select('*')
        .order('service_name');

      if (error) throw error;
      setHealth(data || []);
    } catch (error: any) {
      console.error('Error fetching health status:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching system status',
        description: error.message || 'Could not retrieve system health status',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  // Subscribe to health check updates
  React.useEffect(() => {
    fetchHealthStatus();

    // Set up real-time subscription
    const channel = supabase
      .channel('public:health_check')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_check' }, (payload) => {
        fetchHealthStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHealthStatus, supabase]);

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <ShieldAlert className="h-5 w-5 text-amber-500" />;
      case 'offline':
        return <ShieldX className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Degraded</Badge>;
      case 'offline':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Offline</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Loading system health status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="animate-pulse flex space-x-4">
              <div className="h-4 w-16 bg-slate-200 rounded"></div>
              <div className="h-4 w-28 bg-slate-200 rounded"></div>
              <div className="h-4 w-20 bg-slate-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
        <CardDescription>Real-time health status of Trading Farm services</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {health.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health data available</p>
          ) : (
            health.map((service) => (
              <div key={service.service_name} className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium">{service.service_name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p className="text-sm text-muted-foreground">{service.message}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {getStatusBadge(service.status)}
                  <span className="text-xs text-muted-foreground mt-1">
                    {new Date(service.last_checked).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
