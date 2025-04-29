"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Strategy } from '@/types/backtesting';
import { 
  Portfolio, 
  PortfolioStatus, 
  AllocationMethod, 
  RebalancingFrequency,
  PortfolioAllocation
} from '@/types/portfolio';
import { 
  Briefcase, 
  Save, 
  PieChart, 
  Clock, 
  ArrowRightLeft, 
  RefreshCw,
  AlertTriangle,
  Percent
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Form schema for portfolio creation/editing
const portfolioSchema = z.object({
  name: z.string().min(3, { message: "Portfolio name must be at least 3 characters." }),
  description: z.string().optional(),
  initial_capital: z.coerce.number().min(100, { message: "Initial capital must be at least 100." }),
  allocation_method: z.nativeEnum(AllocationMethod),
  rebalancing_frequency: z.nativeEnum(RebalancingFrequency),
  drift_threshold: z.coerce.number().min(1).max(50).optional(),
  status: z.nativeEnum(PortfolioStatus).default(PortfolioStatus.DRAFT),
});

type PortfolioFormValues = z.infer<typeof portfolioSchema>;

// Props for the PortfolioBuilder component
interface PortfolioBuilderProps {
  portfolio?: Portfolio;
  availableStrategies: Strategy[];
  existingAllocations?: PortfolioAllocation[];
  onSave?: (portfolio: Portfolio, allocations: PortfolioAllocation[]) => void;
}

export function PortfolioBuilder({
  portfolio,
  availableStrategies,
  existingAllocations = [],
  onSave
}: PortfolioBuilderProps) {
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>(existingAllocations);
  const [remainingAllocation, setRemainingAllocation] = useState(100);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Initialize form with default values or existing portfolio
  const form = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: portfolio ? {
      name: portfolio.name,
      description: portfolio.description || "",
      initial_capital: portfolio.initial_capital,
      allocation_method: portfolio.allocation_method,
      rebalancing_frequency: portfolio.rebalancing_frequency,
      drift_threshold: portfolio.drift_threshold,
      status: portfolio.status,
    } : {
      name: "",
      description: "",
      initial_capital: 10000,
      allocation_method: AllocationMethod.EQUAL_WEIGHT,
      rebalancing_frequency: RebalancingFrequency.MONTHLY,
      drift_threshold: 5,
      status: PortfolioStatus.DRAFT,
    }
  });

  // Watch form values for changes
  const allocMethod = form.watch('allocation_method');
  const rebalanceFreq = form.watch('rebalancing_frequency');

  // Initialize allocations if equal weight is selected
  useEffect(() => {
    if (allocMethod === AllocationMethod.EQUAL_WEIGHT && availableStrategies.length > 0 && allocations.length === 0) {
      const equalPercentage = 100 / availableStrategies.length;
      const newAllocations = availableStrategies.map(strategy => ({
        portfolio_id: portfolio?.id || '',
        strategy_id: strategy.id || '',
        strategy_name: strategy.name,
        allocation_percentage: equalPercentage,
      }));
      setAllocations(newAllocations);
      setRemainingAllocation(0);
    }
  }, [allocMethod, availableStrategies, portfolio]);

  // Update remaining allocation when allocations change
  useEffect(() => {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocation_percentage, 0);
    setRemainingAllocation(100 - totalAllocated);
    
    // Set warnings
    const newWarnings = [];
    if (totalAllocated > 100) {
      newWarnings.push("Total allocation exceeds 100%. Please adjust your allocations.");
    } else if (totalAllocated < 100 && allocations.length > 0) {
      newWarnings.push(`Total allocation is ${totalAllocated.toFixed(2)}%, which is less than 100%. ${remainingAllocation.toFixed(2)}% of your capital will remain unallocated.`);
    }
    
    if (allocMethod === AllocationMethod.CUSTOM && rebalanceFreq === RebalancingFrequency.THRESHOLD && !form.getValues('drift_threshold')) {
      newWarnings.push("You've selected threshold-based rebalancing but haven't specified a drift threshold.");
    }
    
    setWarnings(newWarnings);
  }, [allocations, allocMethod, rebalanceFreq]);

  // Handle form submission
  const onSubmit = async (values: PortfolioFormValues) => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to save a portfolio");
      }

      // Check if allocations sum to 100%
      const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocation_percentage, 0);
      if (allocMethod === AllocationMethod.CUSTOM && totalAllocated !== 100) {
        toast({
          variant: "destructive",
          title: "Invalid Allocations",
          description: `Total allocation must be 100%. Currently ${totalAllocated.toFixed(2)}%.`,
        });
        setIsLoading(false);
        return;
      }

      // Prepare portfolio object
      const portfolioData: Portfolio = {
        ...values,
        user_id: session.user.id,
        current_value: values.initial_capital,
        status: values.status,
      };

      // Add ID if editing existing portfolio
      if (portfolio?.id) {
        portfolioData.id = portfolio.id;
      }

      // Update allocations with portfolio ID and normalize allocations
      const portfolioAllocations = allocations.map(allocation => ({
        ...allocation,
        portfolio_id: portfolio?.id || '', // This will be filled in by the API for new portfolios
      }));

      // Call onSave callback
      if (onSave) {
        onSave(portfolioData, portfolioAllocations);
      }

      toast({
        title: "Portfolio Saved",
        description: "Your portfolio has been successfully saved.",
      });
    } catch (error: any) {
      console.error("Error saving portfolio:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save portfolio. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle allocation updates
  const updateAllocation = (strategyId: string, percentage: number) => {
    const existingIndex = allocations.findIndex(a => a.strategy_id === strategyId);
    
    if (existingIndex !== -1) {
      // Update existing allocation
      const newAllocations = [...allocations];
      newAllocations[existingIndex] = {
        ...newAllocations[existingIndex],
        allocation_percentage: percentage
      };
      setAllocations(newAllocations);
    } else {
      // Add new allocation
      const strategy = availableStrategies.find(s => s.id === strategyId);
      if (strategy) {
        setAllocations([
          ...allocations,
          {
            portfolio_id: portfolio?.id || '',
            strategy_id: strategyId,
            strategy_name: strategy.name,
            allocation_percentage: percentage
          }
        ]);
      }
    }
  };

  // Handle removing an allocation
  const removeAllocation = (strategyId: string) => {
    setAllocations(allocations.filter(a => a.strategy_id !== strategyId));
  };

  // Apply equal weights to all strategies
  const applyEqualWeights = () => {
    if (availableStrategies.length === 0) return;
    
    const equalPercentage = 100 / availableStrategies.length;
    const newAllocations = availableStrategies.map(strategy => ({
      portfolio_id: portfolio?.id || '',
      strategy_id: strategy.id || '',
      strategy_name: strategy.name,
      allocation_percentage: equalPercentage,
    }));
    
    setAllocations(newAllocations);
  };

  // Format percentage for display
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          {portfolio ? "Edit Portfolio" : "Create Portfolio"}
        </CardTitle>
        <CardDescription>
          Create a portfolio of trading strategies with custom allocations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span>Portfolio Details</span>
            </TabsTrigger>
            <TabsTrigger value="allocations" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span>Strategy Allocations</span>
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="details" className="space-y-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Trading Portfolio" {...field} />
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
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="A brief description of your portfolio's goals and strategy" 
                              className="min-h-[100px]" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="initial_capital"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Capital (USD)</FormLabel>
                          <FormControl>
                            <Input type="number" min={100} {...field} />
                          </FormControl>
                          <FormDescription>
                            Starting capital for the portfolio
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="allocation_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allocation Method</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value === AllocationMethod.EQUAL_WEIGHT) {
                                applyEqualWeights();
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select allocation method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={AllocationMethod.EQUAL_WEIGHT}>Equal Weight</SelectItem>
                              <SelectItem value={AllocationMethod.RISK_PARITY}>Risk Parity</SelectItem>
                              <SelectItem value={AllocationMethod.MAXIMUM_SHARPE}>Maximum Sharpe</SelectItem>
                              <SelectItem value={AllocationMethod.MINIMUM_VARIANCE}>Minimum Variance</SelectItem>
                              <SelectItem value={AllocationMethod.CUSTOM}>Custom Allocation</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === AllocationMethod.EQUAL_WEIGHT && 
                              "Equal weight allocates the same percentage to each strategy"}
                            {field.value === AllocationMethod.RISK_PARITY && 
                              "Risk parity allocates capital to equalize the risk contribution of each strategy"}
                            {field.value === AllocationMethod.MAXIMUM_SHARPE && 
                              "Maximum Sharpe optimizes for the highest return per unit of risk"}
                            {field.value === AllocationMethod.MINIMUM_VARIANCE && 
                              "Minimum variance finds the allocation with the lowest overall volatility"}
                            {field.value === AllocationMethod.CUSTOM && 
                              "Custom allocation lets you manually set the percentage for each strategy"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rebalancing_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rebalancing Frequency</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rebalancing frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={RebalancingFrequency.DAILY}>Daily</SelectItem>
                              <SelectItem value={RebalancingFrequency.WEEKLY}>Weekly</SelectItem>
                              <SelectItem value={RebalancingFrequency.MONTHLY}>Monthly</SelectItem>
                              <SelectItem value={RebalancingFrequency.QUARTERLY}>Quarterly</SelectItem>
                              <SelectItem value={RebalancingFrequency.YEARLY}>Yearly</SelectItem>
                              <SelectItem value={RebalancingFrequency.THRESHOLD}>Threshold-based</SelectItem>
                              <SelectItem value={RebalancingFrequency.MANUAL}>Manual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How often your portfolio will be rebalanced to target allocations
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('rebalancing_frequency') === RebalancingFrequency.THRESHOLD && (
                      <FormField
                        control={form.control}
                        name="drift_threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Drift Threshold (%)</FormLabel>
                            <div className="flex items-center gap-4">
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={20}
                                  step={0.5}
                                  value={[field.value || 5]}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                              </FormControl>
                              <div className="w-12 text-center font-mono">
                                {(field.value || 5).toFixed(1)}%
                              </div>
                            </div>
                            <FormDescription>
                              Rebalance when any strategy drifts by more than this percentage from its target
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio Status</FormLabel>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={PortfolioStatus.DRAFT}>Draft</SelectItem>
                              <SelectItem value={PortfolioStatus.ACTIVE}>Active</SelectItem>
                              <SelectItem value={PortfolioStatus.PAUSED}>Paused</SelectItem>
                              <SelectItem value={PortfolioStatus.STOPPED}>Stopped</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === PortfolioStatus.DRAFT && 
                              "Draft portfolios are not traded but can be used for simulation"}
                            {field.value === PortfolioStatus.ACTIVE && 
                              "Active portfolios are actively traded and rebalanced"}
                            {field.value === PortfolioStatus.PAUSED && 
                              "Paused portfolios maintain positions but don't make new trades"}
                            {field.value === PortfolioStatus.STOPPED && 
                              "Stopped portfolios have closed all positions and are no longer active"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="allocations" className="space-y-6 py-4">
                {allocMethod !== AllocationMethod.CUSTOM ? (
                  <Alert>
                    <PieChart className="h-4 w-4" />
                    <AlertTitle>Automatic Allocation</AlertTitle>
                    <AlertDescription>
                      You've selected {allocMethod.replace('_', ' ')} allocation method. The system will automatically calculate optimal allocations for you based on historical performance.
                      {allocMethod === AllocationMethod.EQUAL_WEIGHT && 
                        ` Each of your ${availableStrategies.length} strategies will receive ${(100 / availableStrategies.length).toFixed(2)}% of your capital.`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Strategy Allocations</h3>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-medium ${remainingAllocation === 0 ? 'text-green-500' : remainingAllocation > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                          Remaining: {formatPercentage(remainingAllocation)}
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={applyEqualWeights}
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Equal Weights
                        </Button>
                      </div>
                    </div>
                    
                    {warnings.length > 0 && (
                      <Alert variant="warning">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Allocation Warnings</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-4 text-sm">
                            {warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {availableStrategies.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>No strategies available for allocation. Please create strategies first.</p>
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <Table>
                          <TableCaption>Adjust allocation percentages for each strategy</TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Strategy</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="w-[250px]">Allocation (%)</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {availableStrategies.map((strategy) => {
                              const allocation = allocations.find(a => a.strategy_id === strategy.id);
                              const allocationPercentage = allocation?.allocation_percentage || 0;
                              
                              return (
                                <TableRow key={strategy.id}>
                                  <TableCell className="font-medium">{strategy.name}</TableCell>
                                  <TableCell>{strategy.type.replace('_', ' ')}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-4">
                                      <Slider
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={[allocationPercentage]}
                                        onValueChange={(vals) => updateAllocation(strategy.id || '', vals[0])}
                                        className="flex-1"
                                      />
                                      <div className="w-16 font-mono text-sm">
                                        {formatPercentage(allocationPercentage)}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeAllocation(strategy.id || '')}
                                      disabled={!allocation}
                                    >
                                      Remove
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    form.reset();
                    if (allocMethod === AllocationMethod.EQUAL_WEIGHT) {
                      applyEqualWeights();
                    } else {
                      setAllocations(existingAllocations);
                    }
                  }}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Portfolio
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            {portfolio 
              ? `Last updated: ${new Date(portfolio.updated_at || Date.now()).toLocaleString()}` 
              : "Portfolio changes will be applied after saving"}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
