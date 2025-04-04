'use client';

/**
 * Wallet Alerts Component
 * Displays and manages alerts for a wallet
 */
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Bell, 
  BellOff,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: 'low_balance' | 'suspicious_activity' | 'large_withdrawal' | 'large_deposit' | 'other';
  message: string;
  timestamp: string;
  resolved?: boolean;
}

interface WalletAlertsProps {
  alerts: Alert[];
  onResolveAlert: (alertId: string) => void;
}

export function WalletAlerts({ alerts, onResolveAlert }: WalletAlertsProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>(alerts);
  
  // Filter alerts when dependencies change
  useEffect(() => {
    let result = [...alerts];
    
    if (filter === 'active') {
      result = result.filter(alert => !alert.resolved);
    } else if (filter === 'resolved') {
      result = result.filter(alert => alert.resolved);
    }
    
    // Sort by most recent first
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setFilteredAlerts(result);
  }, [alerts, filter]);
  
  // Toggle alert selection
  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId) 
        : [...prev, alertId]
    );
  };
  
  // Select all alerts
  const selectAllAlerts = () => {
    if (selectedAlerts.length === filteredAlerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(filteredAlerts.map(alert => alert.id));
    }
  };
  
  // Resolve selected alerts
  const resolveSelectedAlerts = () => {
    selectedAlerts.forEach(alertId => {
      onResolveAlert(alertId);
    });
    setSelectedAlerts([]);
  };
  
  // Get alert type icon
  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'low_balance':
        return <Wallet className="h-5 w-5 text-yellow-500" />;
      case 'suspicious_activity':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'large_withdrawal':
        return <ArrowUpRight className="h-5 w-5 text-orange-500" />;
      case 'large_deposit':
        return <ArrowDownRight className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };
  
  // Get alert type badge
  const getAlertTypeBadge = (type: string) => {
    switch (type) {
      case 'low_balance':
        return <Badge className="bg-yellow-100 text-yellow-800">Low Balance</Badge>;
      case 'suspicious_activity':
        return <Badge className="bg-red-100 text-red-800">Suspicious Activity</Badge>;
      case 'large_withdrawal':
        return <Badge className="bg-orange-100 text-orange-800">Large Withdrawal</Badge>;
      case 'large_deposit':
        return <Badge className="bg-green-100 text-green-800">Large Deposit</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Alert</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Wallet Alerts</CardTitle>
            <CardDescription>Notifications and alerts for your wallet</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="active">Active Alerts</SelectItem>
                <SelectItem value="resolved">Resolved Alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length > 0 ? (
          <div className="space-y-4">
            {/* Alert Selection Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectedAlerts.length === filteredAlerts.length && filteredAlerts.length > 0}
                  onCheckedChange={selectAllAlerts}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </label>
              </div>
              {selectedAlerts.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={resolveSelectedAlerts}
                  disabled={selectedAlerts.length === 0 || selectedAlerts.every(id => 
                    alerts.find(alert => alert.id === id)?.resolved
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark {selectedAlerts.length} as Resolved
                </Button>
              )}
            </div>
            
            {/* Alerts List */}
            <div className="space-y-3">
              {filteredAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`flex gap-3 p-4 border rounded-md ${
                    alert.resolved ? 'bg-muted/30' : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox 
                    checked={selectedAlerts.includes(alert.id)}
                    onCheckedChange={() => toggleAlertSelection(alert.id)}
                    disabled={alert.resolved}
                  />
                  <div className="flex flex-col sm:flex-row w-full gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-full bg-muted">
                        {getAlertTypeIcon(alert.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getAlertTypeBadge(alert.type)}
                          {alert.resolved && (
                            <Badge variant="outline" className="text-green-600">Resolved</Badge>
                          )}
                        </div>
                        <p className={alert.resolved ? 'text-muted-foreground' : ''}>
                          {alert.message}
                        </p>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                          <span className="mx-1">•</span>
                          {format(new Date(alert.timestamp), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <div className="flex justify-end items-start mt-2 sm:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onResolveAlert(alert.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No alerts found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter !== 'all' 
                ? `There are no ${filter === 'active' ? 'active' : 'resolved'} alerts at this time` 
                : "Your wallet is currently free from alerts"}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setFilter('all')}
            disabled={filter === 'all'}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
