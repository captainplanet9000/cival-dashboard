/**
 * Widget Settings Modal Component
 * Allows customization of dashboard widgets
 */
'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, LayoutGrid, Palette, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button-standardized';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Widget type definitions
export type WidgetType = 'market-data' | 'positions' | 'orders' | 'performance' | 'news';

// Widget size properties
export interface WidgetSize {
  w: number;
  h: number;
}

// Widget settings for different widget types
export interface WidgetSettings {
  title: string;
  refreshInterval: number;
  autoRefresh: boolean;
  theme: 'default' | 'light' | 'dark' | 'compact';
  size: WidgetSize;
  showBorder: boolean;
  showHeader: boolean;
  isCollapsible: boolean;
  // Specific settings based on widget type
  [key: string]: any;
}

// Default widget settings
const defaultWidgetSettings: WidgetSettings = {
  title: 'Widget',
  refreshInterval: 30,
  autoRefresh: true,
  theme: 'default',
  size: { w: 6, h: 8 },
  showBorder: true,
  showHeader: true,
  isCollapsible: true,
};

// Widget type specific default settings
const widgetTypeDefaults: Record<WidgetType, Partial<WidgetSettings>> = {
  'market-data': {
    title: 'Market Data',
    dataPoints: ['price', 'volume', 'change'],
    showPriceHistory: true,
    historyRange: '1d',
    symbols: ['BTC', 'ETH', 'SOL'],
  },
  'positions': {
    title: 'Positions',
    columns: ['asset', 'size', 'entry', 'current', 'pnl'],
    sortBy: 'pnl',
    sortDirection: 'desc',
    showClosed: false,
  },
  'orders': {
    title: 'Orders',
    columns: ['asset', 'type', 'side', 'price', 'size', 'status'],
    sortBy: 'time',
    sortDirection: 'desc',
    showCompleted: false,
  },
  'performance': {
    title: 'Performance',
    chartType: 'line',
    timeframe: '1w',
    metrics: ['pnl', 'win-rate', 'drawdown'],
    showBenchmark: true,
  },
  'news': {
    title: 'Market News',
    sources: ['all'],
    categories: ['market', 'crypto', 'stocks'],
    updateFrequency: 15,
    showImages: true,
  },
};

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  refreshInterval: z.number().min(5).max(3600),
  autoRefresh: z.boolean(),
  theme: z.enum(['default', 'light', 'dark', 'compact']),
  showBorder: z.boolean(),
  showHeader: z.boolean(),
  isCollapsible: z.boolean(),
  // Size properties
  width: z.number().min(1).max(12),
  height: z.number().min(2).max(24),
  // Dynamic fields will be added based on widget type
});

interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgetId: string;
  widgetType: WidgetType;
  currentSettings?: Partial<WidgetSettings>;
  onSave: (widgetId: string, settings: WidgetSettings) => void;
  onResize: (widgetId: string, size: WidgetSize) => void;
}

/**
 * Modal for customizing widget settings
 */
