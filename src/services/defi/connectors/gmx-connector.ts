import { ProtocolConnectorInterface } from '../protocol-connector-interface';
import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../../types/defi-protocol-types';
import axios from 'axios';
import { ethers } from 'ethers';

// GMX V2 contract ABIs (partial)
const GMX_READER_ABI = [
  "function getPositions(address dataStore, address account, address[] memory markets) external view returns (tuple(address market, address collateralToken, bool isLong, uint256 size, uint256 collateral, uint256 averagePrice, uint256 entryFundingRate, uint256 borrowingFactor, uint256 fundingFeeAmountPerSize, uint256 longTokenClaimableFunding, uint256 shortTokenClaimableFunding, uint256 increasedAtBlock, uint256 decreasedAtBlock, uint256 increasedAtTime, uint256 decreasedAtTime, uint256 tokenOracleType, uint256 pnlLow, uint256 pnlHigh)[] memory)",
  "function getMarkets(address dataStore, uint256 start, uint256 end) external view returns (address[] memory)"
];

interface GmxMarket {
  address: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  name: string;
  symbol: string;
}

interface GmxPosition {
  market: string;
  collateralToken: string;
  isLong: boolean;
  size: string;
  collateral: string;
  averagePrice: string;
  pnl: string;
  leverage: string;
  liquidationPrice: string;
  indexToken: string;
  indexTokenSymbol: string;
}

export class GmxConnector implements ProtocolConnectorInterface {
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private chainId: number = 42161; // Default to Arbitrum
  private readerAddress: string = '0xf60becbba223EEA9495Da3f606753867eC10d139'; // GMX V2 Reader on Arbitrum
  private dataStoreAddress: string = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8'; // GMX V2 DataStore on Arbitrum
  private markets: GmxMarket[] = [];
  
  constructor(chainId?: number) {
    if (chainId) {
      this.chainId = chainId;
      this.updateAddresses();
    }
  }
  
  private updateAddresses(): void {
    // Update GMX addresses based on chainId
    if (this.chainId === 42161) { // Arbitrum One
      this.readerAddress = '0xf60becbba223EEA9495Da3f606753867eC10d139';
      this.dataStoreAddress = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8';
    } else if (this.chainId === 42170) { // Arbitrum Nova
      // Set addresses for Nova
    } else if (this.chainId === 43114) { // Avalanche
      this.readerAddress = '0x4aA1d18A1dA73D5Cf0E8bc9A062bd20dc2791F69';
      this.dataStoreAddress = '0xB7c3800330ce92C2f92811b997388F401ebef260';
    }
  }
  
  async connect(wallet: ethers.Signer): Promise<boolean> {
    try {
      this.signer = wallet;
      this.provider = wallet.provider;
      
      if (!this.provider) {
        throw new Error('Provider not available from signer');
      }
      
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;
      this.updateAddresses();
      
      // Load available markets
      await this.loadMarkets();
      
      return true;
    } catch (error) {
      console.error('Failed to connect to GMX:', error);
      return false;
    }
  }
  
  private async loadMarkets(): Promise<GmxMarket[]> {
    if (!this.provider) {
      throw new Error('Provider not connected');
    }
    
    try {
      const readerContract = new ethers.Contract(
        this.readerAddress,
        GMX_READER_ABI,
        this.provider
      );
      
      // Get market addresses
      const marketAddresses = await readerContract.getMarkets(this.dataStoreAddress, 0, 100);
      
      // TODO: For each market address, get market info from the contract
      // This is a simplified example - in production, we would fetch full market details
      this.markets = marketAddresses.map((address: string, index: number) => ({
        address,
        indexToken: '',
        longToken: '',
        shortToken: '',
        name: `Market ${index + 1}`,
        symbol: `MKT${index + 1}`
      }));
      
      return this.markets;
    } catch (error) {
      console.error('Failed to load GMX markets:', error);
      return [];
    }
  }
  
  async getProtocolInfo(): Promise<any> {
    return {
      name: 'GMX',
      description: 'Decentralized perpetual exchange with low fees and deep liquidity',
      type: ProtocolType.GMX,
      website: 'https://gmx.io',
      chainIds: [42161, 43114], // Arbitrum and Avalanche
      tvl: '$500M+',
      markets: this.markets
    };
  }
  
