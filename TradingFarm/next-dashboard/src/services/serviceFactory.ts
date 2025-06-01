/**
 * Service Factory
 * 
 * Provides conditional loading of real or mock service implementations based on configuration.
 * This enables seamless switching between development with mock data and production with real services.
 */

import { CONFIG } from '@/config/mockConfig';
import mockDataService from '@/utils/supabase/mocks-index';

// Import real service implementations
// These would be the actual service implementations when not using mocks
// For demonstration, using placeholder classes that would be replaced with real implementations
class StorageService {
  constructor(private isServerSide: boolean = false) {}
  
  // Real storage service methods would go here
}

class VaultService {
  constructor(private isServerSide: boolean = false) {}
  
  // Real vault service methods would go here
}

class ExchangeService {
  constructor(private isServerSide: boolean = false) {}
  
  // Real exchange service methods would go here
}

class AIService {
  constructor(private isServerSide: boolean = false) {}
  
  // Real AI service methods would go here
}

// Mock service implementations
// Each service uses the mock data and simulates network conditions

class MockStorageService {
  constructor(private isServerSide: boolean = false) {}
  
  // Get agent storage by ID
  async getAgentStorageById(id: string) {
    await this.simulateNetwork();
    return mockDataService.getAgentStorageById(id);
  }
  
  // Get farm storage by ID
  async getFarmStorageById(id: string) {
    await this.simulateNetwork();
    return mockDataService.getFarmStorageById(id);
  }
  
  // Get agent storages by agent ID
  async getAgentStoragesByAgentId(agentId: string) {
    await this.simulateNetwork();
    return mockDataService.getAgentStoragesByAgentId(agentId);
  }
  
  // Get farm storages by farm ID
  async getFarmStoragesByFarmId(farmId: string) {
    await this.simulateNetwork();
    return mockDataService.getFarmStoragesByFarmId(farmId);
  }
  
  // Get complete storage data
  async getCompleteStorageData(storageId: string, storageType: string) {
    await this.simulateNetwork();
    return mockDataService.getCompleteStorageData(storageId, storageType);
  }
  
  // Get storage health status
  async getStorageHealthStatus(storageId: string, storageType: string) {
    await this.simulateNetwork();
    return mockDataService.getStorageHealthStatus(storageId, storageType);
  }
  
  // Helper method to simulate network conditions
  private async simulateNetwork() {
    // Simulate network latency
    if (CONFIG.storage.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.storage.latencyMs));
    }
    
    // Simulate network failures
    if (Math.random() < CONFIG.storage.failureRate) {
      throw new Error('Mock storage service network error');
    }
  }
}

class MockVaultService {
  constructor(private isServerSide: boolean = false) {}
  
  // Get vaults by farm ID
  async getVaultsByFarmId(farmId: string) {
    await this.simulateNetwork();
    return mockDataService.getVaultsByFarmId(farmId);
  }
  
  // Get accounts by vault ID
  async getAccountsByVaultId(vaultId: string) {
    await this.simulateNetwork();
    return mockDataService.getAccountsByVaultId(vaultId);
  }
  
  // Get transactions by account ID
  async getTransactionsByAccountId(accountId: string) {
    await this.simulateNetwork();
    return mockDataService.getTransactionsByAccountId(accountId);
  }
  
  // Get complete vault data
  async getCompleteVaultData(vaultId: string) {
    await this.simulateNetwork();
    return mockDataService.getCompleteVaultData(vaultId);
  }
  
  // Helper method to simulate network conditions
  private async simulateNetwork() {
    // Simulate network latency
    if (CONFIG.vault.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.vault.latencyMs));
    }
    
    // Simulate network failures
    if (Math.random() < CONFIG.vault.failureRate) {
      throw new Error('Mock vault service network error');
    }
  }
}

class MockExchangeService {
  constructor(private isServerSide: boolean = false) {}
  
  // Get exchange connections by farm ID
  async getExchangeConnectionsByFarmId(farmId: string) {
    await this.simulateNetwork();
    return mockDataService.getExchangeConnectionsByFarmId(farmId);
  }
  
  // Get exchange balances by connection ID
  async getExchangeBalancesByConnectionId(connectionId: string) {
    await this.simulateNetwork();
    return mockDataService.getExchangeBalancesByConnectionId(connectionId);
  }
  
  // Get all markets
  async getAllMarkets() {
    await this.simulateNetwork();
    return mockDataService.getAllMarkets();
  }
  
  // Get market data by market ID
  async getMarketDataByMarketId(marketId: string) {
    await this.simulateNetwork();
    return mockDataService.getMarketDataByMarketId(marketId);
  }
  
  // Get order book by market ID
  async getOrderBookByMarketId(marketId: string) {
    await this.simulateNetwork();
    return mockDataService.getOrderBookByMarketId(marketId);
  }
  
  // Get testnet connections
  async getTestnetConnections() {
    await this.simulateNetwork();
    return mockDataService.getTestnetConnections();
  }
  
  // Get exchange fee structure
  async getExchangeFeeStructure(exchange: string) {
    await this.simulateNetwork();
    return mockDataService.getExchangeFeeStructure(exchange);
  }
  
