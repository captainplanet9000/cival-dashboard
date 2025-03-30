/**
 * Advanced Order Service
 * 
 * This service provides functionality for advanced order types including:
 * - Trailing stop orders
 * - One-Cancels-Other (OCO) orders
 * - Bracket orders
 * - TWAP/VWAP orders
 * - Iceberg orders
 */

import { createBrowserClient } from '@/utils/supabase/client';
import websocketService, { WebSocketTopic } from './websocket-service';

// Order types
export type OrderType = 
  | 'market' 
  | 'limit' 
  | 'stop' 
  | 'stop_limit' 
  | 'trailing_stop' 
  | 'oco' 
  | 'iceberg' 
  | 'twap' 
  | 'vwap' 
  | 'take_profit' 
  | 'bracket';

export type OrderSide = 'buy' | 'sell';

export type OrderStatus = 
  | 'new' 
  | 'open' 
  | 'filled' 
  | 'partial_fill' 
  | 'canceled' 
  | 'rejected' 
  | 'expired';

export type TrailType = 'amount' | 'percentage';

export type TriggerCondition = 'gt' | 'lt' | 'gte' | 'lte';

export type TriggerPriceSource = 'mark' | 'index' | 'last';

// Basic Order Interface
export interface OrderBase {
  farm_id: string;
  agent_id?: string;
  exchange: string;
  exchange_account_id?: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  time_in_force?: 'gtc' | 'ioc' | 'fok';
  metadata?: Record<string, any>;
}

// Market Order
export interface MarketOrder extends OrderBase {
  order_type: 'market';
}

// Limit Order
export interface LimitOrder extends OrderBase {
  order_type: 'limit';
  price: number;
}

// Stop Order
export interface StopOrder extends OrderBase {
  order_type: 'stop';
  stop_price: number;
  trigger_condition?: TriggerCondition;
  trigger_price_source?: TriggerPriceSource;
}

// Stop Limit Order
export interface StopLimitOrder extends OrderBase {
  order_type: 'stop_limit';
  price: number;
  stop_price: number;
  trigger_condition?: TriggerCondition;
  trigger_price_source?: TriggerPriceSource;
}

// Trailing Stop Order
export interface TrailingStopOrder extends OrderBase {
  order_type: 'trailing_stop';
  trail_value: number;
  trail_type: TrailType;
  activation_price?: number;
}

// OCO (One-Cancels-Other) Order
export interface OcoOrder extends OrderBase {
  order_type: 'oco';
  price: number; // Limit price
  stop_price: number; // Stop price
  trigger_condition?: TriggerCondition;
}

// Take Profit Order
export interface TakeProfitOrder extends OrderBase {
  order_type: 'take_profit';
  price: number;
  trigger_condition?: TriggerCondition;
}

// Bracket Order (Entry + Stop Loss + Take Profit)
export interface BracketOrder extends OrderBase {
  order_type: 'bracket';
  entry_type: 'market' | 'limit';
  entry_price?: number; // Required if entry_type is limit
  take_profit_price: number;
  stop_loss_price: number;
}

// Iceberg Order
export interface IcebergOrder extends OrderBase {
  order_type: 'iceberg';
  price: number;
  iceberg_qty: number; // Visible quantity
}

// TWAP Order (Time-Weighted Average Price)
export interface TwapOrder extends OrderBase {
  order_type: 'twap';
  price: number; // Limit price, optional for market TWAP
  start_time: string; // ISO date string
  end_time: string; // ISO date string
  num_slices: number;
}

// VWAP Order (Volume-Weighted Average Price)
export interface VwapOrder extends OrderBase {
  order_type: 'vwap';
  price?: number; // Limit price, optional for market VWAP
  start_time: string; // ISO date string
  end_time: string; // ISO date string
  volume_profile: 'historical' | 'custom';
  custom_volume_profile?: number[]; // If volume_profile is 'custom'
}

// Union of all order types
export type Order = 
  | MarketOrder 
  | LimitOrder 
  | StopOrder 
  | StopLimitOrder 
  | TrailingStopOrder 
  | OcoOrder 
  | TakeProfitOrder 
  | BracketOrder 
  | IcebergOrder 
  | TwapOrder 
  | VwapOrder;

/**
 * Create a trailing stop order
 */
export async function createTrailingStopOrder(order: TrailingStopOrder) {
  try {
    const response = await fetch('/api/orders/trailing-stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create trailing stop order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating trailing stop order:', error);
    throw error;
  }
}

/**
 * Create an OCO (One-Cancels-Other) order
 */
export async function createOcoOrder(order: OcoOrder) {
  try {
    const response = await fetch('/api/orders/oco', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create OCO order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating OCO order:', error);
    throw error;
  }
}

/**
 * Create a bracket order (Entry + Stop Loss + Take Profit)
 */
export async function createBracketOrder(order: BracketOrder) {
  try {
    const response = await fetch('/api/orders/bracket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create bracket order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating bracket order:', error);
    throw error;
  }
}

/**
 * Create an iceberg order
 */
export async function createIcebergOrder(order: IcebergOrder) {
  try {
    const response = await fetch('/api/orders/iceberg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create iceberg order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating iceberg order:', error);
    throw error;
  }
}

/**
 * Create a TWAP order (Time-Weighted Average Price)
 */
export async function createTwapOrder(order: TwapOrder) {
  try {
    const response = await fetch('/api/orders/twap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create TWAP order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating TWAP order:', error);
    throw error;
  }
}

/**
 * Create a VWAP order (Volume-Weighted Average Price)
 */
export async function createVwapOrder(order: VwapOrder) {
  try {
    const response = await fetch('/api/orders/vwap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create VWAP order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating VWAP order:', error);
    throw error;
  }
}

/**
 * Update a trailing stop order
 */
export async function updateTrailingStop(orderId: string, newTrailValue: number, newTrailType?: TrailType) {
  try {
    const response = await fetch(`/api/orders/trailing-stop/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trail_value: newTrailValue,
        trail_type: newTrailType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update trailing stop');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating trailing stop:', error);
    throw error;
  }
}

/**
 * Subscribe to order updates for specific advanced order types
 */
export function subscribeToAdvancedOrderUpdates(callback: (data: any) => void) {
  return websocketService.subscribe(WebSocketTopic.ORDER_UPDATES, (message) => {
    // Only process messages for advanced order types
    const advancedTypes = ['trailing_stop', 'oco', 'bracket', 'iceberg', 'twap', 'vwap', 'take_profit'];
    if (message.order && advancedTypes.includes(message.order.order_type)) {
      callback(message);
    }
  });
}

/**
 * Get order status updates with WebSocket
 */
export function getOrderStatusUpdates(orderId: string, callback: (data: any) => void) {
  // Set up a WebSocket subscription
  const unsubscribe = websocketService.subscribe(WebSocketTopic.ORDER_UPDATES, (message) => {
    if (message.order && message.order.id === orderId) {
      callback(message);
    }
  });

  return unsubscribe;
}

export default {
  createTrailingStopOrder,
  createOcoOrder,
  createBracketOrder,
  createIcebergOrder,
  createTwapOrder,
  createVwapOrder,
  updateTrailingStop,
  subscribeToAdvancedOrderUpdates,
  getOrderStatusUpdates
};
