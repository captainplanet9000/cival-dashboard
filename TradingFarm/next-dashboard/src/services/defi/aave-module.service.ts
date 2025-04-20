import { ethers } from 'ethers';
import { SupportedChainId } from '@/types/chains';
import { 
  AaveChainConfig, 
  AssetConfig,
  UserAccountData,
  InterestRateMode,
  FlashLoanRequest
} from '@/types/defi-lending.types';
import SafeManager from './safe-manager.service';

// Aave V3 contract ABIs (simplified for this implementation)
const poolAbi = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)',
  'function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode)',
  'function flashLoan(address receiverAddress, address[] calldata assets, uint256[] calldata amounts, uint256[] interestRateModes, address onBehalfOf, bytes calldata params, uint16 referralCode)'
];

const dataProviderAbi = [
  'function getReserveData(address asset) view returns (tuple(uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id))',
  'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)'
];

const erc20Abi = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const addressProviderAbi = [
  'function getPool() view returns (address)',
  'function getPriceOracle() view returns (address)',
  'function getPoolDataProvider() view returns (address)'
];

/**
 * Service for interacting with Aave V3 on different chains
 * Handles all Aave-specific operations like:
 * - Supply/withdraw collateral
 * - Borrow/repay debt
 * - Flash loans
 * - Getting user position data
 */
export class AaveModule {
  private providers: Record<SupportedChainId, ethers.providers.JsonRpcProvider> = {} as any;
  private poolContracts: Record<SupportedChainId, ethers.Contract> = {} as any;
  private dataProviderContracts: Record<SupportedChainId, ethers.Contract> = {} as any;
  private addressProviderContracts: Record<SupportedChainId, ethers.Contract> = {} as any;
  private assetConfigsByChain: Record<SupportedChainId, Record<string, AssetConfig>> = {} as any;
  
  /**
   * Initialize the Aave Module with configuration for all supported chains
   */
  constructor(
    private readonly safeManager: SafeManager,
    private readonly chainConfigs: Record<SupportedChainId, AaveChainConfig>,
    private readonly rpcUrls: Record<SupportedChainId, string>
  ) {
    // Initialize providers and contracts for each chain
    Object.entries(this.rpcUrls).forEach(([chainIdStr, url]) => {
      const chainId = parseInt(chainIdStr) as SupportedChainId;
      const chainConfig = this.chainConfigs[chainId];
      
      if (chainConfig) {
        this.providers[chainId] = new ethers.providers.JsonRpcProvider(url);
        
        // Initialize contracts
        this.poolContracts[chainId] = new ethers.Contract(
          chainConfig.poolAddress,
          poolAbi,
          this.providers[chainId]
        );
        
        if (chainConfig.protocolDataProviderAddress) {
          this.dataProviderContracts[chainId] = new ethers.Contract(
            chainConfig.protocolDataProviderAddress,
            dataProviderAbi,
            this.providers[chainId]
          );
        }
        
        this.addressProviderContracts[chainId] = new ethers.Contract(
          chainConfig.poolAddressProviderAddress,
          addressProviderAbi,
          this.providers[chainId]
        );
      }
    });
    
    // Initialize asset configs (this would typically be loaded from an API or on-chain)
    this.initializeAssetConfigs();
  }
  
  /**
   * Initialize asset configurations for each chain
   * In a real implementation, this would be fetched from Aave's on-chain data or an API
   */
  private async initializeAssetConfigs(): Promise<void> {
    // For each chain, load the supported assets
    // This is a placeholder and would be replaced by actual implementations
    for (const chainId of Object.keys(this.chainConfigs).map(Number)) {
      this.assetConfigsByChain[chainId] = {};
      
      // In a real implementation, we would fetch this data from the Aave contracts
      // or an API. For now we'll use placeholder data.
      const mockAssets = await this.getMockAssetsForChain(chainId as SupportedChainId);
      
      for (const asset of mockAssets) {
        this.assetConfigsByChain[chainId][asset.address.toLowerCase()] = asset;
      }
    }
  }
  
