import { ProtocolConnectorInterface } from '../protocol-connector-interface';
import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../../types/defi-protocol-types';
import axios from 'axios';
import { ethers } from 'ethers';
import { ErrorHandler } from '../error-handler';

// Curve pool ABI (simplified)
const CURVE_POOL_ABI = [
  "function get_virtual_price() external view returns (uint256)",
  "function coins(uint256 i) external view returns (address)",
  "function balances(uint256 i) external view returns (uint256)",
  "function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)",
  "function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)",
  "function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amount) external returns (uint256)",
  "function remove_liquidity(uint256 _amount, uint256[2] calldata min_amounts) external returns (uint256[2] memory)",
  "function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 _min_amount) external returns (uint256)"
];

// Curve registry ABI (simplified)
const CURVE_REGISTRY_ABI = [
  "function get_pool_from_lp_token(address) external view returns (address)",
  "function get_lp_token(address) external view returns (address)",
  "function get_n_coins(address) external view returns (uint256[2] memory)",
  "function get_coins(address) external view returns (address[8] memory)",
  "function get_underlying_coins(address) external view returns (address[8] memory)",
  "function get_decimals(address) external view returns (uint256[8] memory)",
  "function get_underlying_decimals(address) external view returns (uint256[8] memory)",
  "function get_pool_name(address) external view returns (string memory)"
];

// Curve registry addresses by chain
const CURVE_REGISTRY_ADDRESSES: Record<number, string> = {
  1: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5', // Ethereum Mainnet
  10: '0xC5cfaDA84E902aD92DD40194f0883ad49639b023', // Optimism
  137: '0x094d12e5b541784701FD8d65F11fc0598FBC6332', // Polygon
  42161: '0x445FE580eF8d70FF569aB36e80c647af338db351', // Arbitrum
  43114: '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6'  // Avalanche
};

/**
 * Connector for Curve Finance protocol
 */
export class CurveConnector implements ProtocolConnectorInterface {
  private apiBaseUrl: string = 'https://api.curve.fi/api';
  private chainId: number = 1; // Default to Ethereum mainnet
  private isAuthenticated: boolean = false;
  private userAddress?: string;
  private provider?: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private errorHandler: ErrorHandler;
  
  constructor(chainId?: number) {
    this.errorHandler = ErrorHandler.getInstance();
    
    if (chainId) {
      this.chainId = chainId;
      this.updateEndpoints();
    }
  }
  
  /**
   * Update API endpoints based on the chain ID
   */
  private updateEndpoints(): void {
    // Update API endpoints if needed
    switch (this.chainId) {
      case 1: // Ethereum Mainnet
        this.apiBaseUrl = 'https://api.curve.fi/api';
        break;
      case 137: // Polygon
        this.apiBaseUrl = 'https://api.curve.fi/api/polygon';
        break;
      case 42161: // Arbitrum
        this.apiBaseUrl = 'https://api.curve.fi/api/arbitrum';
        break;
      case 10: // Optimism
        this.apiBaseUrl = 'https://api.curve.fi/api/optimism';
        break;
      case 43114: // Avalanche
        this.apiBaseUrl = 'https://api.curve.fi/api/avalanche';
        break;
      default:
        this.apiBaseUrl = 'https://api.curve.fi/api';
    }
  }
  
  /**
   * Connect to Curve protocol
   */
  async connect(credentials?: Record<string, string>): Promise<boolean> {
    try {
      // Check if address is provided in credentials
      if (!credentials || !credentials.address) {
        throw new Error('Wallet address not provided in credentials');
      }
      
      const walletAddress = credentials.address;
      
      // Store user address and authenticated state
      this.userAddress = walletAddress;
      this.isAuthenticated = true;
      
      // If signer is provided, store it
      if (credentials.signer) {
        this.signer = credentials.signer as unknown as ethers.Signer;
        this.provider = this.signer.provider;
      } else if (credentials.provider) {
        this.provider = credentials.provider as unknown as ethers.providers.Provider;
      }
      
      return true;
    } catch (error) {
      this.errorHandler.handleError(error, 'Curve', 'CONNECT');
      return false;
    }
  }
  
