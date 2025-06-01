/**
 * Market Sync Processor
 * Handles background jobs for synchronizing market data
 */
import { Job } from 'bull';
import { QueueNames, QueueService } from '../queue-service';
import { MarketDataService } from '@/services/market-data-service';
import { invalidateMarketDataCache } from '@/utils/cache-invalidation';

// Job types
export enum MarketSyncJobTypes {
  SYNC_PRICE_DATA = 'sync-price-data',
  SYNC_ORDERBOOK = 'sync-orderbook',
  SYNC_MARKET_SUMMARY = 'sync-market-summary',
  UPDATE_HISTORICAL_DATA = 'update-historical-data',
}

// Job data types
export interface SyncPriceDataJobData {
  symbol: string;
  exchange?: string;
  forceRefresh?: boolean;
}

export interface SyncOrderbookJobData {
  symbol: string;
  exchange: string;
}

export interface SyncMarketSummaryJobData {
  symbols: string[];
  source?: string;
}

export interface UpdateHistoricalDataJobData {
  symbol: string;
  interval: string;
  startDate: string;
  endDate: string;
  source?: string;
}

/**
 * Initialize all market sync processors
 */
export function initializeMarketSyncProcessors(): void {
  // Sync price data processor
  QueueService.registerProcessor<SyncPriceDataJobData, boolean>(
    QueueNames.MARKET_SYNC,
    MarketSyncJobTypes.SYNC_PRICE_DATA,
    async (job) => {
      const { symbol, exchange, forceRefresh } = job.data;
      
      try {
        console.log(`Syncing price data for ${symbol} on ${exchange || 'default exchange'}`);
        
        // If force refresh is enabled, invalidate cache first
        if (forceRefresh) {
          await invalidateMarketDataCache(symbol);
        }
        
        // Fetch latest price data
        const latestData = await MarketDataService.getOHLCV({
          symbol,
          interval: '1m',
          limit: 1,
          source: 'exchange',
          exchange
        });
        
        // Store result in job progress
        await job.progress({ 
          timestamp: new Date().toISOString(),
          latestPrice: latestData[0]?.close || null
        });
        
        return true;
      } catch (error) {
        console.error(`Error syncing price data for ${symbol}:`, error);
        throw error;
      }
    }
  );
  
  // Sync orderbook processor
  QueueService.registerProcessor<SyncOrderbookJobData, boolean>(
    QueueNames.MARKET_SYNC,
    MarketSyncJobTypes.SYNC_ORDERBOOK,
    async (job) => {
      const { symbol, exchange } = job.data;
      
      try {
        console.log(`Syncing orderbook for ${symbol} on ${exchange}`);
        
        // Fetch latest orderbook
        const orderbook = await MarketDataService.getOrderBook(symbol, exchange);
        
        // Store orderbook depth in job progress
        await job.progress({ 
          timestamp: new Date().toISOString(),
          bidCount: orderbook?.bids.length || 0,
          askCount: orderbook?.asks.length || 0,
        });
        
        return true;
      } catch (error) {
        console.error(`Error syncing orderbook for ${symbol}:`, error);
        throw error;
      }
    }
  );
  
  // Sync market summary processor
  QueueService.registerProcessor<SyncMarketSummaryJobData, boolean>(
    QueueNames.MARKET_SYNC,
    MarketSyncJobTypes.SYNC_MARKET_SUMMARY,
    async (job) => {
      const { symbols, source } = job.data;
      
      try {
        console.log(`Syncing market summary for ${symbols.length} symbols`);
        
        // Fetch market summaries
        const summaries = await MarketDataService.getMarketSummaries(
          symbols,
          source || 'coinapi'
        );
        
        // Store result in job progress
        await job.progress({ 
          timestamp: new Date().toISOString(),
          symbolCount: symbols.length,
          successCount: Object.keys(summaries || {}).length,
        });
        
        return true;
      } catch (error) {
        console.error(`Error syncing market summary for ${symbols.join(',')}:`, error);
        throw error;
      }
    }
  );
  
  // Update historical data processor
  QueueService.registerProcessor<UpdateHistoricalDataJobData, boolean>(
    QueueNames.MARKET_SYNC,
    MarketSyncJobTypes.UPDATE_HISTORICAL_DATA,
    async (job) => {
      const { symbol, interval, startDate, endDate, source } = job.data;
      
      try {
        console.log(`Updating historical data for ${symbol} (${interval}) from ${startDate} to ${endDate}`);
        
        // Convert dates to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Calculate progress based on time chunks
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        let processedDays = 0;
        
        // Process in chunks of 30 days
        let currentStart = new Date(start);
        while (currentStart < end) {
          let currentEnd = new Date(currentStart);
          currentEnd.setDate(currentEnd.getDate() + 30);
          
          if (currentEnd > end) {
            currentEnd = new Date(end);
          }
          
          // Fetch data for this chunk
          await MarketDataService.getOHLCV({
            symbol,
            interval: interval as any,
            startTime: currentStart.toISOString(),
            endTime: currentEnd.toISOString(),
            source: source as any
          });
          
          // Update progress
          processedDays += Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
          await job.progress(Math.min(100, Math.round((processedDays / totalDays) * 100)));
          
          // Move to next chunk
          currentStart = new Date(currentEnd);
          currentStart.setDate(currentStart.getDate() + 1);
        }
        
        return true;
      } catch (error) {
        console.error(`Error updating historical data for ${symbol}:`, error);
        throw error;
      }
    }
  );
}
