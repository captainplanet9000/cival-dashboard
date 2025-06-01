/**
 * Portfolio Optimization AI Service
 * Uses LangChain to provide AI-powered portfolio optimization recommendations
 */

import { LangChainService } from './langchain-service';
import { AIModelConfig } from './types';
import { Document } from '@langchain/core/documents';

// Interface for portfolio details
export interface Portfolio {
  farmId: string;
  farmName: string;
  assets: PortfolioAsset[];
  totalValue: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  investmentHorizon: 'short' | 'medium' | 'long';
  targetReturn?: number;
  correlationMatrix?: Record<string, Record<string, number>>;
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  allocation: number; // Percentage of portfolio
  value: number;
  category: string;
  volatility?: number;
  return1Y?: number;
  return3Y?: number;
}

// Optimization recommendations
export interface OptimizationRecommendation {
  summary: string;
  recommendations: AssetRecommendation[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  rationale: string;
}

export interface AssetRecommendation {
  symbol: string;
  currentAllocation: number;
  recommendedAllocation: number;
  action: 'increase' | 'decrease' | 'maintain' | 'add' | 'remove';
  rationale: string;
}

// Portfolio optimization service
export class PortfolioOptimizationService {
  private langChainService: LangChainService;
  private systemPrompt: string;
  private assetDatabase: Document[] = [];
  
  constructor(langChainService: LangChainService) {
    this.langChainService = langChainService;
    
    // Define system prompt for portfolio optimization
    this.systemPrompt = `You are an expert portfolio manager with extensive experience in portfolio optimization. 
Your task is to analyze the provided portfolio information and suggest optimizations to improve risk-adjusted 
returns. Consider the user's risk profile, investment horizon, asset correlations, and performance metrics. 
Your recommendations should be based on modern portfolio theory principles including diversification, 
correlation analysis, and efficient frontier optimization. Provide specific, actionable allocation changes 
with clear rationales for each recommendation.`;
  }
  
  /**
   * Initialize asset database for vector similarity search
   */
  async initializeAssetDatabase(assets: Record<string, any>[]) {
    // Convert assets to documents for vector store
    this.assetDatabase = assets.map(asset => {
      return new Document({
        pageContent: `${asset.symbol}: ${asset.name} - ${asset.description || 'No description available'}`,
        metadata: {
          symbol: asset.symbol,
          name: asset.name,
          category: asset.category,
          volatility: asset.volatility,
          return1Y: asset.return1Y,
          return3Y: asset.return3Y,
          beta: asset.beta,
          marketCap: asset.marketCap,
          tradingVolume: asset.tradingVolume,
        },
      });
    });
    
    // Initialize vector store with asset documents
    await this.langChainService.initVectorStore(this.assetDatabase);
    
    return this.assetDatabase.length;
  }
  
  /**
   * Generate portfolio optimization recommendations
   */
  async optimizePortfolio(portfolio: Portfolio, modelConfig?: AIModelConfig): Promise<OptimizationRecommendation> {
    try {
      // Format portfolio details for the prompt
      const portfolioSummary = this.formatPortfolioSummary(portfolio);
      
      // Build the user prompt
      const userPrompt = `Analyze and optimize the following portfolio to improve risk-adjusted returns:

PORTFOLIO SUMMARY:
${portfolioSummary}

OPTIMIZATION GOALS:
- Risk Profile: ${portfolio.riskProfile}
- Investment Horizon: ${portfolio.investmentHorizon} term
${portfolio.targetReturn ? `- Target Return: ${portfolio.targetReturn}%` : ''}

Provide a comprehensive optimization recommendation including:
1. Specific allocation changes for existing assets
2. Any new assets to add or existing ones to remove
3. Expected impact on portfolio performance (return, risk, Sharpe ratio)
4. Clear rationale for each recommendation`;

      // Generate the optimization recommendation
      const completion = await this.langChainService.chatCompletion({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }, modelConfig);
      
      // Parse the response into a structured format
      return this.parseOptimizationRecommendation(completion.content, portfolio);
      
    } catch (error) {
      console.error('Error generating portfolio optimization:', error);
      throw new Error('Failed to generate portfolio optimization');
    }
  }
  
