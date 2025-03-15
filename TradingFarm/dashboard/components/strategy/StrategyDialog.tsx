import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "../ui/tabs";
import { Switch } from "../ui/switch";
import { Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Strategy, StrategyParameter, StrategyStatus, StrategyType } from './types';
import { Slider } from "../ui/slider";
import { toast } from "../ui/use-toast";

interface StrategyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view' | 'import';
  strategy?: Strategy | null;
  onSave?: (strategy: Partial<Strategy>) => Promise<void>;
  onImport?: (file: File) => Promise<void>;
}

// Form validation schema
const strategyFormSchema = z.object({
  name: z.string().min(3, {
    message: "Strategy name must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  type: z.nativeEnum(StrategyType),
  exchanges: z.array(z.string()).min(1, {
    message: "At least one exchange must be selected.",
  }),
  symbols: z.array(z.string()).min(1, {
    message: "At least one symbol must be selected.",
  }),
  isLive: z.boolean().default(false),
  parameters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      type: z.string(),
      value: z.any(),
      default: z.any(),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
      options: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
        })
      ).optional(),
      validation: z.object({
        required: z.boolean().optional(),
        pattern: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
    })
  ),
});

// Mock exchanges and symbols for demonstration
const availableExchanges = [
  { value: 'binance', label: 'Binance' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'kraken', label: 'Kraken' },
  { value: 'bybit', label: 'Bybit' },
  { value: 'ftx', label: 'FTX' },
];

const availableSymbols = [
  { value: 'BTC/USDT', label: 'BTC/USDT' },
  { value: 'ETH/USDT', label: 'ETH/USDT' },
  { value: 'BTC/USD', label: 'BTC/USD' },
  { value: 'ETH/USD', label: 'ETH/USD' },
  { value: 'XRP/USDT', label: 'XRP/USDT' },
  { value: 'SOL/USDT', label: 'SOL/USDT' },
];

const strategyTypes = Object.values(StrategyType).map(type => ({
  value: type,
  label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}));

