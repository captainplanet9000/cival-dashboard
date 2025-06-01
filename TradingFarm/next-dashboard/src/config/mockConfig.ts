/**
 * Mock System Configuration
 * Controls mock behavior, simulation options, and performance characteristics
 */

// Helper to parse boolean environment variables with fallbacks
const parseBoolEnv = (name: string, defaultValue: boolean = false): boolean => {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper to parse number environment variables with fallbacks
const parseNumEnv = (name: string, defaultValue: number): number => {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Master switch for all mocks
const USE_MOCKS = false; // DISABLED: Use real services

// Configuration object controlling all mock behavior
export const CONFIG = {
  // Global mock settings
  global: {
    useMocks: USE_MOCKS,
    isDevMode: process.env.NODE_ENV === 'development',
    mockDataRefreshInterval: parseNumEnv('NEXT_PUBLIC_MOCK_REFRESH_INTERVAL_MS', 60000), // 1 minute
  },
  
  // Supabase client mock settings
  supabase: {
    useMock: false,
    latencyMs: parseNumEnv('NEXT_PUBLIC_MOCK_SUPABASE_LATENCY_MS', 50),
    failureRate: parseNumEnv('NEXT_PUBLIC_MOCK_SUPABASE_FAILURE_RATE', 0.01),
    consistentFailures: parseBoolEnv('NEXT_PUBLIC_MOCK_SUPABASE_CONSISTENT_FAILURES', false),
  },
  
  // Storage service mock settings
  storage: {
    useMock: false,
    latencyMs: parseNumEnv('NEXT_PUBLIC_MOCK_STORAGE_LATENCY_MS', 100),
    failureRate: parseNumEnv('NEXT_PUBLIC_MOCK_STORAGE_FAILURE_RATE', 0.01),
  },
  
  // Vault service mock settings
  vault: {
    useMock: false,
    latencyMs: parseNumEnv('NEXT_PUBLIC_MOCK_VAULT_LATENCY_MS', 150),
    failureRate: parseNumEnv('NEXT_PUBLIC_MOCK_VAULT_FAILURE_RATE', 0.01),
  },
  
  // Exchange service mock settings
  exchange: {
    useMock: false,
    useTestnet: parseBoolEnv('NEXT_PUBLIC_USE_EXCHANGE_TESTNET', true),
    latencyMs: parseNumEnv('NEXT_PUBLIC_MOCK_EXCHANGE_LATENCY_MS', 200),
    failureRate: parseNumEnv('NEXT_PUBLIC_MOCK_EXCHANGE_FAILURE_RATE', 0.02),
    volatilityFactor: parseNumEnv('NEXT_PUBLIC_MOCK_EXCHANGE_VOLATILITY', 1.0),
  },
  
  // Blockchain service mock settings
  blockchain: {
    useMock: false,
    useTestnet: parseBoolEnv('NEXT_PUBLIC_USE_BLOCKCHAIN_TESTNET', true),
    latencyMs: parseNumEnv('NEXT_PUBLIC_MOCK_BLOCKCHAIN_LATENCY_MS', 500),
    failureRate: parseNumEnv('NEXT_PUBLIC_MOCK_BLOCKCHAIN_FAILURE_RATE', 0.05),
  },
  
  // AI service mock settings
  ai: {
    useMock: false,
    latencyMs: parseNumEnv('NEXT_PUBLIC_MOCK_AI_LATENCY_MS', 1000),
    failureRate: parseNumEnv('NEXT_PUBLIC_MOCK_AI_FAILURE_RATE', 0.01),
  }
};

/**
 * Helper to simulate network latency
 * @param config The configuration section controlling latency
 * @returns A promise that resolves after the configured delay
 */
export const simulateLatency = async (config: { latencyMs: number }): Promise<void> => {
  if (config.latencyMs > 0) {
    await new Promise(resolve => setTimeout(resolve, config.latencyMs));
  }
};

/**
 * Decides whether an operation should fail based on the configured failure rate
 * @param config The configuration section controlling failure rate
 * @returns True if the operation should fail, false otherwise
 */
export const shouldSimulateFailure = (
  config: { failureRate: number, consistentFailures?: boolean }
): boolean => {
  if (config.failureRate <= 0) return false;
  
  // For consistent failures, we use a deterministic approach based on a timestamp
  // This makes failures occur in bursts, which is more realistic
  if (config.consistentFailures) {
    const timestamp = Math.floor(Date.now() / 10000); // Changes every 10 seconds
    const hashCode = String(timestamp).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return (Math.abs(hashCode) % 100) / 100 < config.failureRate;
  }
  
  // Otherwise, use random failures
  return Math.random() < config.failureRate;
};

// Export default configuration
export default CONFIG;
