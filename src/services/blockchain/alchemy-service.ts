import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk';
import { ethers } from 'ethers';

export class AlchemyService {
  private alchemy: Alchemy;
  private network: Network;
  
  constructor(apiKey: string, network: Network = Network.ETH_MAINNET) {
    this.network = network;
    
    this.alchemy = new Alchemy({
      apiKey,
      network
    });
  }
  
  /**
   * Get gas price recommendations
   */
  async getGasPrices() {
    try {
      const feeData = await this.alchemy.core.getFeeData();
      
      return {
        slow: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        average: ethers.formatUnits(
          feeData.maxFeePerGas, 
          'gwei'
        ),
        fast: ethers.formatUnits(
          feeData.maxPriorityFeePerGas.mul(2).add(feeData.maxFeePerGas), 
          'gwei'
        )
      };
    } catch (error) {
      console.error('Error getting gas prices:', error);
      throw error;
    }
  }
  
  /**
   * Simulate a transaction
   */
  async simulateTransaction(
    fromAddress: string,
    toAddress: string,
    amountInEth: string,
    data: string = '0x'
  ) {
    try {
      const tx = {
        from: fromAddress,
        to: toAddress,
        value: ethers.parseEther(amountInEth),
        data,
      };
      
      const estimatedGas = await this.alchemy.core.estimateGas(tx);
      const feeData = await this.alchemy.core.getFeeData();
      
      const gasCost = estimatedGas.mul(feeData.gasPrice);
      const gasCostInEth = ethers.formatEther(gasCost);
      
      return {
        status: 'success',
        estimatedGas: estimatedGas.toString(),
        gasCostInEth,
        gasPriceGwei: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        transaction: tx
      };
    } catch (error) {
      console.error('Error simulating transaction:', error);
      return {
        status: 'error',
        error: error.message,
        reason: error.reason || 'Unknown error'
      };
    }
  }
  
  /**
   * Estimate optimal gas price for transaction
   */
  async estimateOptimalGasPrice(maxWaitTimeSeconds: number = 60) {
    try {
      const feeData = await this.alchemy.core.getFeeData();
      const blockNumber = await this.alchemy.core.getBlockNumber();
      
      // Get recent blocks to analyze
      const blocks = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          this.alchemy.core.getBlock(blockNumber - i)
        )
      );
      
      // Calculate average block time (in seconds)
      const blockTimes = [];
      for (let i = 0; i < blocks.length - 1; i++) {
        blockTimes.push(blocks[i].timestamp - blocks[i + 1].timestamp);
      }
      const avgBlockTime = blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
      
      // Calculate required percentile based on wait time
      const blocksToWait = Math.ceil(maxWaitTimeSeconds / avgBlockTime);
      
      // Analyze gas prices from recent transactions
      const recentGasPrices = [];
      for (const block of blocks) {
        if (block.transactions && block.transactions.length > 0) {
          for (const txHash of block.transactions.slice(0, 20)) {
            const tx = await this.alchemy.core.getTransaction(txHash);
            if (tx && tx.maxFeePerGas) {
              recentGasPrices.push(Number(ethers.formatUnits(tx.maxFeePerGas, 'gwei')));
            } else if (tx && tx.gasPrice) {
              recentGasPrices.push(Number(ethers.formatUnits(tx.gasPrice, 'gwei')));
            }
          }
        }
      }
      
      // Sort gas prices and find optimal price based on wait time
      recentGasPrices.sort((a, b) => a - b);
      const percentile = Math.min(95, Math.max(5, 100 - (blocksToWait * 10)));
      const index = Math.floor(recentGasPrices.length * (percentile / 100));
      const optimalGasPrice = recentGasPrices[index] || 
        Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
      
      return {
        optimalGasPrice,
        baseFeePerGas: Number(ethers.formatUnits(feeData.lastBaseFeePerGas, 'gwei')),
        maxPriorityFeePerGas: Number(ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')),
        estimatedWaitTime: blocksToWait * avgBlockTime,
        confidence: percentile
      };
    } catch (error) {
      console.error('Error estimating optimal gas price:', error);
      throw error;
    }
  }
  
  /**
   * Get token balances for an address
   */
  async getTokenBalances(address: string) {
    try {
      const balances = await this.alchemy.core.getTokenBalances(address);
      
      const tokenMetadataPromises = balances.tokenBalances.map(balance => 
        this.alchemy.core.getTokenMetadata(balance.contractAddress)
      );
      
      const tokenMetadata = await Promise.all(tokenMetadataPromises);
      
      const formattedBalances = balances.tokenBalances.map((balance, index) => {
        const metadata = tokenMetadata[index];
        
        return {
          contractAddress: balance.contractAddress,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          logoUrl: metadata.logo,
          balance: ethers.formatUnits(balance.tokenBalance, metadata.decimals)
        };
      });
      
      return formattedBalances;
    } catch (error) {
      console.error('Error getting token balances:', error);
      throw error;
    }
  }
  
  /**
   * Get recent transactions for an address
   */
  async getRecentTransactions(address: string, limit: number = 10) {
    try {
      const transfers = await this.alchemy.core.getAssetTransfers({
        fromAddress: address,
        category: [
          AssetTransfersCategory.EXTERNAL,
          AssetTransfersCategory.INTERNAL,
          AssetTransfersCategory.ERC20
        ],
        maxCount: limit
      });
      
      return transfers.transfers;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw error;
    }
  }
} 