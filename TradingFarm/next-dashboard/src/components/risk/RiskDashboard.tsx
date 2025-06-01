/**
 * Risk Dashboard Component
 * Central interface for managing trading risk across the platform
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Shield, 
  Gauge, 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Zap,
  Settings,
  BarChart3,
  Clock
} from 'lucide-react';
import { RiskEventsList } from './RiskEventsList';
import { RiskProfilesList } from './RiskProfilesList';
import { RiskMetricsSummary } from './RiskMetricsSummary';
import { CircuitBreakerStatus } from './CircuitBreakerStatus';
import { enhancedRiskService, RiskEventRecord } from '@/services/enhanced-risk-service';

export function RiskDashboard() {
  const [activeEvents, setActiveEvents] = useState<RiskEventRecord[]>([]);
  const [recentEvents, setRecentEvents] = useState<RiskEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadRiskEvents();
    
    // Subscribe to new risk events
    const unsubscribe = enhancedRiskService.subscribeToRiskEvents((event) => {
      if (!event.acknowledged) {
        setActiveEvents(prev => [event, ...prev]);
      }
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  const loadRiskEvents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load active (unacknowledged) events
      const activeResponse = await enhancedRiskService.getRiskEvents(
        undefined, // all target types
        undefined, // all targets
        50, // limit
        false // unacknowledged only
      );
      
      if (activeResponse.success && activeResponse.data) {
        setActiveEvents(activeResponse.data);
      } else if (activeResponse.error) {
        setError(activeResponse.error);
      }
      
      // Load recent events (both acknowledged and unacknowledged)
      const recentResponse = await enhancedRiskService.getRiskEvents(
        undefined, // all target types
        undefined, // all targets
        10, // limit
        null // both acknowledged and unacknowledged
      );
      
      if (recentResponse.success && recentResponse.data) {
        setRecentEvents(recentResponse.data);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while loading risk events');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAcknowledge = async (eventId: string) => {
    try {
      const response = await enhancedRiskService.acknowledgeRiskEvent(
        eventId,
        'Acknowledged via Risk Dashboard',
        { source: 'dashboard' }
      );
      
      if (response.success) {
        // Update the events lists
        setActiveEvents(prev => prev.filter(event => event.id !== eventId));
        setRecentEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, acknowledged: true, acknowledged_at: new Date().toISOString() } 
            : event
        ));
      }
    } catch (error) {
      console.error('Error acknowledging event:', error);
    }
  };
  
  // Calculate summary metrics
  const criticalCount = activeEvents.filter(e => e.severity === 'critical').length;
  const warningCount = activeEvents.filter(e => e.severity === 'warning').length;
  const infoCount = activeEvents.filter(e => e.severity === 'info').length;
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-warning';
      case 'info': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Management Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage trading risk across your farms, strategies, and ElizaOS agents
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadRiskEvents}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button 
            variant="default" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            <span>Risk Settings</span>
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`${criticalCount > 0 ? 'border-destructive/50' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${criticalCount > 0 ? 'text-destructive' : ''}`} />
                <span>Critical Alerts</span>
              </span>
              <Badge 
                variant={criticalCount > 0 ? "destructive" : "outline"}
                className="ml-auto"
              >
                {criticalCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {criticalCount > 0 ? (
                <span className="text-destructive">{criticalCount} Critical</span>
              ) : (
                <span className="text-muted-foreground">No Critical Alerts</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {criticalCount > 0 
                ? 'Requires immediate attention' 
                : 'No critical issues detected'
              }
            </p>
            {criticalCount > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full mt-2"
              >
                View Critical Alerts
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card className={`${warningCount > 0 ? 'border-warning/50' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span className="flex items-center gap-2">
                <AlertCircle className={`h-4 w-4 ${warningCount > 0 ? 'text-warning' : ''}`} />
                <span>Warnings</span>
              </span>
              <Badge 
                variant={warningCount > 0 ? "default" : "outline"}
                className="ml-auto"
              >
                {warningCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warningCount > 0 ? (
                <span className="text-warning">{warningCount} Warning{warningCount !== 1 ? 's' : ''}</span>
              ) : (
                <span className="text-muted-foreground">No Warnings</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {warningCount > 0 
                ? 'Potential issues detected' 
                : 'No warnings detected'
              }
            </p>
            {warningCount > 0 && (
              <div className="mt-2">
                <Progress value={75} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  Risk level at 75% of threshold
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>System Status</span>
              </span>
              <Badge 
                variant="outline"
                className="ml-auto"
              >
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Circuit Breakers</span>
                <Badge variant="outline" className="font-mono">
                  {criticalCount > 0 ? 'TRIGGERED' : 'READY'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Drawdown Monitor</span>
                <Badge variant="outline" className="font-mono">ACTIVE</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk Limits</span>
                <Badge variant="outline" className="font-mono">ENFORCED</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs defaultValue="active-events">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="active-events" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Active Events</span>
            {activeEvents.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {activeEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="circuit-breakers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Circuit Breakers</span>
          </TabsTrigger>
          <TabsTrigger value="risk-profiles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Risk Profiles</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Risk Metrics</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active-events" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {activeEvents.length === 0 && !isLoading ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="text-lg font-medium">No Active Risk Events</h3>
                <p className="text-muted-foreground max-w-md mx-auto mt-1">
                  All risk events have been acknowledged. The system is operating within defined risk parameters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <RiskEventsList 
              events={activeEvents} 
              isLoading={isLoading} 
              onAcknowledge={handleAcknowledge}
              showAcknowledged={false}
            />
          )}
        </TabsContent>
        
        <TabsContent value="circuit-breakers">
          <CircuitBreakerStatus />
        </TabsContent>
        
        <TabsContent value="risk-profiles">
          <RiskProfilesList />
        </TabsContent>
        
        <TabsContent value="metrics">
          <RiskMetricsSummary />
        </TabsContent>
      </Tabs>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>
            Latest risk events and system actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEvents.length === 0 && !isLoading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No recent risk events</p>
              </div>
            ) : (
              recentEvents.map(event => (
                <div 
                  key={event.id} 
                  className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div className={`mt-1 rounded-full p-1 ${
                    event.severity === 'critical' ? 'bg-destructive/10' :
                    event.severity === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
                  }`}>
                    <div className={`h-2 w-2 rounded-full ${
                      event.severity === 'critical' ? 'bg-destructive' :
                      event.severity === 'warning' ? 'bg-warning' : 'bg-primary'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className={`font-medium truncate ${
                        getSeverityColor(event.severity)
                      }`}>
                        {event.description}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.event_type.replace(/_/g, ' ')} on {event.target_type} {event.target_id.substring(0, 8)}
                    </p>
                    {event.acknowledged && (
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary">Acknowledged</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full">
            View All Risk Events
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
