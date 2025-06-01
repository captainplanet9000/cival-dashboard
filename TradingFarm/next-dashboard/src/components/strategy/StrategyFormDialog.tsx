'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategyMeta, StrategyInstance, Timeframe } from '@/lib/strategy/types';
import { createBrowserClient } from '@/utils/supabase/client';

interface StrategyFormDialogProps {
  availableStrategies: StrategyMeta[];
  onSubmit: (data: {
    strategyId: string;
    name: string;
    parameters: Record<string, any>;
    symbols: string[];
    timeframes: string[];
  }) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
  initialData?: StrategyInstance;
}

export default function StrategyFormDialog({
  availableStrategies,
  onSubmit,
  onCancel,
  mode,
  initialData
}: StrategyFormDialogProps) {
  const [formData, setFormData] = useState<{
    strategyId: string;
    name: string;
    parameters: Record<string, any>;
    symbols: string[];
    timeframes: string[];
  }>({
    strategyId: initialData?.strategyId || '',
    name: initialData?.name || '',
    parameters: initialData?.parameters || {},
    symbols: initialData?.symbols || [],
    timeframes: initialData?.timeframes || []
  });
  
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyMeta | null>(null);
  const [symbolFile, setSymbolFile] = useState<{ path: string; url: string } | null>(null);
  const supabase = createBrowserClient();

  // Load available symbols from the database
  useEffect(() => {
    const fetchSymbols = async () => {
      const { data, error } = await supabase
        .from('market_data')
        .select('symbol')
        .order('symbol', { ascending: true });
      
      if (error) {
        console.error('Error fetching symbols:', error);
        return;
      }
      
      // Extract unique symbols
      const symbols = [...new Set(data.map(item => item.symbol))];
      setAvailableSymbols(symbols);
    };
    
    fetchSymbols();
  }, []);

  // Update selected strategy when strategyId changes
  useEffect(() => {
    const strategy = availableStrategies.find(s => s.id === formData.strategyId);
    setSelectedStrategy(strategy || null);
    
    // If not editing, initialize parameters with defaults
    if (mode === 'create' && strategy) {
      const defaultParams: Record<string, any> = {};
      strategy.parameters.forEach(param => {
        defaultParams[param.id] = param.default;
      });
      setFormData(prev => ({ ...prev, parameters: defaultParams }));
    }
  }, [formData.strategyId, availableStrategies, mode]);

  const handleStrategyChange = (strategyId: string) => {
    setFormData(prev => ({ ...prev, strategyId }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };

  const handleParameterChange = (paramId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [paramId]: value
      }
    }));
  };

  const handleAddSymbol = () => {
    if (customSymbol && !formData.symbols.includes(customSymbol)) {
      setFormData(prev => ({
        ...prev,
        symbols: [...prev.symbols, customSymbol]
      }));
      setCustomSymbol('');
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setFormData(prev => ({
      ...prev,
      symbols: prev.symbols.filter(s => s !== symbol)
    }));
  };

  const handleTimeframeToggle = (timeframe: string) => {
    setFormData(prev => {
      if (prev.timeframes.includes(timeframe)) {
        return {
          ...prev,
          timeframes: prev.timeframes.filter(t => t !== timeframe)
        };
      } else {
        return {
          ...prev,
          timeframes: [...prev.timeframes, timeframe]
        };
      }
    });
  };

  const handleSymbolFileUpload = async (files: any[]) => {
    if (files.length > 0) {
      setSymbolFile(files[0]);
      
      try {
        // Assume the file is a text file with one symbol per line
        const response = await fetch(files[0].url);
        const text = await response.text();
        const symbols = text.split(/\r?\n/).map(s => s.trim()).filter(s => s);
        
        // Add new symbols to the form data
        setFormData(prev => {
          const uniqueSymbols = [...new Set([...prev.symbols, ...symbols])];
          return {
            ...prev,
            symbols: uniqueSymbols
          };
        });
      } catch (error) {
        console.error('Error processing symbol file:', error);
      }
    }
  };

  const filteredSymbols = availableSymbols.filter(symbol => 
    symbol.toLowerCase().includes(symbolSearch.toLowerCase())
  );

  const renderParameterInput = (param: StrategyMeta['parameters'][0]) => {
    const value = formData.parameters[param.id];
    
    switch (param.type) {
      case 'number':
        if (param.min !== undefined && param.max !== undefined && param.step !== undefined) {
          return (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{value}</span>
                {param.unit && <span className="text-xs text-muted-foreground">{param.unit}</span>}
              </div>
              <Slider
                value={[value]}
                min={param.min}
                max={param.max}
                step={param.step}
                onValueChange={vals => handleParameterChange(param.id, vals[0])}
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={value}
            min={param.min}
            max={param.max}
            step={param.step}
            onChange={e => handleParameterChange(param.id, parseFloat(e.target.value))}
          />
        );
        
      case 'boolean':
        return (
          <Switch
            checked={value}
            onCheckedChange={checked => handleParameterChange(param.id, checked)}
          />
        );
        
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={val => handleParameterChange(param.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map(option => (
                <SelectItem key={option} value={option.toString()}>
                  {option.toString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      default:
        return (
          <Input
            value={value}
            onChange={e => handleParameterChange(param.id, e.target.value)}
          />
        );
    }
  };

  const isFormValid = () => {
    return (
      formData.strategyId &&
      formData.name &&
      formData.symbols.length > 0 &&
      formData.timeframes.length > 0 &&
      (selectedStrategy ? Object.keys(formData.parameters).length === selectedStrategy.parameters.filter(p => p.isRequired).length : true)
    );
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Strategy' : 'Edit Strategy'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Configure a new trading strategy instance' 
              : 'Update your strategy configuration'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  placeholder="My Trading Strategy"
                  value={formData.name}
                  onChange={handleNameChange}
                />
              </div>
              
              {mode === 'create' && (
                <div className="space-y-2">
                  <Label htmlFor="strategyType">Strategy Type</Label>
                  <Select
                    value={formData.strategyId}
                    onValueChange={handleStrategyChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStrategies.map(strategy => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedStrategy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedStrategy.description}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Tabs for different categories */}
            <Tabs defaultValue="parameters">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="parameters">Parameters</TabsTrigger>
                <TabsTrigger value="symbols">Symbols</TabsTrigger>
                <TabsTrigger value="timeframes">Timeframes</TabsTrigger>
              </TabsList>
              
              {/* Parameters Tab */}
              <TabsContent value="parameters" className="space-y-4">
                {selectedStrategy ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStrategy.parameters
                        .filter(param => !param.isAdvanced)
                        .map(param => (
                          <div key={param.id} className="space-y-2">
                            <Label htmlFor={param.id}>{param.name}</Label>
                            {renderParameterInput(param)}
                            {param.description && (
                              <p className="text-xs text-muted-foreground">
                                {param.description}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                    
                    {selectedStrategy.parameters.some(param => param.isAdvanced) && (
                      <div className="mt-6">
                        <h3 className="text-sm font-medium mb-2">Advanced Parameters</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedStrategy.parameters
                            .filter(param => param.isAdvanced)
                            .map(param => (
                              <div key={param.id} className="space-y-2">
                                <Label htmlFor={param.id}>{param.name}</Label>
                                {renderParameterInput(param)}
                                {param.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {param.description}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Select a strategy to configure parameters
                  </p>
                )}
              </TabsContent>
              
              {/* Symbols Tab */}
              <TabsContent value="symbols" className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search symbols..."
                    value={symbolSearch}
                    onChange={e => setSymbolSearch(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom symbol..."
                      value={customSymbol}
                      onChange={e => setCustomSymbol(e.target.value)}
                    />
                    <Button type="button" onClick={handleAddSymbol}>Add</Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-2 bg-muted/20 rounded-md">
                  {filteredSymbols.slice(0, 30).map(symbol => (
                    <div key={symbol} className="flex items-center space-x-2">
                      <Checkbox
                        id={`symbol-${symbol}`}
                        checked={formData.symbols.includes(symbol)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              symbols: [...prev.symbols, symbol]
                            }));
                          } else {
                            handleRemoveSymbol(symbol);
                          }
                        }}
                      />
                      <Label htmlFor={`symbol-${symbol}`}>{symbol}</Label>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Selected Symbols ({formData.symbols.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.symbols.map(symbol => (
                      <div key={symbol} className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs">
                        {symbol}
                        <button 
                          className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                          onClick={() => handleRemoveSymbol(symbol)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Upload Symbol List</h3>
                  <FileDropzone
                    bucketName="strategy-files"
                    path="symbols"
                    acceptedFileTypes={['.txt', '.csv']}
                    onUploadComplete={handleSymbolFileUpload}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a text file with one symbol per line
                  </p>
                </div>
              </TabsContent>
              
              {/* Timeframes Tab */}
              <TabsContent value="timeframes" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.values(Timeframe).map(timeframe => (
                    <div key={timeframe} className="flex items-center space-x-2">
                      <Checkbox
                        id={`timeframe-${timeframe}`}
                        checked={formData.timeframes.includes(timeframe)}
                        onCheckedChange={() => handleTimeframeToggle(timeframe)}
                      />
                      <Label htmlFor={`timeframe-${timeframe}`}>{timeframe}</Label>
                    </div>
                  ))}
                </div>
                
                {selectedStrategy && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Default timeframe for this strategy: {selectedStrategy.defaultTimeframe}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={() => onSubmit(formData)} 
            disabled={!isFormValid()}
          >
            {mode === 'create' ? 'Create Strategy' : 'Update Strategy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
