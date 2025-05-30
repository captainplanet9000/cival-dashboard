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
  OPTIONS = 'options',
  YIELD = 'yield',
  DERIVATIVES = 'derivatives',
  SYNTHETICS = 'synthetics',
  LIQUIDITY = 'liquidity',
  CLOB = 'centralLimitOrderBook'
}

export enum ProtocolAction {
  SWAP = 'swap',
  SUPPLY = 'supply',
  WITHDRAW = 'withdraw',
  BORROW = 'borrow',
  REPAY = 'repay',
  OPEN_POSITION = 'openPosition',
  CLOSE_POSITION = 'closePosition',
  ADD_LIQUIDITY = 'addLiquidity',
  REMOVE_LIQUIDITY = 'removeLiquidity',
  ADD_COLLATERAL = 'addCollateral',
  REMOVE_COLLATERAL = 'removeCollateral',
  CLAIM_REWARDS = 'claimRewards'
}

export interface ProtocolPosition {
  id: string;
  protocolId: ProtocolType;
  chainId: number;
  type: string;
  assetSymbol: string;
  assetAddress: string;
  positionSize: number;
  positionValue: number;
  entryPrice: number;
  leverage: number;
  unrealizedPnl: number;
  direction: string;
  timestamp: number;
  metadata?: Record<string, any>;
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