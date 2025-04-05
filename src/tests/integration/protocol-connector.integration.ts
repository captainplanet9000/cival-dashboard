import { ethers } from 'ethers';
import { ProtocolConnectorFactory } from '../../services/defi/protocol-connector-factory';
import { ProtocolType, ProtocolAction } from '../../types/defi-protocol-types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables for testing
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const ARBITRUM_TESTNET_RPC = 'https://goerli-rollup.arbitrum.io/rpc';

// Test timeout - integration tests may take longer
jest.setTimeout(30000);

describe('Protocol Connector Integration Tests', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let signer: ethers.Wallet;
  let testAddress: string;

  beforeAll(async () => {
    // Set up provider and signer
    provider = new ethers.providers.JsonRpcProvider(ARBITRUM_TESTNET_RPC);
    signer = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
    testAddress = await signer.getAddress();
    
    console.log(`Testing with address: ${testAddress}`);
  });

  describe('GMX Connector', () => {
    it('should connect to GMX testnet', async () => {
      // Skip if no private key is provided
      if (!TEST_PRIVATE_KEY) {
        console.warn('Skipping test: No private key provided');
        return;
      }

      const gmxConnector = await ProtocolConnectorFactory.getConnector(ProtocolType.GMX, 421613); // Arbitrum Goerli
      
      const connected = await gmxConnector.connect({
        address: testAddress,
        signer: signer
      });
      
      expect(connected).toBe(true);
      
      // Get protocol info
      const info = await gmxConnector.getProtocolInfo();
      expect(info.name).toBe('GMX');
      expect(info.type).toBe(ProtocolType.GMX);
    });
  });
  
  describe('Uniswap Connector', () => {
    it('should connect to Uniswap on Goerli testnet', async () => {
      // Skip if no private key is provided
      if (!TEST_PRIVATE_KEY) {
        console.warn('Skipping test: No private key provided');
        return;
      }
      
      const uniswapConnector = await ProtocolConnectorFactory.getConnector(ProtocolType.UNISWAP, 5); // Goerli
      
      const connected = await uniswapConnector.connect({
        address: testAddress,
        signer: signer
      });
      
      expect(connected).toBe(true);
      
      // Get available pools
      const pools = await uniswapConnector.getTopPools(3);
      expect(Array.isArray(pools)).toBe(true);
    });
  });
  
  describe('Cross-Protocol Tests', () => {
    it('should get best swap rates across protocols', async () => {
      // Implementation will depend on the cross-protocol aggregator
      // This is a placeholder for future implementation
      expect(true).toBe(true);
    });
  });
});

// Example Jest config to run these tests specifically:
// npx jest --config=jest.config.js src/tests/integration/protocol-connector.integration.ts 