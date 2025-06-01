# Risk Management System - Developer Guide

## System Architecture

The Trading Farm Risk Management System implements a comprehensive risk management solution through a layered architecture:

1. **Database Layer**: PostgreSQL with TimescaleDB extension for time-series data
2. **API Layer**: Server-side functions exposing risk management capabilities
3. **Service Layer**: TypeScript services orchestrating risk management operations
4. **UI Layer**: React components providing visualization and interaction

### Database Schema

The core of the Risk Management System consists of these primary tables:

- `risk_profiles` - Risk parameters and constraints for trading
- `risk_events` - Log of risk-related incidents and actions
- `risk_monitors` - Automated risk monitoring configurations
- `risk_scenarios` - Scenario analysis configurations and results
- `asset_correlations` - Historical correlation data between assets
- `position_size_recommendations` - Position sizing guidance

## API Reference

### Risk Profile Management

#### `create_risk_profile`

Creates or updates a risk profile.

```sql
SELECT public.create_risk_profile(
    p_user_id UUID,                         -- User ID
    p_farm_id UUID,                         -- Farm ID
    p_profile_name TEXT,                    -- Profile name
    p_description TEXT,                     -- Description
    p_risk_level TEXT,                      -- 'conservative', 'moderate', 'aggressive', 'custom'
    p_max_drawdown_percent DECIMAL,         -- Maximum drawdown percentage
    p_position_size_limit_percent DECIMAL,  -- Maximum position size as percentage
    p_max_leverage DECIMAL,                 -- Maximum leverage allowed
    p_daily_loss_limit_percent DECIMAL,     -- Daily loss limit percentage
    p_weekly_loss_limit_percent DECIMAL,    -- Weekly loss limit percentage
    p_monthly_loss_limit_percent DECIMAL,   -- Monthly loss limit percentage
    p_auto_close_triggers JSONB,            -- Automatic close triggers (optional)
    p_diversification_rules JSONB           -- Diversification rules (optional)
);
```

**Returns**: JSON object with profile ID, success status, and message.

**Example:**

```typescript
const result = await supabase.rpc('create_risk_profile', {
  p_user_id: '123e4567-e89b-12d3-a456-426614174000',
  p_farm_id: '123e4567-e89b-12d3-a456-426614174001',
  p_profile_name: 'Conservative Trading',
  p_description: 'Low risk profile for stable returns',
  p_risk_level: 'conservative',
  p_max_drawdown_percent: 10.0,
  p_position_size_limit_percent: 5.0,
  p_max_leverage: 1.5,
  p_daily_loss_limit_percent: 1.0,
  p_weekly_loss_limit_percent: 3.0,
  p_monthly_loss_limit_percent: 5.0,
  p_auto_close_triggers: {
    drawdown_percent: 8.0,
    auto_reduce_percent: 50
  },
  p_diversification_rules: {
    max_single_asset_percent: 20,
    max_asset_correlation: 0.7
  }
});
```

#### `activate_risk_profile`

Activates a specific risk profile and deactivates all others for a farm.

```sql
SELECT public.activate_risk_profile(
    p_user_id UUID,     -- User ID
    p_farm_id UUID,     -- Farm ID
    p_profile_id UUID   -- Profile ID to activate
);
```

**Returns**: JSON object with success status and message.

### Risk Event Logging

#### `log_risk_event`

Logs a risk-related event in the system.

```sql
SELECT public.log_risk_event(
    p_user_id UUID,             -- User ID
    p_farm_id UUID,             -- Farm ID
    p_profile_id UUID,          -- Risk profile ID
    p_event_type TEXT,          -- 'warning', 'violation', 'auto_action', 'manual_override'
    p_severity TEXT,            -- 'low', 'medium', 'high', 'critical'
    p_event_description TEXT,   -- Description of the event
    p_metric_name TEXT,         -- The metric that triggered the event
    p_threshold_value DECIMAL,  -- Threshold value (optional)
    p_actual_value DECIMAL,     -- Actual value (optional)
    p_action_taken TEXT,        -- Action taken (optional)
    p_market TEXT,              -- Market symbol (optional)
    p_position_id TEXT,         -- Position ID (optional)
    p_metadata JSONB            -- Additional metadata (optional)
);
```

