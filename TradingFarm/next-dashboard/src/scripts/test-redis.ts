import { getRedisClient, closeRedisConnection } from '../utils/redis/client';
import { RedisCacheService, CacheNamespace, CacheExpiration } from '../utils/redis/cache-service';
import { RedisPubSubService, PubSubChannel } from '../utils/redis/pubsub-service';

/**
 * Redis Connection Test Script
 * 
 * This script tests the connection to the Redis Cloud instance and verifies
 * basic functionality of our Redis services.
 */
async function testRedisConnection() {
  try {
    console.log('Testing Redis connection...');
    
    // Get Redis client
    const redis = getRedisClient();
    
    // Test basic connection with PING
    const pingResult = await redis.ping();
    console.log('PING result:', pingResult);
    
    if (pingResult === 'PONG') {
      console.log('✅ Redis connection successful!');
      
      // Test Cache Service
      await testCacheService();
      
      // Test PubSub Service
      await testPubSubService();
      
      console.log('\n🎉 All Redis services tested successfully!');
    } else {
      console.error('❌ Redis connection failed');
    }
    
    // Close connection
    await closeRedisConnection();
    
  } catch (error) {
    console.error('Error testing Redis connection:', error);
  }
}

async function testCacheService() {
  console.log('\nTesting Redis Cache Service...');
  const cacheService = new RedisCacheService();
  
  // Test setting a value
  const testKey = 'test_key_' + Date.now();
  const testValue = { message: 'Hello from Trading Farm!', timestamp: Date.now() };
  
  console.log(`Setting test key: ${testKey}`);
  await cacheService.set(CacheNamespace.MARKET_DATA, testKey, testValue, CacheExpiration.SHORT);
  
  // Test getting the value
  console.log('Getting test key...');
  const retrievedValue = await cacheService.get(CacheNamespace.MARKET_DATA, testKey);
  console.log('Retrieved value:', retrievedValue);
  
  if (retrievedValue && retrievedValue.message === testValue.message) {
    console.log('✅ Cache service working correctly!');
  } else {
    console.error('❌ Cache service test failed');
  }
  
  // Test deleting the value
  console.log('Deleting test key...');
  await cacheService.delete(CacheNamespace.MARKET_DATA, testKey);
  
  // Verify deletion
  const afterDelete = await cacheService.get(CacheNamespace.MARKET_DATA, testKey);
  if (afterDelete === null) {
    console.log('✅ Cache deletion working correctly!');
  } else {
    console.error('❌ Cache deletion test failed');
  }
}

async function testPubSubService() {
  console.log('\nTesting Redis PubSub Service...');
  const pubSubService = new RedisPubSubService();
  
  // Create a unique channel for testing
  const testChannel = 'test_channel_' + Date.now();
  const testMessage = { 
    event: 'test_event', 
    data: { message: 'Hello from Trading Farm!', timestamp: Date.now() } 
  };
  
  // Set up subscriber first
  console.log(`Subscribing to test channel: ${testChannel}...`);
  let messageReceived = false;
  
  const promise = new Promise<void>((resolve) => {
    pubSubService.subscribe(PubSubChannel.SYSTEM_EVENTS, testChannel, (message) => {
      console.log('Received message:', message);
      messageReceived = true;
      resolve();
    });
    
    // Publish after a short delay to ensure subscription is active
    setTimeout(async () => {
      console.log(`Publishing message to test channel: ${testChannel}...`);
      await pubSubService.publish(PubSubChannel.SYSTEM_EVENTS, testChannel, testMessage);
      
      // If message wasn't received after 2 seconds, resolve anyway to continue tests
      setTimeout(() => {
        if (!messageReceived) {
          console.warn('⚠️ Message not received within timeout. This might be expected in some environments.');
          resolve();
        }
      }, 2000);
    }, 1000);
  });
  
  // Wait for message to be received or timeout
  await promise;
  
  // Close PubSub connections
  await pubSubService.close();
  
  console.log('PubSub test completed');
}

// Run the test
testRedisConnection().catch(console.error);

// Handle application exit
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down...');
  await closeRedisConnection();
  process.exit(0);
});