  /**
   * Find similar assets to a given asset using vector similarity search
   */
  async findSimilarAssets(assetSymbol: string, count: number = 5): Promise<Document[]> {
    try {
      // Find the asset document
      const assetDoc = this.assetDatabase.find(doc => doc.metadata.symbol === assetSymbol);
      
      if (!assetDoc) {
        throw new Error(`Asset with symbol ${assetSymbol} not found in the database`);
      }
      
      // Perform similarity search
      const similarAssets = await this.langChainService.similaritySearch(assetDoc.pageContent, count + 1);
      
      // Filter out the query asset itself
      return similarAssets.filter(asset => asset.metadata.symbol !== assetSymbol);
      
    } catch (error) {
      console.error('Error finding similar assets:', error);
      throw new Error('Failed to find similar assets');
    }
  }
  
  /**
   * Generate a risk assessment for the current portfolio
   */
  async assessPortfolioRisk(portfolio: Portfolio): Promise<string> {
    const riskAssessmentPrompt = `Perform a comprehensive risk assessment of the following portfolio:

${this.formatPortfolioSummary(portfolio)}

Include in your assessment:
1. Overall portfolio risk level
2. Concentration risks
3. Correlation analysis
4. Volatility assessment
5. Market risk exposure
6. Specific recommendations for risk mitigation`;
    
    try {
      const chain = this.langChainService.createPromptChain(
        'You are an expert in portfolio risk assessment. Provide detailed, data-driven risk analysis with actionable risk mitigation recommendations.',
        riskAssessmentPrompt
      );
      
      return await chain.invoke({});
    } catch (error) {
      console.error('Error assessing portfolio risk:', error);
      throw new Error('Failed to assess portfolio risk');
    }
  }
  
  /**
   * Helper method to format portfolio summary for prompts
   */
  private formatPortfolioSummary(portfolio: Portfolio): string {
    const assetsSummary = portfolio.assets
      .map(asset => {
        const valueFormatted = asset.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const returnInfo = asset.return1Y !== undefined ? `, 1Y Return: ${asset.return1Y.toFixed(2)}%` : '';
        const volatilityInfo = asset.volatility !== undefined ? `, Volatility: ${asset.volatility.toFixed(2)}%` : '';
        
        return `- ${asset.symbol} (${asset.name}): ${asset.allocation.toFixed(2)}%, ${valueFormatted}${returnInfo}${volatilityInfo}`;
      })
      .join('\n');
    
    return `Farm: ${portfolio.farmName}
Total Value: ${portfolio.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
Risk Profile: ${portfolio.riskProfile}
Investment Horizon: ${portfolio.investmentHorizon} term
${portfolio.targetReturn ? `Target Return: ${portfolio.targetReturn}%` : ''}

ASSETS:
${assetsSummary}

${this.formatCorrelationMatrix(portfolio.correlationMatrix)}`;
  }
  
  /**
   * Helper method to format correlation matrix for prompts
   */
  private formatCorrelationMatrix(correlationMatrix?: Record<string, Record<string, number>>): string {
    if (!correlationMatrix || Object.keys(correlationMatrix).length === 0) {
      return '';
    }
    
    const assets = Object.keys(correlationMatrix);
    
    // If too many assets, provide a summary instead of the full matrix
    if (assets.length > 5) {
      // Find highly correlated pairs
      const highlyCorrelatedPairs = [];
      
      for (let i = 0; i < assets.length; i++) {
        for (let j = i + 1; j < assets.length; j++) {
          const correlation = correlationMatrix[assets[i]][assets[j]];
          
          if (Math.abs(correlation) > 0.7) {
            highlyCorrelatedPairs.push({
              asset1: assets[i],
              asset2: assets[j],
              correlation: correlation,
            });
          }
        }
      }
      
      if (highlyCorrelatedPairs.length === 0) {
        return 'CORRELATION: No highly correlated asset pairs found.';
      }
      
      // Sort by absolute correlation (highest first)
      highlyCorrelatedPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
      
      // Take top 5
      const topPairs = highlyCorrelatedPairs.slice(0, 5);
      
      return 'NOTABLE CORRELATIONS:\n' + topPairs
        .map(pair => `- ${pair.asset1} & ${pair.asset2}: ${pair.correlation.toFixed(2)}`)
        .join('\n');
    }
    
    // For smaller portfolios, show the full matrix
    let matrixString = 'CORRELATION MATRIX:\n';
    
    // Header row
    matrixString += '     ' + assets.map(asset => asset.padEnd(6)).join(' ') + '\n';
    
    // Data rows
    for (const asset1 of assets) {
      matrixString += asset1.padEnd(5);
      
      for (const asset2 of assets) {
        const correlation = correlationMatrix[asset1][asset2];
        matrixString += correlation.toFixed(2).padStart(6) + ' ';
      }
      
      matrixString += '\n';
    }
    
    return matrixString;
  }
  