  /**
   * Get mock asset data for a chain (placeholder for real implementation)
   */
  private async getMockAssetsForChain(chainId: SupportedChainId): Promise<AssetConfig[]> {
    // In production, we would get this data from Aave's contracts or API
    // This is just placeholder data for demonstration
    if (chainId === 1) { // Ethereum
      return [
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          decimals: 18,
          isActive: true,
          canBeCollateral: true,
          ltv: 80,
          liquidationThreshold: 82.5,
          liquidationBonus: 5
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          decimals: 6,
          isActive: true,
          canBeCollateral: true,
          ltv: 80,
          liquidationThreshold: 85,
          liquidationBonus: 5
        }
      ];
    } else if (chainId === 42161) { // Arbitrum
      return [
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          decimals: 18,
          isActive: true,
          canBeCollateral: true,
          ltv: 80,
          liquidationThreshold: 82.5,
          liquidationBonus: 5
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          decimals: 6,
          isActive: true,
          canBeCollateral: true,
          ltv: 80,
          liquidationThreshold: 85,
          liquidationBonus: 5
        }
      ];
    } else if (chainId === 8453) { // Base
      return [
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          address: '0x4200000000000000000000000000000000000006',
          decimals: 18,
          isActive: true,
          canBeCollateral: true,
          ltv: 80,
          liquidationThreshold: 82.5,
          liquidationBonus: 5
        },
        {
          symbol: 'USDbC',
          name: 'USD Base Coin',
          address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
          decimals: 6,
          isActive: true,
          canBeCollateral: true,
          ltv: 80,
          liquidationThreshold: 85,
          liquidationBonus: 5
        }
      ];
    } else if (chainId === 10254) { // Sonic (example chain ID)
      return [
        {
          symbol: 'WETH',
          name: 'Wrapped Ether',
          address: '0xEA7e9fb8323c4e3125032CD1Af8c5eD953d75E61',
          decimals: 18,
          isActive: true,
          canBeCollateral: true,
          ltv: 80,
          liquidationThreshold: 82.5,
          liquidationBonus: 5
        },
        {
          symbol: 'S',
          name: 'Sonic Token',
          address: '0x12346E3321736Ce7f0BF0a7B1f29af9Eb8c96C96',
          decimals: 18,
          isActive: true,
          canBeCollateral: true,
          ltv: 65,
          liquidationThreshold: 70,
          liquidationBonus: 10
        }
      ];
    }
    
    return [];
  }
  
  /**
   * Get all supported assets for a specific chain
   */
  async getSupportedAssets(chainId: SupportedChainId): Promise<AssetConfig[]> {
    // Ensure assets are loaded
    if (!this.assetConfigsByChain[chainId]) {
      await this.initializeAssetConfigs();
    }
    
    return Object.values(this.assetConfigsByChain[chainId] || {});
  }
  
  /**
   * Get asset configuration by address
   */
  async getAssetConfig(chainId: SupportedChainId, assetAddress: string): Promise<AssetConfig | null> {
    // Ensure assets are loaded
    if (!this.assetConfigsByChain[chainId]) {
      await this.initializeAssetConfigs();
    }
    
    return this.assetConfigsByChain[chainId]?.[assetAddress.toLowerCase()] || null;
  }
  
  /**
   * Get a user's account data from Aave
   */
  async getUserAccountData(chainId: SupportedChainId, userAddress: string): Promise<UserAccountData> {
    const poolContract = this.poolContracts[chainId];
    if (!poolContract) {
      throw new Error(`Pool contract not initialized for chain ${chainId}`);
    }
    
    const result = await poolContract.getUserAccountData(userAddress);
    
    return {
      totalCollateralBase: result.totalCollateralBase.toString(),
      totalDebtBase: result.totalDebtBase.toString(),
      availableBorrowsBase: result.availableBorrowsBase.toString(),
      currentLiquidationThreshold: result.currentLiquidationThreshold.toNumber() / 100, // Convert from basis points
      ltv: result.ltv.toNumber() / 100, // Convert from basis points
      healthFactor: result.healthFactor.toString()
    };
  }
  
  /**
   * Prepare a transaction to supply assets to Aave
   */
  async prepareSupplyTransaction(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string,
    referralCode: number = 0
  ): Promise<ethers.utils.Interface> {
    // Get the pool contract interface
    const poolInterface = this.poolContracts[chainId].interface;
    
    // Check if token approval is needed and include that in the transaction if necessary
    const approvalNeeded = await this.checkApprovalNeeded(
      chainId,
      safeAddress,
      assetAddress,
      amount,
      this.chainConfigs[chainId].poolAddress
    );
    
    if (approvalNeeded) {
      // We'll return two transactions - approval and supply
      // In a complete implementation, we'd use the SafeManager's multi-call feature
      const erc20Interface = new ethers.utils.Interface(erc20Abi);
      const approvalData = erc20Interface.encodeFunctionData('approve', [
        this.chainConfigs[chainId].poolAddress,
        amount
      ]);
      
      // The caller would need to execute this approval transaction before supplying
      console.log(`Approval needed for ${safeAddress} to spend ${amount} of ${assetAddress}`);
    }
    
    // Encode the supply function call
    const data = poolInterface.encodeFunctionData('supply', [
      assetAddress,
      amount,
      safeAddress, // onBehalfOf - the Safe is supplying on its own behalf
      referralCode
    ]);
    
    return new ethers.utils.Interface([data]);
  }
  
  /**
   * Supply assets to Aave
   */
  async supply(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string,
    referralCode: number = 0
  ): Promise<string> {
    const poolContract = this.poolContracts[chainId];
    if (!poolContract) {
      throw new Error(`Pool contract not initialized for chain ${chainId}`);
    }
    
    // Check if approval is needed
    const approvalNeeded = await this.checkApprovalNeeded(
      chainId,
      safeAddress,
      assetAddress,
      amount,
      this.chainConfigs[chainId].poolAddress
    );
    
    const transactions = [];
    
    // If approval is needed, add the approval transaction
    if (approvalNeeded) {
      const erc20Interface = new ethers.utils.Interface(erc20Abi);
      const approvalData = erc20Interface.encodeFunctionData('approve', [
        this.chainConfigs[chainId].poolAddress,
        amount
      ]);
      
      transactions.push({
        to: assetAddress,
        value: '0',
        data: approvalData
      });
    }
    
    // Add the supply transaction
    const poolInterface = poolContract.interface;
    const supplyData = poolInterface.encodeFunctionData('supply', [
      assetAddress,
      amount,
      safeAddress, // onBehalfOf - the Safe is supplying on its own behalf
      referralCode
    ]);
    
    transactions.push({
      to: this.chainConfigs[chainId].poolAddress,
      value: '0',
      data: supplyData
    });
    
    // If we have multiple transactions, use a batch
    if (transactions.length > 1) {
      return this.safeManager.executeTransaction(
        safeAddress,
        chainId,
        await this.safeManager.buildMultiSendTransaction(safeAddress, chainId, transactions)
      );
    } else {
      // Just execute the supply transaction directly
      return this.safeManager.executeTransaction(
        safeAddress,
        chainId,
        await this.safeManager.buildTransaction(safeAddress, chainId, transactions[0])
      );
    }
  }
  
  /**
   * Prepare a transaction to withdraw assets from Aave
   */
  async prepareWithdrawTransaction(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string
  ): Promise<ethers.utils.Interface> {
    // Get the pool contract interface
    const poolInterface = this.poolContracts[chainId].interface;
    
    // Encode the withdraw function call
    const data = poolInterface.encodeFunctionData('withdraw', [
      assetAddress,
      amount,
      safeAddress // to - withdraw to the Safe itself
    ]);
    
    return new ethers.utils.Interface([data]);
  }
  
  /**
   * Withdraw assets from Aave
   */
  async withdraw(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string
  ): Promise<string> {
    const poolContract = this.poolContracts[chainId];
    if (!poolContract) {
      throw new Error(`Pool contract not initialized for chain ${chainId}`);
    }
    
    // Encode the withdraw function call
    const poolInterface = poolContract.interface;
    const withdrawData = poolInterface.encodeFunctionData('withdraw', [
      assetAddress,
      amount,
      safeAddress // to - withdraw to the Safe itself
    ]);
    
    // Execute the transaction through the Safe
    return this.safeManager.executeTransaction(
      safeAddress,
      chainId,
      await this.safeManager.buildTransaction(safeAddress, chainId, {
        to: this.chainConfigs[chainId].poolAddress,
        value: '0',
        data: withdrawData
      })
    );
  }
  
  /**
   * Prepare a transaction to borrow assets from Aave
   */
  async prepareBorrowTransaction(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string,
    interestRateMode: InterestRateMode = InterestRateMode.VARIABLE,
    referralCode: number = 0
  ): Promise<ethers.utils.Interface> {
    // Get the pool contract interface
    const poolInterface = this.poolContracts[chainId].interface;
    
    // Encode the borrow function call
    const data = poolInterface.encodeFunctionData('borrow', [
      assetAddress,
      amount,
      interestRateMode,
      referralCode,
      safeAddress // onBehalfOf - the Safe is borrowing on its own behalf
    ]);
    
    return new ethers.utils.Interface([data]);
  }
  
  /**
   * Borrow assets from Aave
   */
  async borrow(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string,
    interestRateMode: InterestRateMode = InterestRateMode.VARIABLE,
    referralCode: number = 0
  ): Promise<string> {
    const poolContract = this.poolContracts[chainId];
    if (!poolContract) {
      throw new Error(`Pool contract not initialized for chain ${chainId}`);
    }
    
    // Encode the borrow function call
    const poolInterface = poolContract.interface;
    const borrowData = poolInterface.encodeFunctionData('borrow', [
      assetAddress,
      amount,
      interestRateMode,
      referralCode,
      safeAddress // onBehalfOf - the Safe is borrowing on its own behalf
    ]);
    
    // Execute the transaction through the Safe
    return this.safeManager.executeTransaction(
      safeAddress,
      chainId,
      await this.safeManager.buildTransaction(safeAddress, chainId, {
        to: this.chainConfigs[chainId].poolAddress,
        value: '0',
        data: borrowData
      })
    );
  }
  
  /**
   * Prepare a transaction to repay a debt to Aave
   */
  async prepareRepayTransaction(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string,
    interestRateMode: InterestRateMode = InterestRateMode.VARIABLE
  ): Promise<ethers.utils.Interface> {
    // Get the pool contract interface
    const poolInterface = this.poolContracts[chainId].interface;
    
    // Check if token approval is needed and include that in the transaction if necessary
    const approvalNeeded = await this.checkApprovalNeeded(
      chainId,
      safeAddress,
      assetAddress,
      amount,
      this.chainConfigs[chainId].poolAddress
    );
    
    if (approvalNeeded) {
      // We'll return two transactions - approval and repay
      // In a complete implementation, we'd use the SafeManager's multi-call feature
      const erc20Interface = new ethers.utils.Interface(erc20Abi);
      const approvalData = erc20Interface.encodeFunctionData('approve', [
        this.chainConfigs[chainId].poolAddress,
        amount
      ]);
      
      // The caller would need to execute this approval transaction before repaying
      console.log(`Approval needed for ${safeAddress} to spend ${amount} of ${assetAddress}`);
    }
    
    // Encode the repay function call
    const data = poolInterface.encodeFunctionData('repay', [
      assetAddress,
      amount,
      interestRateMode,
      safeAddress // onBehalfOf - the Safe is repaying its own debt
    ]);
    
    return new ethers.utils.Interface([data]);
  }
  
  /**
   * Repay a debt to Aave
   */
  async repay(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    amount: string,
    interestRateMode: InterestRateMode = InterestRateMode.VARIABLE
  ): Promise<string> {
    const poolContract = this.poolContracts[chainId];
    if (!poolContract) {
      throw new Error(`Pool contract not initialized for chain ${chainId}`);
    }
    
    // Check if approval is needed
    const approvalNeeded = await this.checkApprovalNeeded(
      chainId,
      safeAddress,
      assetAddress,
      amount,
      this.chainConfigs[chainId].poolAddress
    );
    
    const transactions = [];
    
    // If approval is needed, add the approval transaction
    if (approvalNeeded) {
      const erc20Interface = new ethers.utils.Interface(erc20Abi);
      const approvalData = erc20Interface.encodeFunctionData('approve', [
        this.chainConfigs[chainId].poolAddress,
        amount
      ]);
      
      transactions.push({
        to: assetAddress,
        value: '0',
        data: approvalData
      });
    }
    
    // Add the repay transaction
    const poolInterface = poolContract.interface;
    const repayData = poolInterface.encodeFunctionData('repay', [
      assetAddress,
      amount,
      interestRateMode,
      safeAddress // onBehalfOf - the Safe is repaying its own debt
    ]);
    
    transactions.push({
      to: this.chainConfigs[chainId].poolAddress,
      value: '0',
      data: repayData
    });
    
    // If we have multiple transactions, use a batch
    if (transactions.length > 1) {
      return this.safeManager.executeTransaction(
        safeAddress,
        chainId,
        await this.safeManager.buildMultiSendTransaction(safeAddress, chainId, transactions)
      );
    } else {
      // Just execute the repay transaction directly
      return this.safeManager.executeTransaction(
        safeAddress,
        chainId,
        await this.safeManager.buildTransaction(safeAddress, chainId, transactions[0])
      );
    }
  }
  
  /**
   * Set whether an asset should be used as collateral or not
   */
  async setUserUseReserveAsCollateral(
    chainId: SupportedChainId,
    safeAddress: string,
    assetAddress: string,
    useAsCollateral: boolean
  ): Promise<string> {
    const poolContract = this.poolContracts[chainId];
    if (!poolContract) {
      throw new Error(`Pool contract not initialized for chain ${chainId}`);
    }
    
    // Encode the function call
    const poolInterface = poolContract.interface;
    const data = poolInterface.encodeFunctionData('setUserUseReserveAsCollateral', [
      assetAddress,
      useAsCollateral
    ]);
    
    // Execute the transaction through the Safe
    return this.safeManager.executeTransaction(
      safeAddress,
      chainId,
      await this.safeManager.buildTransaction(safeAddress, chainId, {
        to: this.chainConfigs[chainId].poolAddress,
        value: '0',
        data
      })
    );
  }
  
  /**
   * Prepare a flash loan transaction
   */
  async prepareFlashLoanTransaction(
    chainId: SupportedChainId,
    safeAddress: string,
    receiverAddress: string,
    request: FlashLoanRequest
  ): Promise<ethers.utils.Interface> {
    const poolInterface = this.poolContracts[chainId].interface;
    
    // If only one asset, use flashLoanSimple for gas efficiency
    if (request.assets.length === 1) {
      const data = poolInterface.encodeFunctionData('flashLoanSimple', [
        receiverAddress,
        request.assets[0],
        request.amounts[0],
        request.params,
        request.referralCode || 0
      ]);
      
      return new ethers.utils.Interface([data]);
    } else {
      // Use the full flashLoan function for multiple assets
      const data = poolInterface.encodeFunctionData('flashLoan', [
        receiverAddress,
        request.assets,
        request.amounts,
        request.modes,
        request.onBehalfOf,
        request.params,
        request.referralCode || 0
      ]);
      
      return new ethers.utils.Interface([data]);
    }
  }
  
  /**
   * Execute a flash loan
   */
  async flashLoan(
    chainId: SupportedChainId,
    safeAddress: string,
    receiverAddress: string,
    request: FlashLoanRequest
  ): Promise<string> {
    const poolContract = this.poolContracts[chainId];
    if (!poolContract) {
      throw new Error(`Pool contract not initialized for chain ${chainId}`);
    }
    
    const poolInterface = poolContract.interface;
    let data;
    
    // If only one asset, use flashLoanSimple for gas efficiency
    if (request.assets.length === 1) {
      data = poolInterface.encodeFunctionData('flashLoanSimple', [
        receiverAddress,
        request.assets[0],
        request.amounts[0],
        request.params,
        request.referralCode || 0
      ]);
    } else {
      // Use the full flashLoan function for multiple assets
      data = poolInterface.encodeFunctionData('flashLoan', [
        receiverAddress,
        request.assets,
        request.amounts,
        request.modes,
        request.onBehalfOf,
        request.params,
        request.referralCode || 0
      ]);
    }
    
    // Execute the transaction through the Safe
    return this.safeManager.executeTransaction(
      safeAddress,
      chainId,
      await this.safeManager.buildTransaction(safeAddress, chainId, {
        to: this.chainConfigs[chainId].poolAddress,
        value: '0',
        data
      })
    );
  }
  
  /**
   * Check if approval is needed for a token
   */
  private async checkApprovalNeeded(
    chainId: SupportedChainId,
    safeAddress: string,
    tokenAddress: string,
    amount: string,
    spender: string
  ): Promise<boolean> {
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`No provider configured for chain ${chainId}`);
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    
    const allowance = await tokenContract.allowance(safeAddress, spender);
    const amountBN = ethers.BigNumber.from(amount);
    
    return allowance.lt(amountBN);
  }
}

export default AaveModule;
