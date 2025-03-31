'use client';

import * as React from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { Bell, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';

interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  threshold: number;
  type: 'above' | 'below' | 'volatility';
  timestamp: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  exchange?: string;
}

interface PriceAlertSystemProps {
  limit?: number;
  cardStyle?: boolean;
}

export default function PriceAlertSystem({ 
  limit = 5, 
  cardStyle = false 
}: PriceAlertSystemProps) {
  const { isConnected, messages } = useSocket();
  const [alerts, setAlerts] = React.useState<PriceAlert[]>([]);
  
  // Process socket messages
  React.useEffect(() => {
    if (!messages || messages.length === 0) {
      // Sample data for initial display
      const sampleAlerts: PriceAlert[] = [
        {
          id: "alert-1",
          symbol: "BTC/USDT",
          price: 51240.75,
          threshold: 51000,
          type: "above",
          timestamp: new Date().toISOString(),
          message: "Bitcoin crossed above $51,000",
          priority: "medium",
          exchange: "Aggregate"
        },
        {
          id: "alert-2",
          symbol: "ETH/USDT",
          price: 2950.25,
          threshold: 3000,
          type: "below",
          timestamp: new Date(Date.now() - 120000).toISOString(),
          message: "Ethereum dropped below $3,000",
          priority: "high",
          exchange: "Binance"
        },
        {
          id: "alert-3",
          symbol: "SOL/USDT",
          price: 145.75,
          threshold: 10,
          type: "volatility",
          timestamp: new Date(Date.now() - 350000).toISOString(),
          message: "Solana 15-min volatility exceeds 10%",
          priority: "medium",
          exchange: "Kraken"
        }
      ];
      setAlerts(sampleAlerts.slice(0, limit));
      return;
    }
    
    // Filter for PRICE_ALERT messages
    const priceAlertMessages = messages
      .filter(msg => msg.type === 'PRICE_ALERT')
      .slice(-limit)
      .map(msg => ({
        id: msg.id || `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        symbol: msg.symbol || 'BTC/USDT',
        price: msg.price || 50000,
        threshold: msg.threshold || 50000,
        type: msg.alert_type || 'above',
        timestamp: msg.timestamp || new Date().toISOString(),
        message: msg.message || `${msg.symbol || 'BTC/USDT'} price alert`,
        priority: msg.priority || 'medium',
        exchange: msg.exchange || 'Aggregate'
      }));
    
    if (priceAlertMessages.length > 0) {
      setAlerts(prev => {
        // Merge existing and new alerts, remove duplicates by ID
        const combined = [...prev, ...priceAlertMessages];
        const unique = combined.filter((alert, index, self) => 
          index === self.findIndex(a => a.id === alert.id)
        );
        return unique.slice(-limit);
      });
    }
  }, [messages, limit]);
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'above':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'below':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'volatility':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const content = (
    <div className="space-y-3">
      {!isConnected && (
        <div className="text-sm p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
          Not connected to real-time data. Showing sample alerts.
        </div>
      )}
      
      {alerts.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground">
          No price alerts available
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className="flex items-center p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div className="mr-3">
                {getAlertIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{alert.symbol}</span>
                  <span className={`text-xs font-semibold ${getPriorityColor(alert.priority)}`}>
                    {alert.priority.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground truncate">
                  {alert.message}
                </p>
                
                <div className="flex text-xs text-muted-foreground mt-1">
                  <span>{format(new Date(alert.timestamp), 'h:mm:ss a')}</span>
                  {alert.exchange && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{alert.exchange}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="font-mono text-sm">
                ${alert.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  if (cardStyle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Alerts</CardTitle>
          <CardDescription>Real-time market price notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }
  
  return content;
}
