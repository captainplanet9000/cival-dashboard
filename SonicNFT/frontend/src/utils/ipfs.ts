/**
 * IPFS gateway optimization utilities
 * These utilities help manage and optimize IPFS content retrieval
 */

// List of public IPFS gateways
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.fleek.co/ipfs/',
  'https://ipfs.infura.io/ipfs/'
];

// Cache for gateway performance
const gatewayPerformance: Record<string, {
  responseTime: number;
  successRate: number;
  lastTested: number;
}> = {};

/**
 * Convert an IPFS URL (ipfs://) to an HTTP URL using the optimal gateway
 */
export const optimizeIpfsUrl = (ipfsUrl: string): string => {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  
  const cid = ipfsUrl.replace('ipfs://', '');
  const gateway = getBestGateway();
  
  return `${gateway}${cid}`;
};

/**
 * Get the best performing IPFS gateway based on cached performance metrics
 */
export const getBestGateway = (): string => {
  // Default to the first gateway if no performance data
  if (Object.keys(gatewayPerformance).length === 0) {
    return IPFS_GATEWAYS[0];
  }
  
  // Find the gateway with best performance
  let bestGateway = IPFS_GATEWAYS[0];
  let bestScore = -Infinity;
  
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const gateway of IPFS_GATEWAYS) {
    const perf = gatewayPerformance[gateway];
    
    if (!perf) continue;
    
    // If last tested more than an hour ago, reduce confidence
    const freshnessFactor = Math.max(0, 1 - (now - perf.lastTested) / ONE_HOUR);
    const score = (perf.successRate * 0.7) - (perf.responseTime * 0.3) * freshnessFactor;
    
    if (score > bestScore) {
      bestScore = score;
      bestGateway = gateway;
    }
  }
  
  return bestGateway;
};

/**
 * Update the performance metrics for a gateway
 */
export const updateGatewayPerformance = (
  gateway: string, 
  success: boolean, 
  responseTime: number
): void => {
  const current = gatewayPerformance[gateway] || {
    responseTime: 1000,
    successRate: 0.5,
    lastTested: 0
  };
  
  // Update metrics with weight to recent performance
  gatewayPerformance[gateway] = {
    responseTime: (current.responseTime * 0.7) + (responseTime * 0.3),
    successRate: (current.successRate * 0.7) + (success ? 0.3 : 0),
    lastTested: Date.now()
  };
  
  // Persist performance data to localStorage for future sessions
  try {
    localStorage.setItem('ipfs_gateway_performance', JSON.stringify(gatewayPerformance));
  } catch (err) {
    console.error('Failed to save gateway performance data:', err);
  }
};

/**
 * Load stored gateway performance data from localStorage
 */
export const loadStoredGatewayPerformance = (): void => {
  try {
    const stored = localStorage.getItem('ipfs_gateway_performance');
    if (stored) {
      const data = JSON.parse(stored);
      Object.assign(gatewayPerformance, data);
    }
  } catch (err) {
    console.error('Failed to load stored gateway performance data:', err);
  }
};

/**
 * Test all gateways and update their performance metrics
 */
export const testAllGateways = async (testCid: string = 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx'): Promise<void> => {
  const testPromises = IPFS_GATEWAYS.map(async (gateway) => {
    const startTime = performance.now();
    let success = false;
    
    try {
      const response = await fetch(`${gateway}${testCid}`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // Abort after 5 seconds
      });
      
      success = response.ok;
    } catch (err) {
      success = false;
    }
    
    const responseTime = performance.now() - startTime;
    updateGatewayPerformance(gateway, success, responseTime);
  });
  
  await Promise.all(testPromises);
};

// Initialize gateway performance data
if (typeof window !== 'undefined') {
  loadStoredGatewayPerformance();
  // Test gateways in the background
  setTimeout(() => testAllGateways(), 2000);
} 