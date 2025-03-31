'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Bot, Brain, CheckCircle, Info, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import OrderTypeSelector from './order-type-selector';
import BasicOrderFields from './basic-order-fields';
import AdvancedOrderFields from './advanced-order-fields';
import { OrderType } from '@/services/advanced-order-service';
import riskManagementService from '@/services/risk-management-service';
import { createOrderWithRiskCheck } from '@/app/actions/advanced-order-actions';
import StrategyCommandConsole from '@/components/eliza-integration/strategy-command-console';

// Mock data - in a real app, this would come from an API
const mockExchanges = [
  { value: 'binance', label: 'Binance' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'ftx', label: 'FTX' },
  { value: 'kraken', label: 'Kraken' },
];

const mockSymbols = [
  { value: 'BTCUSDT', label: 'BTC/USDT' },
  { value: 'ETHUSDT', label: 'ETH/USDT' },
  { value: 'SOLUSDT', label: 'SOL/USDT' },
  { value: 'BNBUSDT', label: 'BNB/USDT' },
];

const mockExchangeAccounts = [
  { value: 'account1', label: 'Binance Main' },
  { value: 'account2', label: 'Binance Testnet' },
  { value: 'account3', label: 'Coinbase Pro' },
];

const mockRiskProfiles = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
];

// Form schema - will be adjusted based on order type
const basicOrderSchema = z.object({
  farm_id: z.string(),
  agent_id: z.string().optional(),
  exchange: z.string(),
  exchange_account_id: z.string().optional(),
  symbol: z.string(),
  order_type: z.enum(['market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'oco', 'iceberg', 'twap', 'vwap', 'take_profit', 'bracket']),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive({ message: 'Quantity must be positive' }),
  time_in_force: z.enum(['gtc', 'ioc', 'fok']).default('gtc'),
  // Fields for specific order types will be added dynamically
});

// Props for the order form
interface AdvancedOrderFormProps {
  farmId: string;
  agentId?: string;
  strategyId?: string;
  onOrderSubmit?: (orderData: any) => void;
  initialData?: any;
}

export default function AdvancedOrderForm({
  farmId,
  agentId,
  strategyId,
  onOrderSubmit,
  initialData
}: AdvancedOrderFormProps) {
  const { toast } = useToast();
  const [orderType, setOrderType] = React.useState<OrderType>(initialData?.order_type || 'market');
  const [riskProfileId, setRiskProfileId] = React.useState<string | null>(null);
  const [riskCheckResult, setRiskCheckResult] = React.useState<any>(null);
  const [isRiskCheckLoading, setIsRiskCheckLoading] = React.useState(false);
  const [useElizaOS, setUseElizaOS] = React.useState(true);
  const [aiTab, setAiTab] = React.useState<'suggestions' | 'console'>('suggestions');
  const [orderValidation, setOrderValidation] = React.useState<{
    valid: boolean;
    message?: string;
    details?: any;
  }>({ valid: true });

  // Create full schema based on selected order type
  const getFullSchema = () => {
    let fullSchema = basicOrderSchema;

    // Add fields based on order type
    switch (orderType) {
      case 'limit':
        fullSchema = fullSchema.extend({
          price: z.number().positive({ message: 'Price must be positive' }),
        });
        break;

      case 'stop':
        fullSchema = fullSchema.extend({
          stop_price: z.number().positive({ message: 'Stop price must be positive' }),
          trigger_condition: z.enum(['gt', 'lt', 'gte', 'lte']).default('gt'),
          trigger_price_source: z.enum(['mark', 'index', 'last']).default('last'),
        });
        break;

      case 'stop_limit':
        fullSchema = fullSchema.extend({
          price: z.number().positive({ message: 'Price must be positive' }),
          stop_price: z.number().positive({ message: 'Stop price must be positive' }),
          trigger_condition: z.enum(['gt', 'lt', 'gte', 'lte']).default('gt'),
          trigger_price_source: z.enum(['mark', 'index', 'last']).default('last'),
        });
        break;

      case 'trailing_stop':
        fullSchema = fullSchema.extend({
          trail_value: z.number().positive({ message: 'Trail value must be positive' }),
          trail_type: z.enum(['amount', 'percentage']),
          activation_price: z.number().positive().optional(),
        });
        break;

      case 'oco':
        fullSchema = fullSchema.extend({
          price: z.number().positive({ message: 'Price must be positive' }),
          stop_price: z.number().positive({ message: 'Stop price must be positive' }),
          trigger_condition: z.enum(['gt', 'lt']).default('lt'),
        });
        break;

      case 'bracket':
        fullSchema = fullSchema.extend({
          entry_type: z.enum(['market', 'limit']),
          entry_price: z.number().positive().optional().superRefine((val, ctx) => {
            const entryType = ctx.parent.entry_type;
            if (entryType === 'limit' && !val) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Entry price is required for limit orders',
              });
            }
          }),
          take_profit_price: z.number().positive({ message: 'Take profit price must be positive' }),
          stop_loss_price: z.number().positive({ message: 'Stop loss price must be positive' }),
        });
        break;

      case 'iceberg':
        fullSchema = fullSchema.extend({
          price: z.number().positive({ message: 'Price must be positive' }),
          iceberg_qty: z.number().positive({ message: 'Visible quantity must be positive' }).refine(val => val <= form.getValues().quantity, {
            message: 'Visible quantity cannot exceed total quantity',
          }),
        });
        break;

      case 'twap':
        fullSchema = fullSchema.extend({
          price: z.number().positive().optional(),
          start_time: z.string(),
          end_time: z.string(),
          num_slices: z.number().int().min(2, { message: 'At least 2 slices required' }),
        });
        break;

      case 'vwap':
        fullSchema = fullSchema.extend({
          price: z.number().positive().optional(),
          start_time: z.string(),
          end_time: z.string(),
          volume_profile: z.enum(['historical', 'custom']),
          custom_volume_profile: z.array(z.number()).optional().superRefine((val, ctx) => {
            const volumeProfile = ctx.parent.volume_profile;
            if (volumeProfile === 'custom') {
              if (!val || val.length === 0) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Custom volume profile is required',
                });
              } else {
                const sum = val.reduce((a, b) => a + b, 0);
                if (Math.abs(sum - 100) > 0.1) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Volume profile percentages must add up to 100%',
                  });
                }
              }
            }
          }),
        });
        break;
    }

    return fullSchema;
  };

  // Set up form with resolver
  const form = useForm({
    resolver: zodResolver(getFullSchema()),
    defaultValues: {
      farm_id: farmId,
      agent_id: agentId,
      exchange: initialData?.exchange || '',
      symbol: initialData?.symbol || '',
      order_type: orderType,
      side: initialData?.side || 'buy',
      quantity: initialData?.quantity || 0,
      time_in_force: initialData?.time_in_force || 'gtc',
      ...initialData,
    },
  });

  // Update form validation when order type changes
  React.useEffect(() => {
    form.setValue('order_type', orderType);
    // Reset fields that might be specific to other order types
    if (orderType !== 'limit' && orderType !== 'stop_limit') {
      form.setValue('price', undefined);
    }
    if (orderType !== 'stop' && orderType !== 'stop_limit') {
      form.setValue('stop_price', undefined);
    }
    
    // Force revalidation when order type changes
    form.trigger();
  }, [orderType, form]);

  // Validate order based on current market conditions
  const validateOrder = async (data: any) => {
    try {
      setIsRiskCheckLoading(true);
      setOrderValidation({ valid: true });
      
      // For demonstration purposes - in a real app, this would call an API
      const side = data.side;
      const price = data.price || data.stop_price;
      const quantity = data.quantity;
      
      // Mock validation for demonstration
      if (side === 'buy' && price && quantity && price * quantity > 50000) {
        setOrderValidation({
          valid: false,
          message: 'Order value exceeds recommended limit',
          details: {
            orderValue: price * quantity,
            recommendedLimit: 50000
          }
        });
      } else if (quantity > 10) {
        setOrderValidation({
          valid: true,
          message: 'Large order detected - please confirm',
          details: {
            suggestedSize: quantity * 0.5
          }
        });
      } else {
        setOrderValidation({ valid: true });
      }

      // Perform risk check if risk profile is selected
      if (riskProfileId) {
        const result = await riskManagementService.checkOrderAgainstRiskLimits(data, agentId);
        setRiskCheckResult(result);
      }
    } catch (error) {
      console.error('Error validating order:', error);
      setOrderValidation({
        valid: false,
        message: 'Error validating order'
      });
    } finally {
      setIsRiskCheckLoading(false);
    }
  };

  const handleOrderTypeChange = (type: OrderType) => {
    setOrderType(type);
  };

  // Handle form submission
  const onSubmit = async (data: any) => {
    try {
      const orderData = {
        ...data,
        farm_id: farmId,
        agent_id: agentId,
        strategy_id: strategyId,
      };

      // Create order with risk check
      const result = await createOrderWithRiskCheck(orderData, riskProfileId || undefined);
      
      if (result.success) {
        toast({
          title: 'Order created successfully',
          description: `Order ID: ${result.data.order.id}`,
          duration: 5000,
        });
        
        if (onOrderSubmit) {
          onOrderSubmit(result.data);
        }
        
        // Clear form
        form.reset();
      } else {
        toast({
          title: 'Error creating order',
          description: result.error,
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  // Calculate risk score color
  const getRiskScoreColor = (score: number) => {
    if (score < 30) return 'bg-green-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Advanced Order Form</CardTitle>
            <CardDescription>
              Create and execute advanced order types with risk management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="font-medium">Order Type</div>
                <OrderTypeSelector 
                  value={orderType} 
                  onChange={handleOrderTypeChange} 
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="font-medium">Basic Order Details</div>
                <BasicOrderFields 
                  form={form} 
                  exchanges={mockExchanges}
                  symbols={mockSymbols}
                  exchangeAccounts={mockExchangeAccounts}
                />
              </div>
              
              {orderType !== 'market' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="font-medium">{orderType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Parameters</div>
                    <AdvancedOrderFields 
                      form={form} 
                      orderType={orderType} 
                    />
                  </div>
                </>
              )}
              
              <Separator />
              
              <div className="space-y-4">
                <div className="font-medium">Risk Management</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="risk-profile">Risk Profile</Label>
                    <select 
                      id="risk-profile"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={riskProfileId || ''}
                      onChange={(e) => setRiskProfileId(e.target.value || null)}
                    >
                      <option value="">No Risk Profile</option>
                      {mockRiskProfiles.map((profile) => (
                        <option key={profile.value} value={profile.value}>
                          {profile.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRiskCheckLoading}
                    onClick={() => validateOrder(form.getValues())}
                  >
                    {isRiskCheckLoading ? 'Validating...' : 'Validate Order'}
                  </Button>
                </div>
                
                {/* Risk Check Results */}
                {riskCheckResult && (
                  <div className="mt-4">
                    <Alert variant={riskCheckResult.passed ? "default" : "destructive"}>
                      <div className="flex items-center">
                        {riskCheckResult.passed ? 
                          <CheckCircle className="h-4 w-4 mr-2" /> : 
                          <AlertTriangle className="h-4 w-4 mr-2" />
                        }
                        <AlertTitle>
                          {riskCheckResult.passed ? 'Risk Check Passed' : 'Risk Check Failed'}
                        </AlertTitle>
                      </div>
                      <AlertDescription>
                        {riskCheckResult.message}
                        
                        {riskCheckResult.risk_score !== undefined && (
                          <div className="mt-2">
                            <div className="flex justify-between text-sm">
                              <span>Risk Score</span>
                              <span>{riskCheckResult.risk_score}/100</span>
                            </div>
                            <Progress 
                              value={riskCheckResult.risk_score} 
                              className={`h-2 mt-1 ${getRiskScoreColor(riskCheckResult.risk_score)}`}
                            />
                          </div>
                        )}
                        
                        {riskCheckResult.warnings && riskCheckResult.warnings.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium text-sm">Warnings:</p>
                            <ul className="list-disc list-inside text-sm">
                              {riskCheckResult.warnings.map((warning: string, idx: number) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {/* Order Validation Results */}
                {!orderValidation.valid && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Order Validation Failed</AlertTitle>
                    <AlertDescription>
                      {orderValidation.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                {orderValidation.message && orderValidation.valid && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Order Information</AlertTitle>
                    <AlertDescription>
                      {orderValidation.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!form.formState.isValid || isRiskCheckLoading || !orderValidation.valid}
                >
                  Submit Order
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <Card className="h-full flex flex-col">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">ElizaOS AI Assistant</CardTitle>
              <div className="flex items-center space-x-2">
                <Label htmlFor="use-eliza" className="text-sm">Enable AI</Label>
                <Switch
                  id="use-eliza"
                  checked={useElizaOS}
                  onCheckedChange={setUseElizaOS}
                />
              </div>
            </div>
            <CardDescription>
              AI-powered order suggestions and analysis
            </CardDescription>
          </CardHeader>
          
          {useElizaOS ? (
            <>
              <Tabs value={aiTab} onValueChange={(value: any) => setAiTab(value)} className="flex-1 flex flex-col">
                <TabsList className="px-6 pt-2">
                  <TabsTrigger value="suggestions" className="flex">
                    <Zap className="h-4 w-4 mr-2" />
                    Suggestions
                  </TabsTrigger>
                  <TabsTrigger value="console" className="flex">
                    <Bot className="h-4 w-4 mr-2" />
                    Console
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="suggestions" className="flex-1 p-6 overflow-auto">
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-primary/10 rounded-md">
                      <Brain className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">AI Order Recommendations</span>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h4 className="font-medium mb-2">Suggested Order Type</h4>
                      <p className="text-sm">
                        Based on current market conditions, a <span className="font-semibold">Trailing Stop</span> order might be more appropriate for this trade.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                        onClick={() => setOrderType('trailing_stop')}
                      >
                        Apply Suggestion
                      </Button>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h4 className="font-medium mb-2">Optimal Entry</h4>
                      <p className="text-sm">
                        Optimal entry price range: <span className="font-semibold">$28,500 - $28,750</span>
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          if (orderType === 'limit' || orderType === 'stop_limit') {
                            form.setValue('price', 28625);
                          } else if (orderType === 'stop') {
                            form.setValue('stop_price', 28625);
                          }
                        }}
                      >
                        Apply Price
                      </Button>
                    </div>
                    
                    <div className="p-4 border rounded-md">
                      <h4 className="font-medium mb-2">Position Sizing</h4>
                      <p className="text-sm">
                        Recommended position size based on risk management: <span className="font-semibold">0.25 BTC</span>
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                        onClick={() => form.setValue('quantity', 0.25)}
                      >
                        Apply Position Size
                      </Button>
                    </div>
                    
                    <Alert className="bg-muted">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Market Analysis</AlertTitle>
                      <AlertDescription className="text-sm">
                        BTC volatility is high (2.8%). Consider reducing position size or using bracket orders to manage risk.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
                
                <TabsContent value="console" className="flex-1 p-0 flex flex-col">
                  <StrategyCommandConsole
                    strategyName="Order Assistant"
                  />
                </TabsContent>
              </Tabs>
              
              <CardFooter className="border-t">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs text-muted-foreground"
                  onClick={() => {
                    // This would open ElizaOS documentation
                  }}
                >
                  Learn more about ElizaOS AI trading assistance
                </Button>
              </CardFooter>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  ElizaOS AI is currently disabled
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-4"
                  onClick={() => setUseElizaOS(true)}
                >
                  Enable ElizaOS
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
