/**
 * Smart Order Router (SOR)
 * 
 * Handles intelligent order routing across multiple exchanges to optimize execution.
 * Features:
 * - Multi-venue order splitting
 * - Price-aware routing
 * - Liquidity analysis
 * - Fee optimization
 */

import { ExchangeId } from '../websocket/websocket-types';
import { ExchangeService } from '../exchanges/exchange-service';
import { 
  OrderParams, 
  OrderResult, 
  MarketData, 
  OrderType,
  OrderSide,
  ExchangeConnector
} from '../exchanges/exchange-types';
import { riskManagementService } from './risk-management-service';

// Splitting strategy types
export type SplitStrategy = 'even' | 'liquidity-weighted' | 'price-biased' | 'fee-optimized';

// Venue-specific order details
export interface VenueOrderAllocation {
  exchange: ExchangeId;
  amount: number;
  priority: number;
  reason: string;
}

// Smart order parameters
export interface SmartOrderParams extends OrderParams {
  venues: ExchangeId[];
  splitStrategy: SplitStrategy;
  maxSlippageBps: number;
  executionWindow?: number; // in milliseconds
  minimumFillRate?: number; // 0-1
  adaptiveSplitting?: boolean;
  routingPreferences?: {
    prioritizeLiquidity?: boolean;
    prioritizeFees?: boolean;
    prioritizeSpeed?: boolean;
    prioritizeReliability?: boolean;
    blacklistedVenues?: ExchangeId[];
  };
}

// Result of a smart order execution
export interface SmartOrderResult {
  orderResults: Map<ExchangeId, OrderResult>;
  aggregateOrderId: string; // The client-facing ID that groups all orders
  filledAmount: number;
  averagePrice: number;
  fees: {
    total: number;
    byExchange: Map<ExchangeId, number>;
  };
  status: 'complete' | 'partial' | 'failed';
  childOrders: Map<ExchangeId, string[]>; // Maps exchanges to their order IDs
  timestamps: {
    started: number;
    completed?: number;
  };
  executionReport: {
    analyzedVenues: ExchangeId[];
    selectedVenues: ExchangeId[];
    liquidityAnalysis: Map<ExchangeId, {
      availableLiquidity: number;
      estimatedImpact: number;
      orderBookDepth: number;
    }>;
    pricingAnalysis: Map<ExchangeId, {
      bestBid: number;
      bestAsk: number;
      estimatedExecutionPrice: number;
      priceAdvantage: number;
    }>;
    feeAnalysis: Map<ExchangeId, {
      estimatedFee: number;
      feeRate: number;
    }>;
    routingDecision: string;
  };
}

/**
 * Smart Order Router Service
 * Manages execution of orders across multiple venues
 */
export class SmartOrderRouter {
  private static instance: SmartOrderRouter;
  private exchangeService: ExchangeService;
  private venuePerformanceCache: Map<ExchangeId, {
    averageSlippage: number;
    fillRate: number;
    orderSuccessRate: number;
    latency: number;
    lastUpdated: number;
  }> = new Map();

  private constructor() {
    this.exchangeService = ExchangeService.getInstance();
  }

  public static getInstance(): SmartOrderRouter {
    if (!SmartOrderRouter.instance) {
      SmartOrderRouter.instance = new SmartOrderRouter();
    }
    return SmartOrderRouter.instance;
  }

