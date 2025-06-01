import { ProtocolType } from '../../types/defi-protocol-types';
import { ProtocolConnectorInterface } from './protocol-connector-interface';
import { WalletProvider } from '../wallet/wallet-provider';
import { ethers } from 'ethers';

// Import protocol connectors
import { AaveConnector } from './connectors/aave-connector';
import { UniswapConnector } from './connectors/uniswap-connector';
import { VertexConnector } from './connectors/vertex-connector';
import { GmxConnector } from './connectors/gmx-connector';
import { SushiswapConnector } from './connectors/sushiswap-connector';
import { MorphoConnector } from './connectors/morpho-connector';

/**
 * Factory for creating and managing protocol connectors
 */
export class ProtocolConnectorFactory {
  private static connectorInstances: Map<string, ProtocolConnectorInterface> = new Map();
  private static walletProvider: WalletProvider = WalletProvider.getInstance();
  
  /**
   * Get a connector instance for a specific protocol
   */
  static async getConnector(protocol: ProtocolType, chainId?: number | string): Promise<ProtocolConnectorInterface> {
    const key = `${protocol}-${chainId || 'default'}`;
    
    // Return existing instance if available
    if (this.connectorInstances.has(key)) {
      return this.connectorInstances.get(key)!;
    }
    
    // Create new connector instance
    let connector: ProtocolConnectorInterface;
    
    try {
      // Convert chainId to number if it's a string
      const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
      
      switch (protocol) {
        case ProtocolType.AAVE:
          connector = new AaveConnector(chainIdNum);
          break;
        case ProtocolType.UNISWAP:
          connector = new UniswapConnector(chainIdNum);
          break;
        case ProtocolType.VERTEX:
          connector = new VertexConnector(chainIdNum?.toString());
          break;
        case ProtocolType.GMX:
          connector = new GmxConnector(chainIdNum);
          break;
        case ProtocolType.SUSHISWAP:
          connector = new SushiswapConnector(chainIdNum);
          break;
        case ProtocolType.MORPHO:
          connector = new MorphoConnector(chainIdNum);
          break;
        default:
          throw new Error(`Unsupported protocol: ${protocol}`);
      }
      
      // Cache connector instance
      this.connectorInstances.set(key, connector);
      
      return connector;
    } catch (error) {
      console.error(`Failed to create connector for ${protocol}:`, error);
      throw error;
    }
  }
  
  /**
   * Connect a wallet to a protocol connector
   */
  static async connectWallet(protocol: ProtocolType, chainId?: number | string): Promise<boolean> {
    try {
      // Get connector instance
      const connector = await this.getConnector(protocol, chainId);
      
      // Get wallet info and signer
      const walletInfo = this.walletProvider.getWalletInfo();
      
      if (!walletInfo || !walletInfo.isConnected) {
        throw new Error('Wallet not connected');
      }
      
      // Connect to protocol using wallet
      const signer = this.walletProvider.getSigner();
      
      if (!signer) {
        throw new Error('Signer not available');
      }
      
      // Switch chain if needed
      const targetChainId = typeof chainId === 'string' ? parseInt(chainId, 10) : (chainId || walletInfo.chainId);
      
      if (walletInfo.chainId !== targetChainId) {
        await this.walletProvider.switchChain(targetChainId);
      }
      
      // Connect to protocol with the appropriate credentials
      // Each protocol connector expects different credentials
      const credentials: Record<string, string> = {};
      
      // For GMX, which expects an ethers signer
      if (protocol === ProtocolType.GMX) {
        // Pass the signer as a string in the credentials
        // The connector will cast it back to an ethers.Signer
        credentials.signer = signer as unknown as string;
      } else {
        // For other protocols that expect an address
        credentials.address = walletInfo.address;
      }
      
      return await connector.connect(credentials);
    } catch (error) {
      console.error(`Failed to connect wallet to ${protocol}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all available protocols
   */
  static getAvailableProtocols(): ProtocolType[] {
    return [
      ProtocolType.AAVE,
      ProtocolType.UNISWAP,
      ProtocolType.VERTEX,
      ProtocolType.GMX,
      ProtocolType.SUSHISWAP,
      ProtocolType.MORPHO,
    ];
  }
  
  /**
   * Get all protocol connectors
   */
  static async getAllConnectors(): Promise<Map<ProtocolType, ProtocolConnectorInterface>> {
    const protocols = this.getAvailableProtocols();
    const connectorMap = new Map<ProtocolType, ProtocolConnectorInterface>();
    
    for (const protocol of protocols) {
      try {
        const connector = await this.getConnector(protocol);
        connectorMap.set(protocol, connector);
      } catch (error) {
        console.error(`Error initializing ${protocol} connector:`, error);
        // Skip and continue with other connectors
      }
    }
    
    return connectorMap;
  }
  
  /**
   * Clear all connector instances
   */
  static clearConnectors(): void {
    this.connectorInstances.clear();
  }
  
  /**
   * Remove a specific connector instance
   */
  static removeConnector(protocol: ProtocolType, chainId?: number | string): void {
    const key = `${protocol}-${chainId || 'default'}`;
    this.connectorInstances.delete(key);
  }
} 