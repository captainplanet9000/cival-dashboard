/**
 * Data access service exports
 */

// Base service
export * from './base-service';

// Entity services
export * from './farm-service';
export * from './agent-service';
export * from './order-service';
export * from './trade-service';
export * from './dashboard-service';

// Export API configuration
export * from './api-config';

// Export service instances
import { DashboardService } from './dashboard-service';
import { FarmService } from './farm-service';
import { AgentService } from './agent-service';
import { OrderService } from './order-service';
import { TradeService } from './trade-service';
import { RealtimeService } from './realtime-service';
import { ElizaCommandService } from './eliza-command-service';

// Create service instances
export const dashboardService = new DashboardService();
export const farmService = new FarmService();
export const agentService = new AgentService();
export const orderService = new OrderService();
export const tradeService = new TradeService();
export const realtimeService = new RealtimeService();
export const elizaCommandService = new ElizaCommandService();

// Export service classes
export { DashboardService } from './dashboard-service';
export { FarmService } from './farm-service';
export { AgentService } from './agent-service';
export { OrderService } from './order-service';
export { TradeService } from './trade-service';
export { RealtimeService } from './realtime-service';
export { ElizaCommandService } from './eliza-command-service'; 