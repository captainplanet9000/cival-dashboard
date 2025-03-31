'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle,
  Check,
  Info,
  Shield,
  ShieldAlert,
  User,
  Users,
  Lock,
  LockOpen,
  Brain,
  Key
} from 'lucide-react';
import { updatePermissionSettings } from '@/app/actions/exchange-actions';

// Schema for permission settings
const permissionSchema = z.object({
  // Exchange API Key Access
  exchange_access_mode: z.enum(['all_users', 'owner_only', 'specific_users']),
  allowed_user_ids: z.array(z.string()).optional(),
  
  // Trading Permissions
  allow_manual_trading: z.boolean().default(true),
  allow_automated_trading: z.boolean().default(true),
  allow_strategy_trading: z.boolean().default(true),
  max_order_value: z.number().min(0).optional(),
  max_daily_trading_value: z.number().min(0).optional(),
  
  // Risk Controls
  require_2fa_for_large_orders: z.boolean().default(false),
  large_order_threshold: z.number().min(0).optional(),
  require_approval_above_threshold: z.boolean().default(false),
  approval_threshold: z.number().min(0).optional(),
  
  // Access Time Restrictions
  restricted_trading_hours: z.boolean().default(false),
  trading_hours_start: z.string().optional(),
  trading_hours_end: z.string().optional(),
  trading_days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  
  // IP Address Restrictions
  ip_restriction_enabled: z.boolean().default(false),
  allowed_ip_addresses: z.array(z.string()).optional(),
  
  // ElizaOS Integration
  allow_elizaos_control: z.boolean().default(false),
  elizaos_permission_level: z.enum(['read_only', 'suggest_only', 'execute_with_approval', 'full_control']).default('suggest_only'),
  elizaos_max_order_value: z.number().min(0).optional(),
});

// Types for permission settings
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface PermissionSettingsProps {
  farmId: string;
  exchangeId: string;
  apiKeyId: string;
  initialValues?: z.infer<typeof permissionSchema>;
  availableUsers?: User[];
  onSuccess?: () => void;
  hasElizaOS?: boolean;
}

