import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { mcpManager } from './mcp-manager';
import { vaultService } from '../vaultService';
import { TransactionType } from '@/types/vault';
import { HeuristMeshClient } from './clients/heurist-mesh-client';
import { UniswapTraderClient } from './clients/uniswap-trader-client';
import { CryptoIndicatorsClient } from './clients/crypto-indicators-client';
import { AlphaVantageClient } from './clients/alpha-vantage-client';
import { CryptoSentimentClient } from './clients/crypto-sentiment-client';

/**
 * MCP Banking Service
 * Integrates MCP servers with the unified banking system
 */
export class McpBankingService {
  private supabase;
  private isServerSide: boolean;
  private static instance: McpBankingService;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor(isServerSide = false) {
    this.isServerSide = isServerSide;
    this.supabase = isServerSide 
      ? createServerClient() 
      : createBrowserClient();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(isServerSide = false): McpBankingService {
    if (!McpBankingService.instance) {
      McpBankingService.instance = new McpBankingService(isServerSide);
    }
    return McpBankingService.instance;
  }
  
  /**
   * Execute a DeFi swap with vault account funds
   * Links vault account with Uniswap MCP operations
   */
  async executeSwapWithVault(
    vaultAccountId: string,
    fromToken: string,
    toToken: string,
    amount: string,
    walletAddress: string,
    options?: {
      slippageTolerance?: number;
      requireApproval?: boolean;
      chainId?: number;
      description?: string;
    }
  ): Promise<{
    success: boolean;
    transactionId: string;
    swapResult?: any;
    message: string;
    status: string;
  }> {
    try {
      // 1. Get the Uniswap client
      const uniswapClient = await mcpManager.getMcpClient('uniswap-trader') as UniswapTraderClient;
      
      // 2. Get a swap quote first
      const quoteResult = await uniswapClient.getSwapQuote(
        fromToken,
        toToken,
        amount,
        { 
          slippageTolerance: options?.slippageTolerance,
          chainId: options?.chainId
        }
      );
      
      // 3. Create a vault transaction (pending)
      const vaultTransaction = await vaultService.createTransaction({
        sourceId: vaultAccountId,
        sourceType: 'vault_account',
        destinationId: 'defi_uniswap',
        destinationType: 'external',
        amount: parseFloat(amount),
        currency: fromToken,
        type: TransactionType.SWAP,
        description: options?.description || `Swap ${amount} ${fromToken} to ${toToken} via Uniswap`,
        metadata: {
          expectedReceiveAmount: quoteResult.expectedAmountOut,
          expectedReceiveToken: toToken,
          slippageTolerance: options?.slippageTolerance || 0.5,
          chainId: options?.chainId || 1,
          quote: quoteResult
        },
        status: options?.requireApproval ? 'pending_approval' : 'pending'
      });
      
      // 4. If approval is required, return early
      if (options?.requireApproval) {
        return {
          success: true,
          transactionId: vaultTransaction.id,
          message: 'Transaction created, pending approval',
          status: 'pending_approval'
        };
      }
      
      // 5. Execute the swap
      try {
        // Check contract security first with Heurist Mesh if available
        if (quoteResult.routerAddress) {
          await this.verifyContractSecurity(
            quoteResult.routerAddress,
            options?.chainId || 1
          );
        }
        
        // Execute the actual swap
        const swapResult = await uniswapClient.executeSwap(
          fromToken,
          toToken,
          amount,
          walletAddress,
          {
            slippageTolerance: options?.slippageTolerance,
            chainId: options?.chainId
          }
        );
        
        // 6. Update vault transaction status to completed
        await vaultService.updateTransactionStatus(
          vaultTransaction.id,
          'completed',
          'system',
          `Swap completed: Received ${swapResult.amountOut} ${toToken}`
        );
        
        // 7. Log the MCP activity
        await mcpManager.logMcpActivity(
          'uniswap-trader',
          'executeSwap',
          { fromToken, toToken, amount, walletAddress },
          swapResult,
          this.isServerSide ? 'system' : (await this.supabase.auth.getUser()).data.user?.id || 'anonymous',
          'success',
          { vaultTransactionId: vaultTransaction.id }
        );
        
        return {
          success: true,
          transactionId: vaultTransaction.id,
          swapResult,
          message: `Successfully swapped ${amount} ${fromToken} to ${swapResult.amountOut} ${toToken}`,
          status: 'completed'
        };
      } catch (error: any) {
        // 8. Handle failure
        await vaultService.updateTransactionStatus(
          vaultTransaction.id,
          'failed',
          'system',
          `Swap failed: ${error.message}`
        );
        
        await mcpManager.logMcpActivity(
          'uniswap-trader',
          'executeSwap',
          { fromToken, toToken, amount, walletAddress },
          null,
          this.isServerSide ? 'system' : (await this.supabase.auth.getUser()).data.user?.id || 'anonymous',
          'error',
          { 
            errorMessage: error.message,
            vaultTransactionId: vaultTransaction.id
          }
        );
        
        return {
          success: false,
          transactionId: vaultTransaction.id,
          message: `Swap failed: ${error.message}`,
          status: 'failed'
        };
      }
    } catch (error: any) {
      console.error('Error executing swap with vault:', error);
      return {
        success: false,
        transactionId: '',
        message: `Error: ${error.message}`,
        status: 'error'
      };
    }
  }
  
  /**
   * Get market analysis by combining data from multiple MCP servers
   * Provides comprehensive trading insights
   */
  async getMarketAnalysis(
    symbol: string,
    options?: {
      includeTechnical?: boolean;
      includeSentiment?: boolean;
      includePrice?: boolean;
      timeframe?: string;
    }
  ): Promise<{
    symbol: string;
    price?: {
      current: number;
      change24h: number;
      high24h: number;
      low24h: number;
      volume24h: number;
    };
    technical?: {
      rsi: number;
      macd: {
        macd: number;
        signal: number;
        histogram: number;
      };
      bollingerBands: {
        upper: number;
        middle: number;
        lower: number;
      };
      indicators: Record<string, any>;
      signals: {
        overall: string;
        timeframe: string;
        strength: number;
        details: Record<string, string>;
      };
    };
    sentiment?: {
      overall: string;
      news: string;
      social: string;
      whaleActivity: string;
      fearAndGreed: number;
    };
    recommendations: Array<{
      action: string;
      reason: string;
      confidence: number;
      timeframe: string;
    }>;
    timestamp: string;
  }> {
    try {
      const includeTechnical = options?.includeTechnical ?? true;
      const includeSentiment = options?.includeSentiment ?? true;
      const includePrice = options?.includePrice ?? true;
      const timeframe = options?.timeframe || '1d';
      
      // Prepare result structure
      const result: any = {
        symbol,
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      
      // Parallel requests to different MCP servers
      const promises = [];
      
      // 1. Get price data from Alpha Vantage
      if (includePrice) {
        const alphaVantagePromise = mcpManager.getMcpClient('alpha-vantage')
          .then((client: AlphaVantageClient) => client.getGlobalQuote(symbol))
          .then(data => {
            result.price = {
              current: parseFloat(data.price),
              change24h: parseFloat(data.change_percent),
              high24h: parseFloat(data.high),
              low24h: parseFloat(data.low),
              volume24h: parseFloat(data.volume)
            };
          })
          .catch(error => {
            console.error('Error fetching price data:', error);
          });
        
        promises.push(alphaVantagePromise);
      }
      
      // 2. Get technical indicators from Crypto Indicators
      if (includeTechnical) {
        const technicalPromise = mcpManager.getMcpClient('crypto-indicators')
          .then((client: CryptoIndicatorsClient) => client.getAllIndicators(symbol, timeframe))
          .then(data => {
            result.technical = {
              rsi: data.rsi,
              macd: data.macd,
              bollingerBands: data.bollingerBands,
              indicators: data.indicators,
              signals: data.signals
            };
            
            // Add technical-based recommendations
            if (data.signals.overall === 'buy' && data.signals.strength > 0.7) {
              result.recommendations.push({
                action: 'buy',
                reason: `Strong technical buy signal (${data.signals.strength.toFixed(2)})`,
                confidence: data.signals.strength,
                timeframe
              });
            } else if (data.signals.overall === 'sell' && data.signals.strength > 0.7) {
              result.recommendations.push({
                action: 'sell',
                reason: `Strong technical sell signal (${data.signals.strength.toFixed(2)})`,
                confidence: data.signals.strength,
                timeframe
              });
            }
          })
          .catch(error => {
            console.error('Error fetching technical indicators:', error);
          });
        
        promises.push(technicalPromise);
      }
      
      // 3. Get sentiment data from Crypto Sentiment
      if (includeSentiment) {
        const sentimentPromise = mcpManager.getMcpClient('crypto-sentiment')
          .then((client: CryptoSentimentClient) => client.getSentimentAnalysis(symbol))
          .then(data => {
            result.sentiment = {
              overall: data.overall,
              news: data.news,
              social: data.social,
              whaleActivity: data.whaleActivity,
              fearAndGreed: data.fearAndGreedIndex
            };
            
            // Add sentiment-based recommendations
            if (data.overall === 'positive' && data.news === 'positive' && data.social === 'positive') {
              result.recommendations.push({
                action: 'buy',
                reason: 'Strong positive sentiment across all channels',
                confidence: 0.8,
                timeframe: 'short-term'
              });
            } else if (data.overall === 'negative' && data.whaleActivity === 'selling') {
              result.recommendations.push({
                action: 'sell',
                reason: 'Negative sentiment with whale selling activity',
                confidence: 0.75,
                timeframe: 'short-term'
              });
            }
          })
          .catch(error => {
            console.error('Error fetching sentiment data:', error);
          });
        
        promises.push(sentimentPromise);
      }
      
      // Wait for all promises to resolve
      await Promise.all(promises);
      
      // Log the analysis activity
      await mcpManager.logMcpActivity(
        'market-analysis',
        'getMarketAnalysis',
        { symbol, options },
        result,
        this.isServerSide ? 'system' : (await this.supabase.auth.getUser()).data.user?.id || 'anonymous',
        'success'
      );
      
      return result;
    } catch (error: any) {
      console.error('Error getting market analysis:', error);
      throw error;
    }
  }
  
  /**
   * Analyze and verify smart contract security before interaction
   */
  private async verifyContractSecurity(
    contractAddress: string,
    chainId: number
  ): Promise<boolean> {
    try {
      // Get the Heurist Mesh client
      const heuristClient = await mcpManager.getMcpClient('heurist-mesh') as HeuristMeshClient;
      
      // Analyze the contract
      const securityReport = await heuristClient.analyzeSmartContract(contractAddress, chainId);
      
      // If high-risk vulnerabilities are found, throw an error
      if (securityReport.riskLevel === 'high') {
        throw new Error(`Contract security check failed: ${securityReport.summary}`);
      }
      
      // If medium-risk, log but allow interaction
      if (securityReport.riskLevel === 'medium') {
        console.warn(`Medium security risk with contract ${contractAddress}: ${securityReport.summary}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying contract security:', error);
      // If the security check itself fails, allow the transaction but log the issue
      return true;
    }
  }
  
  /**
   * Sync DeFi positions with vault accounts
   * Ensures vault accounts reflect on-chain positions
   */
  async syncDefiPositionsWithVault(
    walletAddress: string,
    vaultMasterId: string,
    options?: {
      createMissing?: boolean;
      protocols?: string[];
    }
  ): Promise<{
    success: boolean;
    positions: any[];
    vaultAccounts: any[];
    updated: number;
    created: number;
    message: string;
  }> {
    try {
      // Get Heurist client to fetch DeFi positions
      const heuristClient = await mcpManager.getMcpClient('heurist-mesh') as HeuristMeshClient;
      
      // Get all DeFi positions for the wallet
      const positions = await heuristClient.getDeFiExposure(walletAddress);
      
      // Get vault accounts for this master
      const vaultAccounts = await vaultService.getVaultAccounts(vaultMasterId, { type: 'defi' });
      
      let updated = 0;
      let created = 0;
      const updatedAccountIds = [];
      
      // Process each position
      for (const position of positions) {
        // Skip if protocol filter is set and this protocol isn't included
        if (options?.protocols && options.protocols.length > 0 && 
            !options.protocols.includes(position.protocol)) {
          continue;
        }
        
        // Look for matching vault account
        const matchingAccount = vaultAccounts.find(acc => 
          acc.metadata?.protocol === position.protocol && 
          acc.metadata?.positionId === position.positionId
        );
        
        if (matchingAccount) {
          // Update existing account
          await vaultService.updateVaultAccount(matchingAccount.id, {
            balance: position.amountIn,
            metadata: {
              ...matchingAccount.metadata,
              assetIn: position.assetIn,
              assetOut: position.assetOut,
              amountIn: position.amountIn,
              amountOut: position.amountOut,
              leverage: position.leverage,
              healthFactor: position.healthFactor,
              lastUpdated: new Date().toISOString()
            }
          });
          
          updatedAccountIds.push(matchingAccount.id);
          updated++;
        } else if (options?.createMissing) {
          // Create new vault account for this position
          const newAccount = await vaultService.createVaultAccount(
            vaultMasterId,
            `${position.protocol} - ${position.assetIn}`,
            'defi',
            position.assetIn,
            {
              protocol: position.protocol,
              positionId: position.positionId,
              assetIn: position.assetIn,
              assetOut: position.assetOut,
              amountIn: position.amountIn,
              amountOut: position.amountOut,
              leverage: position.leverage,
              healthFactor: position.healthFactor,
              walletAddress,
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }
          );
          
          updatedAccountIds.push(newAccount.id);
          created++;
        }
      }
      
      // Get updated vault accounts
      const updatedVaultAccounts = await vaultService.getVaultAccounts(vaultMasterId, { 
        type: 'defi',
        ids: updatedAccountIds
      });
      
      // Log the sync activity
      await mcpManager.logMcpActivity(
        'heurist-mesh',
        'syncDefiPositionsWithVault',
        { walletAddress, vaultMasterId, options },
        { updated, created, positions: positions.length },
        this.isServerSide ? 'system' : (await this.supabase.auth.getUser()).data.user?.id || 'anonymous',
        'success'
      );
      
      return {
        success: true,
        positions,
        vaultAccounts: updatedVaultAccounts,
        updated,
        created,
        message: `Synced ${updated} and created ${created} DeFi positions`
      };
    } catch (error: any) {
      console.error('Error syncing DeFi positions with vault:', error);
      return {
        success: false,
        positions: [],
        vaultAccounts: [],
        updated: 0,
        created: 0,
        message: `Error syncing positions: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const mcpBankingService = McpBankingService.getInstance();
