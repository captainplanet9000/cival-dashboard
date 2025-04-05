export enum ProtocolType {
  AAVE = 'aave',
  GMX = 'gmx',
  UNISWAP = 'uniswap',
  MORPHO = 'morpho',
  ETHENA = 'ethena',
  SUILEND = 'suilend',
  SILO = 'silo',
  KAMINO = 'kamino',
  AVALON = 'avalon',
  VERTEX = 'vertex',
  SUSHISWAP = 'sushiswap',
  HYPERLIQUID = 'hyperliquid',
  BLUEFIN = 'bluefin'
}

export enum ProtocolCategory {
  LENDING = 'lending',
  DEX = 'dex',
  PERPETUALS = 'perpetuals',
  DERIVATIVES = 'derivatives',
  SYNTHETICS = 'synthetics',
  LIQUIDITY = 'liquidity',
  CLOB = 'centralLimitOrderBook'
}

export interface ProtocolAction {
  protocol: ProtocolType;
  actionType: string;
  params: Record<string, any>;
}

export interface ProtocolPosition {
  protocol: ProtocolType;
  positionId: string;
  assetIn: string;
  assetOut?: string;
  amountIn: number;
  amountOut?: number;
  leverage?: number;
  status: string;
  timestamp: string;
  healthFactor?: number;
  metadata: Record<string, any>;
}

export interface ProtocolMetadata {
  type: ProtocolType;
  name: string;
  category: ProtocolCategory;
  chains: number[] | string[];
  logo: string;
  website: string;
  description: string;
} 