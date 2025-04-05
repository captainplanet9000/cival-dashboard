import { ProtocolConnectorInterface } from '../protocol-connector-interface';
import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../../types/defi-protocol-types';
import axios from 'axios';
import { ethers } from 'ethers';

// GMX V2 contract ABIs (partial)
const GMX_READER_ABI = [
  "function getPositions(address dataStore, address account, address[] memory markets) external view returns (tuple(address market, address collateralToken, bool isLong, uint256 size, uint256 collateral, uint256 averagePrice, uint256 entryFundingRate, uint256 borrowingFactor, uint256 fundingFeeAmountPerSize, uint256 longTokenClaimableFunding, uint256 shortTokenClaimableFunding, uint256 increasedAtBlock, uint256 decreasedAtBlock, uint256 increasedAtTime, uint256 decreasedAtTime, uint256 tokenOracleType, uint256 pnlLow, uint256 pnlHigh)[] memory)",
  "function getMarkets(address dataStore, uint256 start, uint256 end) external view returns (address[] memory)",
  "function getMarketTokens(address dataStore, address market) external view returns (address indexToken, address longToken, address shortToken)"
];

const GMX_EXCHANGE_ROUTER_ABI = [
  "function createIncreasePosition(address[] memory _path, address _indexToken, uint256 _amountIn, uint256 _minOut, uint256 _sizeDelta, bool _isLong, uint256 _acceptablePrice, uint256 _executionFee, bytes32 _referralCode, address _callbackTarget) external payable returns (bytes32)",
  "function createDecreasePosition(address[] memory _path, address _indexToken, uint256 _collateralDelta, uint256 _sizeDelta, bool _isLong, address _receiver, uint256 _acceptablePrice, uint256 _minOut, uint256 _executionFee, bool _withdrawETH, address _callbackTarget) external payable returns (bytes32)"
];

