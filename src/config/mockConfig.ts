/**
 * Mock Configuration
 * Controls whether to use mock implementations for various services
 */

// Global switch to enable/disable mock services
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

// Base config interface to ensure type safety
interface BaseConfig {
  useMock: boolean;
  mockFailureRate: number;
  mockLatencyMs: number;
}

interface ExchangeConfig extends BaseConfig {
  useTestnet: boolean;
  mockCcxtFailureRate: number;
  mockCcxtLatencyMs: number;
}

interface BlockchainConfig extends BaseConfig {
  useTestnet: boolean;
}

// Individual service mocks
export const CONFIG = {
  // Data Services
  storage: {
    useMock: USE_MOCKS || process.env.NEXT_PUBLIC_USE_MOCK_STORAGE === 'true',
    mockFailureRate: Number(process.env.NEXT_PUBLIC_MOCK_STORAGE_FAILURE_RATE || '0.05'),
    mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_STORAGE_LATENCY_MS || '200')
  } as BaseConfig,
  vault: {
    useMock: USE_MOCKS || process.env.NEXT_PUBLIC_USE_MOCK_VAULT === 'true',
    mockFailureRate: Number(process.env.NEXT_PUBLIC_MOCK_VAULT_FAILURE_RATE || '0.05'),
    mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_VAULT_LATENCY_MS || '200')
  } as BaseConfig,
  
  // External Integrations
  exchange: {
    useMock: USE_MOCKS || process.env.NEXT_PUBLIC_USE_MOCK_EXCHANGES === 'true',
    useTestnet: process.env.NEXT_PUBLIC_USE_EXCHANGE_TESTNET === 'true',
    mockFailureRate: Number(process.env.NEXT_PUBLIC_MOCK_CCXT_FAILURE_RATE || '0.1'),
    mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_CCXT_LATENCY_MS || '350'),
    mockCcxtFailureRate: Number(process.env.NEXT_PUBLIC_MOCK_CCXT_FAILURE_RATE || '0.1'),
    mockCcxtLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_CCXT_LATENCY_MS || '350')
  } as ExchangeConfig,
  blockchain: {
    useMock: USE_MOCKS || process.env.NEXT_PUBLIC_USE_MOCK_BLOCKCHAIN === 'true',
    useTestnet: process.env.NEXT_PUBLIC_USE_BLOCKCHAIN_TESTNET === 'true',
    mockFailureRate: Number(process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN_FAILURE_RATE || '0.05'),
    mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN_LATENCY_MS || '600')
  } as BlockchainConfig,
  ai: {
    useMock: USE_MOCKS || process.env.NEXT_PUBLIC_USE_MOCK_AI === 'true',
    mockFailureRate: Number(process.env.NEXT_PUBLIC_MOCK_AI_FAILURE_RATE || '0.02'),
    mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_AI_LATENCY_MS || '2000')
  } as BaseConfig,
  
  // Database
  supabase: {
    useMock: USE_MOCKS || process.env.NEXT_PUBLIC_USE_MOCK_SUPABASE === 'true',
    mockFailureRate: Number(process.env.NEXT_PUBLIC_MOCK_SUPABASE_FAILURE_RATE || '0.01'),
    mockLatencyMs: Number(process.env.NEXT_PUBLIC_MOCK_SUPABASE_LATENCY_MS || '100')
  } as BaseConfig
};

// Utility to introduce artificial delay
export const simulateLatency = async (configSection: keyof typeof CONFIG): Promise<void> => {
  if (!CONFIG[configSection].useMock) return;
  
  const delay = CONFIG[configSection].mockLatencyMs;
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
};

// Utility to simulate occasional failures
export const simulateFailure = (configSection: keyof typeof CONFIG, errorMessage: string): void => {
  if (!CONFIG[configSection].useMock) return;
  
  const failureRate = CONFIG[configSection].mockFailureRate;
  if (Math.random() < failureRate) {
    throw new Error(`MOCK ERROR: ${errorMessage}`);
  }
}; 