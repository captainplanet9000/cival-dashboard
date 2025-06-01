"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { createTrailingStopOrder, createOcoOrder, createBracketOrder } from "@/app/actions/advanced-order-actions";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function OrderTestPage() {
  // Common form fields
  const [farmId, setFarmId] = useState<number>(1);
  const [agentId, setAgentId] = useState<number | undefined>();
  const [exchange, setExchange] = useState("binance");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<number>(0.01);
  const [price, setPrice] = useState<number>(75000);
  
  // Trailing stop specific fields
  const [trailValue, setTrailValue] = useState<number>(5);
  const [trailType, setTrailType] = useState<"absolute" | "percent">("percent");
  const [activationPrice, setActivationPrice] = useState<number>(76000);
  
  // OCO specific fields
  const [takeProfit, setTakeProfit] = useState<number>(80000);
  const [stopLoss, setStopLoss] = useState<number>(70000);
  
  // Bracket specific fields
  const [entryPrice, setEntryPrice] = useState<number>(75000);
  const [trailingStop, setTrailingStop] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form validation
  const validateCommonFields = (): boolean => {
    if (!farmId || farmId <= 0) {
      setError("Farm ID is required and must be positive");
      return false;
    }
    if (!exchange) {
      setError("Exchange is required");
      return false;
    }
    if (!symbol) {
      setError("Symbol is required");
      return false;
    }
    if (!quantity || quantity <= 0) {
      setError("Quantity must be positive");
      return false;
    }
    if (!price || price <= 0) {
      setError("Price must be positive");
      return false;
    }
    return true;
  };
  
  // Create trailing stop order
  const handleCreateTrailingStop = async () => {
    setError(null);
    if (!validateCommonFields()) return;
    
    if (!trailValue || trailValue <= 0) {
      setError("Trail value must be positive");
      return;
    }
    if (!activationPrice || activationPrice <= 0) {
      setError("Activation price must be positive");
      return;
    }
    
    setLoading(true);
    setResult(null);
    try {
      const result = await createTrailingStopOrder({
        farm_id: farmId,
        agent_id: agentId,
        exchange,
        symbol,
        side,
        quantity,
        trail_value: trailValue,
        trail_type: trailType,
        activation_price: activationPrice
      });
      
      setResult(result);
      toast.success("Trailing stop order created successfully");
    } catch (error) {
      console.error("Error creating trailing stop order:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to create trailing stop order");
    } finally {
      setLoading(false);
    }
  };
  
  // Create OCO order
  const handleCreateOCO = async () => {
    setError(null);
    if (!validateCommonFields()) return;
    
    if (!takeProfit || takeProfit <= 0) {
      setError("Take profit must be positive");
      return;
    }
    if (!stopLoss || stopLoss <= 0) {
      setError("Stop loss must be positive");
      return;
    }
    
    setLoading(true);
    setResult(null);
    try {
      const result = await createOcoOrder({
        farm_id: farmId,
        agent_id: agentId,
        exchange,
        symbol,
        side,
        quantity,
        price,
        take_profit: takeProfit,
        stop_loss: stopLoss
      });
      
      setResult(result);
      toast.success("OCO order created successfully");
    } catch (error) {
      console.error("Error creating OCO order:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to create OCO order");
    } finally {
      setLoading(false);
    }
  };
  
  // Create bracket order
  const handleCreateBracket = async () => {
    setError(null);
    if (!validateCommonFields()) return;
    
    if (!entryPrice || entryPrice <= 0) {
      setError("Entry price must be positive");
      return;
    }
    if (!takeProfit || takeProfit <= 0) {
      setError("Take profit must be positive");
      return;
    }
    if (!stopLoss || stopLoss <= 0) {
      setError("Stop loss must be positive");
      return;
    }
    
    setLoading(true);
    setResult(null);
    try {
      const result = await createBracketOrder({
        farm_id: farmId,
        agent_id: agentId,
        exchange,
        symbol,
        side,
        quantity,
        entry_price: entryPrice,
        take_profit: takeProfit,
        stop_loss: stopLoss,
        trailing_stop: trailingStop
      });
      
      setResult(result);
      toast.success("Bracket order created successfully");
    } catch (error) {
      console.error("Error creating bracket order:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to create bracket order");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Order Creation Test</h1>
      </div>
      
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Common Order Parameters</CardTitle>
          <CardDescription>Base parameters used for all order types</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="farm-id">Farm ID</Label>
            <Input
              id="farm-id"
              type="number"
              value={farmId}
              onChange={(e) => setFarmId(Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="agent-id">Agent ID (Optional)</Label>
            <Input
              id="agent-id"
              type="number"
              value={agentId}
              onChange={(e) => setAgentId(Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="exchange">Exchange</Label>
            <Select value={exchange} onValueChange={(value: string) => setExchange(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="binance">Binance</SelectItem>
                <SelectItem value="bybit">Bybit</SelectItem>
                <SelectItem value="kraken">Kraken</SelectItem>
                <SelectItem value="okx">OKX</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="side">Side</Label>
            <Select value={side} onValueChange={(value: string) => setSide(value as "buy" | "sell")}>
              <SelectTrigger>
                <SelectValue placeholder="Select side" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="price">Base Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="trailing">
        <TabsList className="mb-4">
          <TabsTrigger value="trailing">Trailing Stop</TabsTrigger>
          <TabsTrigger value="oco">OCO Order</TabsTrigger>
          <TabsTrigger value="bracket">Bracket Order</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trailing">
          <Card>
            <CardHeader>
              <CardTitle>Trailing Stop Order</CardTitle>
              <CardDescription>Create a trailing stop order that follows the price</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trail-value">Trail Value</Label>
                <Input
                  id="trail-value"
                  type="number"
                  step="0.01"
                  value={trailValue}
                  onChange={(e) => setTrailValue(Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="trail-type">Trail Type</Label>
                <Select 
                  value={trailType} 
                  onValueChange={(value: string) => setTrailType(value as "absolute" | "percent")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trail type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absolute">Absolute</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="activation-price">Activation Price</Label>
                <Input
                  id="activation-price"
                  type="number"
                  step="0.01"
                  value={activationPrice}
                  onChange={(e) => setActivationPrice(Number(e.target.value))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="ml-auto" 
                disabled={loading} 
                onClick={handleCreateTrailingStop}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Trailing Stop Order
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="oco">
          <Card>
            <CardHeader>
              <CardTitle>OCO Order (One-Cancels-Other)</CardTitle>
              <CardDescription>Create an OCO order with take profit and stop loss</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="take-profit">Take Profit</Label>
                <Input
                  id="take-profit"
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stop-loss">Stop Loss</Label>
                <Input
                  id="stop-loss"
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="ml-auto" 
                disabled={loading} 
                onClick={handleCreateOCO}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create OCO Order
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="bracket">
          <Card>
            <CardHeader>
              <CardTitle>Bracket Order</CardTitle>
              <CardDescription>Create a bracket order with entry, take profit, and stop loss</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry-price">Entry Price</Label>
                <Input
                  id="entry-price"
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="take-profit-bracket">Take Profit</Label>
                <Input
                  id="take-profit-bracket"
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stop-loss-bracket">Stop Loss</Label>
                <Input
                  id="stop-loss-bracket"
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="trailing-stop"
                  checked={trailingStop}
                  onChange={(e) => setTrailingStop(e.target.checked)}
                />
                <Label htmlFor="trailing-stop">Use Trailing Stop</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="ml-auto" 
                disabled={loading} 
                onClick={handleCreateBracket}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Bracket Order
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {result && (
        <>
          <Separator className="my-6" />
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded overflow-auto max-h-80">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
