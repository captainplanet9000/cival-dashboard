import { BybitConnector } from './connectors/bybit-connector';
import { CoinbaseConnector } from './connectors/coinbase-connector';
import { HyperliquidConnector } from './connectors/hyperliquid-connector';
import { OKXConnector } from './connectors/okx-connector';
import { ExchangeType, OrderType, OrderSide, TimeInForce } from '../../types/exchange-types';

export class ExchangeConnector {
  private connectors: Map<string, any> = new Map();
  
  constructor() {
    // Initialize connectors with API keys stored in environment variables
    this.connectors.set(
      ExchangeType.BYBIT, 
      new BybitConnector(
        process.env.BYBIT_API_KEY!, 
        process.env.BYBIT_API_SECRET!
      )
    );
    
    this.connectors.set(
      ExchangeType.COINBASE, 
      new CoinbaseConnector(
        process.env.COINBASE_API_KEY!,
        process.env.COINBASE_PRIVATE_KEY!
      )
    );
    
    this.connectors.set(
      ExchangeType.HYPERLIQUID, 
      new HyperliquidConnector(
        process.env.HYPERLIQUID_ADDRESS!,
        process.env.HYPERLIQUID_PRIVATE_KEY!
      )
    );
    
    // Add other exchange connectors as needed
  }
  
  /**
   * Gets the best available price across all exchanges
   */
  async getBestPrice(symbol: string, side: OrderSide): Promise<{price: number, exchange: ExchangeType}> {
    const prices = await Promise.all(
      Array.from(this.connectors.entries()).map(async ([exchange, connector]) => {
        try {
          const orderbook = await connector.getOrderBook(symbol);
          const price = side === OrderSide.BUY ? 
            orderbook.asks[0].price : 
            orderbook.bids[0].price;
          return { price, exchange: exchange as ExchangeType };
        } catch (error) {
          console.error(`Error getting price from ${exchange}:`, error);
          return { price: side === OrderSide.BUY ? Infinity : 0, exchange: exchange as ExchangeType };
        }
      })
    );
    
    // Find best price based on order side
    return prices.reduce((best, current) => {
      if (side === OrderSide.BUY) {
        return current.price < best.price ? current : best;
      } else {
        return current.price > best.price ? current : best;
      }
    });
  }
  
  /**
   * Places an order on the exchange with the best price
   */
  async smartOrderRouting(
    symbol: string, 
    side: OrderSide, 
    quantity: number, 
    orderType: OrderType = OrderType.MARKET,
    price?: number
  ) {
    const { exchange } = await this.getBestPrice(symbol, side);
    const connector = this.connectors.get(exchange);
    
    return connector.placeOrder({
      symbol,
      side,
      quantity,
      type: orderType,
      price,
      timeInForce: TimeInForce.GTC
    });
  }
  
  /**
   * Places an order on a specific exchange
   */
  async placeOrder(
    exchange: ExchangeType,
    symbol: string, 
    side: OrderSide, 
    quantity: number, 
    orderType: OrderType = OrderType.MARKET,
    price?: number
  ) {
    const connector = this.connectors.get(exchange);
    if (!connector) {
      throw new Error(`Exchange ${exchange} not supported`);
    }
    
    return connector.placeOrder({
      symbol,
      side,
      quantity,
      type: orderType,
      price,
      timeInForce: TimeInForce.GTC
    });
  }
  
  /**
   * Gets account balances across all exchanges
   */
  async getAllBalances() {
    const balances = {};
    
    for (const [exchange, connector] of this.connectors.entries()) {
      try {
        balances[exchange] = await connector.getBalances();
      } catch (error) {
        console.error(`Error getting balances from ${exchange}:`, error);
        balances[exchange] = { error: error.message };
      }
    }
    
    return balances;
  }
} 