/**
 * Alerts Panel Component
 *
 * Displays active alerts, alert configuration, and allows users to acknowledge alerts.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertConfig, TriggeredAlert, monitoringService } from '@/utils/trading/monitoring-service';
import { Bell, Check, Plus, AlertTriangle, Info, Trash } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export interface AlertsPanelProps {
  userId: string;
}

export default function AlertsPanel({ userId }: AlertsPanelProps) {
  const { toast } = useToast();
  const [activeAlerts, setActiveAlerts] = useState<TriggeredAlert[]>([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<TriggeredAlert[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [newAlertConfig, setNewAlertConfig] = useState<Partial<AlertConfig>>({
    metric_name: '',
    condition: '>',
    threshold: 0,
    severity: 'warning',
    enabled: true,
    notification_channels: { email: true }
  });

  // Load active alerts
  useEffect(() => {
    const loadAlerts = async () => {
      setIsLoadingAlerts(true);
      try {
        const active = await monitoringService.getTriggeredAlerts(userId, 20, false);
        setActiveAlerts(active);
        
        const acknowledged = await monitoringService.getTriggeredAlerts(userId, 10, true);
        setAcknowledgedAlerts(acknowledged);
      } catch (error) {
        console.error('Error loading alerts:', error);
        toast({
          title: "Failed to load alerts",
          description: "There was an error loading your alerts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAlerts(false);
      }
    };
    
    if (userId) {
      loadAlerts();
    }
  }, [userId, toast]);

  // Load alert configurations
  useEffect(() => {
    const loadAlertConfigs = async () => {
      setIsLoadingConfigs(true);
      try {
        const configs = await monitoringService.getAlertConfigs(userId);
        setAlertConfigs(configs);
      } catch (error) {
        console.error('Error loading alert configs:', error);
        toast({
          title: "Failed to load alert configurations",
          description: "There was an error loading your alert settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingConfigs(false);
      }
    };
    
    if (userId) {
      loadAlertConfigs();
    }
  }, [userId, toast]);

  // Handle acknowledging an alert
  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      const success = await monitoringService.acknowledgeAlert(userId, alertId);
      
      if (success) {
        // Update local state after successful acknowledge
        const acknowledged = activeAlerts.find(alert => alert.id === alertId);
        if (acknowledged) {
          setActiveAlerts(activeAlerts.filter(alert => alert.id !== alertId));
          setAcknowledgedAlerts([{ ...acknowledged, acknowledged: true }, ...acknowledgedAlerts]);
        }
        
        toast({
          title: "Alert acknowledged",
          description: "The alert has been acknowledged successfully.",
        });
      } else {
        throw new Error("Failed to acknowledge alert");
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Failed to acknowledge alert",
        description: "There was an error acknowledging the alert. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle creating a new alert config
  const handleCreateAlertConfig = async () => {
    try {
      const result = await monitoringService.upsertAlertConfig(userId, newAlertConfig);
      
      if (result) {
        setAlertConfigs([...alertConfigs, result]);
        setAlertDialogOpen(false);
        setNewAlertConfig({
          metric_name: '',
          condition: '>',
          threshold: 0,
          severity: 'warning',
          enabled: true,
          notification_channels: { email: true }
        });
        
        toast({
          title: "Alert configuration created",
          description: "Your new alert has been configured successfully.",
        });
      } else {
        throw new Error("Failed to create alert configuration");
      }
    } catch (error) {
      console.error('Error creating alert config:', error);
      toast({
        title: "Failed to create alert",
        description: "There was an error creating your alert configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle toggling an alert config
  const handleToggleAlertConfig = async (configId: number, enabled: boolean) => {
    try {
      const updatedConfig = await monitoringService.upsertAlertConfig(userId, {
        id: configId,
        enabled
      });
      
      if (updatedConfig) {
        setAlertConfigs(alertConfigs.map(config => 
          config.id === configId ? { ...config, enabled } : config
        ));
        
        toast({
          title: enabled ? "Alert enabled" : "Alert disabled",
          description: `The alert has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
        });
      } else {
        throw new Error("Failed to update alert configuration");
      }
    } catch (error) {
      console.error('Error updating alert config:', error);
      toast({
        title: "Failed to update alert",
        description: "There was an error updating your alert configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle deleting an alert config
  const handleDeleteAlertConfig = async (configId: number) => {
    try {
      const success = await monitoringService.deleteAlertConfig(userId, configId);
      
      if (success) {
        setAlertConfigs(alertConfigs.filter(config => config.id !== configId));
        
        toast({
          title: "Alert configuration deleted",
          description: "The alert configuration has been deleted successfully.",
        });
      } else {
        throw new Error("Failed to delete alert configuration");
      }
    } catch (error) {
      console.error('Error deleting alert config:', error);
      toast({
        title: "Failed to delete alert",
        description: "There was an error deleting your alert configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render severity badge
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="font-medium">Critical</Badge>;
      case 'warning':
        return <Badge variant="warning" className="bg-amber-500 font-medium">Warning</Badge>;
      case 'info':
        return <Badge variant="outline" className="font-medium">Info</Badge>;
      default:
        return <Badge className="font-medium">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Alert Management</h2>
        <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Alert</DialogTitle>
              <DialogDescription>
                Configure a new alert that will notify you when a metric reaches the defined threshold.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="metric-name">Metric Name</Label>
                <Input
                  id="metric-name"
                  placeholder="e.g., drawdown, volatility"
                  value={newAlertConfig.metric_name}
                  onChange={(e) => setNewAlertConfig({ ...newAlertConfig, metric_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={newAlertConfig.condition}
                    onValueChange={(value) => setNewAlertConfig({ ...newAlertConfig, condition: value })}
                  >
                    <SelectTrigger id="condition">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">Greater than (&gt;)</SelectItem>
                      <SelectItem value=">=">Greater or equal (&gt;=)</SelectItem>
                      <SelectItem value="<">Less than (&lt;)</SelectItem>
                      <SelectItem value="<=">Less or equal (&lt;=)</SelectItem>
                      <SelectItem value="==">Equal to (==)</SelectItem>
                      <SelectItem value="!=">Not equal to (!=)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="threshold">Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="0.01"
                    value={newAlertConfig.threshold}
                    onChange={(e) => setNewAlertConfig({
                      ...newAlertConfig,
                      threshold: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="severity">Severity</Label>
                  <Select
                    value={newAlertConfig.severity as string}
                    onValueChange={(value) => setNewAlertConfig({
                      ...newAlertConfig,
                      severity: value as 'info' | 'warning' | 'critical'
                    })}
                  >
                    <SelectTrigger id="severity">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notifications</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="email-notifications"
                    checked={newAlertConfig.notification_channels?.email === true}
                    onCheckedChange={(checked) => setNewAlertConfig({
                      ...newAlertConfig,
                      notification_channels: {
                        ...newAlertConfig.notification_channels,
                        email: checked
                      }
                    })}
                  />
                  <Label htmlFor="email-notifications">Email notifications</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleCreateAlertConfig}>Create Alert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Alerts</TabsTrigger>
          <TabsTrigger value="configurations">Alert Configurations</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Active Alerts
              </CardTitle>
              <CardDescription>
                Alerts that require your attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : activeAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Triggered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{renderSeverityBadge(alert.severity)}</TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="flex items-center gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Acknowledge
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-lg font-medium">No active alerts</p>
                  <p className="text-sm text-muted-foreground">
                    You have no pending alerts that require attention
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configurations">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configurations</CardTitle>
              <CardDescription>
                Configure and manage your alert thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingConfigs ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : alertConfigs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">{config.metric_name}</TableCell>
                        <TableCell>{config.condition}</TableCell>
                        <TableCell>{config.threshold}</TableCell>
                        <TableCell>{renderSeverityBadge(config.severity)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(checked) => handleToggleAlertConfig(config.id, checked)}
                            />
                            <span>{config.enabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteAlertConfig(config.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-lg font-medium">No alert configurations</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    You haven't configured any alerts yet
                  </p>
                  <Button 
                    onClick={() => setAlertDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Alert
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>
                Previously acknowledged alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : acknowledgedAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Triggered</TableHead>
                      <TableHead>Acknowledged</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acknowledgedAlerts.map((alert) => (
                      <TableRow key={alert.id} className="text-muted-foreground">
                        <TableCell>{renderSeverityBadge(alert.severity)}</TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>
                          {format(new Date(alert.triggered_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {alert.acknowledged_at && 
                            format(new Date(alert.acknowledged_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Info className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-lg font-medium">No alert history</p>
                  <p className="text-sm text-muted-foreground">
                    You have no previously acknowledged alerts
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
