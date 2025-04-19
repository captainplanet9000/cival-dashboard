'use client';

import * as React from 'react';
import { useSocket } from '@/providers/socket-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface Execution {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  timestamp: string;
  status: 'success' | 'pending' | 'failed' | 'partial';
  message: string;
  exchange: string;
}

interface ExecutionNotificationsProps {
  limit?: number;
  cardStyle?: boolean;
}

export default function ExecutionNotifications({ 
  limit = 5, 
  cardStyle = false 
}: ExecutionNotificationsProps) {
  const { isConnected, messages } = useSocket();
  const [executions, setExecutions] = React.useState<Execution[]>([]);
  
  // Process socket messages
  React.useEffect(() => {
    if (!messages || messages.length === 0) {
      // Sample data for initial display
      const sampleExecutions: Execution[] = [
        {
          id: "exec-1",
          symbol: "BTC/USDT",
          side: "buy",
          quantity: 0.05,
          price: 50750.25,
          value: 0.05 * 50750.25,
          timestamp: new Date().toISOString(),
          status: "success",
          message: "Market buy order executed successfully",
          exchange: "Binance"
        },
        {
          id: "exec-2",
          symbol: "ETH/USDT",
          side: "sell",
          quantity: 1.2,
          price: 2985.75,
          value: 1.2 * 2985.75,
          timestamp: new Date(Date.now() - 150000).toISOString(),
          status: "success",
          message: "Limit sell order filled completely",
          exchange: "Coinbase"
        },
        {
          id: "exec-3",
          symbol: "SOL/USDT",
          side: "buy",
          quantity: 5,
          price: 142.50,
          value: 5 * 142.50,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          status: "partial",
          message: "Limit buy order partially filled (60%)",
          exchange: "Kraken"
        }
      ];
      setExecutions(sampleExecutions.slice(0, limit));
      return;
    }
    
    // Filter and map EXECUTION_NOTIFICATION messages
    const executionMessages = messages
      .filter(msg => msg.event === 'EXECUTION_NOTIFICATION')
      .slice(-limit)
      .map(msg => {
        const d = (msg as any).data;
        return {
          id: d.id || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          symbol: d.symbol || 'BTC/USDT',
          side: d.side || 'buy',
          quantity: d.quantity || 0.01,
          price: d.price || 50000,
          value: d.value ?? (d.quantity || 0.01) * (d.price || 50000),
          timestamp: d.timestamp || msg.timestamp,
          status: d.status || 'success',
          message: d.message || 'Order executed',
          exchange: d.exchange || 'Binance'
        };
      });
    
    if (executionMessages.length > 0) {
      setExecutions(prev => {
        // Merge existing and new executions, remove duplicates by ID
        const combined = [...prev, ...executionMessages];
        const unique = combined.filter((exec, index, self) => 
          index === self.findIndex(e => e.id === exec.id)
        );
        return unique.slice(-limit);
      });
    }
  }, [messages, limit]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getSideColor = (side: 'buy' | 'sell') => {
    return side === 'buy' ? 'text-green-500' : 'text-red-500';
  };
  
  const content = (
    <div className="space-y-3">
      {!isConnected && (
        <div className="text-sm p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
          Not connected to real-time data. Showing sample executions.
        </div>
      )}
      
      {executions.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground">
          No executions available
        </div>
      ) : (
        <div className="space-y-2">
          {executions.map((execution) => (
            <div 
              key={execution.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div>
                {getStatusIcon(execution.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{execution.symbol}</span>
                  <span className={`font-medium ${getSideColor(execution.side)}`}>
                    {execution.side.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground truncate">
                  {execution.message}
                </p>
                
                <div className="flex text-xs text-muted-foreground mt-1">
                  <span>{format(new Date(execution.timestamp), 'h:mm:ss a')}</span>
                  <span className="mx-1">•</span>
                  <span>{execution.exchange}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium">
                  {execution.quantity} @ ${execution.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  ${execution.value.toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
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
          <CardTitle>Execution Notifications</CardTitle>
          <CardDescription>Real-time order execution updates</CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }
  
  return content;
}