**Returns**: JSON object with event ID, success status, and message.

### Risk Monitoring

#### `create_risk_monitor`

Creates or updates a risk monitor configuration.

```sql
SELECT public.create_risk_monitor(
    p_user_id UUID,                 -- User ID
    p_farm_id UUID,                 -- Farm ID
    p_profile_id UUID,              -- Risk profile ID
    p_monitor_name TEXT,            -- Monitor name
    p_monitor_type TEXT,            -- 'drawdown', 'volatility', 'correlation', 'exposure', 'concentration'
    p_monitored_markets TEXT[],     -- Markets to monitor
    p_check_interval_seconds INT,   -- Check interval in seconds
    p_notification_channels TEXT[], -- Notification channels
    p_auto_actions JSONB,           -- Automatic actions configuration (optional)
    p_configuration JSONB           -- Monitor configuration
);
```

**Returns**: JSON object with monitor ID, success status, and message.

### Position Sizing

#### `calculate_position_size`

Calculates recommended position size based on risk profile and market conditions.

```sql
SELECT public.calculate_position_size(
    p_user_id UUID,          -- User ID
    p_farm_id UUID,          -- Farm ID
    p_market TEXT,           -- Market symbol
    p_risk_profile_id UUID   -- Risk profile ID (optional, uses active profile if null)
);
```

**Returns**: JSON object with recommendation details, success status, and message.

## TypeScript Service Implementation

Here's how to implement a TypeScript service to interact with the Risk Management API:

