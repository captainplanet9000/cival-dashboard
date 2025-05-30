/**
 * Position Management Service
 * 
 * Responsible for tracking and managing user positions across exchanges.
 * Provides functions for position lookup, P&L calculation, and risk analysis.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createExchangeConnector } from '@/lib/exchange/connector-factory';
import { IExchangeConnector } from '@/lib/exchange/types';
import { 
  Position, 
  PositionSummary, 
  PositionRiskMetrics, 
  PositionUpdate 
} from './types';

/**
 * Interface for Position Management Service
 */
export interface IPositionManagementService {
  /**
   * Get all positions for a user
   * 
   * @param includeZero - Whether to include zero-sized positions
   * @returns Array of user positions across all exchanges
   */
  getAllPositions(includeZero?: boolean): Promise<Position[]>;
  
  /**
   * Get positions for a specific exchange
   * 
   * @param exchange - The exchange to get positions for
   * @param includeZero - Whether to include zero-sized positions
   * @returns Array of positions on the specified exchange
   */
  getExchangePositions(exchange: string, includeZero?: boolean): Promise<Position[]>;
  
  /**
   * Get a specific position
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @returns The position if found, null otherwise
   */
  getPosition(exchange: string, symbol: string): Promise<Position | null>;
  
  /**
   * Manually update a position 
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @param update - The position update data
   * @returns The updated position
   */
  updatePosition(exchange: string, symbol: string, update: PositionUpdate): Promise<Position>;
  
  /**
   * Calculate position risk metrics
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @returns Risk metrics for the position
   */
  calculateRiskMetrics(exchange: string, symbol: string): Promise<PositionRiskMetrics>;
  
  /**
   * Calculate position P&L
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @param currentPrice - Optional current price (if not provided, latest price will be fetched)
   * @returns Updated position with P&L information
   */
  calculatePositionPnL(exchange: string, symbol: string, currentPrice?: number): Promise<Position>;
  
  /**
   * Get position summary for all exchanges
   * 
   * @returns Position summary across all exchanges
   */
  getPositionSummary(): Promise<PositionSummary>;
  
  /**
   * Sync positions with exchange
   * 
   * @param exchange - The exchange to sync positions with
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns True if sync was successful
   */
  syncPositionsWithExchange(exchange: string, credentialId?: string): Promise<boolean>;
}

/**
 * Implementation of Position Management Service
 */
export class PositionManagementService implements IPositionManagementService {
  private userId: string;
  private supabase = createBrowserClient();
  private connectorCache: Map<string, IExchangeConnector> = new Map();
  
  /**
   * Create a new Position Management Service
   * 
   * @param userId - The ID of the user
   */
  constructor(userId: string) {
    this.userId = userId;
  }
  
