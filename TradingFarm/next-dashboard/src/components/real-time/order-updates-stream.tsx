'use client';

import * as React from 'react';
import { useSocket } from '@/providers/socket-provider';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface OrderUpdate {
  id: string;
  symbol: string;
  type: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'pending' | 'filled' | 'partial' | 'canceled' | 'rejected';
  timestamp: string;
  exchange: string;
}

interface OrderUpdatesStreamProps {
  limit?: number;
  cardStyle?: boolean;
}

export default function OrderUpdatesStream({ 
  limit = 10,
  cardStyle = false
}: OrderUpdatesStreamProps) {
  const { isConnected, messages } = useSocket();
  const [orderUpdates, setOrderUpdates] = React.useState<OrderUpdate[]>([]);
  
  // Process socket messages
  React.useEffect(() => {
    if (!messages || messages.length === 0) return;
    
    // Filter for ORDER_UPDATE messages
    const orderMessages = messages
      .filter(msg => msg.type === 'ORDER_UPDATE')
      .slice(-limit)
      .map(msg => ({
        id: msg.id || `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        symbol: msg.symbol || 'BTC/USDT',
        type: msg.order_type || 'limit',
        side: msg.side || 'buy',
        quantity: msg.quantity || 0.01,
        price: msg.price || 50000,
        status: msg.status || 'pending',
        timestamp: msg.timestamp || new Date().toISOString(),
        exchange: msg.exchange || 'Binance'
      }));
    
    // Use sample data if we don't have enough real messages
    if (orderMessages.length === 0) {
      const sampleOrders: OrderUpdate[] = [
        {
          id: 'sample-1',
          symbol: 'BTC/USDT',
          type: 'limit',
          side: 'buy',
          quantity: 0.1,
          price: 50123.45,
          status: 'filled',
          timestamp: new Date().toISOString(),
          exchange: 'Binance'
        },
        {
          id: 'sample-2',
          symbol: 'ETH/USDT',
          type: 'market',
          side: 'sell',
          quantity: 1.5,
          price: 2987.65,
          status: 'filled',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          exchange: 'Coinbase'
        },
        {
          id: 'sample-3',
          symbol: 'SOL/USDT',
          type: 'limit',
          side: 'buy',
          quantity: 10,
          price: 123.45,
          status: 'pending',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          exchange: 'Kraken'
        }
      ];
      setOrderUpdates(sampleOrders);
    } else {
      setOrderUpdates(prev => {
        // Merge existing and new orders, remove duplicates by ID
        const combined = [...prev, ...orderMessages];
        const unique = combined.filter((order, index, self) => 
          index === self.findIndex(o => o.id === order.id)
        );
        return unique.slice(-limit);
      });
    }
  }, [messages, limit]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled':
        return 'bg-green-500';
      case 'partial':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'canceled':
        return 'bg-gray-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const getSideColor = (side: 'buy' | 'sell') => {
    return side === 'buy' ? 'bg-green-500' : 'bg-red-500';
  };
  
  const content = (
    <div className="space-y-4">
      {!isConnected && (
        <div className="text-sm p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
          Not connected to real-time data. Showing sample data.
        </div>
      )}
      
      {orderUpdates.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground">
          No order updates available
        </div>
      ) : (
        <div className="space-y-2">
          {orderUpdates.map((order) => (
            <div 
              key={order.id}
              className="flex items-center p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{order.symbol}</span>
                  <Badge variant="outline">{order.exchange}</Badge>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`} />
                </div>
                
                <div className="flex text-sm text-muted-foreground mt-1">
                  <div className="pr-3 mr-3 border-r">
                    <span className={`px-2 py-0.5 rounded-full text-white ${getSideColor(order.side)}`}>
                      {order.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="pr-3 mr-3 border-r">
                    <span>{order.quantity} @ ${order.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span>{format(new Date(order.timestamp), 'h:mm:ss a')}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs uppercase font-semibold">
                {order.status}
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
          <CardTitle>Order Updates</CardTitle>
          <CardDescription>Real-time order status changes</CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }
  
  return content;
}