```typescript
// src/services/risk/risk-management-service.ts

import { createBrowserClient, createServerClient } from '@/utils/supabase/client';
import { RiskProfile, RiskEvent, RiskMonitor, PositionSizeRecommendation } from '@/types/risk';

export class RiskManagementService {
  private supabase = typeof window !== 'undefined' 
    ? createBrowserClient() 
    : createServerClient();

  // Create or update a risk profile
  async createRiskProfile(profile: Omit<RiskProfile, 'id' | 'created_at' | 'updated_at'>): Promise<{id: string; success: boolean; message: string}> {
    const { data, error } = await this.supabase.rpc('create_risk_profile', {
      p_user_id: profile.user_id,
      p_farm_id: profile.farm_id,
      p_profile_name: profile.profile_name,
      p_description: profile.description,
      p_risk_level: profile.risk_level,
      p_max_drawdown_percent: profile.max_drawdown_percent,
      p_position_size_limit_percent: profile.position_size_limit_percent,
      p_max_leverage: profile.max_leverage,
      p_daily_loss_limit_percent: profile.daily_loss_limit_percent,
      p_weekly_loss_limit_percent: profile.weekly_loss_limit_percent,
      p_monthly_loss_limit_percent: profile.monthly_loss_limit_percent,
      p_auto_close_triggers: profile.auto_close_triggers,
      p_diversification_rules: profile.diversification_rules
    });

    if (error) throw new Error(`Failed to create risk profile: ${error.message}`);
    return data;
  }

  // Activate a risk profile
  async activateRiskProfile(userId: string, farmId: string, profileId: string): Promise<{success: boolean; message: string}> {
    const { data, error } = await this.supabase.rpc('activate_risk_profile', {
      p_user_id: userId,
      p_farm_id: farmId,
      p_profile_id: profileId
    });

    if (error) throw new Error(`Failed to activate risk profile: ${error.message}`);
    return data;
  }

  // Log a risk event
  async logRiskEvent(event: Omit<RiskEvent, 'id' | 'created_at' | 'updated_at'>): Promise<{id: string; success: boolean; message: string}> {
    const { data, error } = await this.supabase.rpc('log_risk_event', {
      p_user_id: event.user_id,
      p_farm_id: event.farm_id,
      p_profile_id: event.profile_id,
      p_event_type: event.event_type,
      p_severity: event.severity,
      p_event_description: event.event_description,
      p_metric_name: event.metric_name,
      p_threshold_value: event.threshold_value,
      p_actual_value: event.actual_value,
      p_action_taken: event.action_taken,
      p_market: event.market,
      p_position_id: event.position_id,
      p_metadata: event.metadata
    });

    if (error) throw new Error(`Failed to log risk event: ${error.message}`);
    return data;
  }

  // Create or update a risk monitor
  async createRiskMonitor(monitor: Omit<RiskMonitor, 'id' | 'created_at' | 'updated_at'>): Promise<{id: string; success: boolean; message: string}> {
    const { data, error } = await this.supabase.rpc('create_risk_monitor', {
      p_user_id: monitor.user_id,
      p_farm_id: monitor.farm_id,
      p_profile_id: monitor.profile_id,
      p_monitor_name: monitor.monitor_name,
      p_monitor_type: monitor.monitor_type,
      p_monitored_markets: monitor.monitored_markets,
      p_check_interval_seconds: monitor.check_interval_seconds,
      p_notification_channels: monitor.notification_channels,
      p_auto_actions: monitor.auto_actions,
      p_configuration: monitor.configuration
    });

    if (error) throw new Error(`Failed to create risk monitor: ${error.message}`);
    return data;
  }

  // Calculate recommended position size
  async calculatePositionSize(userId: string, farmId: string, market: string, riskProfileId?: string): Promise<PositionSizeRecommendation> {
    const { data, error } = await this.supabase.rpc('calculate_position_size', {
      p_user_id: userId,
      p_farm_id: farmId,
      p_market: market,
      p_risk_profile_id: riskProfileId
    });

    if (error) throw new Error(`Failed to calculate position size: ${error.message}`);
    return data;
  }

  // Get risk profiles for a farm
  async getRiskProfiles(userId: string, farmId: string): Promise<RiskProfile[]> {
    const { data, error } = await this.supabase
      .from('risk_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('farm_id', farmId);

    if (error) throw new Error(`Failed to get risk profiles: ${error.message}`);
    return data || [];
  }

  // Get risk events for a farm
  async getRiskEvents(userId: string, farmId: string, limit = 50, offset = 0): Promise<RiskEvent[]> {
    const { data, error } = await this.supabase
      .from('risk_events')
      .select('*')
      .eq('user_id', userId)
      .eq('farm_id', farmId)
      .order('event_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to get risk events: ${error.message}`);
    return data || [];
  }

  // Get risk monitors for a farm
  async getRiskMonitors(userId: string, farmId: string): Promise<RiskMonitor[]> {
    const { data, error } = await this.supabase
      .from('risk_monitors')
      .select('*')
      .eq('user_id', userId)
      .eq('farm_id', farmId);

    if (error) throw new Error(`Failed to get risk monitors: ${error.message}`);
    return data || [];
  }
}

export const riskManagementService = new RiskManagementService();
```

## React Component Integration Example

Here's an example of how to integrate the Risk Management Service with a React component:

```tsx
// src/components/risk/RiskProfileForm.tsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { riskManagementService } from '@/services/risk/risk-management-service';
import { RiskProfile } from '@/types/risk';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface RiskProfileFormProps {
  userId: string;
  farmId: string;
  onSuccess?: (profileId: string) => void;
}

