/**
 * Trading Farm Services
 * 
 * Central export file for all service modules
 */

// Core API services
export { ApiGateway, ApiServiceType } from './api-gateway';
export { apiAdapter, ServiceType as BackendServiceType } from './api-adapter';

// Service-specific clients
export { ExchangeClient } from './clients/exchange-client';
export { ElizaOSClient } from './clients/elizaos-client';
export { VaultBankingClient } from './clients/vault-banking-client';
export { SimulationClient } from './clients/simulation-client';

// Supporting services
export { MonitoringService } from './monitoring-service';
export { getNotificationService } from './notification-service';
export { getFallbackService } from './fallback-service';

// Custom hooks for React components
export { default as useExchange } from './hooks/use-exchange';
export { default as useElizaOS } from './hooks/use-elizaos';
export { default as useVaultBanking } from './hooks/use-vault-banking';
export { default as useSimulation } from './hooks/use-simulation';
export { default as useNotifications } from './hooks/use-notifications';
