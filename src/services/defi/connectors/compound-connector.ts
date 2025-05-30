import { ProtocolConnectorInterface } from '../protocol-connector-interface';
import { ProtocolAction, ProtocolPosition, ProtocolType } from '../../../types/defi-protocol-types';
import axios from 'axios';
import { ethers } from 'ethers';
import { ErrorHandler } from '../error-handler';

// Compound comptroller ABI (simplified)
const COMPTROLLER_ABI = [
  "function getAllMarkets() external view returns (address[] memory)",
  "function markets(address) external view returns (bool isListed, uint collateralFactorMantissa, bool isComped)",
  "function getAccountLiquidity(address) external view returns (uint, uint, uint)",
  "function enterMarkets(address[] memory) external returns (uint[] memory)",
  "function exitMarket(address) external returns (uint)"
];

// cToken ABI (simplified)
const CTOKEN_ABI = [
  "function decimals() external view returns (uint8)",
  "function underlying() external view returns (address)",
  "function symbol() external view returns (string memory)",
  "function name() external view returns (string memory)",
  "function balanceOf(address) external view returns (uint)",
  "function borrowBalanceCurrent(address) external returns (uint)",
  "function borrowBalanceStored(address) external view returns (uint)",
  "function balanceOfUnderlying(address) external returns (uint)",
  "function exchangeRateCurrent() external returns (uint)",
  "function exchangeRateStored() external view returns (uint)",
  "function supplyRatePerBlock() external view returns (uint)",
  "function borrowRatePerBlock() external view returns (uint)",
  "function getCash() external view returns (uint)",
  "function totalBorrows() external view returns (uint)",
  "function totalSupply() external view returns (uint)",
  "function totalReserves() external view returns (uint)",
  "function reserveFactorMantissa() external view returns (uint)",
  "function mint(uint) external returns (uint)",
  "function redeem(uint) external returns (uint)",
  "function redeemUnderlying(uint) external returns (uint)",
  "function borrow(uint) external returns (uint)",
  "function repayBorrow(uint) external returns (uint)",
  "function repayBorrowBehalf(address, uint) external returns (uint)"
];

// ERC20 ABI (simplified)
const ERC20_ABI = [
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string memory)",
  "function name() external view returns (string memory)",
  "function balanceOf(address) external view returns (uint)",
  "function allowance(address, address) external view returns (uint)",
  "function approve(address, uint) external returns (bool)"
];

// Compound v2 addresses by chain
const COMPOUND_ADDRESSES: Record<number, {comptroller: string, priceOracle: string}> = {
  1: { // Ethereum Mainnet
    comptroller: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
    priceOracle: '0x922018674c12a7F0D394ebEEf9B58F186CdE13c1'
  },
  137: { // Polygon
    comptroller: '0x20CA53E2395FA571798623F1cFBD11Fe2C114c24',
    priceOracle: '0x2Cf7C0333D9c8648a35C373fEE7275136D8B31fA'
  }
};

/**
 * Connector for Compound protocol
 */
export class CompoundConnector implements ProtocolConnectorInterface {
  private apiBaseUrl: string = 'https://api.compound.finance/api/v2';
  private chainId: number = 1; // Default to Ethereum mainnet
  private comptrollerAddress: string;
  private priceOracleAddress: string;
  private isAuthenticated: boolean = false;
  private userAddress?: string;
  private provider?: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private errorHandler: ErrorHandler;
  
  constructor(chainId?: number) {
    this.errorHandler = ErrorHandler.getInstance();
    
    this.chainId = chainId || 1;
    const addresses = COMPOUND_ADDRESSES[this.chainId];
    
    if (!addresses) {
      throw new Error(`Compound is not supported on chain ${this.chainId}`);
    }
    
    this.comptrollerAddress = addresses.comptroller;
    this.priceOracleAddress = addresses.priceOracle;
  }
  
