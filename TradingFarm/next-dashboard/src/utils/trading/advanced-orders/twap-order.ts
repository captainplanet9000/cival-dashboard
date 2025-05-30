import { OrderParams, OrderResult } from '../../../types/orders';
import { IExchangeConnector } from '../exchanges/exchange-connector.interface';

/**
 * TWAP (Time-Weighted Average Price) Order Class
 * Slices a large order into smaller child orders executed at regular intervals.
 */
export interface TwapOrderParams {
  symbol: string;
  totalQuantity: number;
  sliceCount: number;
  intervalMs: number;
  side: 'buy' | 'sell';
  price?: number; // Optional limit price
}

export class TwapOrder {
  private params: TwapOrderParams;
  private connector: IExchangeConnector;
  private executedSlices: number = 0;
  private results: OrderResult[] = [];

  constructor(params: TwapOrderParams, connector: IExchangeConnector) {
    this.params = params;
    this.connector = connector;
  }

  /**
   * Executes the TWAP order by placing child orders at specified intervals.
   * Resolves with an array of OrderResults.
   */
  async execute(): Promise<OrderResult[]> {
    const { totalQuantity, sliceCount, intervalMs, symbol, side, price } = this.params;
    const sliceQty = totalQuantity / sliceCount;

    for (let i = 0; i < sliceCount; i++) {
      const orderParams: OrderParams = {
        symbol,
        quantity: sliceQty,
        side,
        type: price ? 'limit' : 'market',
        price,
      };
      // Place the order via connector
      const result = await this.connector.placeOrder(orderParams);
      this.results.push(result);
      this.executedSlices++;
      // Wait for the next interval unless this is the last slice
      if (i < sliceCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    return this.results;
  }
}