  /**
   * Get all positions for a user
   * 
   * @param includeZero - Whether to include zero-sized positions
   * @returns Array of user positions across all exchanges
   */
  public async getAllPositions(includeZero: boolean = false): Promise<Position[]> {
    try {
      let query = this.supabase
        .from('exchange_positions')
        .select('*')
        .eq('user_id', this.userId);
      
      if (!includeZero) {
        query = query.not('position_size', 'eq', 0);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Fetch current prices for P&L calculation
      const enrichedPositions = await this.enrichPositionsWithCurrentPrices(data || []);
      
      return enrichedPositions;
    } catch (error) {
      console.error(`Failed to get all positions:`, error);
      throw error;
    }
  }
  
  /**
   * Get positions for a specific exchange
   * 
   * @param exchange - The exchange to get positions for
   * @param includeZero - Whether to include zero-sized positions
   * @returns Array of positions on the specified exchange
   */
  public async getExchangePositions(exchange: string, includeZero: boolean = false): Promise<Position[]> {
    try {
      let query = this.supabase
        .from('exchange_positions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('exchange', exchange);
      
      if (!includeZero) {
        query = query.not('position_size', 'eq', 0);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Fetch current prices for P&L calculation
      const enrichedPositions = await this.enrichPositionsWithCurrentPrices(data || []);
      
      return enrichedPositions;
    } catch (error) {
      console.error(`Failed to get positions for ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific position
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @returns The position if found, null otherwise
   */
  public async getPosition(exchange: string, symbol: string): Promise<Position | null> {
    try {
      const { data, error } = await this.supabase
        .from('exchange_positions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('exchange', exchange)
        .eq('symbol', symbol)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }
      
      if (!data) {
        return null;
      }
      
      // Calculate current P&L
      const currentPrice = await this.getCurrentPrice(exchange, symbol);
      return this.calculatePnL(data, currentPrice);
    } catch (error) {
      console.error(`Failed to get position for ${symbol} on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Manually update a position 
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @param update - The position update data
   * @returns The updated position
   */
  public async updatePosition(exchange: string, symbol: string, update: PositionUpdate): Promise<Position> {
    try {
      // Check if the position exists
      const { data: existingPosition, error: queryError } = await this.supabase
        .from('exchange_positions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('exchange', exchange)
        .eq('symbol', symbol)
        .single();
      
      if (queryError && queryError.code !== 'PGRST116') { // No rows returned
        throw queryError;
      }
      
      let result;
      
      if (existingPosition) {
        // Update existing position
        const { error: updateError } = await this.supabase
          .from('exchange_positions')
          .update({
            position_size: update.positionSize ?? existingPosition.position_size,
            entry_price: update.entryPrice ?? existingPosition.entry_price,
            liquidation_price: update.liquidationPrice ?? existingPosition.liquidation_price,
            unrealized_pnl: update.unrealizedPnl ?? existingPosition.unrealized_pnl,
            realized_pnl: update.realizedPnl ?? existingPosition.realized_pnl,
            margin_used: update.marginUsed ?? existingPosition.margin_used,
            leverage: update.leverage ?? existingPosition.leverage,
            last_updated_price: update.lastPrice ?? existingPosition.last_updated_price,
            metadata: update.metadata ? { ...existingPosition.metadata, ...update.metadata } : existingPosition.metadata
          })
          .eq('id', existingPosition.id)
          .select()
          .single();
        
        if (updateError) {
          throw updateError;
        }
        
        result = existingPosition;
      } else {
        // Create new position
        const { data: newPosition, error: insertError } = await this.supabase
          .from('exchange_positions')
          .insert({
            user_id: this.userId,
            exchange,
            symbol,
            position_size: update.positionSize || 0,
            entry_price: update.entryPrice || 0,
            liquidation_price: update.liquidationPrice,
            unrealized_pnl: update.unrealizedPnl || 0,
            realized_pnl: update.realizedPnl || 0,
            margin_used: update.marginUsed,
            leverage: update.leverage || 1,
            last_updated_price: update.lastPrice,
            metadata: update.metadata
          })
          .select()
          .single();
        
        if (insertError) {
          throw insertError;
        }
        
        result = newPosition;
      }
      
      // Calculate current P&L
      const currentPrice = update.lastPrice || await this.getCurrentPrice(exchange, symbol);
      return this.calculatePnL(result, currentPrice);
    } catch (error) {
      console.error(`Failed to update position for ${symbol} on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate position risk metrics
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @returns Risk metrics for the position
   */
  public async calculateRiskMetrics(exchange: string, symbol: string): Promise<PositionRiskMetrics> {
    try {
      // Get the position
      const position = await this.getPosition(exchange, symbol);
      
      if (!position) {
        throw new Error(`Position not found for ${symbol} on ${exchange}`);
      }
      
      // Get current market price
      const currentPrice = await this.getCurrentPrice(exchange, symbol);
      
      // Calculate risk metrics
      const positionValue = Math.abs(position.position_size * currentPrice);
      const entryValue = Math.abs(position.position_size * position.entry_price);
      
      // Calculate max drawdown, ideally would be based on historical data
      // For now, use a simple estimate based on current price vs entry
      const maxDrawdown = Math.abs((currentPrice - position.entry_price) / position.entry_price);
      
      // Calculate risk metrics
      const metrics: PositionRiskMetrics = {
        exchange,
        symbol,
        positionValue,
        entryValue,
        notionalValue: positionValue,
        leverage: position.leverage || 1,
        maxDrawdown,
        maxDrawdownValue: positionValue * maxDrawdown,
        liquidationPrice: position.liquidation_price || null,
        
        // Distance to liquidation (as percentage)
        liquidationDistance: position.liquidation_price 
          ? Math.abs((currentPrice - position.liquidation_price) / currentPrice) * 100
          : null,
        
        // Breaking even requires price to move back to entry
        breakEvenPriceChange: position.position_size !== 0
          ? ((position.entry_price - currentPrice) / currentPrice) * 100
          : 0,
        
        // Delta measures price sensitivity (simple approximation)
        delta: position.position_size,
        
        // Value at Risk (simple approximation using 2-sigma for daily move)
        valueAtRisk: positionValue * 0.05, // Assuming 5% daily volatility
        
        // Margin ratio
        marginRatio: position.margin_used 
          ? (position.margin_used / positionValue) * 100
          : 100 / (position.leverage || 1)
      };
      
      return metrics;
    } catch (error) {
      console.error(`Failed to calculate risk metrics for ${symbol} on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate position P&L
   * 
   * @param exchange - The exchange the position is on
   * @param symbol - The symbol of the position
   * @param currentPrice - Optional current price (if not provided, latest price will be fetched)
   * @returns Updated position with P&L information
   */
  public async calculatePositionPnL(exchange: string, symbol: string, currentPrice?: number): Promise<Position> {
    try {
      // Get the position
      const position = await this.getPosition(exchange, symbol);
      
      if (!position) {
        throw new Error(`Position not found for ${symbol} on ${exchange}`);
      }
      
      // Get current price if not provided
      const price = currentPrice || await this.getCurrentPrice(exchange, symbol);
      
      // Calculate P&L
      const updatedPosition = this.calculatePnL(position, price);
      
      // Update position in database
      await this.supabase
        .from('exchange_positions')
        .update({
          unrealized_pnl: updatedPosition.unrealized_pnl,
          last_updated_price: price
        })
        .eq('id', position.id);
      
      return updatedPosition;
    } catch (error) {
      console.error(`Failed to calculate P&L for ${symbol} on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Get position summary for all exchanges
   * 
   * @returns Position summary across all exchanges
   */
  public async getPositionSummary(): Promise<PositionSummary> {
    try {
      // Get all positions
      const positions = await this.getAllPositions();
      
      // Calculate totals
      let totalPositionValue = 0;
      let totalUnrealizedPnL = 0;
      let totalRealizedPnL = 0;
      const exchanges = new Set<string>();
      const assets = new Set<string>();
      let countLong = 0;
      let countShort = 0;
      
      for (const position of positions) {
        const currentPrice = position.last_updated_price || await this.getCurrentPrice(position.exchange, position.symbol);
        const positionValue = Math.abs(position.position_size * currentPrice);
        
        totalPositionValue += positionValue;
        totalUnrealizedPnL += position.unrealized_pnl || 0;
        totalRealizedPnL += position.realized_pnl || 0;
        exchanges.add(position.exchange);
        assets.add(position.symbol);
        
        if (position.position_size > 0) {
          countLong++;
        } else if (position.position_size < 0) {
          countShort++;
        }
      }
      
      // Calculate daily P&L
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data: dailyPnL, error } = await this.supabase
        .from('trading_performance')
        .select('profit_loss')
        .eq('user_id', this.userId)
        .eq('period', 'day')
        .gte('end_date', oneDayAgo.toISOString())
        .order('end_date', { ascending: false })
        .limit(1)
        .single();
      
      return {
        totalPositionValue,
        totalUnrealizedPnL,
        totalRealizedPnL,
        totalDailyPnL: dailyPnL?.profit_loss || 0,
        numberOfPositions: positions.length,
        numberOfExchanges: exchanges.size,
        numberOfAssets: assets.size,
        countLongPositions: countLong,
        countShortPositions: countShort,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Failed to get position summary:`, error);
      throw error;
    }
  }
  
  /**
   * Sync positions with exchange
   * 
   * @param exchange - The exchange to sync positions with
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns True if sync was successful
   */
  public async syncPositionsWithExchange(exchange: string, credentialId?: string): Promise<boolean> {
    try {
      // Get the exchange connector
      const connector = await this.getConnector(exchange, credentialId);
      
      // Get positions from the exchange
      const accountInfo = await connector.getAccountInfo();
      
      if (!accountInfo || !accountInfo.positions) {
        throw new Error(`Failed to get positions from ${exchange}`);
      }
      
      // Process each position
      for (const position of accountInfo.positions) {
        // Check if we already have this position
        const existingPosition = await this.getPosition(exchange, position.symbol);
        
        if (existingPosition) {
          // Update existing position
          await this.updatePosition(exchange, position.symbol, {
            positionSize: position.positionSize,
            entryPrice: position.entryPrice,
            liquidationPrice: position.liquidationPrice,
            unrealizedPnl: position.unrealizedPnL,
            marginUsed: position.margin,
            leverage: position.leverage,
            lastPrice: position.markPrice,
            metadata: {
              last_sync: new Date().toISOString(),
              exchange_data: position
            }
          });
        } else if (position.positionSize !== 0) {
          // Create new position if not zero
          await this.updatePosition(exchange, position.symbol, {
            positionSize: position.positionSize,
            entryPrice: position.entryPrice,
            liquidationPrice: position.liquidationPrice,
            unrealizedPnl: position.unrealizedPnL,
            marginUsed: position.margin,
            leverage: position.leverage,
            lastPrice: position.markPrice,
            metadata: {
              last_sync: new Date().toISOString(),
              exchange_data: position
            }
          });
        }
      }
      
      // Also update balances
      await this.syncBalancesWithExchange(exchange, accountInfo, credentialId);
      
      return true;
    } catch (error) {
      console.error(`Failed to sync positions with ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Sync balances with exchange
   * 
   * @param exchange - The exchange to sync balances with
   * @param accountInfo - Account information from the exchange
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns True if sync was successful
   */
  private async syncBalancesWithExchange(
    exchange: string, 
    accountInfo: any, 
    credentialId?: string
  ): Promise<boolean> {
    try {
      if (!accountInfo || !accountInfo.balances) {
        throw new Error(`No balance information available from ${exchange}`);
      }
      
      // Process each balance
      for (const balance of accountInfo.balances) {
        if (balance.free === 0 && balance.locked === 0) {
          continue; // Skip zero balances
        }
        
        // Check if we already have this balance
        const { data: existingBalance, error } = await this.supabase
          .from('exchange_balances')
          .select('*')
          .eq('user_id', this.userId)
          .eq('exchange', exchange)
          .eq('asset', balance.asset)
          .single();
        
        if (error && error.code !== 'PGRST116') { // No rows returned
          throw error;
        }
        
        // Get current USD price for the asset
        let usdValue = null;
        try {
          // For simplicity, we'll just use BTC/USD and ETH/USD as examples
          // A real implementation would use price feeds or exchange rates
          if (balance.asset === 'BTC') {
            const btcPrice = await this.getCurrentPrice(exchange, 'BTCUSDT');
            usdValue = (balance.free + balance.locked) * btcPrice;
          } else if (balance.asset === 'ETH') {
            const ethPrice = await this.getCurrentPrice(exchange, 'ETHUSDT');
            usdValue = (balance.free + balance.locked) * ethPrice;
          } else if (balance.asset === 'USDT' || balance.asset === 'USDC' || balance.asset === 'USD') {
            usdValue = balance.free + balance.locked;
          }
        } catch (e) {
          console.warn(`Failed to get USD value for ${balance.asset}:`, e);
        }
        
        if (existingBalance) {
          // Update existing balance
          await this.supabase
            .from('exchange_balances')
            .update({
              free: balance.free,
              locked: balance.locked,
              usd_value: usdValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBalance.id);
        } else {
          // Create new balance
          await this.supabase
            .from('exchange_balances')
            .insert({
              user_id: this.userId,
              exchange,
              asset: balance.asset,
              free: balance.free,
              locked: balance.locked,
              usd_value: usdValue,
              metadata: {
                last_sync: new Date().toISOString()
              }
            });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to sync balances with ${exchange}:`, error);
      return false; // Continue despite balance sync failure
    }
  }
  
  /**
   * Get an exchange connector instance
   * 
   * @param exchange - The exchange to get a connector for
   * @param credentialId - Optional ID of the exchange credential to use
   * @returns An initialized exchange connector
   */
  private async getConnector(
    exchange: string,
    credentialId?: string
  ): Promise<IExchangeConnector> {
    // Create a cache key
    const cacheKey = `${exchange}:${credentialId || 'default'}`;
    
    // Check if the connector is already cached
    if (this.connectorCache.has(cacheKey)) {
      return this.connectorCache.get(cacheKey)!;
    }
    
    // Get credentials for the exchange
    const credentials = await this.getExchangeCredentials(exchange, credentialId);
    
    // Create the connector
    const connector = createExchangeConnector(exchange, {
      useTestnet: credentials.is_testnet
    });
    
    // Connect to the exchange
    const connected = await connector.connect({
      apiKey: credentials.api_key,
      secretKey: credentials.api_secret,
      passphrase: credentials.api_passphrase
    });
    
    if (!connected) {
      throw new Error(`Failed to connect to ${exchange}`);
    }
    
    // Cache the connector
    this.connectorCache.set(cacheKey, connector);
    
    return connector;
  }
  
  /**
   * Get exchange credentials for a user
   * 
   * @param exchange - The exchange to get credentials for
   * @param credentialId - Optional ID of the credential to use
   * @returns The exchange credentials
   */
  private async getExchangeCredentials(
    exchange: string,
    credentialId?: string
  ): Promise<any> {
    try {
      let query = this.supabase
        .from('exchange_credentials')
        .select('*')
        .eq('user_id', this.userId)
        .eq('exchange', exchange)
        .eq('is_active', true);
      
      // If a specific credential ID is provided, use that
      if (credentialId) {
        query = query.eq('id', credentialId);
      } else {
        // Otherwise, get the most recently updated credential
        query = query.order('updated_at', { ascending: false }).limit(1);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error(`No active credentials found for ${exchange}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to get exchange credentials for ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate P&L for a position
   * 
   * @param position - The position to calculate P&L for
   * @param currentPrice - The current price of the asset
   * @returns The position with updated P&L information
   */
  private calculatePnL(position: any, currentPrice: number): Position {
    // For long positions: (current_price - entry_price) * position_size
    // For short positions: (entry_price - current_price) * abs(position_size)
    const unrealizedPnL = position.position_size > 0
      ? (currentPrice - position.entry_price) * position.position_size
      : (position.entry_price - currentPrice) * Math.abs(position.position_size);
    
    // Calculate profit/loss percentage
    const pnlPercentage = position.entry_price !== 0
      ? (unrealizedPnL / (position.entry_price * Math.abs(position.position_size))) * 100
      : 0;
    
    return {
      ...position,
      unrealized_pnl: unrealizedPnL,
      pnl_percentage: pnlPercentage,
      last_updated_price: currentPrice
    };
  }
  
  /**
   * Get current price for a symbol
   * 
   * @param exchange - The exchange to get the price from
   * @param symbol - The symbol to get the price for
   * @returns The current price of the asset
   */
  private async getCurrentPrice(exchange: string, symbol: string): Promise<number> {
    try {
      // First try to get from market_data table
      const { data, error } = await this.supabase
        .from('market_data')
        .select('price, last_update')
        .eq('exchange', exchange)
        .eq('symbol', symbol)
        .single();
      
      // If we have recent data (less than 1 minute old), use it
      if (data && new Date(data.last_update).getTime() > Date.now() - 60000) {
        return data.price;
      }
      
      // Otherwise, fetch from exchange API
      // This is a simplified implementation, real-world would use WebSockets or cached prices
      try {
        const connector = await this.getConnector(exchange);
        const marketData = await connector.getMarketData(symbol);
        
        if (marketData && marketData.lastPrice) {
          // Update our cached price
          await this.supabase
            .from('market_data')
            .upsert({
              exchange,
              symbol,
              price: marketData.lastPrice,
              bid: marketData.bidPrice,
              ask: marketData.askPrice,
              volume_24h: marketData.volume,
              last_update: new Date().toISOString()
            }, { onConflict: 'exchange,symbol' });
          
          return marketData.lastPrice;
        }
      } catch (e) {
        console.warn(`Failed to get price from exchange API:`, e);
        // If we have any cached data, return it even if it's old
        if (data) {
          return data.price;
        }
      }
      
      throw new Error(`Failed to get current price for ${symbol} on ${exchange}`);
    } catch (error) {
      console.error(`Failed to get current price for ${symbol} on ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Enrich positions with current prices and P&L calculations
   * 
   * @param positions - The positions to enrich
   * @returns Positions with P&L information
   */
  private async enrichPositionsWithCurrentPrices(positions: any[]): Promise<Position[]> {
    // Group positions by exchange to minimize API calls
    const exchangeMap = new Map<string, { symbols: string[], positions: any[] }>();
    
    for (const position of positions) {
      if (!exchangeMap.has(position.exchange)) {
        exchangeMap.set(position.exchange, { symbols: [], positions: [] });
      }
      
      const exchangeData = exchangeMap.get(position.exchange)!;
      exchangeData.symbols.push(position.symbol);
      exchangeData.positions.push(position);
    }
    
    // Process each exchange
    const enrichedPositions: Position[] = [];
    
    for (const [exchange, data] of exchangeMap.entries()) {
      // Get prices for all symbols in this exchange
      const prices = new Map<string, number>();
      
      for (const symbol of data.symbols) {
        try {
          const price = await this.getCurrentPrice(exchange, symbol);
          prices.set(symbol, price);
        } catch (e) {
          console.warn(`Failed to get price for ${symbol} on ${exchange}:`, e);
          // Use last known price if available
          if (data.positions.find(p => p.symbol === symbol)?.last_updated_price) {
            prices.set(symbol, data.positions.find(p => p.symbol === symbol).last_updated_price);
          }
        }
      }
      
      // Calculate P&L for each position
      for (const position of data.positions) {
        const price = prices.get(position.symbol) || position.last_updated_price || 0;
        enrichedPositions.push(this.calculatePnL(position, price));
      }
    }
    
    return enrichedPositions;
  }
}