export function RiskProfileForm({ userId, farmId, onSuccess }: RiskProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm({
    defaultValues: {
      profile_name: '',
      description: '',
      risk_level: 'moderate',
      max_drawdown_percent: 15,
      position_size_limit_percent: 10,
      max_leverage: 2,
      daily_loss_limit_percent: 2,
      weekly_loss_limit_percent: 5,
      monthly_loss_limit_percent: 10,
    }
  });

  const onSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      
      const profileData = {
        user_id: userId,
        farm_id: farmId,
        ...values
      };
      
      const result = await riskManagementService.createRiskProfile(profileData);
      
      toast({
        title: 'Success',
        description: 'Risk profile created successfully',
      });
      
      if (onSuccess) {
        onSuccess(result.id);
      }
      
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to create risk profile: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Risk Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="profile_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="risk_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Level</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="max_drawdown_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Drawdown (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="position_size_limit_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Size Limit (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="max_leverage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Leverage</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="daily_loss_limit_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Loss Limit (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="weekly_loss_limit_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weekly Loss Limit (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="monthly_loss_limit_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Loss Limit (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Risk Profile'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

## WebSocket Integration for Real-Time Risk Monitoring

For real-time risk monitoring, you can leverage Supabase's realtime capabilities:

```typescript
// src/hooks/useRiskMonitoring.ts

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { RiskEvent } from '@/types/risk';

export function useRiskMonitoring(userId: string, farmId: string) {
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Initial load of recent events
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('risk_events')
          .select('*')
          .eq('user_id', userId)
          .eq('farm_id', farmId)
          .order('event_time', { ascending: false })
          .limit(10);
        
        if (error) throw new Error(error.message);
        setEvents(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEvents();
    
    // Subscribe to new events
    const subscription = supabase
      .channel('risk_events_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'risk_events',
        filter: `user_id=eq.${userId} AND farm_id=eq.${farmId}`
      }, (payload) => {
        const newEvent = payload.new as RiskEvent;
        setEvents(prev => [newEvent, ...prev].slice(0, 10));
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [userId, farmId]);

  return { events, isLoading, error };
}
```

## Testing the Risk Management API

Here are examples of testing the Risk Management API using Jest:

```typescript
// src/tests/unit/services/risk-management-service.test.ts

import { riskManagementService } from '@/services/risk/risk-management-service';
import { createBrowserClient } from '@/utils/supabase/client';

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createBrowserClient: jest.fn(),
  createServerClient: jest.fn()
}));

describe('RiskManagementService', () => {
  let mockRpc: jest.Mock;
  let mockFrom: jest.Mock;
  
  beforeEach(() => {
    mockRpc = jest.fn();
    mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => ({ data: [], error: null }))
            })),
            order: jest.fn(() => ({ data: [], error: null })),
            limit: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))
    }));
    
    (createBrowserClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
      from: mockFrom
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRiskProfile', () => {
    it('should call the create_risk_profile RPC function with correct parameters', async () => {
      const profileData = {
        user_id: 'user123',
        farm_id: 'farm123',
        profile_name: 'Test Profile',
        description: 'Test Description',
        risk_level: 'moderate',
        max_drawdown_percent: 15,
        position_size_limit_percent: 10,
        max_leverage: 2,
        daily_loss_limit_percent: 2,
        weekly_loss_limit_percent: 5,
        monthly_loss_limit_percent: 10,
        auto_close_triggers: { trigger1: true },
        diversification_rules: { rule1: true }
      };
      
      mockRpc.mockResolvedValue({
        data: { id: 'profile123', success: true, message: 'Success' },
        error: null
      });
      
      const result = await riskManagementService.createRiskProfile(profileData);
      
      expect(mockRpc).toHaveBeenCalledWith('create_risk_profile', {
        p_user_id: profileData.user_id,
        p_farm_id: profileData.farm_id,
        p_profile_name: profileData.profile_name,
        p_description: profileData.description,
        p_risk_level: profileData.risk_level,
        p_max_drawdown_percent: profileData.max_drawdown_percent,
        p_position_size_limit_percent: profileData.position_size_limit_percent,
        p_max_leverage: profileData.max_leverage,
        p_daily_loss_limit_percent: profileData.daily_loss_limit_percent,
        p_weekly_loss_limit_percent: profileData.weekly_loss_limit_percent,
        p_monthly_loss_limit_percent: profileData.monthly_loss_limit_percent,
        p_auto_close_triggers: profileData.auto_close_triggers,
        p_diversification_rules: profileData.diversification_rules
      });
      
      expect(result).toEqual({ id: 'profile123', success: true, message: 'Success' });
    });
    
    it('should throw an error if the RPC call fails', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create profile' }
      });
      
      await expect(riskManagementService.createRiskProfile({} as any)).rejects.toThrow(
        'Failed to create risk profile: Failed to create profile'
      );
    });
  });
  
  // More tests for other methods...
});
```

## Conclusion

This developer guide provides a comprehensive overview of the Risk Management System's architecture, API reference, service implementation, component integration, and testing. By following these patterns, you can effectively extend and customize the Risk Management System to meet your specific requirements.

For more advanced scenarios or custom implementations, refer to the full source code and database schema documentation.