export function WidgetSettingsModal({
  isOpen,
  onClose,
  widgetId,
  widgetType,
  currentSettings,
  onSave,
  onResize,
}: WidgetSettingsModalProps) {
  // Merge default settings with type-specific defaults and current settings
  const mergedSettings = {
    ...defaultWidgetSettings,
    ...widgetTypeDefaults[widgetType],
    ...currentSettings,
  };

  // Setup form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: mergedSettings.title,
      refreshInterval: mergedSettings.refreshInterval,
      autoRefresh: mergedSettings.autoRefresh,
      theme: mergedSettings.theme,
      showBorder: mergedSettings.showBorder,
      showHeader: mergedSettings.showHeader,
      isCollapsible: mergedSettings.isCollapsible,
      width: mergedSettings.size.w,
      height: mergedSettings.size.h,
    },
  });

  // Reset form when settings change
  useEffect(() => {
    form.reset({
      title: mergedSettings.title,
      refreshInterval: mergedSettings.refreshInterval,
      autoRefresh: mergedSettings.autoRefresh,
      theme: mergedSettings.theme,
      showBorder: mergedSettings.showBorder,
      showHeader: mergedSettings.showHeader,
      isCollapsible: mergedSettings.isCollapsible,
      width: mergedSettings.size.w,
      height: mergedSettings.size.h,
    });
  }, [mergedSettings, form, isOpen]);

  // Handle form submission
  const onSubmit = (values: any) => {
    const updatedSettings: WidgetSettings = {
      ...mergedSettings,
      title: values.title,
      refreshInterval: values.refreshInterval,
      autoRefresh: values.autoRefresh,
      theme: values.theme,
      showBorder: values.showBorder,
      showHeader: values.showHeader,
      isCollapsible: values.isCollapsible,
      size: {
        w: values.width,
        h: values.height,
      },
    };

    // Add type-specific settings
    if (widgetType === 'market-data') {
      updatedSettings.dataPoints = values.dataPoints || mergedSettings.dataPoints;
      updatedSettings.showPriceHistory = values.showPriceHistory ?? mergedSettings.showPriceHistory;
      updatedSettings.historyRange = values.historyRange || mergedSettings.historyRange;
      updatedSettings.symbols = values.symbols || mergedSettings.symbols;
    } else if (widgetType === 'positions') {
      updatedSettings.columns = values.columns || mergedSettings.columns;
      updatedSettings.sortBy = values.sortBy || mergedSettings.sortBy;
      updatedSettings.sortDirection = values.sortDirection || mergedSettings.sortDirection;
      updatedSettings.showClosed = values.showClosed ?? mergedSettings.showClosed;
    } else if (widgetType === 'orders') {
      updatedSettings.columns = values.columns || mergedSettings.columns;
      updatedSettings.sortBy = values.sortBy || mergedSettings.sortBy;
      updatedSettings.sortDirection = values.sortDirection || mergedSettings.sortDirection;
      updatedSettings.showCompleted = values.showCompleted ?? mergedSettings.showCompleted;
    } else if (widgetType === 'performance') {
      updatedSettings.chartType = values.chartType || mergedSettings.chartType;
      updatedSettings.timeframe = values.timeframe || mergedSettings.timeframe;
      updatedSettings.metrics = values.metrics || mergedSettings.metrics;
      updatedSettings.showBenchmark = values.showBenchmark ?? mergedSettings.showBenchmark;
    } else if (widgetType === 'news') {
      updatedSettings.sources = values.sources || mergedSettings.sources;
      updatedSettings.categories = values.categories || mergedSettings.categories;
      updatedSettings.updateFrequency = values.updateFrequency || mergedSettings.updateFrequency;
      updatedSettings.showImages = values.showImages ?? mergedSettings.showImages;
    }

    // Save settings
    onSave(widgetId, updatedSettings);
    onClose();
  };

  // Render type-specific settings forms
  const renderTypeSpecificSettings = () => {
    switch (widgetType) {
      case 'market-data':
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="symbols"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbols</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value?.[0] || 'BTC'}
                      onValueChange={(value) => field.onChange([value])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select symbols" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        <SelectItem value="SOL">Solana (SOL)</SelectItem>
                        <SelectItem value="BNB">Binance Coin (BNB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Trading pairs to display in the widget
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="historyRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>History Range</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || '1d'}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="4h">4 Hours</SelectItem>
                        <SelectItem value="1d">1 Day</SelectItem>
                        <SelectItem value="1w">1 Week</SelectItem>
                        <SelectItem value="1m">1 Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="showPriceHistory"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Show Price History
                    </FormLabel>
                    <FormDescription>
                      Display price chart in widget
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
        );
        
      case 'positions':
      case 'orders':
      case 'performance':
      case 'news':
      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Settings for this widget type will be available soon.
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Widget Settings</DialogTitle>
          <DialogDescription>
            Customize how this widget appears and behaves on your dashboard.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </TabsList>
              
              {/* General Settings */}
              <TabsContent value="general" className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Widget Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="refreshInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refresh Interval (sec)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={5} 
                            max={3600} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="autoRefresh"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-[74px]">
                        <div className="space-y-0.5">
                          <FormLabel>Auto Refresh</FormLabel>
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
                
                <FormField
                  control={form.control}
                  name="isCollapsible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Allow Collapse</FormLabel>
                        <FormDescription>
                          Widget can be collapsed to just the header
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
              </TabsContent>
              
              {/* Appearance Settings */}
              <TabsContent value="appearance" className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Widget Theme</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a theme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="compact">Compact</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="showBorder"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Show Border</FormLabel>
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
                    name="showHeader"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Show Header</FormLabel>
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
                
                <div className="space-y-2">
                  <FormLabel>Widget Size</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Width (1-12)</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number" 
                                min={1} 
                                max={12} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                value={field.value}
                              />
                              <Slider
                                value={[field.value]}
                                min={1}
                                max={12}
                                step={1}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className="w-36"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Height (2-24)</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number" 
                                min={2} 
                                max={24} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                value={field.value}
                              />
                              <Slider
                                value={[field.value]}
                                min={2}
                                max={24}
                                step={1}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className="w-36"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Data Settings */}
              <TabsContent value="data" className="py-4">
                {renderTypeSpecificSettings()}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default WidgetSettingsModal;