  /**
   * Parse the AI completion into a structured recommendation
   */
  private parseOptimizationRecommendation(completion: string, portfolio: Portfolio): OptimizationRecommendation {
    try {
      // Extract recommendation details using regex patterns
      // This is a simplified approach - production code would need a more robust parser
      
      // Extract summary
      const summaryMatch = completion.match(/(?:summary|overview|portfolio optimization|recommendation summary):(.*?)(?:\n\n|\n\r\n|$)/i);
      const summary = summaryMatch ? summaryMatch[1].trim() : 'Portfolio optimization recommendations';
      
      // Extract expected metrics
      const expectedReturnMatch = completion.match(/expected return:?\s*([\d.]+)%/i);
      const expectedReturn = expectedReturnMatch ? parseFloat(expectedReturnMatch[1]) : 0;
      
      const expectedRiskMatch = completion.match(/expected risk:?\s*([\d.]+)%/i) || completion.match(/expected volatility:?\s*([\d.]+)%/i);
      const expectedRisk = expectedRiskMatch ? parseFloat(expectedRiskMatch[1]) : 0;
      
      const sharpeRatioMatch = completion.match(/sharpe ratio:?\s*([\d.]+)/i);
      const sharpeRatio = sharpeRatioMatch ? parseFloat(sharpeRatioMatch[1]) : 0;
      
      // Extract overall rationale
      const rationaleMatch = completion.match(/(?:rationale|reasoning|justification):(.*?)(?:\n\n|\n\r\n|$)/i);
      const rationale = rationaleMatch ? rationaleMatch[1].trim() : 'Based on portfolio optimization principles.';
      
      // Extract asset recommendations
      const assetRecommendations: AssetRecommendation[] = [];
      
      // Process existing assets
      for (const asset of portfolio.assets) {
        const assetRegex = new RegExp(`${asset.symbol}[:\\s]([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
        const assetMatch = completion.match(assetRegex);
        
        if (assetMatch) {
          const assetText = assetMatch[1];
          
          // Look for allocation recommendation
          const allocationMatch = assetText.match(/(\d+(?:\.\d+)?)%\s+to\s+(\d+(?:\.\d+)?)%/i) ||
                                  assetText.match(/allocation:?\s*(\d+(?:\.\d+)?)%\s+to\s+(\d+(?:\.\d+)?)%/i);
          
          if (allocationMatch) {
            const currentAllocation = parseFloat(allocationMatch[1]);
            const recommendedAllocation = parseFloat(allocationMatch[2]);
            
            const action = recommendedAllocation > currentAllocation + 1 ? 'increase' :
                          recommendedAllocation < currentAllocation - 1 ? 'decrease' : 'maintain';
            
            // Extract rationale for this specific asset
            const assetRationaleMatch = assetText.match(/(?:rationale|reason|because|due to|based on):(.*?)(?:\n|$)/i) ||
                                       assetText.match(/(?:rationale|reason|because|due to|based on)\s+(.*?)(?:\n|$)/i);
            
            const assetRationale = assetRationaleMatch ? assetRationaleMatch[1].trim() : 
                                  'Based on portfolio optimization analysis.';
            
            assetRecommendations.push({
              symbol: asset.symbol,
              currentAllocation: asset.allocation,
              recommendedAllocation,
              action,
              rationale: assetRationale,
            });
          }
        }
      }
      
      // If we couldn't extract specific recommendations, create a fallback
      if (assetRecommendations.length === 0) {
        for (const asset of portfolio.assets) {
          assetRecommendations.push({
            symbol: asset.symbol,
            currentAllocation: asset.allocation,
            recommendedAllocation: asset.allocation, // Default to current allocation
            action: 'maintain',
            rationale: 'Maintain current allocation based on portfolio analysis.',
          });
        }
      }
      
      return {
        summary,
        recommendations: assetRecommendations,
        expectedReturn,
        expectedRisk,
        sharpeRatio,
        rationale,
      };
    } catch (error) {
      console.error('Error parsing optimization recommendation:', error);
      
      // Return a basic recommendation if parsing fails
      return {
        summary: 'Portfolio optimization recommendations',
        recommendations: portfolio.assets.map(asset => ({
          symbol: asset.symbol,
          currentAllocation: asset.allocation,
          recommendedAllocation: asset.allocation,
          action: 'maintain',
          rationale: 'Maintain current allocation.',
        })),
        expectedReturn: 0,
        expectedRisk: 0,
        sharpeRatio: 0,
        rationale: 'Error parsing AI recommendations. Please review the complete AI response for details.',
      };
    }
  }
}

export default PortfolioOptimizationService;
