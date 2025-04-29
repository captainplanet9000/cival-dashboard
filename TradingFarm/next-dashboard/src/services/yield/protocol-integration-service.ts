/**
 * Trading Farm Cross-Chain Yield Optimization
 * Service for integrating with various DeFi protocols across multiple chains
 */

import { createServerClient } from '@/utils/supabase/server';
import { ethers } from 'ethers';
import { ProtocolType, IntegrationType, HealthStatus } from '@/types/yield-strategy.types';
import { decrypt, encrypt } from '@/utils/crypto';

// Common ABI fragments for interacting with yield protocols
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const STAKING_ABI = [
  'function stake(uint256 amount) returns (bool)',
  'function withdraw(uint256 amount) returns (bool)',
  'function earned(address account) view returns (uint256)',
  'function getReward() returns (bool)',
  'function rewardRate() view returns (uint256)'
];

const LENDING_ABI = [
  'function deposit(uint256 amount) returns (uint256)',
  'function withdraw(uint256 amount) returns (uint256)',
  'function getAccountSnapshot(address account) view returns (uint256, uint256, uint256, uint256)',
  'function supplyRatePerBlock() view returns (uint256)'
];

export interface ProtocolConfig {
  chainId: string;
  protocolId: string;
  protocolType: ProtocolType;
  integrationType: IntegrationType;
  contractAddress?: string;
  tokenAddress?: string;
  apiEndpoint?: string;
  graphEndpoint?: string;
  credentials?: Record<string, any>;
  abi?: any[];
  methodMappings?: Record<string, string>;
}

export class ProtocolIntegrationService {
  private configs: Map<string, ProtocolConfig> = new Map();
  private providers: Map<string, ethers.providers.Provider> = new Map();
  
  /**
   * Initialize the service by loading integrations
   */
  async initialize(): Promise<void> {
    await this.loadIntegrations();
  }
  
  /**
   * Load all protocol integrations from the database
   */
  private async loadIntegrations(): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      // Get all protocol integrations
      const { data, error } = await supabase
        .from('protocol_integrations')
        .select(`
          *,
          yield_protocols!inner(id, name, chain_id, protocol_type)
        `)
        .eq('is_active', true);
      
      if (error) {
        throw new Error(`Failed to load protocol integrations: ${error.message}`);
      }
      
      // Initialize configurations
      for (const integration of data || []) {
        const protocol = integration.yield_protocols;
        
        const config: ProtocolConfig = {
          chainId: protocol.chain_id,
          protocolId: protocol.id,
          protocolType: protocol.protocol_type as ProtocolType,
          integrationType: integration.integration_type as IntegrationType,
          contractAddress: integration.config?.contractAddress,
          tokenAddress: integration.config?.tokenAddress,
          apiEndpoint: integration.config?.apiEndpoint,
          graphEndpoint: integration.config?.graphEndpoint,
          methodMappings: integration.config?.methodMappings,
          abi: this.getAbiForProtocol(protocol.protocol_type as ProtocolType)
        };
        
        if (integration.credentials && Object.keys(integration.credentials).length > 0) {
          // Decrypt credentials if needed
          // This is a simplified approach - in production, credentials should be securely managed
          config.credentials = integration.credentials;
        }
        
        this.configs.set(protocol.id, config);
      }
      