  /**
   * Connect to Compound protocol
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
      this.errorHandler.handleError(error, 'Compound', 'CONNECT');
      return false;
    }
  }
  
  /**
   * Get protocol information
   */
  async getProtocolInfo(): Promise<any> {
    return {
      name: 'Compound',
      type: ProtocolType.COMPOUND,
      chainId: this.chainId,
      website: 'https://compound.finance',
      description: 'Compound is an algorithmic, autonomous interest rate protocol built for developers',
      logoUrl: 'https://compound.finance/images/compound-mark.svg'
    };
  }
  
  /**
   * Get user positions on Compound
   */
  async getUserPositions(address?: string): Promise<ProtocolPosition[]> {
    try {
      const userAddress = address || this.userAddress;
      
      if (!userAddress) {
        throw new Error('User address not provided');
      }
      
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      const positions: ProtocolPosition[] = [];
      
      // Get Comptroller contract
      const comptrollerContract = new ethers.Contract(
        this.comptrollerAddress,
        COMPTROLLER_ABI,
        this.provider
      );
      
      // Get all markets
      const markets = await comptrollerContract.getAllMarkets();
      
      // Get account liquidity
      const [error, liquidity, shortfall] = await comptrollerContract.getAccountLiquidity(userAddress);
      
      // Calculate health factor
      const healthFactor = shortfall.isZero() 
        ? (liquidity.isZero() ? 1 : 999) // Max health factor if no borrowing
        : parseFloat(ethers.utils.formatEther(liquidity)) / parseFloat(ethers.utils.formatEther(shortfall));
      
      // Process each market
      for (const cTokenAddress of markets) {
        try {
          // Get cToken contract
          const cTokenContract = new ethers.Contract(
            cTokenAddress,
            CTOKEN_ABI,
            this.provider
          );
          
          // Get cToken symbol
          const cTokenSymbol = await cTokenContract.symbol();
          
          // Check if user has supply or borrow position
          const cTokenBalance = await cTokenContract.balanceOf(userAddress);
          const borrowBalance = await cTokenContract.borrowBalanceStored(userAddress);
          
          // Skip if no position in this market
          if (cTokenBalance.isZero() && borrowBalance.isZero()) {
            continue;
          }
          
          // Get underlying token
          let underlyingAddress;
          let underlyingSymbol;
          let underlyingDecimals;
          
          try {
            // For non-ETH markets
            underlyingAddress = await cTokenContract.underlying();
            const underlyingContract = new ethers.Contract(
              underlyingAddress,
              ERC20_ABI,
              this.provider
            );
            underlyingSymbol = await underlyingContract.symbol();
            underlyingDecimals = await underlyingContract.decimals();
          } catch (error) {
            // For ETH market (cETH)
            underlyingAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
            underlyingSymbol = 'ETH';
            underlyingDecimals = 18;
          }
          
          // Get exchange rate
          const exchangeRate = await cTokenContract.exchangeRateStored();
          
          // Get supply and borrow rates
          const supplyRatePerBlock = await cTokenContract.supplyRatePerBlock();
          const borrowRatePerBlock = await cTokenContract.borrowRatePerBlock();
          
          // Calculate annual rates (assuming ~2.1M blocks per year)
          const blocksPerYear = 2102400;
          const supplyAPY = (Math.pow((1 + (parseFloat(supplyRatePerBlock.toString()) / 1e18)), blocksPerYear) - 1) * 100;
          const borrowAPY = (Math.pow((1 + (parseFloat(borrowRatePerBlock.toString()) / 1e18)), blocksPerYear) - 1) * 100;
          
          // Calculate supply value
          if (!cTokenBalance.isZero()) {
            const supplyAmountUnderlying = cTokenBalance
              .mul(exchangeRate)
              .div(ethers.BigNumber.from(10).pow(18));
            
            const supplyAmountUnderlyingFormatted = ethers.utils.formatUnits(
              supplyAmountUnderlying,
              underlyingDecimals
            );
            
            // Get underlying token price (simplified, would need a price oracle in production)
            const price = await this.getTokenPrice(underlyingAddress);
            
            // Calculate USD value
            const supplyValueUSD = parseFloat(supplyAmountUnderlyingFormatted) * price;
            
            // Add supply position
            positions.push({
              id: `compound-supply-${this.chainId}-${cTokenAddress}-${userAddress}`,
              protocolId: ProtocolType.COMPOUND,
              chainId: this.chainId,
              assetSymbol: underlyingSymbol,
              assetAddress: underlyingAddress,
              positionType: 'supply',
              direction: 'supply',
              positionValue: supplyValueUSD,
              tokenAmount: supplyAmountUnderlyingFormatted,
              leverage: 1,
              collateral: [],
              healthFactor: healthFactor,
              metadata: {
                cTokenAddress,
                cTokenSymbol,
                supplyAPY,
                exchangeRate: exchangeRate.toString()
              }
            });
          }
          
          // Calculate borrow value
          if (!borrowBalance.isZero()) {
            const borrowAmountFormatted = ethers.utils.formatUnits(
              borrowBalance,
              underlyingDecimals
            );
            
            // Get underlying token price (simplified, would need a price oracle in production)
            const price = await this.getTokenPrice(underlyingAddress);
            
            // Calculate USD value
            const borrowValueUSD = parseFloat(borrowAmountFormatted) * price;
            
            // Add borrow position
            positions.push({
              id: `compound-borrow-${this.chainId}-${cTokenAddress}-${userAddress}`,
              protocolId: ProtocolType.COMPOUND,
              chainId: this.chainId,
              assetSymbol: underlyingSymbol,
              assetAddress: underlyingAddress,
              positionType: 'borrow',
              direction: 'borrow',
              positionValue: borrowValueUSD,
              tokenAmount: borrowAmountFormatted,
              leverage: 1,
              collateral: [],
              healthFactor: healthFactor,
              metadata: {
                cTokenAddress,
                cTokenSymbol,
                borrowAPY,
              }
            });
          }
        } catch (error) {
          console.error(`Error processing market ${cTokenAddress}:`, error);
          // Continue with next market
        }
      }
      
      return positions;
    } catch (error) {
      this.errorHandler.handleError(error, 'Compound', 'GET_POSITIONS');
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
        case ProtocolAction.SUPPLY:
          return await this.supply(params);
        case ProtocolAction.WITHDRAW:
          return await this.withdraw(params);
        case ProtocolAction.BORROW:
          return await this.borrow(params);
        case ProtocolAction.REPAY:
          return await this.repay(params);
        case ProtocolAction.ENABLE_COLLATERAL:
          return await this.enterMarkets(params);
        case ProtocolAction.DISABLE_COLLATERAL:
          return await this.exitMarket(params);
        default:
          throw new Error(`Action ${action} not supported`);
      }
    } catch (error) {
      this.errorHandler.handleError(error, 'Compound', action.toString());
      throw error;
    }
  }
  
  /**
   * Supply assets to Compound
   */
  private async supply(params: any): Promise<any> {
    const { cTokenAddress, amount, approveFirst = true } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get cToken contract
    const cTokenContract = new ethers.Contract(
      cTokenAddress,
      CTOKEN_ABI,
      this.signer
    );
    
    // For cETH, handle direct ETH supply
    if (cTokenAddress.toLowerCase() === '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5'.toLowerCase()) {
      // This is cETH on mainnet
      // Supply ETH directly
      const tx = await cTokenContract.mint({
        value: amount,
        gasLimit: 3000000
      });
      
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    }
    
    // For other tokens, approve first if needed
    if (approveFirst) {
      // Get underlying token
      const underlyingAddress = await cTokenContract.underlying();
      const underlyingContract = new ethers.Contract(
        underlyingAddress,
        ERC20_ABI,
        this.signer
      );
      
      // Approve cToken to spend underlying
      const approveTx = await underlyingContract.approve(cTokenAddress, amount);
      await approveTx.wait();
    }
    
    // Supply tokens
    const tx = await cTokenContract.mint(amount, { gasLimit: 3000000 });
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Withdraw assets from Compound
   */
  private async withdraw(params: any): Promise<any> {
    const { cTokenAddress, amount, redeemAll = false } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get cToken contract
    const cTokenContract = new ethers.Contract(
      cTokenAddress,
      CTOKEN_ABI,
      this.signer
    );
    
    let tx;
    
    if (redeemAll) {
      // Get user cToken balance
      const userAddress = await this.signer.getAddress();
      const cTokenBalance = await cTokenContract.balanceOf(userAddress);
      
      // Redeem all cTokens
      tx = await cTokenContract.redeem(cTokenBalance, { gasLimit: 3000000 });
    } else {
      // Redeem specific amount of underlying
      tx = await cTokenContract.redeemUnderlying(amount, { gasLimit: 3000000 });
    }
    
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Borrow assets from Compound
   */
  private async borrow(params: any): Promise<any> {
    const { cTokenAddress, amount } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get cToken contract
    const cTokenContract = new ethers.Contract(
      cTokenAddress,
      CTOKEN_ABI,
      this.signer
    );
    
    // Borrow tokens
    const tx = await cTokenContract.borrow(amount, { gasLimit: 3000000 });
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Repay borrowed assets on Compound
   */
  private async repay(params: any): Promise<any> {
    const { cTokenAddress, amount, approveFirst = true, repayBehalf = null } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get cToken contract
    const cTokenContract = new ethers.Contract(
      cTokenAddress,
      CTOKEN_ABI,
      this.signer
    );
    
    // For cETH, handle direct ETH repayment
    if (cTokenAddress.toLowerCase() === '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5'.toLowerCase()) {
      // This is cETH on mainnet
      
      let tx;
      if (repayBehalf) {
        // Repay on behalf of another account
        tx = await cTokenContract.repayBorrowBehalf(repayBehalf, {
          value: amount,
          gasLimit: 3000000
        });
      } else {
        // Repay own borrow
        tx = await cTokenContract.repayBorrow({
          value: amount,
          gasLimit: 3000000
        });
      }
      
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    }
    
    // For other tokens, approve first if needed
    if (approveFirst) {
      // Get underlying token
      const underlyingAddress = await cTokenContract.underlying();
      const underlyingContract = new ethers.Contract(
        underlyingAddress,
        ERC20_ABI,
        this.signer
      );
      
      // Approve cToken to spend underlying
      const approveTx = await underlyingContract.approve(cTokenAddress, amount);
      await approveTx.wait();
    }
    
    // Repay tokens
    let tx;
    if (repayBehalf) {
      // Repay on behalf of another account
      tx = await cTokenContract.repayBorrowBehalf(repayBehalf, amount, { gasLimit: 3000000 });
    } else {
      // Repay own borrow
      tx = await cTokenContract.repayBorrow(amount, { gasLimit: 3000000 });
    }
    
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Enter markets (enable as collateral)
   */
  private async enterMarkets(params: any): Promise<any> {
    const { cTokenAddresses } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get Comptroller contract
    const comptrollerContract = new ethers.Contract(
      this.comptrollerAddress,
      COMPTROLLER_ABI,
      this.signer
    );
    
    // Enter markets
    const tx = await comptrollerContract.enterMarkets(cTokenAddresses, { gasLimit: 3000000 });
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Exit market (disable as collateral)
   */
  private async exitMarket(params: any): Promise<any> {
    const { cTokenAddress } = params;
    
    if (!this.signer) {
      throw new Error('Signer not available');
    }
    
    // Get Comptroller contract
    const comptrollerContract = new ethers.Contract(
      this.comptrollerAddress,
      COMPTROLLER_ABI,
      this.signer
    );
    
    // Exit market
    const tx = await comptrollerContract.exitMarket(cTokenAddress, { gasLimit: 3000000 });
    const receipt = await tx.wait();
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }
  
  /**
   * Get all Compound markets
   */
  async getMarkets(): Promise<any[]> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }
      
      // Get Comptroller contract
      const comptrollerContract = new ethers.Contract(
        this.comptrollerAddress,
        COMPTROLLER_ABI,
        this.provider
      );
      
      // Get all markets
      const cTokenAddresses = await comptrollerContract.getAllMarkets();
      
      // Get market details for each cToken
      const marketsPromises = cTokenAddresses.map(async (cTokenAddress: string) => {
        try {
          // Get cToken contract
          const cTokenContract = new ethers.Contract(
            cTokenAddress,
            CTOKEN_ABI,
            this.provider
          );
          
          // Get cToken symbol and name
          const cTokenSymbol = await cTokenContract.symbol();
          const cTokenName = await cTokenContract.name();
          
          // Get market info
          const [isListed, collateralFactor, isComped] = await comptrollerContract.markets(cTokenAddress);
          
          // Get underlying token
          let underlyingAddress;
          let underlyingSymbol;
          let underlyingDecimals;
          
          try {
            // For non-ETH markets
            underlyingAddress = await cTokenContract.underlying();
            const underlyingContract = new ethers.Contract(
              underlyingAddress,
              ERC20_ABI,
              this.provider
            );
            underlyingSymbol = await underlyingContract.symbol();
            underlyingDecimals = await underlyingContract.decimals();
          } catch (error) {
            // For ETH market (cETH)
            underlyingAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
            underlyingSymbol = 'ETH';
            underlyingDecimals = 18;
          }
          
          // Get exchange rate
          const exchangeRate = await cTokenContract.exchangeRateStored();
          
          // Get supply and borrow rates
          const supplyRatePerBlock = await cTokenContract.supplyRatePerBlock();
          const borrowRatePerBlock = await cTokenContract.borrowRatePerBlock();
          
          // Calculate annual rates (assuming ~2.1M blocks per year)
          const blocksPerYear = 2102400;
          const supplyAPY = (Math.pow((1 + (parseFloat(supplyRatePerBlock.toString()) / 1e18)), blocksPerYear) - 1) * 100;
          const borrowAPY = (Math.pow((1 + (parseFloat(borrowRatePerBlock.toString()) / 1e18)), blocksPerYear) - 1) * 100;
          
          // Get liquidity info
          const cash = await cTokenContract.getCash();
          const totalBorrows = await cTokenContract.totalBorrows();
          const totalSupply = await cTokenContract.totalSupply();
          const totalReserves = await cTokenContract.totalReserves();
          
          // Get token price (simplified, would need a price oracle in production)
          const price = await this.getTokenPrice(underlyingAddress);
          
          return {
            cTokenAddress,
            cTokenSymbol,
            cTokenName,
            underlyingAddress,
            underlyingSymbol,
            underlyingDecimals,
            isListed,
            collateralFactor: collateralFactor.toString(),
            isComped,
            exchangeRate: exchangeRate.toString(),
            supplyAPY,
            borrowAPY,
            liquidity: ethers.utils.formatUnits(cash, underlyingDecimals),
            totalBorrows: ethers.utils.formatUnits(totalBorrows, underlyingDecimals),
            totalSupply: totalSupply.toString(),
            utilization: totalBorrows.mul(ethers.constants.WeiPerEther).div(cash.add(totalBorrows).sub(totalReserves)).toString(),
            price
          };
        } catch (error) {
          console.error(`Error processing market ${cTokenAddress}:`, error);
          return null;
        }
      });
      
      const markets = await Promise.all(marketsPromises);
      
      // Filter out null markets
      return markets.filter(m => m !== null);
    } catch (error) {
      this.errorHandler.handleError(error, 'Compound', 'GET_MARKETS');
      return [];
    }
  }
  
  /**
   * Get token price (simplified implementation)
   * In a production environment, this would use a proper price oracle
   */
  private async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      // Use CoinGecko or another price feed in production
      // This is a simplified implementation that returns dummy prices
      const knownPrices: Record<string, number> = {
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': 1800, // ETH
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1, // USDC
        '0x6B175474E89094C44Da98b954EedeAC495271d0F': 1, // DAI
        '0xdAC17F958D2ee523a2206206994597C13D831ec7': 1, // USDT
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 27000 // WBTC
      };
      
      const tokenAddressLower = tokenAddress.toLowerCase();
      
      // Return known price or fallback to 1
      return knownPrices[tokenAddressLower] || 1;
    } catch (error) {
      console.error('Error getting token price:', error);
      return 1; // Default to 1 USD in case of error
    }
  }
} 