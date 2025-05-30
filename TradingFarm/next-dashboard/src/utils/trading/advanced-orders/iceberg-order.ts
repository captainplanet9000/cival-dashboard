import { OrderParams, OrderResult } from '../../../types/orders';
import { IExchangeConnector } from '../exchanges/exchange-connector.interface';

/**
 * Iceberg Order Class
 * Slices a large order into visible and hidden child orders to minimize market impact.
 */
export interface IcebergOrderParams {
  symbol: string;
  totalQuantity: number;
  visibleQuantity: number;
  intervalMs: number;
  side: 'buy' | 'sell';
  price?: number; // Optional limit price
}

export class IcebergOrder {
  private params: IcebergOrderParams;
  private connector: IExchangeConnector;
  private executedQuantity: number = 0;
  private results: OrderResult[] = [];

  constructor(params: IcebergOrderParams, connector: IExchangeConnector) {
    this.params = params;
    this.connector = connector;
  }

  /**
   * Executes the Iceberg order by repeatedly placing visible child orders until the total quantity is filled.
   * Resolves with an array of OrderResults.
   */
  async execute(): Promise<OrderResult[]> {
    const { totalQuantity, visibleQuantity, intervalMs, symbol, side, price } = this.params;
    while (this.executedQuantity < totalQuantity) {
      const sliceQty = Math.min(visibleQuantity, totalQuantity - this.executedQuantity);
      const orderParams: OrderParams = {
        symbol,
        quantity: sliceQty,
        side,
        type: price ? 'limit' : 'market',
        price,
      };
      const result = await this.connector.placeOrder(orderParams);
      this.results.push(result);
      this.executedQuantity += sliceQty;
      if (this.executedQuantity < totalQuantity) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    return this.results;
  }
}
