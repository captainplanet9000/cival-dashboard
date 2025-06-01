// Exchange connector interface for Trading Farm advanced order execution
import { OrderParams, OrderResult } from '../../../types/orders';

export interface IExchangeConnector {
  placeOrder(params: OrderParams): Promise<OrderResult>;
  // Optionally add more methods as needed
}
