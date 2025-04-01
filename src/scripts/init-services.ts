import { ServiceRegistry } from '../services/service-registry';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Initialize all Trading Farm services
 */
export async function initializeServices() {
  try {
    const serviceRegistry = ServiceRegistry.getInstance();
    
    // Initialize all services with API keys from environment variables
    serviceRegistry.initialize({
      bybit: {
        apiKey: process.env.BYBIT_API_KEY || '',
        apiSecret: process.env.BYBIT_API_SECRET || ''
      },
      coinbase: {
        apiKey: process.env.COINBASE_API_KEY || '',
        privateKey: process.env.COINBASE_PRIVATE_KEY || ''
      },
      hyperliquid: {
        address: process.env.HYPERLIQUID_ADDRESS || '',
        privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || ''
      },
      marketStack: process.env.MARKETSTACK_API_KEY,
      openAI: process.env.OPENAI_API_KEY,
      neonPostgres: process.env.NEON_DB_URL,
      alchemy: process.env.ALCHEMY_API_KEY
    });
    
    // Initialize vector database
    if (serviceRegistry.neonPgVectorService) {
      await serviceRegistry.neonPgVectorService.initialize();
      console.log('Vector database initialized successfully');
    }
    
    console.log('All Trading Farm services initialized successfully');
    return serviceRegistry;
  } catch (error) {
    console.error('Error initializing Trading Farm services:', error);
    throw error;
  }
}

// Run initialization if script is called directly
if (require.main === module) {
  initializeServices()
    .then(() => {
      console.log('Services initialized successfully');
    })
    .catch((error) => {
      console.error('Error initializing services:', error);
      process.exit(1);
    });
} 