  /**
   * Get protocol information
   */
  async getProtocolInfo(): Promise<any> {
    return {
      name: 'Curve Finance',
      type: ProtocolType.CURVE,
      chainId: this.chainId,
      website: 'https://curve.fi',
      description: 'Curve is an exchange liquidity pool on Ethereum designed for extremely efficient stablecoin trading',
      logoUrl: 'https://curve.fi/logo.png'
    };
  }
  
  /**
   * Get user positions on Curve Finance
   */
  async getUserPositions(address?: string): Promise<ProtocolPosition[]> {
    try {
      const userAddress = address || this.userAddress;
      
      if (!userAddress) {
        throw new Error('User address not provided');
      }
      
      const positions: ProtocolPosition[] = [];
      
      // Get registry contract to query pools
      const registryAddress = CURVE_REGISTRY_ADDRESSES[this.chainId];
      
      if (!registryAddress || !this.provider) {
        throw new Error('Registry not available for this chain or provider not set');
      }
      
      const registryContract = new ethers.Contract(
        registryAddress,
        CURVE_REGISTRY_ABI,
        this.provider
      );
      
      // Get pool information from API
      const response = await axios.get(`${this.apiBaseUrl}/getPools`);
      const pools = response.data.data.pools;
      
      // For each pool, check if the user has LP tokens
      for (const pool of pools) {
        try {
          // Get the LP token address
          const lpTokenAddress = pool.address;
          
          // Get LP token contract
          const lpTokenContract = new ethers.Contract(
            lpTokenAddress,
            [
              "function balanceOf(address) external view returns (uint256)",
              "function decimals() external view returns (uint8)"
            ],
            this.provider
          );
          
          // Get user balance
          const balance = await lpTokenContract.balanceOf(userAddress);
          
          // Skip if no balance
          if (balance.isZero()) {
            continue;
          }
          
          // Get token decimals
          const decimals = await lpTokenContract.decimals();
          
          // Get pool contract
          const poolContract = new ethers.Contract(
            pool.pool_address,
            CURVE_POOL_ABI,
            this.provider
          );
          
          // Get virtual price
          const virtualPrice = await poolContract.get_virtual_price();
          
          // Calculate position value in USD
          const balanceFormatted = ethers.utils.formatUnits(balance, decimals);
          const virtualPriceFormatted = ethers.utils.formatUnits(virtualPrice, 18);
          const positionValue = parseFloat(balanceFormatted) * parseFloat(virtualPriceFormatted) * pool.usdTotal / pool.virtualPrice;
          
          // Create position object
          positions.push({
            id: `curve-${this.chainId}-${pool.address}-${userAddress}`,
            protocolId: ProtocolType.CURVE,
            chainId: this.chainId,
            assetSymbol: pool.symbol,
            assetAddress: pool.address,
            positionType: 'liquidity',
            direction: 'liquidity',
            positionValue,
            tokenAmount: balanceFormatted,
            leverage: 1,
            collateral: [],
            healthFactor: 1,
            metadata: {
              poolName: pool.name,
              coins: pool.coins.map((c: any) => c.symbol).join('/'),
              apy: pool.apy,
              virtualPrice: pool.virtualPrice,
              poolAddress: pool.pool_address
            }
          });
        } catch (error) {
          console.error(`Error processing pool ${pool.name}:`, error);
          // Continue with next pool
        }
      }
      
      return positions;
    } catch (error) {
      this.errorHandler.handleError(error, 'Curve', 'GET_POSITIONS');
      return [];
    }
  }
  
  /**
   * Execute a protocol action
   */
  async executeAction(action: ProtocolAction, params: any): Promise<any> {
    try {
      if (!this.isAuthenticated || !this.signer) {
        throw new Error('Not authenticated or signer not available');
      }
      
      // Handle different action types
      switch (action) {
        case ProtocolAction.ADD_LIQUIDITY:
          return await this.addLiquidity(params);
        case ProtocolAction.REMOVE_LIQUIDITY:
          return await this.removeLiquidity(params);
        case ProtocolAction.SWAP:
          return await this.swap(params);
        default:
          throw new Error(`Action ${action} not supported`);
      }
    } catch (error) {
      this.errorHandler.handleError(error, 'Curve', action.toString());
      throw error;
    }
  }
  
