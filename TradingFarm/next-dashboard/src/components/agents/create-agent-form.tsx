"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TradingAgentType, SupportedExchange } from "@/services/elizaos/trading-agent-service";
import { Loader2 } from "lucide-react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Form schema
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Agent name must be at least 3 characters.",
  }).max(100, {
    message: "Agent name must be at most 100 characters.",
  }),
  description: z.string().optional(),
  agentType: z.nativeEnum(TradingAgentType, {
    errorMap: (issue, ctx) => ({ message: "Please select a valid agent type." }),
  }),
  exchanges: z.array(z.nativeEnum(SupportedExchange)).min(1, {
    message: "Please select at least one exchange.",
  }),
  tradingPairs: z.array(z.string()).min(1, {
    message: "Please enter at least one trading pair.",
  }),
  riskParameters: z.object({
    maxPositionSize: z.number().positive({
      message: "Max position size must be positive.",
    }),
    maxDrawdown: z.number().min(0, {
      message: "Max drawdown must be at least 0.",
    }).max(100, {
      message: "Max drawdown must be at most 100.",
    }),
    maxOrdersPerInterval: z.number().int().positive({
      message: "Max orders must be a positive integer.",
    }),
    orderIntervalSeconds: z.number().int().positive({
      message: "Order interval must be a positive integer.",
    }),
  }),
  tradingParameters: z.record(z.any()),
  modelProvider: z.string().optional(),
  modelId: z.string().optional(),
  isPaperTrading: z.boolean().default(true),
});

export default function CreateAgentForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExchanges, setSelectedExchanges] = useState<SupportedExchange[]>([]);
  const [tradingPairsInput, setTradingPairsInput] = useState("");

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      agentType: TradingAgentType.TREND_FOLLOWER,
      exchanges: [],
      tradingPairs: [],
      riskParameters: {
        maxPositionSize: 0.01,
        maxDrawdown: 5,
        maxOrdersPerInterval: 3,
        orderIntervalSeconds: 60,
      },
      tradingParameters: {},
      isPaperTrading: true,
    },
  });

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      
      // Prepare the trading pairs from the input
      const tradingPairs = tradingPairsInput
        .split(",")
        .map((pair) => pair.trim())
        .filter((pair) => pair.length > 0);
      
      if (tradingPairs.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please enter at least one trading pair.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Update the form values with the trading pairs
      const formValues = { 
        ...values,
        tradingPairs,
        exchanges: selectedExchanges,
      };
      
      // Send the request to the API
      const response = await fetch("/api/trading-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create trading agent");
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Trading agent created successfully",
      });
      
      // Redirect to the agent detail page
      router.push(`/dashboard/agents/${data.id}`);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create trading agent",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Helper function to toggle exchange selection
  const toggleExchange = (exchange: SupportedExchange) => {
    if (selectedExchanges.includes(exchange)) {
      setSelectedExchanges(selectedExchanges.filter((e) => e !== exchange));
    } else {
      setSelectedExchanges([...selectedExchanges, exchange]);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Create Trading Agent</CardTitle>
        <CardDescription>
          Configure a new ElizaOS trading agent for your automated trading strategies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Trading Bot" {...field} />
                    </FormControl>
                    <FormDescription>
                      A unique name for your trading agent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TradingAgentType.MARKET_MAKER}>
                          Market Maker
                        </SelectItem>
                        <SelectItem value={TradingAgentType.TREND_FOLLOWER}>
                          Trend Follower
                        </SelectItem>
                        <SelectItem value={TradingAgentType.ARBITRAGE}>
                          Arbitrage
                        </SelectItem>
                        <SelectItem value={TradingAgentType.PORTFOLIO_MANAGER}>
                          Portfolio Manager
                        </SelectItem>
                        <SelectItem value={TradingAgentType.SIGNAL_GENERATOR}>
                          Signal Generator
                        </SelectItem>
                        <SelectItem value={TradingAgentType.RISK_MANAGER}>
                          Risk Manager
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of trading strategy this agent will execute
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your agent's trading strategy..." 
                      className="min-h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    A detailed description of your agent's strategy and purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <FormItem>
                <FormLabel>Exchanges</FormLabel>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="binance"
                      checked={selectedExchanges.includes(SupportedExchange.BINANCE)}
                      onCheckedChange={() => toggleExchange(SupportedExchange.BINANCE)}
                    />
                    <Label htmlFor="binance">Binance</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="bybit"
                      checked={selectedExchanges.includes(SupportedExchange.BYBIT)}
                      onCheckedChange={() => toggleExchange(SupportedExchange.BYBIT)}
                    />
                    <Label htmlFor="bybit">Bybit</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="hyperliquid"
                      checked={selectedExchanges.includes(SupportedExchange.HYPERLIQUID)}
                      onCheckedChange={() => toggleExchange(SupportedExchange.HYPERLIQUID)}
                    />
                    <Label htmlFor="hyperliquid">Hyperliquid</Label>
                  </div>
                </div>
                {selectedExchanges.length === 0 && (
                  <p className="text-sm font-medium text-destructive">
                    Please select at least one exchange
                  </p>
                )}
              </FormItem>
              
              <FormItem>
                <FormLabel>Trading Pairs</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="BTC-USDT, ETH-USDT, SOL-USDT" 
                    value={tradingPairsInput}
                    onChange={(e) => setTradingPairsInput(e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  Enter comma-separated trading pairs (e.g., BTC-USDT, ETH-USDT)
                </FormDescription>
                {tradingPairsInput.trim() === "" && (
                  <p className="text-sm font-medium text-destructive">
                    Please enter at least one trading pair
                  </p>
                )}
              </FormItem>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Risk Parameters</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="riskParameters.maxPositionSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Position Size</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001"
                          min="0.001"
                          placeholder="0.01" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum position size in BTC (or equivalent)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="riskParameters.maxDrawdown"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Drawdown (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="5" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum allowed drawdown percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="riskParameters.maxOrdersPerInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Orders Per Interval</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="1"
                          min="1"
                          placeholder="3" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of orders per time interval
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="riskParameters.orderIntervalSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Interval (seconds)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="1"
                          min="1"
                          placeholder="60" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Time interval for order placement limits
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="isPaperTrading"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Paper Trading Mode</FormLabel>
                    <FormDescription>
                      Enable paper trading to simulate trades without using real funds
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
            
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Agent...
                </>
              ) : (
                "Create Trading Agent"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
