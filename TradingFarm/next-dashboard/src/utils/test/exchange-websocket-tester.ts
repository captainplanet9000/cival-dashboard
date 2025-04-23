/**
 * Exchange WebSocket Connection Tester
 * 
 * Utility to test WebSocket connections to exchanges and verify
 * that real-time data is flowing correctly. This is used for
 * integration testing and debugging of exchange connectivity.
 */

import { ExchangeFactory } from '@/services/exchange/exchange-factory';
import { createLogger } from '@/lib/logging';

const logger = createLogger('exchange-websocket-tester');

export interface WebSocketTestResult {
  exchangeId: string;
  symbol: string;
  connected: boolean;
  messageCount: number;
  errors: string[];
  latency: number;
  dataPoints: any[];
  testDuration: number; // in milliseconds
}

/**
 * Test WebSocket connection to an exchange
 * 
 * @param exchangeId The exchange identifier (e.g., 'coinbase', 'hyperliquid')
 * @param symbol The trading pair to subscribe to (e.g., 'BTC/USD')
 * @param testDuration How long to run the test for in milliseconds (default: 10000 ms)
 * @param messageLimit Maximum number of messages to capture (default: 10)
 * @returns Promise resolving to test results
 */
export async function testWebSocketConnection(
  exchangeId: string,
  symbol: string,
  testDuration: number = 10000,
  messageLimit: number = 10
): Promise<WebSocketTestResult> {
  const result: WebSocketTestResult = {
    exchangeId,
    symbol,
    connected: false,
    messageCount: 0,
    errors: [],
    latency: 0,
    dataPoints: [],
    testDuration
  };
  
  const factory = ExchangeFactory.getInstance();
  const exchange = factory.getExchange(exchangeId);
  
  logger.info(`Testing WebSocket connection to ${exchangeId} for symbol ${symbol}`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    let firstMessageTime: number | null = null;
    let subscription: any = null;
    
    const messageHandler = (data: any) => {
      if (result.messageCount === 0) {
        firstMessageTime = Date.now();
        result.connected = true;
      }
      
      result.messageCount++;
      
      if (result.dataPoints.length < messageLimit) {
        result.dataPoints.push(data);
      }
      
      // Calculate latency once we have enough messages
      if (result.messageCount >= 5 && firstMessageTime !== null) {
        result.latency = Math.round((Date.now() - firstMessageTime) / result.messageCount);
      }
    };
    
    const errorHandler = (error: any) => {
      result.errors.push(error.toString());
      logger.error(`WebSocket error for ${exchangeId}: ${error}`);
    };
    
    // Set up a timeout to end the test
    const timeout = setTimeout(async () => {
      if (subscription) {
        try {
          await exchange.unsubscribe(subscription);
          logger.info(`Unsubscribed from ${exchangeId} WebSocket for ${symbol}`);
        } catch (error) {
          logger.error(`Error unsubscribing from ${exchangeId}: ${error}`);
          result.errors.push(`Unsubscribe error: ${error}`);
        }
      }
      
      // Calculate final test duration
      result.testDuration = Date.now() - startTime;
      
      logger.info(`WebSocket test for ${exchangeId} completed with ${result.messageCount} messages received`);
      resolve(result);
    }, testDuration);
    
    // Start the subscription
    exchange.subscribeToTicker(symbol, messageHandler)
      .then(sub => {
        subscription = sub;
        logger.info(`Successfully subscribed to ${exchangeId} WebSocket for ${symbol}`);
      })
      .catch(error => {
        clearTimeout(timeout);
        result.errors.push(`Subscription error: ${error}`);
        logger.error(`Error subscribing to ${exchangeId}: ${error}`);
        resolve(result);
      });
  });
}

/**
 * Test WebSocket connections to multiple exchanges
 * 
 * @param testConfigs Array of test configurations (exchangeId, symbol)
 * @param testDuration How long to run each test for in milliseconds (default: 10000 ms)
 * @returns Promise resolving to array of test results
 */
export async function testMultipleWebSocketConnections(
  testConfigs: Array<{ exchangeId: string; symbol: string }>,
  testDuration: number = 10000
): Promise<WebSocketTestResult[]> {
  const results: WebSocketTestResult[] = [];
  
  for (const config of testConfigs) {
    try {
      const result = await testWebSocketConnection(
        config.exchangeId,
        config.symbol,
        testDuration
      );
      results.push(result);
    } catch (error) {
      logger.error(`Error testing ${config.exchangeId} for ${config.symbol}: ${error}`);
      results.push({
        exchangeId: config.exchangeId,
        symbol: config.symbol,
        connected: false,
        messageCount: 0,
        errors: [`Test execution error: ${error}`],
        latency: 0,
        dataPoints: [],
        testDuration: 0
      });
    }
  }
  
  return results;
}
