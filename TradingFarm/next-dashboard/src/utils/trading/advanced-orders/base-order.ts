/**
 * Base interface for advanced order types
 */
import { IExchangeConnector } from '../exchanges/exchange-connector.interface';
import { OrderSide } from '../order-management-service';

export interface BaseOrderParams {
  symbol: string;
  totalQuantity: number;
  side: OrderSide;
  price?: number;
}

export interface OrderResult {
  orderId: string;
  status: 'success' | 'error';
  message?: string;
  filledQuantity?: number;
  averagePrice?: number;
  error?: Error;
}

/**
 * Base class for advanced order types
 */
export abstract class BaseOrder {
  protected symbol: string;
  protected totalQuantity: number;
  protected side: OrderSide;
  protected price?: number;
  protected connector: IExchangeConnector;

  constructor(params: BaseOrderParams, connector: IExchangeConnector) {
    this.symbol = params.symbol;
    this.totalQuantity = params.totalQuantity;
    this.side = params.side;
    this.price = params.price;
    this.connector = connector;
  }

  /**
   * Execute the order strategy
   */
  abstract execute(): Promise<OrderResult[]>;
}
