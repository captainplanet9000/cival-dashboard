// Redis Connection Test Script
const Redis = require('ioredis');

// Redis connection URL with API key 
const REDIS_URL = 'redis://default:IVBKBkEZFyYvR1mL3krjDEYTkmvC0S57@redis-14637.c289.us-west-1-2.ec2.redns.redis-cloud.com:14637';

// Create Redis client
const redis = new Redis(REDIS_URL);

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Connected to Redis Cloud');
});

redis.on('error', (err) => {
  console.error('❌ Redis Error:', err);
});

async function testConnection() {
  try {
    console.log('Testing connection to Redis Cloud...');
    
    // Test PING command
    const pingResult = await redis.ping();
    console.log('PING result:', pingResult);
    
    // Test setting a key
    const testKey = 'trading-farm:test:' + Date.now();
    const testValue = JSON.stringify({
      message: 'Trading Farm Initialized',
      timestamp: new Date().toISOString(),
      farm: {
        name: 'Test Farm',
        agents: 3,
        active: true
      }
    });
    
    console.log(`Setting test key: ${testKey}`);
    await redis.set(testKey, testValue, 'EX', 60); // Expire in 60 seconds
    
    // Test getting the key
    console.log('Getting test key...');
    const result = await redis.get(testKey);
    console.log('Retrieved value:', result ? JSON.parse(result) : null);
    
    // Get all matching keys
    console.log('Listing all trading-farm:test:* keys:');
    const keys = await redis.keys('trading-farm:test:*');
    console.log('Keys found:', keys);
    
    // Test delete key
    console.log('Deleting test key...');
    await redis.del(testKey);
    
    // Verify deletion
    const afterDelete = await redis.get(testKey);
    console.log('After deletion:', afterDelete);
    
    console.log('\n🎉 Redis connection test completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during Redis test:', err);
    process.exit(1);
  }
}

// Run the test
testConnection();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing Redis connection...');
  redis.quit();
  process.exit(0);
});