const StrategyDialog: React.FC<StrategyDialogProps> = ({
  isOpen,
  onClose,
  mode,
  strategy,
  onSave,
  onImport,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [importFile, setImportFile] = useState<File | null>(null);

  // Initialize form with strategy data or defaults
  const form = useForm<z.infer<typeof strategyFormSchema>>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: strategy ? {
      name: strategy.name,
      description: strategy.description,
      type: strategy.type,
      exchanges: strategy.exchanges,
      symbols: strategy.symbols,
      isLive: strategy.isLive,
      parameters: strategy.parameters,
    } : {
      name: '',
      description: '',
      type: StrategyType.CUSTOM,
      exchanges: [],
      symbols: [],
      isLive: false,
      parameters: [],
    },
  });

  useEffect(() => {
    if (strategy && (mode === 'edit' || mode === 'view')) {
      form.reset({
        name: strategy.name,
        description: strategy.description,
        type: strategy.type,
        exchanges: strategy.exchanges,
        symbols: strategy.symbols,
        isLive: strategy.isLive,
        parameters: strategy.parameters,
      });
    }
  }, [strategy, mode, form]);

  const onSubmit = async (data: z.infer<typeof strategyFormSchema>) => {
    if (mode === 'view') return;
    
    setIsLoading(true);
    try {
      if (mode === 'import' && importFile && onImport) {
        await onImport(importFile);
      } else if (onSave) {
        await onSave(data);
      }
      
      toast({
        title: `Strategy ${mode === 'create' ? 'Created' : 'Updated'}`,
        description: `Successfully ${mode === 'create' ? 'created' : 'updated'} the strategy.`,
      });
      
      onClose();
    } catch (error) {
      console.error(`Failed to ${mode} strategy`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${mode} the strategy. Please try again.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  // Render a parameter input based on its type
  const renderParameterInput = (parameter: StrategyParameter) => {
    switch (parameter.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor={parameter.id}>{parameter.name}</Label>
              <span className="text-sm text-muted-foreground">
                {form.watch(`parameters.${form.getValues('parameters').findIndex(p => p.id === parameter.id)}.value`)}
              </span>
            </div>
            <Slider
              id={parameter.id}
              min={parameter.min}
              max={parameter.max}
              step={parameter.step}
              value={[form.watch(`parameters.${form.getValues('parameters').findIndex(p => p.id === parameter.id)}.value`)]}
              onValueChange={(value) => {
                const index = form.getValues('parameters').findIndex(p => p.id === parameter.id);
                const params = [...form.getValues('parameters')];
                params[index] = { ...params[index], value: value[0] };
                form.setValue('parameters', params);
              }}
              disabled={mode === 'view'}
            />
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          </div>
        );
      
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={parameter.id}>{parameter.name}</Label>
              <p className="text-xs text-muted-foreground">{parameter.description}</p>
            </div>
            <Switch
              id={parameter.id}
              checked={form.watch(`parameters.${form.getValues('parameters').findIndex(p => p.id === parameter.id)}.value`)}
              onCheckedChange={(checked) => {
                const index = form.getValues('parameters').findIndex(p => p.id === parameter.id);
                const params = [...form.getValues('parameters')];
                params[index] = { ...params[index], value: checked };
                form.setValue('parameters', params);
              }}
              disabled={mode === 'view'}
            />
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={parameter.id}>{parameter.name}</Label>
            <Select
              value={String(form.watch(`parameters.${form.getValues('parameters').findIndex(p => p.id === parameter.id)}.value`))}
              onValueChange={(value) => {
                const index = form.getValues('parameters').findIndex(p => p.id === parameter.id);
                const params = [...form.getValues('parameters')];
                params[index] = { ...params[index], value };
                form.setValue('parameters', params);
              }}
              disabled={mode === 'view'}
            >
              <SelectTrigger id={parameter.id}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {parameter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          </div>
        );
      
      default: // string or other types
        return (
          <div className="space-y-2">
            <Label htmlFor={parameter.id}>{parameter.name}</Label>
            <Input
              id={parameter.id}
              value={form.watch(`parameters.${form.getValues('parameters').findIndex(p => p.id === parameter.id)}.value`) || ''}
              onChange={(e) => {
                const index = form.getValues('parameters').findIndex(p => p.id === parameter.id);
                const params = [...form.getValues('parameters')];
                params[index] = { ...params[index], value: e.target.value };
                form.setValue('parameters', params);
              }}
              disabled={mode === 'view'}
            />
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          </div>
        );
    }
  };

  // Import strategy form
  const renderImportForm = () => {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="import-file">Strategy File</Label>
          <Input
            id="import-file"
            type="file"
            accept=".json,.py,.js"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Import a strategy from a file. Supported formats: JSON, Python, JavaScript.
          </p>
        </div>
        
        {importFile && (
          <div className="rounded-md bg-muted p-4">
            <p className="font-medium">Selected file: {importFile.name}</p>
            <p className="text-sm text-muted-foreground">
              Size: {(importFile.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Strategy' : 
             mode === 'edit' ? 'Edit Strategy' :
             mode === 'import' ? 'Import Strategy' : 'Strategy Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new trading strategy for your portfolio.' : 
             mode === 'edit' ? 'Make changes to your strategy settings.' :
             mode === 'import' ? 'Import a strategy from a file.' : 'View strategy details and performance.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : mode === 'import' ? (
          renderImportForm()
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="parameters">Parameters</TabsTrigger>
                  <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategy Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={mode === 'view'} />
                        </FormControl>
                        <FormMessage />
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
                          <Textarea 
                            {...field} 
                            rows={3} 
                            disabled={mode === 'view'} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategy Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={mode === 'view'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a strategy type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {strategyTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isLive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Live Trading</FormLabel>
                          <FormDescription>
                            Enable live trading for this strategy
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={mode === 'view'}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="parameters" className="space-y-4">
                  {form.getValues('parameters').length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">
                        No parameters defined for this strategy.
                      </p>
                      {mode !== 'view' && (
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          type="button"
                          onClick={() => {
                            // Logic to add a new parameter would go here
                          }}
                        >
                          Add Parameter
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {form.getValues('parameters').map((parameter, index) => (
                        <div key={parameter.id} className="rounded-lg border p-4">
                          {renderParameterInput(parameter)}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="exchanges" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="exchanges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchanges</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {availableExchanges.map((exchange) => (
                            <div 
                              key={exchange.value} 
                              className={`
                                flex items-center space-x-2 rounded-md border p-2 cursor-pointer
                                ${field.value.includes(exchange.value) 
                                  ? 'bg-primary/10 border-primary/50' 
                                  : 'hover:bg-muted/50'}
                              `}
                              onClick={() => {
                                if (mode !== 'view') {
                                  const newValue = field.value.includes(exchange.value)
                                    ? field.value.filter((v) => v !== exchange.value)
                                    : [...field.value, exchange.value];
                                  form.setValue('exchanges', newValue);
                                }
                              }}
                            >
                              <div 
                                className={`h-4 w-4 rounded-sm border
                                  ${field.value.includes(exchange.value) 
                                    ? 'bg-primary border-primary' 
                                    : 'border-muted-foreground'}`}
                              >
                                {field.value.includes(exchange.value) && (
                                  <div className="flex h-full items-center justify-center">
                                    <div className="text-white">✓</div>
                                  </div>
                                )}
                              </div>
                              <span>{exchange.label}</span>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="symbols"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trading Pairs</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {availableSymbols.map((symbol) => (
                            <div 
                              key={symbol.value} 
                              className={`
                                flex items-center space-x-2 rounded-md border p-2 cursor-pointer
                                ${field.value.includes(symbol.value) 
                                  ? 'bg-primary/10 border-primary/50' 
                                  : 'hover:bg-muted/50'}
                              `}
                              onClick={() => {
                                if (mode !== 'view') {
                                  const newValue = field.value.includes(symbol.value)
                                    ? field.value.filter((v) => v !== symbol.value)
                                    : [...field.value, symbol.value];
                                  form.setValue('symbols', newValue);
                                }
                              }}
                            >
                              <div 
                                className={`h-4 w-4 rounded-sm border
                                  ${field.value.includes(symbol.value) 
                                    ? 'bg-primary border-primary' 
                                    : 'border-muted-foreground'}`}
                              >
                                {field.value.includes(symbol.value) && (
                                  <div className="flex h-full items-center justify-center">
                                    <div className="text-white">✓</div>
                                  </div>
                                )}
                              </div>
                              <span>{symbol.label}</span>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                {mode !== 'view' && (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === 'create' ? 'Create' : mode === 'edit' ? 'Save Changes' : 'Import'}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StrategyDialog;
