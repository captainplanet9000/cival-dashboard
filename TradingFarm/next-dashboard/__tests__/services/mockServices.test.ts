import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  storageService,
  vaultService,
  exchangeService,
  aiService,
  resetAllMockData 
} from '@/services/serviceFactory';
import { CONFIG } from '@/config/mockConfig';

// Mock the config to ensure we're using mock services
vi.mock('@/config/mockConfig', () => {
  return {
    CONFIG: {
      global: { useMocks: true },
      storage: { useMock: true, latencyMs: 0, failureRate: 0 },
      vault: { useMock: true, latencyMs: 0, failureRate: 0 },
      exchange: { useMock: true, latencyMs: 0, failureRate: 0 },
      ai: { useMock: true, latencyMs: 0, failureRate: 0 },
      supabase: { useMock: true, latencyMs: 0, failureRate: 0 }
    }
  };
});

describe('Mock Service Tests', () => {
  beforeEach(() => {
    // Reset all mock data before each test
    resetAllMockData();
  });

  describe('Storage Service', () => {
    it('should return agent storages by agent ID', async () => {
      const agentId = 'agent-1'; // Use a known agent ID from mock data
      const storages = await storageService.getAgentStoragesByAgentId(agentId);
      
      expect(Array.isArray(storages)).toBe(true);
      if (storages.length > 0) {
        expect(storages[0]).toHaveProperty('agent_id', agentId);
        expect(storages[0]).toHaveProperty('name');
        expect(storages[0]).toHaveProperty('capacity');
      }
    });

    it('should return farm storages by farm ID', async () => {
      const farmId = 'farm-1'; // Use a known farm ID from mock data
      const storages = await storageService.getFarmStoragesByFarmId(farmId);
      
      expect(Array.isArray(storages)).toBe(true);
      if (storages.length > 0) {
        expect(storages[0]).toHaveProperty('farm_id', farmId);
        expect(storages[0]).toHaveProperty('name');
        expect(storages[0]).toHaveProperty('capacity');
      }
    });

    it('should return complete storage data', async () => {
      const storageId = 'storage-1'; // Use a known storage ID from mock data
      const storageType = 'agent_storage';
      const data = await storageService.getCompleteStorageData(storageId, storageType);
      
      expect(data).toHaveProperty('storage');
      expect(data).toHaveProperty('allocations');
      expect(data).toHaveProperty('transactions');
      expect(data).toHaveProperty('auditLogs');
    });
  });

  describe('Vault Service', () => {
    it('should return vaults by farm ID', async () => {
      const farmId = 'farm-1'; // Use a known farm ID from mock data
      const vaults = await vaultService.getVaultsByFarmId(farmId);
      
      expect(Array.isArray(vaults)).toBe(true);
      if (vaults.length > 0) {
        expect(vaults[0]).toHaveProperty('farm_id', farmId);
        expect(vaults[0]).toHaveProperty('name');
      }
    });

    it('should return accounts by vault ID', async () => {
      const vaultId = 'vault-1'; // Use a known vault ID from mock data
      const accounts = await vaultService.getAccountsByVaultId(vaultId);
      
      expect(Array.isArray(accounts)).toBe(true);
      if (accounts.length > 0) {
        expect(accounts[0]).toHaveProperty('vault_id', vaultId);
        expect(accounts[0]).toHaveProperty('name');
        expect(accounts[0]).toHaveProperty('balance');
      }
    });

    it('should return complete vault data', async () => {
      const vaultId = 'vault-1'; // Use a known vault ID from mock data
      const data = await vaultService.getCompleteVaultData(vaultId);
      
      expect(data).toHaveProperty('id', vaultId);
      expect(data).toHaveProperty('accounts');
      expect(data).toHaveProperty('recentTransactions');
      expect(Array.isArray(data.accounts)).toBe(true);
      expect(Array.isArray(data.recentTransactions)).toBe(true);
    });
  });

  describe('Exchange Service', () => {
    it('should return exchange connections by farm ID', async () => {
      const farmId = 'farm-1'; // Use a known farm ID from mock data
      const connections = await exchangeService.getExchangeConnectionsByFarmId(farmId);
      
      expect(Array.isArray(connections)).toBe(true);
      if (connections.length > 0) {
        expect(connections[0]).toHaveProperty('farm_id', farmId);
        expect(connections[0]).toHaveProperty('exchange_name');
      }
    });

    it('should return all markets', async () => {
      const markets = await exchangeService.getAllMarkets();
      
      expect(Array.isArray(markets)).toBe(true);
      if (markets.length > 0) {
        expect(markets[0]).toHaveProperty('id');
        expect(markets[0]).toHaveProperty('name');
        expect(markets[0]).toHaveProperty('last_price');
      }
    });

    it('should return market data by market ID', async () => {
      const marketId = 'BTC-USD'; // Use a known market ID from mock data
      const marketData = await exchangeService.getMarketDataByMarketId(marketId);
      
      expect(marketData).toHaveProperty('id', marketId);
      expect(marketData).toHaveProperty('name');
      expect(marketData).toHaveProperty('last_price');
      expect(marketData).toHaveProperty('volume_24h');
    });
  });

  describe('AI Service', () => {
    it('should analyze market sentiment', async () => {
      const marketId = 'BTC-USD'; // Use a known market ID
      const sentiment = await aiService.analyzeMarketSentiment(marketId);
      
      expect(sentiment).toHaveProperty('market', marketId);
      expect(sentiment).toHaveProperty('sentiment');
      expect(['bullish', 'bearish', 'neutral']).toContain(sentiment.sentiment);
      expect(sentiment).toHaveProperty('score');
      expect(sentiment).toHaveProperty('analysis');
    });

    it('should predict price movement', async () => {
      const marketId = 'BTC-USD'; // Use a known market ID
      const timeframe = '24h';
      const prediction = await aiService.predictPriceMovement(marketId, timeframe);
      
      expect(prediction).toHaveProperty('market', marketId);
      expect(prediction).toHaveProperty('currentPrice');
      expect(prediction).toHaveProperty('predictedPrice');
      expect(prediction).toHaveProperty('timeframe', timeframe);
      expect(prediction).toHaveProperty('confidence');
    });
  });
});
