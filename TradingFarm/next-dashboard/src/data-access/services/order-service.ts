import { BaseService } from './base-service';
import { OrderRepository, OrderQueryOptions } from '../repositories/order-repository';
import { Order } from '../models/order';

/**
 * Service for managing trading orders
 */
export class OrderService extends BaseService<Order> {
  private orderRepository: OrderRepository;

  constructor(orderRepository = new OrderRepository()) {
    super(orderRepository);
    this.orderRepository = orderRepository;
  }

  /**
   * Find orders by farm ID
   */
  async findByFarmId(farmId: number, options: Partial<OrderQueryOptions> = {}): Promise<Order[]> {
    return this.orderRepository.findAll({
      ...options,
      filters: {
        ...(options.filters || {}),
        farm_id: farmId
      }
    });
  }

  /**
   * Find orders by agent ID
   */
  async findByAgentId(agentId: number, options: Partial<OrderQueryOptions> = {}): Promise<Order[]> {
    return this.orderRepository.findAll({
      ...options,
      filters: {
        ...(options.filters || {}),
        agent_id: agentId
      }
    });
  }

  /**
   * Find orders by status
   */
  async findByStatus(
    status: string | string[], 
    options: Partial<OrderQueryOptions> = {}
  ): Promise<Order[]> {
    return this.orderRepository.findAll({
      ...options,
      filters: {
        ...(options.filters || {}),
        status: status
      }
    });
  }

  /**
   * Find filled orders
   */
  async findFilledOrders(options: Partial<OrderQueryOptions> = {}): Promise<Order[]> {
    return this.findByStatus('filled', options);
  }

  /**
   * Find open orders
   */
  async findOpenOrders(options: Partial<OrderQueryOptions> = {}): Promise<Order[]> {
    return this.findByStatus(['open', 'new'], options);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number): Promise<Order | null> {
    return this.orderRepository.update(orderId, {
      status: 'canceled',
      executed_at: new Date().toISOString()
    });
  }

  /**
   * Cancel all open orders for a farm
   */
  async cancelAllOrders(farmId: number): Promise<boolean> {
    const openOrders = await this.findOpenOrders({
      filters: { farm_id: farmId }
    });

    // Cancel each order sequentially
    const results = await Promise.all(
      openOrders.map(order => this.cancelOrder(order.id))
    );

    // Check if all orders were cancelled successfully
    return results.every(result => result !== null);
  }

  /**
   * Get order statistics for a farm
   */
  async getOrderStatistics(farmId: number): Promise<{
    total: number;
    filled: number;
    canceled: number;
    open: number;
    new: number;
    rejected: number;
    expired: number;
  }> {
    // This would typically involve database queries
    // For now, returning mock data
    return {
      total: 0,
      filled: 0,
      canceled: 0,
      open: 0,
      new: 0,
      rejected: 0,
      expired: 0
    };
  }
} 