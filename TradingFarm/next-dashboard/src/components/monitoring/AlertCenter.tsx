'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle, AlertTriangle, XCircle, Info, Clock, Shield, BarChart3 } from 'lucide-react';
import { 
  Alert, 
  AlertSeverity, 
  AlertStatus, 
  AlertCategory, 
  AlertSource 
} from '@/lib/alerts/types';
import { AlertService } from '@/lib/alerts/alert-service';
import { createBrowserClient } from '@/utils/supabase/client';

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [alertStats, setAlertStats] = useState<Record<string, any>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'actionRequired' | 'critical' | 'warning' | 'info'>('all');
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory | 'all'>('all');
  const [alertService, setAlertService] = useState<AlertService | null>(null);
  
  const supabase = createBrowserClient();
  const { toast } = useToast();

  // Initialize user ID and services
  useEffect(() => {
    const initUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        setUserId(user.id);
        setAlertService(new AlertService(user.id));
      } catch (error) {
        console.error('Error initializing user:', error);
      }
    };
    
    initUser();
  }, []);

  // Fetch alerts when userId is set
  useEffect(() => {
    if (userId && alertService) {
      fetchAlerts();
      fetchAlertStats();
      
      // Set up real-time subscription for alerts
      const alertsSubscription = supabase
        .channel('alerts-channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${userId}`
        }, () => {
          fetchAlerts();
          fetchAlertStats();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(alertsSubscription);
      };
    }
  }, [userId, alertService]);

  // Apply filters when alerts or filter settings change
  useEffect(() => {
    filterAlerts(activeFilter, selectedCategory);
  }, [alerts, activeFilter, selectedCategory]);

  const fetchAlerts = async () => {
    if (!alertService) return;
    
    setLoading(true);
    try {
      const alertsData = await alertService.getActiveAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alerts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertStats = async () => {
    if (!alertService) return;
    
    try {
      const stats = await alertService.getAlertStats();
      setAlertStats(stats);
    } catch (error) {
      console.error('Error fetching alert stats:', error);
    }
  };

  const filterAlerts = (filter: string, category: string) => {
    let filtered = [...alerts];
    
    // Apply severity filter
    if (filter === 'critical') {
      filtered = filtered.filter(alert => alert.severity === AlertSeverity.CRITICAL);
    } else if (filter === 'warning') {
      filtered = filtered.filter(alert => alert.severity === AlertSeverity.WARNING);
    } else if (filter === 'info') {
      filtered = filtered.filter(alert => alert.severity === AlertSeverity.INFO);
    } else if (filter === 'actionRequired') {
      filtered = filtered.filter(alert => alert.actionRequired);
    }
    
    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter(alert => alert.category === category);
    }
    
    setFilteredAlerts(filtered);
  };

  const handleUpdateStatus = async (alertId: string, status: AlertStatus) => {
    if (!alertService) return;
    
    try {
      const success = await alertService.updateAlertStatus(alertId, status);
      
      if (success) {
        // Update local state
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, status } : alert
        ));
        
        toast({
          title: 'Alert Updated',
          description: `Alert ${status === AlertStatus.ACKNOWLEDGED ? 'acknowledged' : status === AlertStatus.RESOLVED ? 'resolved' : 'dismissed'}`,
        });
      } else {
        throw new Error('Failed to update alert status');
      }
    } catch (error) {
      console.error('Error updating alert status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert status',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Alert Center</h2>
        <Button onClick={fetchAlerts} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Alert summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{alertStats.totalActive || 0}</p>
              </div>
              <Bell className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-500">{alertStats.bySeverity?.critical || 0}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Action Required</p>
                <p className="text-2xl font-bold text-amber-500">{alertStats.actionRequired || 0}</p>
              </div>
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Unacknowledged</p>
                <p className="text-2xl font-bold">{alertStats.totalUnacknowledged || 0}</p>
              </div>
              <Info className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs defaultValue="all" onValueChange={(value) => setActiveFilter(value as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="actionRequired">Action Required</TabsTrigger>
            <TabsTrigger value="critical">Critical</TabsTrigger>
            <TabsTrigger value="warning">Warning</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs defaultValue="all" onValueChange={(value) => setSelectedCategory(value as any)}>
          <TabsList>
            <TabsTrigger value="all">All Categories</TabsTrigger>
            <TabsTrigger value={AlertCategory.TRADING}>Trading</TabsTrigger>
            <TabsTrigger value={AlertCategory.RISK}>Risk</TabsTrigger>
            <TabsTrigger value={AlertCategory.SYSTEM}>System</TabsTrigger>
            <TabsTrigger value={AlertCategory.SECURITY}>Security</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Alert list */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-accent/50">
                    <CardContent className="p-4">
                      <div className="h-20 animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">No alerts to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onUpdateStatus={handleUpdateStatus} 
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
  onUpdateStatus: (alertId: string, status: AlertStatus) => void;
}

function AlertCard({ alert, onUpdateStatus }: AlertCardProps) {
  // Helper function to get icon based on severity
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case AlertSeverity.ERROR:
        return <XCircle className="h-5 w-5 text-red-400" />;
      case AlertSeverity.WARNING:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case AlertSeverity.INFO:
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };
  
  // Helper function to get icon based on category
  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case AlertCategory.TRADING:
        return <BarChart3 className="h-4 w-4" />;
      case AlertCategory.RISK:
        return <AlertTriangle className="h-4 w-4" />;
      case AlertCategory.SYSTEM:
        return <Info className="h-4 w-4" />;
      case AlertCategory.SECURITY:
        return <Shield className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };
  
  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Helper function to get badge color based on severity
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'bg-red-500 text-white hover:bg-red-600';
      case AlertSeverity.ERROR:
        return 'bg-red-400 text-white hover:bg-red-500';
      case AlertSeverity.WARNING:
        return 'bg-amber-500 text-white hover:bg-amber-600';
      case AlertSeverity.INFO:
        return 'bg-blue-500 text-white hover:bg-blue-600';
      default:
        return '';
    }
  };
  
  return (
    <Card className={`border-l-4 ${
      alert.severity === AlertSeverity.CRITICAL ? 'border-l-red-500' : 
      alert.severity === AlertSeverity.ERROR ? 'border-l-red-400' : 
      alert.severity === AlertSeverity.WARNING ? 'border-l-amber-500' : 
      'border-l-blue-500'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="mt-1">
              {getSeverityIcon(alert.severity)}
            </div>
            <div>
              <h3 className="font-medium">{alert.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {getCategoryIcon(alert.category)} {alert.category}
                </Badge>
                
                <Badge variant="outline" className="text-xs">
                  {formatTimestamp(alert.createdAt)}
                </Badge>
                
                {alert.status === AlertStatus.ACKNOWLEDGED && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 text-xs">
                    Acknowledged
                  </Badge>
                )}
                
                {alert.actionRequired && (
                  <Badge className={`${getSeverityColor(alert.severity)} text-xs`}>
                    Action Required
                  </Badge>
                )}
              </div>
              
              {alert.relatedEntityType && (
                <p className="text-xs text-muted-foreground mt-2">
                  Related to: {alert.relatedEntityType} {alert.relatedEntityId}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {alert.status === AlertStatus.ACTIVE && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUpdateStatus(alert.id, AlertStatus.ACKNOWLEDGED)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Acknowledge
              </Button>
            )}
            
            {(alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.ACKNOWLEDGED) && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUpdateStatus(alert.id, AlertStatus.RESOLVED)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Resolve
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onUpdateStatus(alert.id, AlertStatus.DISMISSED)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