  /**
   * Add liquidity to a Curve pool
   */
  private async addLiquidity(params: any): Promise<any> {
    const { poolAddress, amounts, minMintAmount, deadline } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get pool contract
    const poolContract = new ethers.Contract(
      poolAddress,
      CURVE_POOL_ABI,
      this.signer
    );
    
    // Execute add_liquidity transaction
    const tx = await poolContract.add_liquidity(
      amounts,
      minMintAmount,
      { gasLimit: 3000000 }
    );
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Remove liquidity from a Curve pool
   */
  private async removeLiquidity(params: any): Promise<any> {
    const { poolAddress, amount, minAmounts, coinIndex } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get pool contract
    const poolContract = new ethers.Contract(
      poolAddress,
      CURVE_POOL_ABI,
      this.signer
    );
    
    let tx;
    
    // Check if removing to a specific coin or proportionally
    if (coinIndex !== undefined) {
      // Remove to a specific coin
      tx = await poolContract.remove_liquidity_one_coin(
        amount,
        coinIndex,
        minAmounts[0],
        { gasLimit: 3000000 }
      );
    } else {
      // Remove proportionally
      tx = await poolContract.remove_liquidity(
        amount,
        minAmounts,
        { gasLimit: 3000000 }
      );
    }
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Swap tokens on Curve
   */
  private async swap(params: any): Promise<any> {
    const { poolAddress, fromIndex, toIndex, amount, minReceived } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get pool contract
    const poolContract = new ethers.Contract(
      poolAddress,
      CURVE_POOL_ABI,
      this.signer
    );
    
    // Execute exchange transaction
    const tx = await poolContract.exchange(
      fromIndex,
      toIndex,
      amount,
      minReceived,
      { gasLimit: 3000000 }
    );
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Get all available Curve pools
   */
  async getPools(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/getPools`);
      return response.data.data.pools;
    } catch (error) {
      this.errorHandler.handleError(error, 'Curve', 'GET_POOLS');
      return [];
    }
  }
  
  /**
   * Get detailed information about a specific pool
   */
  async getPoolInfo(poolAddress: string): Promise<any> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      // Get registry contract
      const registryAddress = CURVE_REGISTRY_ADDRESSES[this.chainId];
      
      if (!registryAddress) {
        throw new Error('Registry not available for this chain');
      }
      
      const registryContract = new ethers.Contract(
        registryAddress,
        CURVE_REGISTRY_ABI,
        this.provider
      );
      
      // Get pool name
      const poolName = await registryContract.get_pool_name(poolAddress);
      
      // Get LP token
      const lpToken = await registryContract.get_lp_token(poolAddress);
      
      // Get coins
      const coins = await registryContract.get_coins(poolAddress);
      
      // Get decimals
      const decimals = await registryContract.get_decimals(poolAddress);
      
      // Get pool contract
      const poolContract = new ethers.Contract(
        poolAddress,
        CURVE_POOL_ABI,
        this.provider
      );
      
      // Get virtual price
      const virtualPrice = await poolContract.get_virtual_price();
      
      // Get balances for each coin
      const balances = [];
      for (let i = 0; i < 8; i++) {
        if (coins[i] === '0x0000000000000000000000000000000000000000') {
          break;
        }
        
        try {
          const balance = await poolContract.balances(i);
          balances.push({
            coin: coins[i],
            balance: ethers.utils.formatUnits(balance, decimals[i])
          });
        } catch (error) {
          // Some pools have different balance access methods
          break;
        }
      }
      
      return {
        name: poolName,
        address: poolAddress,
        lpToken,
        virtualPrice: ethers.utils.formatUnits(virtualPrice, 18),
        coins: coins.filter(c => c !== '0x0000000000000000000000000000000000000000'),
        decimals: decimals.slice(0, coins.filter(c => c !== '0x0000000000000000000000000000000000000000').length),
        balances
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'Curve', 'GET_POOL_INFO');
      return null;
    }
  }
  
  /**
   * Get a quote for swapping tokens
   */
  async getSwapQuote(poolAddress: string, fromIndex: number, toIndex: number, amount: string): Promise<any> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      // Get pool contract
      const poolContract = new ethers.Contract(
        poolAddress,
        CURVE_POOL_ABI,
        this.provider
      );
      
      // Get expected output amount
      const dy = await poolContract.get_dy(fromIndex, toIndex, amount);
      
      return {
        fromIndex,
        toIndex,
        fromAmount: amount,
        toAmount: dy.toString(),
        poolAddress
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'Curve', 'GET_SWAP_QUOTE');
      return null;
    }
  }
} 