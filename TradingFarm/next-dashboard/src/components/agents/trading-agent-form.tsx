'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Define the trading agent configuration schema
const tradingAgentConfigSchema = z.object({
  // Strategy Settings
  strategy_id: z.string().min(1, "A strategy must be selected"),
  strategy_mode: z.enum(["paper", "live"]),
  initial_capital: z.number().min(1, "Initial capital must be positive"),
  
  // Trading Parameters
  max_position_size_percent: z.number().min(1).max(100).default(5),
  max_drawdown_percent: z.number().min(0.1).max(50).default(10),
  trading_pairs: z.array(z.string()).min(1, "At least one trading pair must be selected"),
  timeframes: z.array(z.string()).min(1, "At least one timeframe must be selected"),
  
  // Risk Management
  stop_loss_percent: z.number().min(0.1).default(2),
  take_profit_percent: z.number().min(0.1).default(4),
  trailing_stop_enabled: z.boolean().default(false),
  trailing_stop_percent: z.number().min(0.1).optional(),
  
  // Agent Behavior
  auto_adjust_parameters: z.boolean().default(true),
  run_schedule: z.enum(["continuous", "daily", "custom"]).default("continuous"),
  max_daily_trades: z.number().min(1).optional(),
  
  // Notification Settings
  notification_channels: z.array(z.string()).default([]),
  notify_on_trade: z.boolean().default(true),
  notify_on_error: z.boolean().default(true),
  
  // Advanced Settings
  exchange_id: z.string().min(1, "An exchange must be selected"),
  slippage_tolerance_percent: z.number().min(0).default(0.1),
  execution_delay_ms: z.number().min(0).default(0),
  
  // Metadata
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type TradingAgentConfig = z.infer<typeof tradingAgentConfigSchema>;

interface TradingAgentFormProps {
  onConfigChange: (config: TradingAgentConfig) => void;
  initialConfig?: Partial<TradingAgentConfig>;
}

export function TradingAgentForm({ onConfigChange, initialConfig = {} }: TradingAgentFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  
  // Mock data for dropdowns - in production, these would come from API calls
  const availableStrategies = [
    { id: 'ai-adaptive-strategy', name: 'AI Adaptive Strategy' },
    { id: 'trend-following', name: 'Trend Following Strategy' },
    { id: 'mean-reversion', name: 'Mean Reversion Strategy' },
    { id: 'breakout', name: 'Breakout Strategy' },
  ];
  
  const exchanges = [
    { id: 'coinbase', name: 'Coinbase' },
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'hyperliquid', name: 'Hyperliquid' },
  ];
  
  const tradingPairs = [
    { value: 'BTC/USDT', label: 'BTC/USDT' },
    { value: 'ETH/USDT', label: 'ETH/USDT' },
    { value: 'SOL/USDT', label: 'SOL/USDT' },
    { value: 'BNB/USDT', label: 'BNB/USDT' },
    { value: 'XRP/USDT', label: 'XRP/USDT' },
  ];
  
  const timeframes = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ];
  
  const notificationChannels = [
    { id: 'email', label: 'Email' },
    { id: 'push', label: 'Push Notifications' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'discord', label: 'Discord' },
  ];
  
  // Default values with any provided initial config
  const defaultValues: TradingAgentConfig = {
    strategy_id: '',
    strategy_mode: 'paper',
    initial_capital: 10000,
    max_position_size_percent: 5,
    max_drawdown_percent: 10,
    trading_pairs: ['BTC/USDT'],
    timeframes: ['1h'],
    stop_loss_percent: 2,
    take_profit_percent: 4,
    trailing_stop_enabled: false,
    trailing_stop_percent: 1,
    auto_adjust_parameters: true,
    run_schedule: 'continuous',
    max_daily_trades: 10,
    notification_channels: [],
    notify_on_trade: true,
    notify_on_error: true,
    exchange_id: '',
    slippage_tolerance_percent: 0.1,
    execution_delay_ms: 0,
    description: '',
    tags: [],
    ...initialConfig
  };
  
  const form = useForm<TradingAgentConfig>({
    resolver: zodResolver(tradingAgentConfigSchema),
    defaultValues,
  });
  
  // Watch for form changes and notify parent component
  const formValues = form.watch();
  useEffect(() => {
    try {
      const validatedData = tradingAgentConfigSchema.parse(formValues);
      onConfigChange(validatedData);
    } catch (error) {
      // Validation errors will be handled by the form
      console.log("Form validation in progress:", error);
    }
  }, [formValues, onConfigChange]);
  
  return (
    <Form {...form}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="behavior">Agent Behavior</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Settings</CardTitle>
              <CardDescription>
                Select a trading strategy and configure basic parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="strategy_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Strategy</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableStrategies.map(strategy => (
                          <SelectItem key={strategy.id} value={strategy.id}>
                            {strategy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This determines how the agent will analyze markets and make trading decisions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="strategy_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trading mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paper">Paper Trading</SelectItem>
                        <SelectItem value="live">Live Trading</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Paper trading uses simulated money, Live trading uses real funds
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="initial_capital"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Capital ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        step="1000" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Starting capital for this trading agent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="exchange_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exchange" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {exchanges.map(exchange => (
                          <SelectItem key={exchange.id} value={exchange.id}>
                            {exchange.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The exchange where trades will be executed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_position_size_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Position Size (% of capital)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">{field.value}%</span>
                          </div>
                          <Slider
                            min={1}
                            max={100}
                            step={1}
                            value={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Maximum percentage of capital per position
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="max_drawdown_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Drawdown (%)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">{field.value}%</span>
                          </div>
                          <Slider
                            min={0.1}
                            max={50}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(values) => field.onChange(values[0])}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Agent will stop trading if drawdown exceeds this percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Market Selection</CardTitle>
              <CardDescription>
                Choose which markets and timeframes the agent will trade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="trading_pairs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Pairs</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {tradingPairs.map((pair) => (
                          <div key={pair.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`pair-${pair.value}`}
                              checked={field.value.includes(pair.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, pair.value]);
                                } else {
                                  field.onChange(field.value.filter(p => p !== pair.value));
                                }
                              }}
                            />
                            <label
                              htmlFor={`pair-${pair.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {pair.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select trading pairs for this agent to monitor and trade
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="timeframes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeframes</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {timeframes.map((tf) => (
                          <div key={tf.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`timeframe-${tf.value}`}
                              checked={field.value.includes(tf.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, tf.value]);
                                } else {
                                  field.onChange(field.value.filter(t => t !== tf.value));
                                }
                              }}
                            />
                            <label
                              htmlFor={`timeframe-${tf.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {tf.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select timeframes for market analysis
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Parameters</CardTitle>
              <CardDescription>
                Configure risk management settings for your trading agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stop_loss_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Loss (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0.1" 
                          step="0.1" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Default stop loss percentage for trades
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="take_profit_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Take Profit (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0.1" 
                          step="0.1" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Default take profit percentage for trades
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="trailing_stop_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Trailing Stop Loss</FormLabel>
                        <FormDescription>
                          Automatically adjust stop loss as price moves in your favor
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
                
                {form.watch("trailing_stop_enabled") && (
                  <FormField
                    control={form.control}
                    name="trailing_stop_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trailing Stop Distance (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0.1" 
                            step="0.1" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Distance to maintain behind price for trailing stop
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <FormField
                control={form.control}
                name="max_daily_trades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Daily Trades</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        step="1" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="No limit"
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of trades per day (leave empty for no limit)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Behavior</CardTitle>
              <CardDescription>
                Configure how your trading agent will operate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="auto_adjust_parameters"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-adjust Parameters</FormLabel>
                      <FormDescription>
                        Allow the agent to learn and adjust its parameters based on market conditions
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
                name="run_schedule"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Run Schedule</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="continuous" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Continuous (24/7)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="daily" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Daily (Run once per day)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="custom" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Custom Schedule
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      How often should the agent run and evaluate the market
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notification_channels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Channels</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {notificationChannels.map((channel) => (
                          <div key={channel.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`channel-${channel.id}`}
                              checked={field.value.includes(channel.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, channel.id]);
                                } else {
                                  field.onChange(field.value.filter(c => c !== channel.id));
                                }
                              }}
                            />
                            <label
                              htmlFor={`channel-${channel.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {channel.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Select where you want to receive notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="notify_on_trade"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Trade Notifications</FormLabel>
                        <FormDescription>
                          Notify when trades are executed
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
                  name="notify_on_error"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Error Notifications</FormLabel>
                        <FormDescription>
                          Notify on errors or failures
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-tune advanced parameters for your trading agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slippage_tolerance_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slippage Tolerance (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum allowed price slippage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="execution_delay_ms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Execution Delay (ms)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="10" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Delay between signal and execution (for simulation)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Description</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a description for this agent" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description to identify this agent's purpose
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter comma-separated tags" 
                        onChange={(e) => {
                          const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                          field.onChange(tagsArray);
                        }}
                        value={field.value.join(', ')}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional tags to categorize this agent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Form>
  );
}