      console.log(`Loaded ${this.configs.size} protocol integrations`);
    } catch (error) {
      console.error('Error loading protocol integrations:', error);
      throw error;
    }
  }
  
  /**
   * Get a provider for a specific chain
   */
  private async getProvider(chainId: string): Promise<ethers.providers.Provider> {
    if (this.providers.has(chainId)) {
      return this.providers.get(chainId)!;
    }
    
    // Get RPC URL from environment or configuration
    const rpcUrl = this.getRpcUrlForChain(chainId);
    
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`);
    }
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.providers.set(chainId, provider);
    
    return provider;
  }
  
  /**
   * Get RPC URL for a chain from environment variables or a mapping
   */
  private getRpcUrlForChain(chainId: string): string | undefined {
    const chainRpcMap: Record<string, string> = {
      '1': process.env.ETHEREUM_RPC_URL || '',
      '10': process.env.OPTIMISM_RPC_URL || '',
      '137': process.env.POLYGON_RPC_URL || '',
      '42161': process.env.ARBITRUM_RPC_URL || '',
      '43114': process.env.AVALANCHE_RPC_URL || '',
      '56': process.env.BSC_RPC_URL || '',
      '250': process.env.FANTOM_RPC_URL || '',
    };
    
    return chainRpcMap[chainId];
  }
  
  /**
   * Get the appropriate ABI based on protocol type
   */
  private getAbiForProtocol(protocolType: ProtocolType): any[] {
    switch (protocolType) {
      case 'staking':
        return [...ERC20_ABI, ...STAKING_ABI];
      case 'lending':
        return [...ERC20_ABI, ...LENDING_ABI];
      default:
        return ERC20_ABI;
    }
  }
  
  /**
   * Get APY for a specific protocol
   */
  async getProtocolApy(protocolId: string): Promise<{ apy: number; tvl: number; lastUpdated: Date }> {
    try {
      const config = this.configs.get(protocolId);
      
      if (!config) {
        throw new Error(`Protocol ${protocolId} not configured`);
      }
      
      switch (config.integrationType) {
        case 'api':
          return await this.getApyFromApi(config);
        case 'subgraph':
          return await this.getApyFromSubgraph(config);
        case 'rpc':
          return await this.getApyFromRpc(config);
        case 'contract':
          return await this.getApyFromContract(config);
        default:
          throw new Error(`Unsupported integration type: ${config.integrationType}`);
      }
    } catch (error) {
      console.error(`Error getting APY for protocol ${protocolId}:`, error);
      
      // Return default values on error
      return {
        apy: 0,
        tvl: 0,
        lastUpdated: new Date()
      };
    }
  }
  
  /**
   * Get APY from a REST API
   */
  private async getApyFromApi(config: ProtocolConfig): Promise<{ apy: number; tvl: number; lastUpdated: Date }> {
    if (!config.apiEndpoint) {
      throw new Error('API endpoint not configured');
    }
    
    // Add authentication headers if credentials are provided
    const headers: Record<string, string> = {};
    if (config.credentials?.apiKey) {
      headers['X-API-Key'] = config.credentials.apiKey;
    }
    
    // Make API request
    const response = await fetch(config.apiEndpoint, { headers });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract values using mapping if available, otherwise use defaults
    const apyPath = config.methodMappings?.apy || 'apy';
    const tvlPath = config.methodMappings?.tvl || 'tvl';
    
    const apy = this.getNestedValue(data, apyPath);
    const tvl = this.getNestedValue(data, tvlPath);
    
    return {
      apy: parseFloat(apy) || 0,
      tvl: parseFloat(tvl) || 0,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Get APY from a GraphQL subgraph
   */
  private async getApyFromSubgraph(config: ProtocolConfig): Promise<{ apy: number; tvl: number; lastUpdated: Date }> {
    if (!config.graphEndpoint) {
      throw new Error('GraphQL endpoint not configured');
    }
    
    // Define GraphQL query based on protocol type
    let query = '';
    
    switch (config.protocolType) {
      case 'lending':
        query = `{
          markets(where: { id: "${config.contractAddress?.toLowerCase()}" }) {
            supplyRate
            totalSupply
            totalValueLockedUSD
          }
        }`;
        break;
      case 'staking':
        query = `{
          stakingPools(where: { id: "${config.contractAddress?.toLowerCase()}" }) {
            apy
            totalStaked
            totalValueLockedUSD
          }
        }`;
        break;
      default:
        query = `{
          protocol(id: "${config.contractAddress?.toLowerCase()}") {
            apy
            tvlUSD
          }
        }`;
    }
    
    // Make GraphQL request
    const response = await fetch(config.graphEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }
    
    const { data } = await response.json();
    
    // Extract values based on protocol type
    let apy = 0;
    let tvl = 0;
    
    if (config.protocolType === 'lending' && data.markets?.[0]) {
      // Convert supply rate to APY (simplified calculation)
      const supplyRatePerYear = parseFloat(data.markets[0].supplyRate) * 365 * 24 * 60 * 60;
      apy = supplyRatePerYear * 100; // Convert to percentage
      tvl = parseFloat(data.markets[0].totalValueLockedUSD);
    } else if (config.protocolType === 'staking' && data.stakingPools?.[0]) {
      apy = parseFloat(data.stakingPools[0].apy);
      tvl = parseFloat(data.stakingPools[0].totalValueLockedUSD);
    } else if (data.protocol) {
      apy = parseFloat(data.protocol.apy);
      tvl = parseFloat(data.protocol.tvlUSD);
    }
    
    return {
      apy,
      tvl,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Get APY directly from RPC calls
   */
  private async getApyFromRpc(config: ProtocolConfig): Promise<{ apy: number; tvl: number; lastUpdated: Date }> {
    // Implementation will depend on the specific RPC methods needed
    // This is a placeholder implementation
    return {
      apy: 0,
      tvl: 0,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Get APY by reading from smart contracts
   */
  private async getApyFromContract(config: ProtocolConfig): Promise<{ apy: number; tvl: number; lastUpdated: Date }> {
    if (!config.contractAddress) {
      throw new Error('Contract address not configured');
    }
    
    const provider = await this.getProvider(config.chainId);
    const contract = new ethers.Contract(config.contractAddress, config.abi || [], provider);
    
    try {
      let apy = 0;
      let tvl = 0;
      
      // Different calculation methods based on protocol type
      if (config.protocolType === 'lending') {
        // For lending protocols like Compound/Aave
        const supplyRatePerBlock = await contract.supplyRatePerBlock();
        const blocksPerDay = 6500; // Approximate for Ethereum
        const daysPerYear = 365;
        
        // Convert APR to APY
        const apr = parseFloat(ethers.utils.formatUnits(supplyRatePerBlock, 18)) * blocksPerDay * daysPerYear;
        apy = (Math.pow(1 + (apr / daysPerYear), daysPerYear) - 1) * 100;
        
        // Get token contract to calculate TVL
        if (config.tokenAddress) {
          const tokenContract = new ethers.Contract(config.tokenAddress, ERC20_ABI, provider);
          const balance = await tokenContract.balanceOf(config.contractAddress);
          
          // Would need price data to convert to USD
          tvl = parseFloat(ethers.utils.formatUnits(balance, 18));
        }
      } else if (config.protocolType === 'staking') {
        // For staking protocols
        const rewardRate = await contract.rewardRate();
        const totalSupply = await contract.totalSupply ? await contract.totalSupply() : ethers.BigNumber.from(1);
        const rewardToken = config.tokenAddress ? new ethers.Contract(config.tokenAddress, ERC20_ABI, provider) : null;
        
        // Simple APR calculation (reward rate / total staked)
        if (!totalSupply.isZero()) {
          const rewardsPerYear = rewardRate.mul(ethers.BigNumber.from(365 * 24 * 60 * 60));
          const apr = rewardsPerYear.mul(ethers.BigNumber.from(100)).div(totalSupply);
          apy = parseFloat(ethers.utils.formatUnits(apr, 18));
        }
        
        // TVL would require price data which is not available here
        tvl = parseFloat(ethers.utils.formatUnits(totalSupply, 18));
      }
      
      return {
        apy,
        tvl,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Contract call failed for ${config.contractAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Helper to extract nested values from an object
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Update protocol health status
   */
  async updateProtocolHealth(protocolId: string, status: HealthStatus, errorMessage?: string): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      const { error } = await supabase
        .from('protocol_integrations')
        .update({
          health_status: status,
          last_checked_at: new Date().toISOString(),
          error_count: status === 'healthy' ? 0 : supabase.rpc('increment_error_count', { protocol_id: protocolId }),
          metadata: errorMessage ? { lastError: errorMessage } : undefined
        })
        .eq('protocol_id', protocolId);
      
      if (error) {
        console.error(`Failed to update protocol health: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating protocol health:', error);
    }
  }
  
  /**
   * Store latest APY data in the history table
   */
  async storeApyHistory(protocolId: string, apy: number, tvl: number): Promise<void> {
    try {
      const supabase = await createServerClient();
      
      const { error } = await supabase
        .from('yield_apy_history')
        .insert({
          protocol_id: protocolId,
          apy,
          tvl_usd: tvl,
          timestamp: new Date().toISOString()
        });
      
      if (error) {
        console.error(`Failed to store APY history: ${error.message}`);
      }
      
      // Also update the protocol with latest APY range
      await supabase
        .from('yield_protocols')
        .update({
          apy_range: supabase.rpc('update_apy_range', { 
            p_protocol_id: protocolId,
            p_current_apy: apy
          }),
          tvl_usd: tvl,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', protocolId);
    } catch (error) {
      console.error('Error storing APY history:', error);
    }
  }
  
  /**
   * Execute a deposit into a protocol
   * This is a simplified implementation - production would need more robust error handling
   */
  async executeDeposit(
    protocolId: string, 
    amount: string, 
    walletAddress: string,
    privateKey: string
  ): Promise<{ txHash: string; status: 'pending' | 'completed' | 'failed' }> {
    try {
      const config = this.configs.get(protocolId);
      
      if (!config) {
        throw new Error(`Protocol ${protocolId} not configured`);
      }
      
      const provider = await this.getProvider(config.chainId);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // First approve the token transfer if not directly ETH
      let approveTxHash = '';
      if (config.tokenAddress && config.tokenAddress !== ethers.constants.AddressZero) {
        const tokenContract = new ethers.Contract(config.tokenAddress, ERC20_ABI, wallet);
        const tx = await tokenContract.approve(config.contractAddress, ethers.utils.parseEther(amount));
        await tx.wait();
        approveTxHash = tx.hash;
      }
      
      // Now execute the deposit
      const contract = new ethers.Contract(config.contractAddress!, config.abi || [], wallet);
      let method = 'deposit';
      
      // Use method mapping if available
      if (config.methodMappings?.deposit) {
        method = config.methodMappings.deposit;
      }
      
      const tx = await contract[method](ethers.utils.parseEther(amount));
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        status: receipt.status === 1 ? 'completed' : 'failed'
      };
    } catch (error) {
      console.error(`Deposit execution failed for protocol ${protocolId}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a withdrawal from a protocol
   * This is a simplified implementation - production would need more robust error handling
   */
  async executeWithdrawal(
    protocolId: string, 
    amount: string, 
    walletAddress: string,
    privateKey: string
  ): Promise<{ txHash: string; status: 'pending' | 'completed' | 'failed' }> {
    try {
      const config = this.configs.get(protocolId);
      
      if (!config) {
        throw new Error(`Protocol ${protocolId} not configured`);
      }
      
      const provider = await this.getProvider(config.chainId);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Execute the withdrawal
      const contract = new ethers.Contract(config.contractAddress!, config.abi || [], wallet);
      let method = 'withdraw';
      
      // Use method mapping if available
      if (config.methodMappings?.withdraw) {
        method = config.methodMappings.withdraw;
      }
      
      const tx = await contract[method](ethers.utils.parseEther(amount));
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        status: receipt.status === 1 ? 'completed' : 'failed'
      };
    } catch (error) {
      console.error(`Withdrawal execution failed for protocol ${protocolId}:`, error);
      throw error;
    }
  }
  
  /**
   * Claim rewards from a protocol (if applicable)
   */
  async claimRewards(
    protocolId: string,
    walletAddress: string,
    privateKey: string
  ): Promise<{ txHash: string; status: 'pending' | 'completed' | 'failed'; amount?: string }> {
    try {
      const config = this.configs.get(protocolId);
      
      if (!config) {
        throw new Error(`Protocol ${protocolId} not configured`);
      }
      
      // Check if protocol supports rewards
      if (config.protocolType !== 'staking' && config.protocolType !== 'farming') {
        throw new Error('Protocol does not support reward claiming');
      }
      
      const provider = await this.getProvider(config.chainId);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Get earned rewards first
      const contract = new ethers.Contract(config.contractAddress!, config.abi || [], wallet);
      let claimMethod = 'getReward';
      let earnedMethod = 'earned';
      
      // Use method mapping if available
      if (config.methodMappings?.claim) {
        claimMethod = config.methodMappings.claim;
      }
      
      if (config.methodMappings?.earned) {
        earnedMethod = config.methodMappings.earned;
      }
      
      // Check earned amount if method exists
      let earnedAmount;
      if (contract[earnedMethod]) {
        earnedAmount = await contract[earnedMethod](walletAddress);
      }
      
      // Execute claim
      const tx = await contract[claimMethod]();
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        status: receipt.status === 1 ? 'completed' : 'failed',
        amount: earnedAmount ? ethers.utils.formatEther(earnedAmount) : undefined
      };
    } catch (error) {
      console.error(`Claim rewards failed for protocol ${protocolId}:`, error);
      throw error;
    }
  }
}
