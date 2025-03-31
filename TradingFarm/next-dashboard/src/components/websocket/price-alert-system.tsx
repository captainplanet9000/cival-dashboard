"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "@/providers/socket-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { BellRing, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: "above" | "below";
  createdAt: Date;
  triggeredAt?: Date;
  active: boolean;
}

interface PriceAlertSystemProps {
  farmId: string;
}

export default function PriceAlertSystem({ farmId }: PriceAlertSystemProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [newAlertSymbol, setNewAlertSymbol] = useState("");
  const [newAlertPrice, setNewAlertPrice] = useState("");
  const [newAlertCondition, setNewAlertCondition] = useState<"above" | "below">("above");
  const { isConnected, send, messages } = useSocket();
  const { toast } = useToast();

  // Example symbols
  const availableSymbols = ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD"];

  useEffect(() => {
    // Listen for price alert triggers
    const alertMessages = messages.filter((msg) => 
      msg.type === "PRICE_ALERT" && 
      msg.farm_id === farmId
    );
    
    if (alertMessages.length > 0) {
      // Process any new alert messages
      const latestMessage = alertMessages[alertMessages.length - 1];
      
      // Update the triggered alert in our state
      if (latestMessage.alert_id) {
        setAlerts(prev => 
          prev.map(alert => 
            alert.id === latestMessage.alert_id 
              ? { ...alert, triggeredAt: new Date(), active: false } 
              : alert
          )
        );
        
        // Show a toast notification
        toast({
          title: `${latestMessage.symbol} Alert Triggered`,
          description: `Price ${latestMessage.condition} ${latestMessage.price}`,
          variant: "default",
        });
      }
    }
  }, [messages, farmId, toast]);

  // Create a new price alert
  const createAlert = useCallback(() => {
    if (!newAlertSymbol || !newAlertPrice) {
      toast({
        title: "Invalid Alert",
        description: "Symbol and price are required",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(newAlertPrice);
    if (isNaN(price)) {
      toast({
        description: "Price must be a valid number",
        variant: "destructive",
      });
      return;
    }

    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      symbol: newAlertSymbol,
      price,
      condition: newAlertCondition,
      createdAt: new Date(),
      active: true
    };

    setAlerts([...alerts, newAlert]);

    // Send to server to register the alert
    send("REGISTER_PRICE_ALERT", {
      farm_id: farmId,
      alert_id: newAlert.id,
      symbol: newAlert.symbol,
      price: newAlert.price,
      condition: newAlert.condition
    });

    // Reset form
    setNewAlertSymbol("");
    setNewAlertPrice("");
    setNewAlertCondition("above");

    toast({
      description: `Alert created for ${newAlert.symbol}`,
    });
  }, [alerts, newAlertSymbol, newAlertPrice, newAlertCondition, farmId, toast]);

  // Delete an alert
  const deleteAlert = useCallback((id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
    
    // Notify server to remove the alert
    send("UNREGISTER_PRICE_ALERT", {
      farm_id: farmId,
      alert_id: id
    });

    toast({
      description: "Alert removed",
    });
  }, [alerts, farmId, toast]);

  // Toggle an alert's active status
  const toggleAlert = useCallback((id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id 
        ? { ...alert, active: !alert.active } 
        : alert
    ));

    const alert = alerts.find(a => a.id === id);
    if (alert) {
      send(
        alert.active ? "UNREGISTER_PRICE_ALERT" : "REGISTER_PRICE_ALERT", 
        {
          farm_id: farmId,
          alert_id: id,
          symbol: alert.symbol,
          price: alert.price,
          condition: alert.condition
        }
      );
    }
  }, [alerts, farmId, send]);

  return (
    <div className="space-y-4">
      {/* Alert List */}
      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div 
              key={alert.id} 
              className={`flex items-center justify-between rounded-md border p-3 ${
                alert.triggeredAt ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <BellRing className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{alert.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    {alert.condition === "above" ? "Above" : "Below"} {alert.price.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {alert.triggeredAt ? (
                  <Badge variant="outline" className="text-xs">
                    Triggered {alert.triggeredAt.toLocaleString()}
                  </Badge>
                ) : (
                  <>
                    <Switch 
                      checked={alert.active}
                      onCheckedChange={() => toggleAlert(alert.id)}
                    />
                    <Button
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center rounded-md border-2 border-dashed">
          <p className="text-sm text-muted-foreground">No price alerts set</p>
        </div>
      )}

      {/* Create New Alert Form */}
      <div className="rounded-md border p-4">
        <h4 className="mb-3 text-sm font-medium">Create New Alert</h4>
        <div className="space-y-3">
          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <select
              id="symbol"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newAlertSymbol}
              onChange={(e) => setNewAlertSymbol(e.target.value)}
            >
              <option value="">Select Symbol</option>
              {availableSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
          
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="condition">Condition</Label>
              <div className="flex rounded-md overflow-hidden border">
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    newAlertCondition === "above" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => setNewAlertCondition("above")}
                >
                  <ArrowUp className="mr-1 h-4 w-4 inline" />
                  Above
                </button>
                <button
                  type="button"
                  className={`flex-1 px-3 py-2 text-sm font-medium ${
                    newAlertCondition === "below" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => setNewAlertCondition("below")}
                >
                  <ArrowDown className="mr-1 h-4 w-4 inline" />
                  Below
                </button>
              </div>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                placeholder="0.00"
                value={newAlertPrice}
                onChange={(e) => setNewAlertPrice(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={createAlert}
            disabled={!isConnected}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Alert
          </Button>
        </div>
      </div>
    </div>
  );
}
