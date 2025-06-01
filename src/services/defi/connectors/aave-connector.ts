import { ProtocolConnectorInterface } from '../protocol-connector-interface';
import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../../types/defi-protocol-types';
import axios from 'axios';
import { ethers } from 'ethers';
import * as AaveProtocolJS from '@aave/protocol-js';

// Aave networks configuration
const AAVE_NETWORKS = {
  // Ethereum Mainnet
  1: {
    v3: {
      marketName: 'proto_mainnet_v3',
      addresses: {
        LENDING_POOL_ADDRESS_PROVIDER: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
        LENDING_POOL: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        DATA_PROVIDER: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
        UI_POOL_DATA_PROVIDER: '0x91c0eA31b49B69Ea18607702c5d9aC360bf3dE7d'
      }
    }
  },
  // Polygon
  137: {
    v3: {
      marketName: 'proto_polygon_v3',
      addresses: {
        LENDING_POOL_ADDRESS_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
        LENDING_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        UI_POOL_DATA_PROVIDER: '0x7006e5a16E422868174d56b4eFa5332591eD3cbc'
      }
    }
  },
  // Avalanche
  43114: {
    v3: {
      marketName: 'proto_avalanche_v3',
      addresses: {
        LENDING_POOL_ADDRESS_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
        LENDING_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        UI_POOL_DATA_PROVIDER: '0x7006e5a16E422868174d56b4eFa5332591eD3cbc'
      }
    }
  },
  // Arbitrum
  42161: {
    v3: {
      marketName: 'proto_arbitrum_v3',
      addresses: {
        LENDING_POOL_ADDRESS_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
        LENDING_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
        UI_POOL_DATA_PROVIDER: '0x7006e5a16E422868174d56b4eFa5332591eD3cbc'
      }
    }
  },
};

interface ReserveData {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  aTokenAddress: string;
  debtTokenAddress: string;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: string;
  totalBorrow: string;
  utilizationRate: number;
  liquidationThreshold: number;
  ltv: number;
  priceUSD: number;
  isIsolated: boolean;
}

export class AaveConnector implements ProtocolConnectorInterface {
  private baseApiUrl: string = 'https://aave-api-v2.aave.com/data/v3';
  private chainId: number = 1; // Default to Ethereum mainnet
  private isAuthenticated: boolean = false;
  private userAddress?: string;
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private aavePool: ethers.Contract | null = null;
  private aaveDataProvider: ethers.Contract | null = null;
  
  constructor(chainId?: number) {
    if (chainId) {
      this.chainId = chainId;
    }
  }
  
  private getAaveAddresses(): any {
    const networkConfig = AAVE_NETWORKS[this.chainId];
    
    if (!networkConfig) {
      throw new Error(`Chain ID ${this.chainId} not supported by Aave`);
    }
    
    return networkConfig.v3.addresses;
  }
  
