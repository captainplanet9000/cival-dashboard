/**
 * Bridge Service - Connects to FastAPI backend for LayerZero cross-chain transfers
 * Enables HeyAnon-style multi-chain swaps within the Trading Farm dashboard
 */

export interface ChainInfo {
  id: number;
  name: string;
}

export interface BridgeQuoteRequest {
  from_chain_id: number;
  to_chain_id: number;
  token_address: string;
  amount: string;
  sender_address: string;
}

export interface BridgeExecuteRequest extends BridgeQuoteRequest {
  recipient_address: string;
  wallet_id?: string;
  farm_id?: string;
}

export interface BridgeStatusRequest {
  tx_hash: string;
  from_chain_id: number;
}

export interface BridgeQuoteResponse {
  fee: string;
  estimated_time: number;
  from_token_price?: string;
  to_token_price?: string;
  success: boolean;
  error?: string;
}

export interface BridgeExecuteResponse {
  tx_hash?: string;
  status: string;
  bridge_id?: string;
  success: boolean;
  error?: string;
}

export interface BridgeStatusResponse {
  status: string;
  tx_hash: string;
  from_chain_id: number;
  to_chain_id: number;
  confirmation_time?: string;
  success: boolean;
  error?: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  price_usd?: string;
}

class BridgeService {
  private apiUrl: string;
  
  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  /**
   * Get a list of supported chains for bridging
   */
  async getSupportedChains(): Promise<ChainInfo[]> {
    try {
      const response = await fetch(`${this.apiUrl}/bridge/chains`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch supported chains');
      }
      
      const data = await response.json();
      return data.chains || [];
    } catch (error) {
      console.error('Error fetching supported chains:', error);
      return [];
    }
  }

  /**
   * Get a quote for bridging tokens across chains
   */
  async getBridgeQuote(request: BridgeQuoteRequest): Promise<BridgeQuoteResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/bridge/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get bridge quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting bridge quote:', error);
      return {
        fee: '0',
        estimated_time: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute a bridge transaction
   */
  async executeBridge(request: BridgeExecuteRequest): Promise<BridgeExecuteResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/bridge/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to execute bridge');
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing bridge:', error);
      return {
        status: 'failed',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check the status of a bridge transaction
   */
  async getBridgeStatus(request: BridgeStatusRequest): Promise<BridgeStatusResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/bridge/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get bridge status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting bridge status:', error);
      return {
        status: 'unknown',
        tx_hash: request.tx_hash,
        from_chain_id: request.from_chain_id,
        to_chain_id: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get token information (mock implementation for demo)
   */
  async getTokenInfo(chainId: number, tokenAddress: string): Promise<TokenInfo | null> {
    // Mock implementation for demo purposes
    const mockTokens: Record<string, TokenInfo> = {
      // Ethereum tokens
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        logo: '/tokens/eth.png',
        price_usd: '2456.78',
      },
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logo: '/tokens/usdc.png',
        price_usd: '1.00',
      },
      // Arbitrum tokens have the same address but on different chain
      'arb_0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        logo: '/tokens/eth.png',
        price_usd: '2456.78',
      },
    };
    
    const key = chainId === 42161 ? `arb_${tokenAddress}` : tokenAddress;
    return mockTokens[key] || null;
  }

  /**
   * Get list of popular tokens for a chain (mock implementation for demo)
   */
  async getPopularTokens(chainId: number): Promise<TokenInfo[]> {
    // Mock implementation for demo purposes
    const ethereumTokens = [
      {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        logo: '/tokens/eth.png',
        price_usd: '2456.78',
      },
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logo: '/tokens/usdc.png',
        price_usd: '1.00',
      },
      {
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        symbol: 'USDT',
        name: 'Tether',
        decimals: 6,
        logo: '/tokens/usdt.png',
        price_usd: '1.00',
      },
    ];
    
    const arbitrumTokens = [
      {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        logo: '/tokens/eth.png',
        price_usd: '2456.78',
      },
      {
        address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logo: '/tokens/usdc.png',
        price_usd: '1.00',
      },
    ];
    
    const optimismTokens = [
      {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        logo: '/tokens/eth.png',
        price_usd: '2456.78',
      },
      {
        address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logo: '/tokens/usdc.png',
        price_usd: '1.00',
      },
    ];
    
    switch (chainId) {
      case 1: // Ethereum
        return ethereumTokens;
      case 42161: // Arbitrum
        return arbitrumTokens;
      case 10: // Optimism
        return optimismTokens;
      default:
        return ethereumTokens; // Default to Ethereum tokens
    }
  }
}

export const bridgeService = new BridgeService();
