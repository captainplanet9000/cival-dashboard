'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { OrderType } from '@/services/advanced-order-service';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Clock, Target } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DateTimePicker } from '@/components/ui/date-time-picker';

interface AdvancedOrderFieldsProps {
  form: UseFormReturn<any>;
  orderType: OrderType;
}

export default function AdvancedOrderFields({
  form,
  orderType
}: AdvancedOrderFieldsProps) {
  // Show the appropriate fields based on the selected order type
  switch (orderType) {
    case 'market':
      return null; // Market orders don't need additional fields
    
    case 'limit':
      return <LimitOrderFields form={form} />;
    
    case 'stop':
      return <StopOrderFields form={form} />;
    
    case 'stop_limit':
      return <StopLimitOrderFields form={form} />;
    
    case 'trailing_stop':
      return <TrailingStopOrderFields form={form} />;
    
    case 'oco':
      return <OcoOrderFields form={form} />;
    
    case 'bracket':
      return <BracketOrderFields form={form} />;
    
    case 'iceberg':
      return <IcebergOrderFields form={form} />;
    
    case 'twap':
      return <TwapOrderFields form={form} />;
    
    case 'vwap':
      return <VwapOrderFields form={form} />;
    
    default:
      return null;
  }
}

// Limit Order Fields
function LimitOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit Price</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter limit price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Stop Order Fields
function StopOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="stop_price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Stop Price</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter stop price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="trigger_condition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trigger Condition</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger condition" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                <SelectItem value="gte">Greater Than or Equal (&gt;=)</SelectItem>
                <SelectItem value="lte">Less Than or Equal (&lt;=)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="trigger_price_source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Price Source</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select price source" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="last">Last Price</SelectItem>
                <SelectItem value="mark">Mark Price</SelectItem>
                <SelectItem value="index">Index Price</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Stop Limit Order Fields
function StopLimitOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="stop_price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Stop Price</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter stop price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit Price</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter limit price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="trigger_condition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trigger Condition</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger condition" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                <SelectItem value="gte">Greater Than or Equal (&gt;=)</SelectItem>
                <SelectItem value="lte">Less Than or Equal (&lt;=)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Trailing Stop Order Fields
function TrailingStopOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center p-2 bg-muted rounded-md mb-4">
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Trailing Stop Order</span>
      </div>

      <FormField
        control={form.control}
        name="trail_value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trail Value</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter trail value" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="trail_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trail Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select trail type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="amount">Amount (Fixed Value)</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="activation_price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Activation Price (Optional)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter activation price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// OCO (One-Cancels-Other) Order Fields
function OcoOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center p-2 bg-muted rounded-md mb-4">
        <Target className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">One-Cancels-Other Order</span>
      </div>

      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit Price (Take Profit)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter limit price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="stop_price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Stop Price (Stop Loss)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter stop price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="trigger_condition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trigger Condition (for Stop)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger condition" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                <SelectItem value="lt">Less Than (&lt;)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Bracket Order Fields
function BracketOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center p-2 bg-muted rounded-md mb-4">
        <Target className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Bracket Order (Entry + Stop Loss + Take Profit)</span>
      </div>

      <div className="space-y-4">
        <div className="font-medium">Entry Order</div>
        
        <FormField
          control={form.control}
          name="entry_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry Order Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entry type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('entry_type') === 'limit' && (
          <FormField
            control={form.control}
            name="entry_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Price</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any" 
                    placeholder="Enter entry price" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="font-medium">Take Profit</div>
        
        <FormField
          control={form.control}
          name="take_profit_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Take Profit Price</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="any" 
                  placeholder="Enter take profit price" 
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <div className="font-medium">Stop Loss</div>
        
        <FormField
          control={form.control}
          name="stop_loss_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stop Loss Price</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="any" 
                  placeholder="Enter stop loss price" 
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// Iceberg Order Fields
function IcebergOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit Price</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter limit price" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="iceberg_qty"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Visible Quantity</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter visible quantity" 
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
            <p className="text-sm text-muted-foreground">
              This is the amount visible to the market. The total quantity will be executed in slices of this size.
            </p>
          </FormItem>
        )}
      />
    </div>
  );
}

// TWAP Order Fields
function TwapOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center p-2 bg-muted rounded-md mb-4">
        <Clock className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Time-Weighted Average Price</span>
      </div>

      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit Price (Optional)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter limit price" 
                {...field}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  field.onChange(value);
                }} 
              />
            </FormControl>
            <FormMessage />
            <p className="text-sm text-muted-foreground">
              Leave empty for market TWAP.
            </p>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="start_time"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start Time</FormLabel>
            <DateTimePicker
              value={field.value ? new Date(field.value) : undefined}
              onChange={(date) => field.onChange(date ? date.toISOString() : '')}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="end_time"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>End Time</FormLabel>
            <DateTimePicker
              value={field.value ? new Date(field.value) : undefined}
              onChange={(date) => field.onChange(date ? date.toISOString() : '')}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="num_slices"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Slices</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                min="2"
                step="1" 
                placeholder="Enter number of execution slices" 
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))} 
              />
            </FormControl>
            <FormMessage />
            <p className="text-sm text-muted-foreground">
              The order will be split into this many equal parts.
            </p>
          </FormItem>
        )}
      />
    </div>
  );
}

// VWAP Order Fields
function VwapOrderFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center p-2 bg-muted rounded-md mb-4">
        <Clock className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Volume-Weighted Average Price</span>
      </div>

      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit Price (Optional)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="any" 
                placeholder="Enter limit price" 
                {...field}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  field.onChange(value);
                }} 
              />
            </FormControl>
            <FormMessage />
            <p className="text-sm text-muted-foreground">
              Leave empty for market VWAP.
            </p>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="start_time"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Start Time</FormLabel>
            <DateTimePicker
              value={field.value ? new Date(field.value) : undefined}
              onChange={(date) => field.onChange(date ? date.toISOString() : '')}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="end_time"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>End Time</FormLabel>
            <DateTimePicker
              value={field.value ? new Date(field.value) : undefined}
              onChange={(date) => field.onChange(date ? date.toISOString() : '')}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="volume_profile"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Volume Profile</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select volume profile" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="historical">Historical (Based on past data)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch('volume_profile') === 'custom' && (
        <FormField
          control={form.control}
          name="custom_volume_profile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Volume Distribution (%)</FormLabel>
              <p className="text-xs text-muted-foreground mb-2">
                Enter comma-separated percentages (e.g., "10,20,40,20,10"). Must add up to 100%.
              </p>
              <FormControl>
                <Input 
                  placeholder="E.g., 10,20,40,20,10" 
                  {...field}
                  onChange={(e) => {
                    const valueString = e.target.value;
                    if (valueString) {
                      const values = valueString.split(',').map(v => parseFloat(v.trim()));
                      field.onChange(values);
                    } else {
                      field.onChange(undefined);
                    }
                  }} 
                  value={field.value ? field.value.join(',') : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
