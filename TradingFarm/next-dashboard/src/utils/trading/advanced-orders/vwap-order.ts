import { OrderParams, OrderResult } from '../../../types/orders';
import { IExchangeConnector } from '../exchanges/exchange-connector.interface';

/**
 * VWAP (Volume-Weighted Average Price) Order Class
 * Slices a large order into smaller child orders based on volume profile.
 */
export interface VwapOrderParams {
  symbol: string;
  totalQuantity: number;
  volumeProfile: number[]; // Array of volume percentages per slice (should sum to 1)
  intervalMs: number;
  side: 'buy' | 'sell';
  price?: number; // Optional limit price
}

export class VwapOrder {
  private params: VwapOrderParams;
  private connector: IExchangeConnector;
  private results: OrderResult[] = [];

  constructor(params: VwapOrderParams, connector: IExchangeConnector) {
    this.params = params;
    this.connector = connector;
  }

  /**
   * Executes the VWAP order by placing child orders according to the volume profile.
   * Resolves with an array of OrderResults.
   */
  async execute(): Promise<OrderResult[]> {
    const { totalQuantity, volumeProfile, intervalMs, symbol, side, price } = this.params;
    for (let i = 0; i < volumeProfile.length; i++) {
      const sliceQty = totalQuantity * volumeProfile[i];
      const orderParams: OrderParams = {
        symbol,
        quantity: sliceQty,
        side,
        type: price ? 'limit' : 'market',
        price,
      };
      const result = await this.connector.placeOrder(orderParams);
      this.results.push(result);
      if (i < volumeProfile.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    return this.results;
  }
}
