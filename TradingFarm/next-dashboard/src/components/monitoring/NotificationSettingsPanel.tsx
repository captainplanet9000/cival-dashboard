/**
 * Notification Settings Panel Component
 *
 * Manages user notification preferences across different channels (email, push, SMS).
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { monitoringService, NotificationPreference } from '@/utils/trading/monitoring-service';
import { Bell, Mail, Smartphone, BellOff, Save, Loader2 } from 'lucide-react';

export interface NotificationSettingsPanelProps {
  userId: string;
}

export default function NotificationSettingsPanel({ userId }: NotificationSettingsPanelProps) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load notification preferences
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const prefs = await monitoringService.getNotificationPreferences(userId);
        setPreferences(prefs);
        
        // If no preferences exist yet, create default ones
        if (prefs.length === 0) {
          createDefaultPreferences();
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast({
          title: "Failed to load notification settings",
          description: "There was an error loading your notification preferences. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    const createDefaultPreferences = async () => {
      // This would typically be handled by backend logic
      // Here we're simulating the creation of default preferences
      toast({
        title: "Setting up notifications",
        description: "Creating default notification preferences...",
      });
      
      // Default email preference would be created in the database migration
      // This is just for UI presentation if the user hasn't set up preferences yet
      const defaults = [
        {
          id: 0,
          user_id: userId,
          channel: 'email',
          enabled: true,
          config: { frequency: 'immediate' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 0, 
          user_id: userId,
          channel: 'push',
          enabled: false,
          config: { frequency: 'immediate' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 0,
          user_id: userId,
          channel: 'sms',
          enabled: false,
          config: { frequency: 'daily' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setPreferences(defaults as NotificationPreference[]);
    };
    
    if (userId) {
      loadPreferences();
    }
  }, [userId, toast]);

  // Handle toggling notification channel
  const handleToggleChannel = async (prefId: number, enabled: boolean) => {
    // Find the preference in the local state
    const preference = preferences.find(p => p.id === prefId);
    if (!preference) return;
    
    // Optimistically update UI
    setPreferences(preferences.map(p => 
      p.id === prefId ? { ...p, enabled } : p
    ));
    
    try {
      const result = await monitoringService.updateNotificationPreference(userId, prefId, { enabled });
      
      if (!result) {
        throw new Error("Failed to update notification preference");
      }
      
      toast({
        title: enabled ? "Notifications enabled" : "Notifications disabled",
        description: `${preference.channel.charAt(0).toUpperCase() + preference.channel.slice(1)} notifications have been ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      
      // Revert UI change on error
      setPreferences(preferences.map(p => 
        p.id === prefId ? preference : p
      ));
      
      toast({
        title: "Failed to update notification settings",
        description: "There was an error updating your notification preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle updating notification frequency
  const handleUpdateFrequency = async (prefId: number, frequency: string) => {
    // Find the preference in the local state
    const preference = preferences.find(p => p.id === prefId);
    if (!preference) return;
    
    // Create new config with updated frequency
    const updatedConfig = {
      ...preference.config,
      frequency
    };
    
    // Optimistically update UI
    setPreferences(preferences.map(p => 
      p.id === prefId ? { ...p, config: updatedConfig } : p
    ));
    
    try {
      const result = await monitoringService.updateNotificationPreference(userId, prefId, {
        config: updatedConfig
      });
      
      if (!result) {
        throw new Error("Failed to update notification preference");
      }
      
      toast({
        title: "Notification frequency updated",
        description: `${preference.channel.charAt(0).toUpperCase() + preference.channel.slice(1)} notifications will now be sent ${frequency}.`,
      });
    } catch (error) {
      console.error('Error updating notification frequency:', error);
      
      // Revert UI change on error
      setPreferences(preferences.map(p => 
        p.id === prefId ? preference : p
      ));
      
      toast({
        title: "Failed to update notification settings",
        description: "There was an error updating your notification preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle saving contact information
  const handleSaveContactInfo = async (channel: string, contactInfo: string) => {
    setSaving(true);
    try {
      // Find the preference for this channel
      const preference = preferences.find(p => p.channel === channel);
      if (!preference) throw new Error(`No preference found for channel: ${channel}`);
      
      // Update config with contact info
      const updatedConfig = {
        ...preference.config,
        contactInfo
      };
      
      const result = await monitoringService.updateNotificationPreference(userId, preference.id, {
        config: updatedConfig
      });
      
      if (!result) {
        throw new Error("Failed to update contact information");
      }
      
      // Update local state
      setPreferences(preferences.map(p => 
        p.id === preference.id ? { ...p, config: updatedConfig } : p
      ));
      
      toast({
        title: "Contact information updated",
        description: `Your ${channel} contact information has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating contact information:', error);
      toast({
        title: "Failed to update contact information",
        description: "There was an error updating your contact information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Get preferences by channel
  const getPreferenceByChannel = (channel: string): NotificationPreference | undefined => {
    return preferences.find(p => p.channel === channel);
  };

  // Render channel icon
  const renderChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'push':
        return <Bell className="h-5 w-5" />;
      case 'sms':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notification Settings</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="channels">Notification Channels</TabsTrigger>
            <TabsTrigger value="types">Alert Types</TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="space-y-6">
            {/* Email Notifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {renderChannelIcon('email')}
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Receive trading alerts and reports via email
                  </CardDescription>
                </div>
                <div>
                  {getPreferenceByChannel('email') && (
                    <Switch
                      checked={getPreferenceByChannel('email')?.enabled || false}
                      onCheckedChange={(checked) => 
                        handleToggleChannel(getPreferenceByChannel('email')!.id, checked)
                      }
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        defaultValue={getPreferenceByChannel('email')?.config?.contactInfo || ''}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => 
                          handleSaveContactInfo('email', 
                            (document.getElementById('email') as HTMLInputElement).value
                          )
                        }
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email-frequency">Notification Frequency</Label>
                    <Select
                      defaultValue={getPreferenceByChannel('email')?.config?.frequency || 'immediate'}
                      onValueChange={(value) => 
                        handleUpdateFrequency(getPreferenceByChannel('email')!.id, value)
                      }
                    >
                      <SelectTrigger id="email-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate (as they happen)</SelectItem>
                        <SelectItem value="hourly">Hourly digest</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                        <SelectItem value="weekly">Weekly digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Critical alerts will always be sent immediately, regardless of your digest settings.
              </CardFooter>
            </Card>
            
            {/* Push Notifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {renderChannelIcon('push')}
                    Push Notifications
                  </CardTitle>
                  <CardDescription>
                    Receive alerts through your browser or mobile app
                  </CardDescription>
                </div>
                <div>
                  {getPreferenceByChannel('push') && (
                    <Switch
                      checked={getPreferenceByChannel('push')?.enabled || false}
                      onCheckedChange={(checked) => 
                        handleToggleChannel(getPreferenceByChannel('push')!.id, checked)
                      }
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="push-frequency">Notification Frequency</Label>
                    <Select
                      defaultValue={getPreferenceByChannel('push')?.config?.frequency || 'immediate'}
                      onValueChange={(value) => 
                        handleUpdateFrequency(getPreferenceByChannel('push')!.id, value)
                      }
                    >
                      <SelectTrigger id="push-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate (as they happen)</SelectItem>
                        <SelectItem value="hourly">Hourly digest</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Push notifications require browser or app permissions to be enabled.
              </CardFooter>
            </Card>
            
            {/* SMS Notifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {renderChannelIcon('sms')}
                    SMS Notifications
                  </CardTitle>
                  <CardDescription>
                    Receive critical alerts via text message
                  </CardDescription>
                </div>
                <div>
                  {getPreferenceByChannel('sms') && (
                    <Switch
                      checked={getPreferenceByChannel('sms')?.enabled || false}
                      onCheckedChange={(checked) => 
                        handleToggleChannel(getPreferenceByChannel('sms')!.id, checked)
                      }
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        defaultValue={getPreferenceByChannel('sms')?.config?.contactInfo || ''}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => 
                          handleSaveContactInfo('sms', 
                            (document.getElementById('phone') as HTMLInputElement).value
                          )
                        }
                        disabled={saving}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="sms-frequency">Notification Frequency</Label>
                    <Select
                      defaultValue={getPreferenceByChannel('sms')?.config?.frequency || 'immediate'}
                      onValueChange={(value) => 
                        handleUpdateFrequency(getPreferenceByChannel('sms')!.id, value)
                      }
                    >
                      <SelectTrigger id="sms-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate (critical alerts only)</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                SMS notifications may incur charges depending on your carrier.
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert Type Settings</CardTitle>
                <CardDescription>
                  Control which types of alerts you receive across channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Trading Alerts</h3>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="trade-execution" className="flex items-center gap-2">
                          Trade Execution
                          <span className="text-xs text-muted-foreground">
                            (When trades are executed)
                          </span>
                        </Label>
                        <Switch id="trade-execution" defaultChecked />
                      </div>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="position-alerts" className="flex items-center gap-2">
                          Position Alerts
                          <span className="text-xs text-muted-foreground">
                            (When positions reach thresholds)
                          </span>
                        </Label>
                        <Switch id="position-alerts" defaultChecked />
                      </div>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="strategy-alerts" className="flex items-center gap-2">
                          Strategy Signals
                          <span className="text-xs text-muted-foreground">
                            (When trading strategies generate signals)
                          </span>
                        </Label>
                        <Switch id="strategy-alerts" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Risk Alerts</h3>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="circuit-breaker" className="flex items-center gap-2">
                          Circuit Breaker
                          <span className="text-xs text-muted-foreground">
                            (When circuit breakers are triggered)
                          </span>
                        </Label>
                        <Switch id="circuit-breaker" defaultChecked />
                      </div>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="drawdown-alerts" className="flex items-center gap-2">
                          Drawdown Alerts
                          <span className="text-xs text-muted-foreground">
                            (When drawdown exceeds thresholds)
                          </span>
                        </Label>
                        <Switch id="drawdown-alerts" defaultChecked />
                      </div>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="exposure-alerts" className="flex items-center gap-2">
                          Exposure Alerts
                          <span className="text-xs text-muted-foreground">
                            (When position size exceeds limits)
                          </span>
                        </Label>
                        <Switch id="exposure-alerts" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">System Alerts</h3>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-alerts" className="flex items-center gap-2">
                          Security Alerts
                          <span className="text-xs text-muted-foreground">
                            (Login attempts, password changes)
                          </span>
                        </Label>
                        <Switch id="login-alerts" defaultChecked />
                      </div>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="maintenance-alerts" className="flex items-center gap-2">
                          Maintenance Alerts
                          <span className="text-xs text-muted-foreground">
                            (Scheduled maintenance, system updates)
                          </span>
                        </Label>
                        <Switch id="maintenance-alerts" defaultChecked />
                      </div>
                    </div>
                    
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="api-alerts" className="flex items-center gap-2">
                          API Connection Alerts
                          <span className="text-xs text-muted-foreground">
                            (Exchange connectivity issues)
                          </span>
                        </Label>
                        <Switch id="api-alerts" defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
