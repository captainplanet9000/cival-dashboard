'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Check,
  Bell,
  Clock,
  Eye,
  EyeOff,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  RefreshCcw,
  Brain,
  Bot,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { acknowledgeAlert, resolveAlert } from '@/app/actions/risk-management-actions';

// Types for risk alerts
export interface RiskAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  alert_type: 'limit_breach' | 'drawdown' | 'volatility' | 'concentration' | 'leverage' | 'pattern' | 'ai_insight';
  affected_assets?: string[];
  metadata?: Record<string, any>;
  ai_generated?: boolean;
  ai_recommendation?: string;
  action_required?: boolean;
}

interface RiskAlertsProps {
  alerts: RiskAlert[];
  onRefresh?: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  hasElizaOS?: boolean;
}

export default function RiskAlerts({
  alerts,
  onRefresh,
  isLoading = false,
  title = "Risk Alerts",
  description = "Active risk notifications and warnings",
  hasElizaOS = true
}: RiskAlertsProps) {
  const { toast } = useToast();
  const [processingAlert, setProcessingAlert] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('all');
  
  // Filter alerts based on tab
  const filteredAlerts = React.useMemo(() => {
    if (currentTab === 'all') return alerts;
    if (currentTab === 'active') return alerts.filter(alert => !alert.resolved_at);
    if (currentTab === 'critical') return alerts.filter(alert => alert.severity === 'critical');
    if (currentTab === 'ai') return alerts.filter(alert => alert.ai_generated);
    return alerts;
  }, [alerts, currentTab]);
  
  // Counts for tab badges
  const alertCounts = React.useMemo(() => ({
    all: alerts.length,
    active: alerts.filter(alert => !alert.resolved_at).length,
    critical: alerts.filter(alert => alert.severity === 'critical').length,
    ai: alerts.filter(alert => alert.ai_generated).length
  }), [alerts]);
  
  // Handle alert acknowledgement
  const handleAcknowledge = async (alertId: string) => {
    try {
      setProcessingAlert(alertId);
      const result = await acknowledgeAlert(alertId);
      
      if (result.success) {
        toast({
          title: "Alert acknowledged",
          description: "The alert has been acknowledged successfully.",
        });
        if (onRefresh) onRefresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to acknowledge alert",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessingAlert(null);
    }
  };
  
  // Handle alert resolution
  const handleResolve = async (alertId: string, notes?: string) => {
    try {
      setProcessingAlert(alertId);
      const result = await resolveAlert(alertId, notes);
      
      if (result.success) {
        toast({
          title: "Alert resolved",
          description: "The alert has been resolved successfully.",
        });
        if (onRefresh) onRefresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to resolve alert",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessingAlert(null);
    }
  };
  
  // Get severity badge color
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Info</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Get alert type icon
  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'limit_breach':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'drawdown':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'volatility':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'concentration':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case 'leverage':
        return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      case 'pattern':
        return <AlertTriangle className="h-5 w-5 text-green-500" />;
      case 'ai_insight':
        return <Brain className="h-5 w-5 text-primary" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };
  
  // Get alert status badge
  const getStatusBadge = (alert: RiskAlert) => {
    if (alert.resolved_at) {
      return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Resolved</Badge>;
    } else if (alert.acknowledged_at) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Acknowledged</Badge>;
    } else if (alert.action_required) {
      return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Action Required</Badge>;
    } else {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">New</Badge>;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              {title}
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasElizaOS && (
              <Badge className="bg-primary/20 text-primary border-primary/30 flex items-center">
                <Brain className="h-3 w-3 mr-1" />
                ElizaOS Powered
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all" className="relative">
              All
              {alertCounts.all > 0 && (
                <Badge className="ml-2 text-xs">{alertCounts.all}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="relative">
              Active
              {alertCounts.active > 0 && (
                <Badge className="ml-2 text-xs">{alertCounts.active}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="critical" className="relative">
              Critical
              {alertCounts.critical > 0 && (
                <Badge className="ml-2 text-xs bg-red-500">{alertCounts.critical}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai" className="relative">
              AI Insights
              {alertCounts.ai > 0 && (
                <Badge className="ml-2 text-xs bg-primary">{alertCounts.ai}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Check className="h-12 w-12 text-green-500 mb-2 opacity-50" />
                <h3 className="text-lg font-medium">No alerts found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentTab === 'all' ? 'You have no active or recent alerts.' :
                   currentTab === 'active' ? 'You have no active alerts.' :
                   currentTab === 'critical' ? 'You have no critical alerts.' :
                   'You have no AI-generated insights.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className={`border rounded-lg overflow-hidden ${
                    alert.severity === 'critical' && !alert.resolved_at ? 'border-red-300 bg-red-50/50' :
                    alert.ai_generated ? 'border-primary/30 bg-primary/5' :
                    alert.resolved_at ? 'border-green-200 bg-green-50/50' : 
                    'border-gray-200'
                  }`}>
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex space-x-3">
                          {getAlertTypeIcon(alert.alert_type)}
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-medium">{alert.title}</h3>
                              {alert.ai_generated && (
                                <Badge 
                                  variant="outline" 
                                  className="ml-2 border-primary/30 text-primary text-xs bg-primary/10"
                                >
                                  <Bot className="h-2.5 w-2.5 mr-1" /> AI Generated
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {getSeverityBadge(alert.severity)}
                          {getStatusBadge(alert)}
                        </div>
                      </div>
                      
                      {alert.affected_assets && alert.affected_assets.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {alert.affected_assets.map((asset, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {alert.ai_recommendation && (
                        <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded text-sm">
                          <div className="flex items-start space-x-2">
                            <Brain className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <div className="font-medium text-primary">ElizaOS Recommendation</div>
                              <p>{alert.ai_recommendation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </div>
                        
                        <div className="flex space-x-2">
                          {!alert.acknowledged_at && !alert.resolved_at && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={processingAlert === alert.id}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          
                          {!alert.resolved_at && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleResolve(alert.id)}
                              disabled={processingAlert === alert.id}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={processingAlert === alert.id}
                              >
                                {processingAlert === alert.id ? (
                                  <RefreshCcw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => window.open(`/risk-management/alerts/${alert.id}`, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  // This would be handled client-side in a real implementation
                                  toast({
                                    title: "Alert snoozed",
                                    description: "The alert has been snoozed for 24 hours.",
                                  });
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Snooze
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  // This would be handled client-side in a real implementation
                                  window.open(`/risk-management/alerts/${alert.id}/analyze`, '_blank');
                                }}
                                disabled={!hasElizaOS}
                              >
                                <Brain className="h-4 w-4 mr-2" />
                                AI Analysis
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
      
      {hasElizaOS && (
        <CardFooter className="bg-muted/50 border-t px-6 py-4">
          <Button variant="outline" className="w-full" onClick={() => {
            // This would be handled client-side in a real implementation
            window.open('/risk-management/ai-insights', '_blank');
          }}>
            <Zap className="h-4 w-4 mr-2" />
            Generate AI Risk Analysis
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