  async connect(credentials?: Record<string, string>): Promise<boolean> {
    try {
      // Check if credentials are provided
      if (!credentials) {
        throw new Error('No credentials provided');
      }
      
      // Set user address if provided
      if (credentials.address) {
        this.userAddress = credentials.address;
        this.isAuthenticated = true;
      }
      
      // Connect with signer if provided
      if (credentials.signer) {
        this.signer = credentials.signer as unknown as ethers.Signer;
        this.provider = this.signer.provider;
        
        if (this.provider) {
          const network = await this.provider.getNetwork();
          this.chainId = network.chainId;
          
          // Initialize Aave contracts
          await this.initContracts();
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Aave:', error);
      this.isAuthenticated = false;
      return false;
    }
  }
  
  private async initContracts(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }
    
    try {
      const addresses = this.getAaveAddresses();
      
      // Initialize Pool contract
      this.aavePool = new ethers.Contract(
        addresses.LENDING_POOL,
        AaveProtocolJS.PoolABI,
        this.provider
      );
      
      // Initialize Data Provider contract
      this.aaveDataProvider = new ethers.Contract(
        addresses.DATA_PROVIDER,
        AaveProtocolJS.PoolDataProviderABI,
        this.provider
      );
    } catch (error) {
      console.error('Failed to initialize Aave contracts:', error);
      throw error;
    }
  }
  
  async getProtocolInfo(): Promise<any> {
    return {
      name: 'Aave',
      description: 'Decentralized lending and borrowing protocol',
      type: ProtocolType.AAVE,
      website: 'https://aave.com',
      chainIds: Object.keys(AAVE_NETWORKS).map(Number),
      tvl: '$10B+',
    };
  }
  
  async getAvailableActions(): Promise<ProtocolAction[]> {
    return [
      ProtocolAction.SUPPLY,
      ProtocolAction.WITHDRAW,
      ProtocolAction.BORROW,
      ProtocolAction.REPAY
    ];
  }
  
  async getUserPositions(address: string): Promise<ProtocolPosition[]> {
    if (!address) {
      address = this.userAddress || '';
    }
    
    if (!address) {
      throw new Error('User address not provided');
    }
    
    try {
      const positions: ProtocolPosition[] = [];
      
      // Get both supply and borrow positions
      const supplyPositions = await this.getUserSupplyPositions(address);
      const borrowPositions = await this.getUserBorrowPositions(address);
      
      return [...supplyPositions, ...borrowPositions];
    } catch (error) {
      console.error('Failed to get Aave positions:', error);
      return [];
    }
  }
  
  private async getUserSupplyPositions(address: string): Promise<ProtocolPosition[]> {
    try {
      // In a production implementation, we would call the Aave contracts
      // For now, we call the API
      const apiUrl = `${this.baseApiUrl}/users/${address}/markets?marketName=${AAVE_NETWORKS[this.chainId]?.v3.marketName || 'proto_mainnet_v3'}`;
      const response = await axios.get(apiUrl);
      const marketsData = response.data?.marketsData || [];
      
      const supplyPositions: ProtocolPosition[] = [];
      
      for (const marketData of marketsData) {
        if (marketData.supplyBalance > 0) {
          supplyPositions.push({
            id: `aave-supply-${this.chainId}-${address}-${marketData.symbol}`,
            protocolId: ProtocolType.AAVE,
            chainId: this.chainId,
            type: 'supply',
            assetSymbol: marketData.symbol,
            assetAddress: marketData.underlyingAsset,
            positionSize: parseFloat(marketData.supplyBalance),
            positionValue: parseFloat(marketData.supplyBalance) * parseFloat(marketData.priceInUSD),
            entryPrice: parseFloat(marketData.priceInUSD),
            leverage: 1, // Supply positions don't have leverage
            unrealizedPnl: parseFloat(marketData.supplyAPY) * parseFloat(marketData.supplyBalance) * parseFloat(marketData.priceInUSD) / 365, // Daily interest
            direction: 'supply',
            timestamp: Date.now(), // Using current timestamp
            metadata: {
              marketId: marketData.underlyingAsset,
              apy: parseFloat(marketData.supplyAPY),
              aTokenAddress: marketData.aTokenAddress,
              isCollateral: marketData.usageAsCollateralEnabled,
              ltv: parseFloat(marketData.ltv),
              liquidationThreshold: parseFloat(marketData.liquidationThreshold)
            }
          });
        }
      }
      
      return supplyPositions;
    } catch (error) {
      console.error('Failed to get Aave supply positions:', error);
      return [];
    }
  }
  
  private async getUserBorrowPositions(address: string): Promise<ProtocolPosition[]> {
    try {
      // In a production implementation, we would call the Aave contracts
      // For now, we call the API
      const apiUrl = `${this.baseApiUrl}/users/${address}/markets?marketName=${AAVE_NETWORKS[this.chainId]?.v3.marketName || 'proto_mainnet_v3'}`;
      const response = await axios.get(apiUrl);
      const marketsData = response.data?.marketsData || [];
      
      const borrowPositions: ProtocolPosition[] = [];
      
      for (const marketData of marketsData) {
        if (marketData.borrowBalance > 0) {
          borrowPositions.push({
            id: `aave-borrow-${this.chainId}-${address}-${marketData.symbol}`,
            protocolId: ProtocolType.AAVE,
            chainId: this.chainId,
            type: 'borrow',
            assetSymbol: marketData.symbol,
            assetAddress: marketData.underlyingAsset,
            positionSize: parseFloat(marketData.borrowBalance),
            positionValue: parseFloat(marketData.borrowBalance) * parseFloat(marketData.priceInUSD),
            entryPrice: parseFloat(marketData.priceInUSD),
            leverage: 1, // Borrow positions don't have leverage
            unrealizedPnl: -parseFloat(marketData.borrowAPY) * parseFloat(marketData.borrowBalance) * parseFloat(marketData.priceInUSD) / 365, // Daily interest (negative for borrows)
            direction: 'borrow',
            timestamp: Date.now(), // Using current timestamp
            metadata: {
              marketId: marketData.underlyingAsset,
              apy: parseFloat(marketData.borrowAPY),
              debtTokenAddress: marketData.variableDebtTokenAddress,
              interestRateMode: 2, // Variable rate (2) vs Stable rate (1)
              isVariable: true
            }
          });
        }
      }
      
      return borrowPositions;
    } catch (error) {
      console.error('Failed to get Aave borrow positions:', error);
      return [];
    }
  }
  
  async executeAction(action: ProtocolAction, params?: any): Promise<any> {
    if (!this.signer) {
      throw new Error('Wallet not connected for transactions');
    }
    
    try {
      switch (action) {
        case ProtocolAction.SUPPLY:
          return this.supply(params);
          
        case ProtocolAction.WITHDRAW:
          return this.withdraw(params);
          
        case ProtocolAction.BORROW:
          return this.borrow(params);
          
        case ProtocolAction.REPAY:
          return this.repay(params);
          
        default:
          throw new Error(`Action ${action} not supported for Aave`);
      }
    } catch (error) {
      console.error(`Failed to execute Aave action ${action}:`, error);
      throw error;
    }
  }
  
  private async supply(params: {
    asset: string;
    amount: string;
    onBehalfOf?: string;
    referralCode?: number;
  }): Promise<any> {
    if (!this.signer || !this.aavePool) {
      throw new Error('Aave contracts not initialized or signer not available');
    }
    
    try {
      console.log('Supplying to Aave with params:', params);
      
      // In a production implementation, this would need to:
      // 1. Get approval for the token transfer
      // 2. Call the supply function on the LendingPool
      
      // Example of building the transaction (would need error handling and gas estimation)
      // const erc20Contract = new ethers.Contract(
      //   params.asset,
      //   IERC20_ABI,
      //   this.signer
      // );
      
      // // Approve spending
      // const amountWei = ethers.utils.parseUnits(params.amount, decimals);
      // const approveTx = await erc20Contract.approve(
      //   this.aavePool.address,
      //   amountWei
      // );
      // await approveTx.wait();
      
      // // Supply
      // const poolWithSigner = this.aavePool.connect(this.signer);
      // const supplyTx = await poolWithSigner.supply(
      //   params.asset,
      //   amountWei,
      //   params.onBehalfOf || await this.signer.getAddress(),
      //   params.referralCode || 0
      // );
      // const receipt = await supplyTx.wait();
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        asset: params.asset,
        amount: params.amount,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to supply to Aave:', error);
      throw error;
    }
  }
  
  private async withdraw(params: {
    asset: string;
    amount: string;
    aTokenAddress?: string;
    toAddress?: string;
  }): Promise<any> {
    if (!this.signer || !this.aavePool) {
      throw new Error('Aave contracts not initialized or signer not available');
    }
    
    try {
      console.log('Withdrawing from Aave with params:', params);
      
      // In a production implementation:
      // const poolWithSigner = this.aavePool.connect(this.signer);
      // const amountWei = ethers.utils.parseUnits(params.amount, decimals);
      // const withdrawTx = await poolWithSigner.withdraw(
      //   params.asset,
      //   amountWei,
      //   params.toAddress || await this.signer.getAddress()
      // );
      // const receipt = await withdrawTx.wait();
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        asset: params.asset,
        amount: params.amount,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to withdraw from Aave:', error);
      throw error;
    }
  }
  
  private async borrow(params: {
    asset: string;
    amount: string;
    interestRateType?: number; // 1 = stable, 2 = variable
    onBehalfOf?: string;
    referralCode?: number;
  }): Promise<any> {
    if (!this.signer || !this.aavePool) {
      throw new Error('Aave contracts not initialized or signer not available');
    }
    
    try {
      console.log('Borrowing from Aave with params:', params);
      
      // In a production implementation:
      // const poolWithSigner = this.aavePool.connect(this.signer);
      // const amountWei = ethers.utils.parseUnits(params.amount, decimals);
      // const borrowTx = await poolWithSigner.borrow(
      //   params.asset,
      //   amountWei,
      //   params.interestRateType || 2, // Default to variable rate
      //   params.referralCode || 0,
      //   params.onBehalfOf || await this.signer.getAddress()
      // );
      // const receipt = await borrowTx.wait();
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        asset: params.asset,
        amount: params.amount,
        interestRateType: params.interestRateType || 2,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to borrow from Aave:', error);
      throw error;
    }
  }
  
  private async repay(params: {
    asset: string;
    amount: string;
    interestRateType?: number; // 1 = stable, 2 = variable
    onBehalfOf?: string;
  }): Promise<any> {
    if (!this.signer || !this.aavePool) {
      throw new Error('Aave contracts not initialized or signer not available');
    }
    
    try {
      console.log('Repaying Aave loan with params:', params);
      
      // In a production implementation:
      // First, approve the spending
      // const erc20Contract = new ethers.Contract(
      //   params.asset,
      //   IERC20_ABI,
      //   this.signer
      // );
      
      // const amountWei = ethers.utils.parseUnits(params.amount, decimals);
      // const approveTx = await erc20Contract.approve(
      //   this.aavePool.address,
      //   amountWei
      // );
      // await approveTx.wait();
      
      // // Then repay
      // const poolWithSigner = this.aavePool.connect(this.signer);
      // const repayTx = await poolWithSigner.repay(
      //   params.asset,
      //   amountWei,
      //   params.interestRateType || 2, // Default to variable rate
      //   params.onBehalfOf || await this.signer.getAddress()
      // );
      // const receipt = await repayTx.wait();
      
      // For this simplified implementation, return mock data
      return {
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2, 42)}`,
        asset: params.asset,
        amount: params.amount,
        interestRateType: params.interestRateType || 2,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to repay Aave loan:', error);
      throw error;
    }
  }
  
  async getReserveData(): Promise<ReserveData[]> {
    try {
      // In a production implementation, we would call the Aave contracts
      // For now, we call the API
      const apiUrl = `${this.baseApiUrl}/markets?marketName=${AAVE_NETWORKS[this.chainId]?.v3.marketName || 'proto_mainnet_v3'}`;
      const response = await axios.get(apiUrl);
      const reserves = response.data?.reserves || [];
      
      return reserves.map((reserve: any) => ({
        symbol: reserve.symbol,
        name: reserve.name,
        decimals: parseInt(reserve.decimals),
        address: reserve.underlyingAsset,
        aTokenAddress: reserve.aTokenAddress,
        debtTokenAddress: reserve.variableDebtTokenAddress,
        supplyAPY: parseFloat(reserve.supplyAPY),
        borrowAPY: parseFloat(reserve.variableBorrowAPY),
        totalSupply: reserve.totalSupply,
        totalBorrow: reserve.totalDebt,
        utilizationRate: parseFloat(reserve.utilizationRate),
        liquidationThreshold: parseFloat(reserve.liquidationThreshold),
        ltv: parseFloat(reserve.ltv),
        priceUSD: parseFloat(reserve.priceInUSD),
        isIsolated: reserve.isIsolated
      }));
    } catch (error) {
      console.error('Failed to get Aave reserve data:', error);
      return [];
    }
  }
  
  async getUserHealthFactor(address?: string): Promise<number> {
    if (!address) {
      address = this.userAddress;
    }
    
    if (!address) {
      throw new Error('User address not provided');
    }
    
    try {
      // In a production implementation, we would call the Aave contracts
      // For now, we call the API
      const apiUrl = `${this.baseApiUrl}/users/${address}/summary?marketName=${AAVE_NETWORKS[this.chainId]?.v3.marketName || 'proto_mainnet_v3'}`;
      const response = await axios.get(apiUrl);
      
      return parseFloat(response.data?.userReserves?.healthFactor || '0');
    } catch (error) {
      console.error('Failed to get Aave user health factor:', error);
      return 0;
    }
  }
  
  async getUserAccountData(address?: string): Promise<any> {
    if (!address) {
      address = this.userAddress;
    }
    
    if (!address) {
      throw new Error('User address not provided');
    }
    
    try {
      // In a production implementation, we would call the Aave contracts
      // For now, we call the API
      const apiUrl = `${this.baseApiUrl}/users/${address}/summary?marketName=${AAVE_NETWORKS[this.chainId]?.v3.marketName || 'proto_mainnet_v3'}`;
      const response = await axios.get(apiUrl);
      
      const userData = response.data || {};
      
      return {
        totalCollateralUSD: parseFloat(userData.totalCollateralUSD || '0'),
        totalDebtUSD: parseFloat(userData.totalDebtUSD || '0'),
        availableBorrowsUSD: parseFloat(userData.availableBorrowsUSD || '0'),
        currentLiquidationThreshold: parseFloat(userData.currentLiquidationThreshold || '0'),
        ltv: parseFloat(userData.ltv || '0'),
        healthFactor: parseFloat(userData.healthFactor || '0'),
        netWorthUSD: parseFloat(userData.netWorthUSD || '0')
      };
    } catch (error) {
      console.error('Failed to get Aave user account data:', error);
      return {
        totalCollateralUSD: 0,
        totalDebtUSD: 0,
        availableBorrowsUSD: 0,
        currentLiquidationThreshold: 0,
        ltv: 0,
        healthFactor: 0,
        netWorthUSD: 0
      };
    }
  }
} 