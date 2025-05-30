import { ProtocolType, ProtocolCategory } from '../../types/defi-protocol-types';
import { ProtocolConnectorInterface } from './protocol-connector-interface';

// Import connectors as they're implemented
// For now, we'll use dynamic imports to avoid dependency issues

export class ProtocolServiceFactory {
  private static connectorInstances: Map<string, ProtocolConnectorInterface> = new Map();
  
  static async getConnector(protocol: ProtocolType, chainId?: number | string): Promise<ProtocolConnectorInterface> {
    const key = `${protocol}-${chainId || 'default'}`;
    
    if (this.connectorInstances.has(key)) {
      return this.connectorInstances.get(key)!;
    }
    
    let connector: ProtocolConnectorInterface;
    
    try {
      switch (protocol) {
        case ProtocolType.AAVE:
          const { AaveConnector } = await import('./connectors/aave-connector');
          connector = new AaveConnector(chainId as number);
          break;
        case ProtocolType.GMX:
          const { GMXConnector } = await import('./connectors/gmx-connector');
          connector = new GMXConnector(chainId as number);
          break;
        case ProtocolType.UNISWAP:
          const { UniswapConnector } = await import('./connectors/uniswap-connector');
          connector = new UniswapConnector(chainId as number);
          break;
        case ProtocolType.VERTEX:
          const { VertexConnector } = await import('./connectors/vertex-connector');
          connector = new VertexConnector(chainId as string);
          break;
        case ProtocolType.SUSHISWAP:
          const { SushiSwapConnector } = await import('./connectors/sushiswap-connector');
          connector = new SushiSwapConnector(chainId as number);
          break;
        case ProtocolType.HYPERLIQUID:
          const { HyperliquidConnector } = await import('./connectors/hyperliquid-connector');
          connector = new HyperliquidConnector();
          break;
        case ProtocolType.BLUEFIN:
          const { BluefinConnector } = await import('./connectors/bluefin-connector');
          connector = new BluefinConnector();
          break;
        default:
          throw new Error(`Protocol ${protocol} is not implemented yet`);
      }
      
      this.connectorInstances.set(key, connector);
      return connector;
    } catch (error) {
      console.error(`Error loading connector for ${protocol}:`, error);
      throw new Error(`Failed to initialize connector for ${protocol}`);
    }
  }
  
  static getProtocolMetadata(protocol: ProtocolType): any {
    // Return metadata about each protocol
    const metadata = {
      [ProtocolType.AAVE]: {
        name: 'Aave',
        category: ProtocolCategory.LENDING,
        chains: [1, 137, 42161, 10, 43114, 8453], // Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Base
        website: 'https://aave.com',
        description: 'Aave is a decentralized lending protocol where users can borrow assets and earn interest by supplying collateral to the protocol.'
      },
      [ProtocolType.GMX]: {
        name: 'GMX',
        category: ProtocolCategory.PERPETUALS,
        chains: [42161, 43114], // Arbitrum, Avalanche
        website: 'https://gmx.io',
        description: 'GMX is a decentralized perpetual exchange with low fees and deep liquidity.'
      },
      [ProtocolType.UNISWAP]: {
        name: 'Uniswap',
        category: ProtocolCategory.DEX,
        chains: [1, 137, 42161, 10, 8453], // Ethereum, Polygon, Arbitrum, Optimism, Base
        website: 'https://uniswap.org',
        description: 'Uniswap is a decentralized exchange protocol that enables automated token swaps.'
      },
      [ProtocolType.VERTEX]: {
        name: 'Vertex Protocol',
        category: ProtocolCategory.PERPETUALS,
        chains: ['arbitrum', 'base', 'mantle', 'sei', 'sonic', 'abstract', 'berachain', 'avalanche'],
        website: 'https://vertexprotocol.com',
        description: 'Vertex is a multi-chain perpetual trading platform'
      },
      [ProtocolType.SUSHISWAP]: {
        name: 'SushiSwap',
        category: ProtocolCategory.DEX,
        chains: [1, 56, 137, 42161, 10, 250, 43114, 8453], // Ethereum, BSC, Polygon, Arbitrum, Optimism, Fantom, Avalanche, Base
        website: 'https://sushi.com',
        description: 'SushiSwap is a community-driven decentralized exchange'
      },
      [ProtocolType.HYPERLIQUID]: {
        name: 'Hyperliquid',
        category: ProtocolCategory.DERIVATIVES,
        chains: ['hyperliquid'],
        website: 'https://hyperliquid.xyz',
        description: 'Hyperliquid is a decentralized derivatives exchange'
      },
      [ProtocolType.BLUEFIN]: {
        name: 'Bluefin Exchange',
        category: ProtocolCategory.CLOB,
        chains: ['arbitrum'],
        website: 'https://bluefin.io',
        description: 'Bluefin is a decentralized, order book-based exchange with advanced trading capabilities'
      },
      [ProtocolType.MORPHO]: {
        name: 'Morpho',
        category: ProtocolCategory.LENDING,
        chains: [1, 10, 8453], // Ethereum, Optimism, Base
        website: 'https://morpho.org',
        description: 'Morpho is a lending protocol that enhances existing platforms by improving interest rates for lenders and borrowers.'
      },
      [ProtocolType.ETHENA]: {
        name: 'Ethena',
        category: ProtocolCategory.SYNTHETICS,
        chains: [1], // Ethereum
        website: 'https://ethena.fi',
        description: 'Ethena is a synthetic asset protocol that creates USDe, a yield-bearing stablecoin.'
      },
      [ProtocolType.AVALON]: {
        name: 'Avalon Finance',
        category: ProtocolCategory.DERIVATIVES,
        chains: [1], // Ethereum
        website: 'https://avalon.finance',
        description: 'Avalon Finance provides Bitcoin market derivatives'
      }
      // Add other protocols as needed
    };
    
    return metadata[protocol] || { name: protocol, category: 'unknown' };
  }
  
  static async getAllProtocolsMetadata(): Promise<any[]> {
    return Object.values(ProtocolType).map(protocol => ({
      id: protocol,
      ...this.getProtocolMetadata(protocol)
    }));
  }
  
  static async getProtocolsByCategory(category: ProtocolCategory): Promise<any[]> {
    const allProtocols = await this.getAllProtocolsMetadata();
    return allProtocols.filter(protocol => protocol.category === category);
  }
} 