  async getAvailableActions(): Promise<ProtocolAction[]> {
    return [
      ProtocolAction.SWAP,
      ProtocolAction.OPEN_POSITION,
      ProtocolAction.CLOSE_POSITION,
      ProtocolAction.ADD_COLLATERAL,
      ProtocolAction.REMOVE_COLLATERAL
    ];
  }
  
  async getUserPositions(address: string): Promise<ProtocolPosition[]> {
    if (!this.provider || !this.markets.length) {
      throw new Error('Provider not connected or markets not loaded');
    }
    
    try {
      const readerContract = new ethers.Contract(
        this.readerAddress,
        GMX_READER_ABI,
        this.provider
      );
      
      const marketAddresses = this.markets.map(m => m.address);
      const rawPositions = await readerContract.getPositions(
        this.dataStoreAddress,
        address,
        marketAddresses
      );
      
      // Filter out empty positions and transform to our format
      const positions: ProtocolPosition[] = rawPositions
        .filter((pos: any) => pos.size.gt(0))
        .map((pos: any, index: number) => {
          const market = this.markets.find(m => m.address.toLowerCase() === pos.market.toLowerCase());
          
          // Calculate position details
          const size = ethers.utils.formatUnits(pos.size, 30);
          const collateral = ethers.utils.formatUnits(pos.collateral, 30);
          const leverage = (parseFloat(size) / parseFloat(collateral)).toFixed(2);
          
          return {
            id: `gmx-${this.chainId}-${address}-${index}`,
            protocolId: ProtocolType.GMX,
            chainId: this.chainId,
            type: 'perpetual',
            assetSymbol: market?.symbol || 'Unknown',
            assetAddress: pos.market,
            positionSize: parseFloat(size),
            positionValue: parseFloat(size),
            entryPrice: parseFloat(ethers.utils.formatUnits(pos.averagePrice, 30)),
            leverage: parseFloat(leverage),
            unrealizedPnl: parseFloat(ethers.utils.formatUnits(pos.pnlHigh, 30)),
            direction: pos.isLong ? 'long' : 'short',
            timestamp: parseInt(pos.increasedAtTime.toString()),
            metadata: {
              market: pos.market,
              collateralToken: pos.collateralToken,
              liquidationPrice: '0', // Would need additional calculation
              fundingRate: ethers.utils.formatUnits(pos.fundingFeeAmountPerSize, 30)
            }
          };
        });
      
      return positions;
    } catch (error) {
      console.error('Failed to get GMX positions:', error);
      return [];
    }
  }
  
  async executeAction(action: ProtocolAction, params: any): Promise<boolean> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      switch (action) {
        case ProtocolAction.OPEN_POSITION:
          // Example: Opening a position on GMX
          // In production implementation, this would call GMX contract methods
          console.log('Opening GMX position with params:', params);
          
          // const exchangeRouter = new ethers.Contract(EXCHANGE_ROUTER_ADDRESS, EXCHANGE_ROUTER_ABI, this.signer);
          // const txn = await exchangeRouter.createIncreasePosition(
          //   [params.addresses],
          //   [params.numbers],
          //   params.orderType,
          //   { gasLimit: 5000000 }
          // );
          // await txn.wait();
          
          return true;
          
        case ProtocolAction.CLOSE_POSITION:
          // Example: Closing a position
          console.log('Closing GMX position with params:', params);
          return true;
          
        // Implement other actions
        
        default:
          throw new Error(`Action ${action} not supported for GMX`);
      }
    } catch (error) {
      console.error(`Failed to execute GMX action ${action}:`, error);
      return false;
    }
  }
  
  async getMarketData(marketAddress?: string): Promise<any> {
    // In a production implementation, fetch real market data from GMX contracts
    // For now, return mock data
    const allMarkets = marketAddress 
      ? this.markets.filter(m => m.address === marketAddress)
      : this.markets;
      
    return allMarkets.map(market => ({
      address: market.address,
      name: market.name,
      symbol: market.symbol,
      priceUsd: Math.random() * 2000 + 1000, // Mock price
      fundingRate: (Math.random() * 0.01 - 0.005), // Mock funding rate
      volumeUsd24h: Math.random() * 10000000, // Mock volume
      openInterestUsd: Math.random() * 50000000, // Mock OI
      longLiquidityUsd: Math.random() * 20000000, // Mock liquidity
      shortLiquidityUsd: Math.random() * 20000000 // Mock liquidity
    }));
  }
} 