  // Get complete exchange data
  async getCompleteExchangeData(connectionId: string) {
    await this.simulateNetwork();
    return mockDataService.getCompleteExchangeData(connectionId);
  }
  
  // Helper method to simulate network conditions
  private async simulateNetwork() {
    // Simulate network latency
    if (CONFIG.exchange.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.exchange.latencyMs));
    }
    
    // Simulate network failures
    if (Math.random() < CONFIG.exchange.failureRate) {
      throw new Error('Mock exchange service network error');
    }
  }
}

class MockAIService {
  constructor(private isServerSide: boolean = false) {}
  
  // Analyze market sentiment
  async analyzeMarketSentiment(marketId: string) {
    await this.simulateNetwork();
    
    // Generate mock sentiment analysis
    const sentiments = ['bullish', 'bearish', 'neutral'];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const score = Math.random() * 100;
    
    return {
      market: marketId,
      sentiment,
      score,
      analysis: `The ${marketId} market is showing ${sentiment} signals with a confidence score of ${score.toFixed(2)}.`,
      sources: ['mock-source-1', 'mock-source-2'],
      timestamp: new Date().toISOString()
    };
  }
  
  // Predict price movement
  async predictPriceMovement(marketId: string, timeframe: string) {
    await this.simulateNetwork();
    
    // Get current market data
    const marketData = mockDataService.getMarketDataByMarketId(marketId);
    if (!marketData) throw new Error(`Market ${marketId} not found`);
    
    // Generate mock price prediction
    const currentPrice = marketData.last_price;
    const change = (Math.random() - 0.4) * 0.1; // Slight bullish bias
    const predictedPrice = currentPrice * (1 + change);
    
    return {
      market: marketId,
      currentPrice,
      predictedPrice,
      timeframe,
      confidence: Math.random() * 100,
      factors: ['market momentum', 'trading volume', 'technical indicators'],
      timestamp: new Date().toISOString()
    };
  }
  
  // Helper method to simulate network conditions
  private async simulateNetwork() {
    // Simulate network latency
    if (CONFIG.ai.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.ai.latencyMs));
    }
    
    // Simulate network failures
    if (Math.random() < CONFIG.ai.failureRate) {
      throw new Error('Mock AI service network error');
    }
  }
}

/**
 * Get the appropriate storage service based on configuration
 * @param isServerSide Whether this service is being used on the server side
 * @returns StorageService instance (real or mocked)
 */
export const getStorageService = (isServerSide = false) => {
  if (CONFIG.storage.useMock) {
    console.log('[ServiceFactory] Using Mock Storage Service');
    return new MockStorageService(isServerSide);
  }
  console.log('[ServiceFactory] Using Real Storage Service');
  return new StorageService(isServerSide);
};

/**
 * Get the appropriate vault service based on configuration
 * @param isServerSide Whether this service is being used on the server side
 * @returns VaultService instance (real or mocked)
 */
export const getVaultService = (isServerSide = false) => {
  if (CONFIG.vault.useMock) {
    console.log('[ServiceFactory] Using Mock Vault Service');
    return new MockVaultService(isServerSide);
  }
  console.log('[ServiceFactory] Using Real Vault Service');
  return new VaultService(isServerSide);
};

/**
 * Get the appropriate exchange service based on configuration
 * @param isServerSide Whether this service is being used on the server side
 * @returns ExchangeService instance (real or mocked)
 */
export const getExchangeService = (isServerSide = false) => {
  if (CONFIG.exchange.useMock) {
    console.log('[ServiceFactory] Using Mock Exchange Service');
    return new MockExchangeService(isServerSide);
  }
  console.log('[ServiceFactory] Using Real Exchange Service');
  return new ExchangeService(isServerSide);
};

/**
 * Get the appropriate AI service based on configuration
 * @param isServerSide Whether this service is being used on the server side
 * @returns AIService instance (real or mocked)
 */
export const getAIService = (isServerSide = false) => {
  if (CONFIG.ai.useMock) {
    console.log('[ServiceFactory] Using Mock AI Service');
    return new MockAIService(isServerSide);
  }
  console.log('[ServiceFactory] Using Real AI Service');
  return new AIService(isServerSide);
};

/**
 * Reset all mock data - useful for testing or when starting fresh
 * @returns True if reset was performed, false if mocks are not in use
 */
export const resetAllMockData = (): boolean => {
  if (CONFIG.global.useMocks) {
    try {
      // Reset all mock data collections
      // This could be extended to include other mock data sets as they're added
      
      console.log('[ServiceFactory] All mock data has been reset');
      return true;
    } catch (error) {
      console.error('[ServiceFactory] Failed to reset mock data:', error);
      return false;
    }
  }
  console.log('[ServiceFactory] Mock services are not in use, nothing to reset');
  return false;
};

// Export specific instances for singleton access patterns
export const storageService = getStorageService(typeof window === 'undefined');
export const vaultService = getVaultService(typeof window === 'undefined');
export const exchangeService = getExchangeService(typeof window === 'undefined');
export const aiService = getAIService(typeof window === 'undefined');