export default function PermissionSettings({
  farmId,
  exchangeId,
  apiKeyId,
  initialValues,
  availableUsers = [],
  onSuccess,
  hasElizaOS = true,
}: PermissionSettingsProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Setup form with default values
  const form = useForm<z.infer<typeof permissionSchema>>({
    resolver: zodResolver(permissionSchema),
    defaultValues: initialValues || {
      exchange_access_mode: 'owner_only',
      allowed_user_ids: [],
      allow_manual_trading: true,
      allow_automated_trading: true,
      allow_strategy_trading: true,
      require_2fa_for_large_orders: false,
      large_order_threshold: 1000,
      require_approval_above_threshold: false,
      approval_threshold: 10000,
      restricted_trading_hours: false,
      trading_hours_start: '09:00',
      trading_hours_end: '17:00',
      trading_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      ip_restriction_enabled: false,
      allowed_ip_addresses: [],
      allow_elizaos_control: false,
      elizaos_permission_level: 'suggest_only',
      elizaos_max_order_value: 1000,
    },
  });
  
  // Watch form values for conditional rendering
  const exchangeAccessMode = form.watch('exchange_access_mode');
  const requireApproval = form.watch('require_approval_above_threshold');
  const restrictedHours = form.watch('restricted_trading_hours');
  const ipRestrictionEnabled = form.watch('ip_restriction_enabled');
  const allowElizaOSControl = form.watch('allow_elizaos_control');
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof permissionSchema>) => {
    setIsSubmitting(true);
    
    try {
      const result = await updatePermissionSettings({
        farm_id: farmId,
        exchange_id: exchangeId,
        api_key_id: apiKeyId,
        settings: values,
      });
      
      if (result.success) {
        toast({
          title: "Permissions Updated",
          description: "Exchange permission settings have been saved successfully.",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update permission settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Exchange Permission Settings
            </CardTitle>
            <CardDescription>
              Control who can access and use this exchange connection
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Exchange Access Control */}
            <div className="space-y-4">
              <h3 className="text-md font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                User Access Control
              </h3>
              
              <FormField
                control={form.control}
                name="exchange_access_mode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Who can access this exchange connection?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="owner_only" id="owner_only" />
                          <FormLabel htmlFor="owner_only" className="cursor-pointer">
                            Owner only (most secure)
                          </FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="specific_users" id="specific_users" />
                          <FormLabel htmlFor="specific_users" className="cursor-pointer">
                            Specific users
                          </FormLabel>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all_users" id="all_users" />
                          <FormLabel htmlFor="all_users" className="cursor-pointer">
                            All farm members
                          </FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {exchangeAccessMode === 'specific_users' && availableUsers.length > 0 && (
                <FormField
                  control={form.control}
                  name="allowed_user_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Users</FormLabel>
                      <div className="space-y-2">
                        {availableUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2 border rounded-md p-2">
                            <Switch
                              checked={field.value?.includes(user.id) || false}
                              onCheckedChange={(checked) => {
                                const updatedValue = checked
                                  ? [...(field.value || []), user.id]
                                  : (field.value || []).filter((id) => id !== user.id);
                                field.onChange(updatedValue);
                              }}
                            />
                            <div className="flex items-center space-x-2">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.name} 
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-3 w-3" />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <FormDescription>
                        Only selected users will be able to access this exchange connection
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <Separator />
            
            {/* Trading Permissions */}
            <div className="space-y-4">
              <h3 className="text-md font-medium flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Trading Permissions
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="allow_manual_trading"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Manual Trading</FormLabel>
                        <FormDescription>
                          Allow users to manually create and execute trades
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allow_automated_trading"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Automated Trading</FormLabel>
                        <FormDescription>
                          Allow automated systems to place trades
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allow_strategy_trading"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Strategy Trading</FormLabel>
                        <FormDescription>
                          Allow trading strategies to execute trades
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_order_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Order Value (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? undefined : value);
                          }}
                          placeholder="No limit"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for no limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_daily_trading_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Daily Trading Value (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? undefined : value);
                          }}
                          placeholder="No limit"
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for no limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Risk Controls */}
            <div className="space-y-4">
              <h3 className="text-md font-medium flex items-center">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Risk Controls
              </h3>
              
              <FormField
                control={form.control}
                name="require_2fa_for_large_orders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Require 2FA for Large Orders</FormLabel>
                      <FormDescription>
                        Require two-factor authentication for orders above a threshold
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="require_approval_above_threshold"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Require Approval for Large Orders</FormLabel>
                      <FormDescription>
                        Orders above threshold will require manual approval
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {requireApproval && (
                <FormField
                  control={form.control}
                  name="approval_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approval Threshold (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(isNaN(value) ? undefined : value);
                          }}
                          placeholder="10000"
                        />
                      </FormControl>
                      <FormDescription>
                        Orders above this amount will require manual approval
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Advanced Risk Controls</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Additional risk controls like trading limits, asset restrictions, and leverage controls can be configured in the Risk Management section.
                </AlertDescription>
              </Alert>
            </div>
            
            {/* ElizaOS Integration */}
            {hasElizaOS && (
              <>
                <Separator />
                
                <div className="space-y-4 border-primary/20 bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-md font-medium flex items-center text-primary">
                    <Brain className="h-4 w-4 mr-2" />
                    ElizaOS Integration
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="allow_elizaos_control"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-primary/20 p-3 shadow-sm bg-background">
                        <div className="space-y-0.5">
                          <FormLabel>Allow ElizaOS Control</FormLabel>
                          <FormDescription>
                            Enable ElizaOS to interact with this exchange connection
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {allowElizaOSControl && (
                    <>
                      <FormField
                        control={form.control}
                        name="elizaos_permission_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ElizaOS Permission Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select permission level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="read_only">Read Only (Data Access Only)</SelectItem>
                                <SelectItem value="suggest_only">Suggest Only (Proposes Trades)</SelectItem>
                                <SelectItem value="execute_with_approval">Execute with Approval</SelectItem>
                                <SelectItem value="full_control">Full Control (Autonomous Trading)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Controls what actions ElizaOS can perform with this exchange connection
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="elizaos_max_order_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ElizaOS Maximum Order Value (USD)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  field.onChange(isNaN(value) ? undefined : value);
                                }}
                                placeholder="1000"
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum value of orders ElizaOS can place (leave empty for no limit)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Alert className="bg-primary/10 border-primary/20">
                        <Brain className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-primary">AI Trading Capabilities</AlertTitle>
                        <AlertDescription className="text-primary/80">
                          ElizaOS can analyze market conditions, monitor order flow, and execute trades based on predefined strategies. 
                          You can configure detailed AI behavior in the ElizaOS Agent settings.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
          
          <CardFooter className="border-t pt-6">
            <Button 
              type="submit" 
              className="ml-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Saving...</>
              ) : (
                <>Save Permission Settings</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