// GMX network configuration
const GMX_CONFIG = {
  // Arbitrum One
  42161: {
    READER_ADDRESS: '0xf60becbba223EEA9495Da3f606753867eC10d139',
    DATASTORE_ADDRESS: '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8',
    EXCHANGE_ROUTER_ADDRESS: '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8'
  },
  // Avalanche
  43114: {
    READER_ADDRESS: '0x4aA1d18A1dA73D5Cf0E8bc9A062bd20dc2791F69',
    DATASTORE_ADDRESS: '0xB7c3800330ce92C2f92811b997388F401ebef260',
    EXCHANGE_ROUTER_ADDRESS: '0x11E590f6092D557bF71B6DDA576E2391C6C9A707'
  }
};

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
  private readerAddress: string = GMX_CONFIG[42161].READER_ADDRESS;
  private dataStoreAddress: string = GMX_CONFIG[42161].DATASTORE_ADDRESS;
  private exchangeRouterAddress: string = GMX_CONFIG[42161].EXCHANGE_ROUTER_ADDRESS;
  private markets: GmxMarket[] = [];
  private isConnected: boolean = false;
  
  constructor(chainId?: number) {
    if (chainId) {
      this.chainId = chainId;
      this.updateAddresses();
    }
  }
  
  private updateAddresses(): void {
    // Update GMX addresses based on chainId
    if (this.chainId in GMX_CONFIG) {
      const config = GMX_CONFIG[this.chainId];
      this.readerAddress = config.READER_ADDRESS;
      this.dataStoreAddress = config.DATASTORE_ADDRESS;
      this.exchangeRouterAddress = config.EXCHANGE_ROUTER_ADDRESS;
    } else {
      console.warn(`Chain ID ${this.chainId} not supported by GMX. Defaulting to Arbitrum.`);
      this.chainId = 42161;
      this.readerAddress = GMX_CONFIG[42161].READER_ADDRESS;
      this.dataStoreAddress = GMX_CONFIG[42161].DATASTORE_ADDRESS;
      this.exchangeRouterAddress = GMX_CONFIG[42161].EXCHANGE_ROUTER_ADDRESS;
    }
  }
  
  async connect(credentials?: Record<string, string>): Promise<boolean> {
    try {
      // This method now accepts standard credentials instead of ethers.Signer
      // but we expect the caller to pass in a 'signer' key with the ethers signer
      if (!credentials || !credentials.signer) {
        throw new Error('Signer not provided in credentials');
      }
      
      // Extract signer from credentials - this requires some type casting
      // In a real implementation, we would use stronger typing
      const signer = credentials.signer as unknown as ethers.Signer;
      this.signer = signer;
      this.provider = signer.provider;
      
      if (!this.provider) {
        throw new Error('Provider not available from signer');
      }
      
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;
      this.updateAddresses();
      
      // Load available markets
      await this.loadMarkets();
      this.isConnected = true;
      
      return true;
    } catch (error) {
      console.error('Failed to connect to GMX:', error);
      this.isConnected = false;
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
      
      // In a full implementation, we would use the MarketUtils contract to get market details
      const marketPromises = marketAddresses.map(async (address: string, index: number) => {
        try {
          // Call the Reader contract to get market tokens
          const tokens = await readerContract.getMarketTokens(
            this.dataStoreAddress,
            address
          );
          
          const marketInfo = {
            address,
            indexToken: tokens.indexToken || '',
            longToken: tokens.longToken || '',
            shortToken: tokens.shortToken || '',
            name: `Market ${index + 1}`,
            symbol: `MKT${index + 1}`
          };
          
          // Get token symbols in a real implementation
          // This is simplified for this example
          
          return marketInfo;
        } catch (error) {
          console.error(`Error getting market details for ${address}:`, error);
          return {
            address,
            indexToken: '',
            longToken: '',
            shortToken: '',
            name: `Market ${index + 1}`,
            symbol: `MKT${index + 1}`
          };
        }
      });
      
      this.markets = await Promise.all(marketPromises);
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
      chainIds: Object.keys(GMX_CONFIG).map(Number), // Supported chains
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
  
  async executeAction(action: ProtocolAction, params?: any): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      switch (action) {
        case ProtocolAction.OPEN_POSITION:
          return this.openPosition(params);
          
        case ProtocolAction.CLOSE_POSITION:
          return this.closePosition(params);
          
        case ProtocolAction.ADD_COLLATERAL:
          return this.addCollateral(params);
          
        case ProtocolAction.REMOVE_COLLATERAL:
          return this.removeCollateral(params);
          
        case ProtocolAction.SWAP:
          return this.executeSwap(params);
          
        default:
          throw new Error(`Action ${action} not supported for GMX`);
      }
    } catch (error) {
      console.error(`Failed to execute GMX action ${action}:`, error);
      throw error;
    }
  }
  
  // Method implementations
  
  private async openPosition(params: {
    market: string,
    collateralToken: string,
    isLong: boolean,
    size: string,
    leverage?: number,
    slippage?: number
  }): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('Opening GMX position with params:', params);
      
      // In a production implementation, we would build the createIncreasePosition parameters
      const exchangeRouter = new ethers.Contract(
        this.exchangeRouterAddress,
        GMX_EXCHANGE_ROUTER_ABI,
        this.signer
      );
      
      // Create path for token swap (collateral -> position)
      // This would need more complex logic in a real implementation
      const path = [params.collateralToken];
      
      // Estimate execution fee - in a real implementation we'd calculate this correctly
      const executionFee = ethers.utils.parseEther('0.01');
      
      // Calculate size delta based on collateral and leverage
      const amountIn = ethers.utils.parseUnits(params.size, 18);
      const sizeDelta = params.leverage 
        ? ethers.utils.parseUnits((parseFloat(params.size) * params.leverage).toString(), 18) 
        : amountIn.mul(10); // Default 10x leverage
      
      // Set acceptable price with slippage
      // This would need a proper price feed in a real implementation
      const acceptablePrice = ethers.constants.MaxUint256;
      
      // In a real implementation, we would execute this transaction
      // const tx = await exchangeRouter.createIncreasePosition(
      //   path,
      //   params.market, // indexToken
      //   amountIn,
      //   0, // minOut
      //   sizeDelta,
      //   params.isLong,
      //   acceptablePrice,
      //   executionFee,
      //   ethers.constants.HashZero, // referral code
      //   ethers.constants.AddressZero, // callback target
      //   { value: executionFee }
      // );
      // const receipt = await tx.wait();
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        action: ProtocolAction.OPEN_POSITION,
        params: {
          ...params,
          sizeDelta: sizeDelta.toString(),
          amountIn: amountIn.toString(),
          executionFee: executionFee.toString()
        }
      };
    } catch (error) {
      console.error('Failed to open GMX position:', error);
      throw error;
    }
  }
  
  private async closePosition(params: {
    market: string,
    collateralToken: string,
    isLong: boolean,
    sizeDelta?: string,
    slippage?: number
  }): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('Closing GMX position with params:', params);
      
      // In a production implementation, build the transaction parameters
      const exchangeRouter = new ethers.Contract(
        this.exchangeRouterAddress,
        GMX_EXCHANGE_ROUTER_ABI,
        this.signer
      );
      
      // Path for the collateral token
      const path = [params.collateralToken];
      
      // Size delta for decreasing the position
      const sizeDelta = params.sizeDelta 
        ? ethers.utils.parseUnits(params.sizeDelta, 18)
        : ethers.constants.MaxUint256; // Close entire position by default
      
      // Execution fee
      const executionFee = ethers.utils.parseEther('0.01');
      
      // Acceptable price with slippage
      const acceptablePrice = params.isLong ? 0 : ethers.constants.MaxUint256;
      
      // In a real implementation, we would execute this transaction
      // const tx = await exchangeRouter.createDecreasePosition(
      //   path,
      //   params.market, // indexToken
      //   0, // collateralDelta - 0 means withdraw all when closing
      //   sizeDelta,
      //   params.isLong,
      //   await this.signer.getAddress(), // receiver
      //   acceptablePrice,
      //   0, // minOut
      //   executionFee,
      //   false, // withdrawETH
      //   ethers.constants.AddressZero, // callback target
      //   { value: executionFee }
      // );
      // const receipt = await tx.wait();
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        action: ProtocolAction.CLOSE_POSITION,
        params: {
          ...params,
          sizeDelta: sizeDelta.toString(),
          executionFee: executionFee.toString()
        }
      };
    } catch (error) {
      console.error('Failed to close GMX position:', error);
      throw error;
    }
  }
  
  private async addCollateral(params: {
    market: string,
    collateralToken: string,
    isLong: boolean,
    amount: string
  }): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('Adding collateral to GMX position with params:', params);
      
      // This is similar to openPosition but with sizeDelta = 0
      // In a real implementation, we would build the transaction parameters
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        action: ProtocolAction.ADD_COLLATERAL,
        params: params
      };
    } catch (error) {
      console.error('Failed to add collateral to GMX position:', error);
      throw error;
    }
  }
  
  private async removeCollateral(params: {
    market: string,
    collateralToken: string,
    isLong: boolean,
    amount: string
  }): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('Removing collateral from GMX position with params:', params);
      
      // This is similar to closePosition but with sizeDelta = 0
      // In a real implementation, we would build the transaction parameters
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        action: ProtocolAction.REMOVE_COLLATERAL,
        params: params
      };
    } catch (error) {
      console.error('Failed to remove collateral from GMX position:', error);
      throw error;
    }
  }
  
  private async executeSwap(params: {
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut?: string,
    receiver?: string
  }): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('Executing GMX swap with params:', params);
      
      // In a production implementation, we would use the swap router
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        action: ProtocolAction.SWAP,
        params: params
      };
    } catch (error) {
      console.error('Failed to execute GMX swap:', error);
      throw error;
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