  /**
   * Execute a smart order across multiple venues
   */
  public async executeSmartOrder(
    params: SmartOrderParams,
    userId: string
  ): Promise<SmartOrderResult> {
    console.log(`[SmartOrderRouter] Executing smart order for ${params.symbol}`);
    
    // Generate a unique aggregate order ID
    const aggregateOrderId = `sor-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Initialize result structure
    const result: SmartOrderResult = {
      orderResults: new Map(),
      aggregateOrderId,
      filledAmount: 0,
      averagePrice: 0,
      fees: {
        total: 0,
        byExchange: new Map(),
      },
      status: 'failed',
      childOrders: new Map(),
      timestamps: {
        started: Date.now(),
      },
      executionReport: {
        analyzedVenues: [],
        selectedVenues: [],
        liquidityAnalysis: new Map(),
        pricingAnalysis: new Map(),
        feeAnalysis: new Map(),
        routingDecision: ''
      }
    };
    
    try {
      // 1. Gather market data from all specified venues
      const marketDataMap = await this.gatherMarketData(params.venues, params.symbol);
      
      // 2. Analyze liquidity, pricing, and fees for each venue
      const analysisResult = await this.analyzeExecutionVenues(
        params,
        marketDataMap,
        userId
      );
      
      // 3. Determine order allocation based on the split strategy
      const allocations = await this.allocateOrdersByStrategy(
        params,
        analysisResult,
        userId
      );
      
      // 4. Execute orders on each venue according to allocation
      result.executionReport.routingDecision = `Split order across ${allocations.length} venues based on ${params.splitStrategy} strategy`;
      result.executionReport.selectedVenues = allocations.map(a => a.exchange);
      
      // 5. Execute orders in parallel, prioritizing by allocation priority
      // Sort allocations by priority (lower number = higher priority)
      const sortedAllocations = [...allocations].sort((a, b) => a.priority - b.priority);
      
      // Convert to a sequential execution for venues with the same priority
      const executionGroups: VenueOrderAllocation[][] = [];
      let currentPriority = -1;
      let currentGroup: VenueOrderAllocation[] = [];
      
      for (const allocation of sortedAllocations) {
        if (allocation.priority !== currentPriority) {
          if (currentGroup.length > 0) {
            executionGroups.push(currentGroup);
          }
          currentGroup = [allocation];
          currentPriority = allocation.priority;
        } else {
          currentGroup.push(allocation);
        }
      }
      
      if (currentGroup.length > 0) {
        executionGroups.push(currentGroup);
      }
      
      // Execute each priority group in sequence, but venues within a group in parallel
      let totalFilled = 0;
      let priceAccumulator = 0;
      let totalFees = 0;
      
      for (const group of executionGroups) {
        // Execute all venues in this priority group in parallel
        const executionPromises = group.map(allocation => 
          this.executeOnVenue(params, allocation, aggregateOrderId)
        );
        
        const venueResults = await Promise.all(executionPromises);
        
        // Process results from this group
        for (const venueResult of venueResults) {
          if (!venueResult) continue;
          
          const { orderResult, exchange, fee } = venueResult;
          
          // Store order result
          result.orderResults.set(exchange, orderResult);
          
          // Track child orders
          if (!result.childOrders.has(exchange)) {
            result.childOrders.set(exchange, []);
          }
          result.childOrders.get(exchange)!.push(orderResult.id);
          
          // Track fill amounts and prices
          totalFilled += orderResult.filled;
          priceAccumulator += orderResult.filled * (orderResult.price || 0);
          
          // Track fees
          totalFees += fee;
          result.fees.byExchange.set(exchange, fee);
        }
      }
      
      // Calculate average price
      result.averagePrice = totalFilled > 0 ? priceAccumulator / totalFilled : 0;
      result.filledAmount = totalFilled;
      result.fees.total = totalFees;
      
      // Determine final status
      if (totalFilled >= params.amount * 0.99) { // Consider 99% filled as complete
        result.status = 'complete';
      } else if (totalFilled > 0) {
        result.status = 'partial';
      } else {
        result.status = 'failed';
      }
      
      // Mark completion timestamp
      result.timestamps.completed = Date.now();
      
      // Update venue performance cache with execution data
      this.updateVenuePerformanceCache(result);
      
      return result;
    } catch (error) {
      console.error('[SmartOrderRouter] Error executing smart order:', error);
      
      // In case of error, still return any partial results
      result.status = 'failed';
      result.timestamps.completed = Date.now();
      
      return result;
    }
  }
  
  /**
   * Execute an order on a specific venue
   */
  private async executeOnVenue(
    params: SmartOrderParams,
    allocation: VenueOrderAllocation,
    aggregateOrderId: string
  ): Promise<{ orderResult: OrderResult; exchange: ExchangeId; fee: number } | null> {
    try {
      const exchange = allocation.exchange;
      const connector = await this.exchangeService.getConnector(exchange);
      
      if (!connector) {
        console.error(`[SmartOrderRouter] No connector available for ${exchange}`);
        return null;
      }
      
      // Prepare venue-specific order parameters
      const venueOrderParams: OrderParams = {
        ...params,
        amount: allocation.amount,
        clientOrderId: `${aggregateOrderId}-${exchange}`,
      };
      
      // Execute the order
      const orderResult = await connector.placeOrder(venueOrderParams);
      
      // Calculate actual fee
      const fee = orderResult.fee?.cost || 
                 (orderResult.filled * (orderResult.price || 0) * 0.001); // Default 0.1% if not provided
      
      return {
        orderResult,
        exchange,
        fee
      };
    } catch (error) {
      console.error(`[SmartOrderRouter] Error executing on ${allocation.exchange}:`, error);
      return null;
    }
  }
  
  /**
   * Gather market data from multiple venues
   */
  private async gatherMarketData(
    venues: ExchangeId[], 
    symbol: string
  ): Promise<Map<ExchangeId, MarketData>> {
    const results = new Map<ExchangeId, MarketData>();
    
    // Gather market data in parallel
    const marketDataPromises = venues.map(async (venue) => {
      try {
        const connector = await this.exchangeService.getConnector(venue);
        if (!connector) return null;
        
        const marketData = await connector.getMarketData(symbol);
        return { venue, marketData };
      } catch (error) {
        console.error(`[SmartOrderRouter] Error getting market data from ${venue}:`, error);
        return null;
      }
    });
    
    const marketDataResults = await Promise.all(marketDataPromises);
    
    // Process results
    for (const result of marketDataResults) {
      if (result) {
        results.set(result.venue, result.marketData);
      }
    }
    
    return results;
  }
  
  /**
   * Analyze venues for liquidity, pricing, and fees
   */
  private async analyzeExecutionVenues(
    params: SmartOrderParams,
    marketDataMap: Map<ExchangeId, MarketData>,
    userId: string
  ): Promise<{
    liquidityAnalysis: Map<ExchangeId, {
      availableLiquidity: number;
      estimatedImpact: number;
      orderBookDepth: number;
    }>;
    pricingAnalysis: Map<ExchangeId, {
      bestBid: number;
      bestAsk: number;
      estimatedExecutionPrice: number;
      priceAdvantage: number;
    }>;
    feeAnalysis: Map<ExchangeId, {
      estimatedFee: number;
      feeRate: number;
    }>;
    venueScores: Map<ExchangeId, number>;
  }> {
    const liquidityAnalysis = new Map();
    const pricingAnalysis = new Map();
    const feeAnalysis = new Map();
    const venueScores = new Map<ExchangeId, number>();
    
    // Default benchmark values
    let bestPrice = params.side === OrderSide.BUY ? Number.MAX_VALUE : 0;
    
    // Find benchmark price across all venues
    for (const [venue, marketData] of marketDataMap.entries()) {
      const price = params.side === OrderSide.BUY ? marketData.ask : marketData.bid;
      
      if (params.side === OrderSide.BUY) {
        bestPrice = Math.min(bestPrice, price);
      } else {
        bestPrice = Math.max(bestPrice, price);
      }
    }
    
    // Analyze each venue
    for (const venue of params.venues) {
      const marketData = marketDataMap.get(venue);
      if (!marketData) continue;
      
      // Get connector for fee information
      const connector = await this.exchangeService.getConnector(venue);
      if (!connector) continue;
      
      // 1. Liquidity analysis
      // This is a simplification - in a real system we'd analyze the order book depth
      const liquidity = {
        availableLiquidity: params.side === OrderSide.BUY ? 
          marketData.volume || 100000 : // For buy, use available sell-side volume
          marketData.volume || 100000,  // For sell, use available buy-side volume
        estimatedImpact: Math.min(params.amount / (marketData.volume || 100000) * 0.01, 0.01), // Simplistic impact model
        orderBookDepth: 100 // Placeholder - would need order book analysis
      };
      liquidityAnalysis.set(venue, liquidity);
      
      // 2. Pricing analysis
      const venuePrice = params.side === OrderSide.BUY ? marketData.ask : marketData.bid;
      const priceDiff = params.side === OrderSide.BUY ?
        (venuePrice - bestPrice) / bestPrice :
        (bestPrice - venuePrice) / bestPrice;
      
      const pricing = {
        bestBid: marketData.bid,
        bestAsk: marketData.ask,
        estimatedExecutionPrice: venuePrice * (1 + liquidity.estimatedImpact * (params.side === OrderSide.BUY ? 1 : -1)),
        priceAdvantage: -priceDiff // Negative difference is better
      };
      pricingAnalysis.set(venue, pricing);
      
      // 3. Fee analysis
      const feeCalculation = await connector.calculateFees(
        params.symbol,
        params.side,
        params.amount,
        venuePrice
      );
      
      const fees = {
        estimatedFee: feeCalculation.cost,
        feeRate: feeCalculation.percentage
      };
      feeAnalysis.set(venue, fees);
      
      // 4. Calculate venue score
      // Lower is better: 60% price, 20% liquidity, 20% fees
      const priceScore = priceDiff * 60;
      const liquidityScore = (1 - Math.min(liquidity.availableLiquidity / params.amount, 1)) * 20;
      const feeScore = (fees.feeRate / 0.001) * 20; // Normalize against 0.1% fee
      
      // Apply user preferences if available
      const preferences = params.routingPreferences;
      if (preferences) {
        let adjustedScore = priceScore + liquidityScore + feeScore;
        
        if (preferences.prioritizeLiquidity) {
          adjustedScore -= liquidityScore * 0.5; // Reduce the impact of liquidity score
        }
        
        if (preferences.prioritizeFees) {
          adjustedScore -= feeScore * 0.5; // Reduce the impact of fee score
        }
        
        if (preferences.blacklistedVenues?.includes(venue)) {
          adjustedScore = Number.MAX_VALUE; // Effectively exclude this venue
        }
        
        venueScores.set(venue, adjustedScore);
      } else {
        venueScores.set(venue, priceScore + liquidityScore + feeScore);
      }
    }
    
    return {
      liquidityAnalysis,
      pricingAnalysis,
      feeAnalysis,
      venueScores
    };
  }
  
  /**
   * Allocate orders across venues according to the specified strategy
   */
  private async allocateOrdersByStrategy(
    params: SmartOrderParams,
    analysisResult: {
      liquidityAnalysis: Map<ExchangeId, any>;
      pricingAnalysis: Map<ExchangeId, any>;
      feeAnalysis: Map<ExchangeId, any>;
      venueScores: Map<ExchangeId, number>;
    },
    userId: string
  ): Promise<VenueOrderAllocation[]> {
    const { venueScores, liquidityAnalysis, pricingAnalysis, feeAnalysis } = analysisResult;
    const allocations: VenueOrderAllocation[] = [];
    
    // Filter to venues with sufficient liquidity
    const viableVenues = Array.from(venueScores.entries())
      .filter(([venue, score]) => {
        // Ensure venue has enough liquidity and a real score
        const liquidity = liquidityAnalysis.get(venue);
        return liquidity && 
               liquidity.availableLiquidity >= params.amount * 0.5 &&
               score < Number.MAX_VALUE;
      })
      .sort((a, b) => a[1] - b[1]); // Sort by score (lower is better)
    
    // Fast path: if no viable venues, return empty allocation
    if (viableVenues.length === 0) {
      return allocations;
    }
    
    // Fast path: if only 1 viable venue, allocate everything there
    if (viableVenues.length === 1) {
      const [venue] = viableVenues[0];
      allocations.push({
        exchange: venue,
        amount: params.amount,
        priority: 0,
        reason: 'Single viable venue available'
      });
      return allocations;
    }
    
    // Apply the requested splitting strategy
    switch (params.splitStrategy) {
      case 'even': {
        // Split evenly among top venues (max 3)
        const topVenues = viableVenues.slice(0, 3).map(([venue]) => venue);
        const amountPerVenue = params.amount / topVenues.length;
        
        topVenues.forEach((venue, index) => {
          allocations.push({
            exchange: venue,
            amount: amountPerVenue,
            priority: 0, // Execute all at once
            reason: 'Even split among top venues'
          });
        });
        break;
      }
        
      case 'liquidity-weighted': {
        // Weight by available liquidity
        let totalLiquidity = 0;
        const topVenues = viableVenues.slice(0, 4).map(([venue]) => venue);
        
        const venuesWithLiquidity = topVenues.map(venue => {
          const liquidity = liquidityAnalysis.get(venue)?.availableLiquidity || 0;
          totalLiquidity += liquidity;
          return { venue, liquidity };
        });
        
        venuesWithLiquidity.forEach(({ venue, liquidity }, index) => {
          const weight = liquidity / totalLiquidity;
          const amount = params.amount * weight;
          
          allocations.push({
            exchange: venue,
            amount,
            priority: 0, // Execute all at once
            reason: `Liquidity-weighted allocation (${(weight * 100).toFixed(1)}%)`
          });
        });
        break;
      }
        
      case 'price-biased': {
        // Prioritize venues with best price, allocate more to better prices
        // Take top 3 venues by price
        const topVenues = viableVenues.slice(0, 3);
        const totalWeight = topVenues.reduce((sum, [_, score], index) => {
          // Weighting: 1st = 60%, 2nd = 30%, 3rd = 10% (reverse engineering from wanted allocation)
          const weight = index === 0 ? 3 : index === 1 ? 1.5 : 0.5;
          return sum + weight;
        }, 0);
        
        topVenues.forEach(([venue, _], index) => {
          // Calculate weight based on position
          const weight = index === 0 ? 3 : index === 1 ? 1.5 : 0.5;
          const normalizedWeight = weight / totalWeight;
          const amount = params.amount * normalizedWeight;
          
          allocations.push({
            exchange: venue,
            amount,
            priority: index, // Execute best price first
            reason: `Price-biased allocation (${(normalizedWeight * 100).toFixed(1)}%)`
          });
        });
        break;
      }
        
      case 'fee-optimized': {
        // Prioritize venues with lowest fees
        // Sort venues by fee rate
        const venuesByFee = Array.from(viableVenues)
          .sort((a, b) => {
            const feeA = feeAnalysis.get(a[0])?.feeRate || 0;
            const feeB = feeAnalysis.get(b[0])?.feeRate || 0;
            return feeA - feeB;
          });
        
        // Allocate more to venues with lower fees
        const totalWeight = venuesByFee.reduce((sum, _, index) => {
          // Weighting: 1st = 70%, 2nd = 20%, 3rd = 10% (reverse engineering from wanted allocation)
          const weight = index === 0 ? 7 : index === 1 ? 2 : 1;
          return sum + weight;
        }, 0);
        
        venuesByFee.slice(0, 3).forEach(([venue], index) => {
          // Calculate weight based on position
          const weight = index === 0 ? 7 : index === 1 ? 2 : 1;
          const normalizedWeight = weight / totalWeight;
          const amount = params.amount * normalizedWeight;
          
          allocations.push({
            exchange: venue,
            amount,
            priority: 0, // Execute all at once
            reason: `Fee-optimized allocation (${(normalizedWeight * 100).toFixed(1)}%)`
          });
        });
        break;
      }
    }
    
    return allocations;
  }
  
  /**
   * Update the venue performance cache with execution results
   */
  private updateVenuePerformanceCache(result: SmartOrderResult): void {
    const now = Date.now();
    
    // Update cache for each venue
    for (const [exchange, orderResult] of result.orderResults.entries()) {
      const existingStats = this.venuePerformanceCache.get(exchange) || {
        averageSlippage: 0,
        fillRate: 0,
        orderSuccessRate: 0,
        latency: 0,
        lastUpdated: 0
      };
      
      // Calculate metrics
      const slippage = orderResult.average && orderResult.price 
        ? Math.abs(orderResult.average - orderResult.price) / orderResult.price 
        : 0;
      
      const fillRate = orderResult.amount > 0 
        ? orderResult.filled / orderResult.amount 
        : 0;
      
      const latency = result.timestamps.completed && result.timestamps.started
        ? result.timestamps.completed - result.timestamps.started
        : 0;
      
      // Exponential moving average update (alpha = 0.3)
      const alpha = 0.3;
      const updatedStats = {
        averageSlippage: existingStats.averageSlippage * (1 - alpha) + slippage * alpha,
        fillRate: existingStats.fillRate * (1 - alpha) + fillRate * alpha,
        orderSuccessRate: existingStats.orderSuccessRate * (1 - alpha) + (orderResult.filled > 0 ? 1 : 0) * alpha,
        latency: existingStats.latency * (1 - alpha) + latency * alpha,
        lastUpdated: now
      };
      
      this.venuePerformanceCache.set(exchange, updatedStats);
    }
  }
}

// Singleton instance
export const smartOrderRouter = SmartOrderRouter.getInstance();
