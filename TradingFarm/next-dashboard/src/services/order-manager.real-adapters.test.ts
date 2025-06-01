import { OrderManager } from './order-manager';
import { BybitAdapter } from '../utils/exchanges/bybit-adapter';
import { CoinbaseAdapter } from '../utils/exchanges/coinbase-adapter';
import { HyperliquidAdapter } from '../utils/exchanges/hyperliquid-adapter';

// NOTE: These credentials must be set to valid sandbox/testnet keys for safe automated tests.
const BYBIT_TEST_CREDENTIALS = {
  apiKey: process.env.BYBIT_TEST_API_KEY || '',
  apiSecret: process.env.BYBIT_TEST_API_SECRET || '',
  isTestnet: true,
};
const COINBASE_TEST_CREDENTIALS = {
  apiKey: process.env.COINBASE_TEST_API_KEY || '',
  apiSecret: process.env.COINBASE_TEST_API_SECRET || '',
  passphrase: process.env.COINBASE_TEST_PASSPHRASE || '',
};
const HYPERLIQUID_TEST_CREDENTIALS = {
  privateKey: process.env.HYPERLIQUID_TEST_PRIVATE_KEY || '',
  walletAddress: process.env.HYPERLIQUID_TEST_WALLET_ADDRESS || '',
};

describe('OrderManager Integration - Real Adapters', () => {
  let orderManager: OrderManager;

  // Bybit
  describe('BybitAdapter', () => {
    let adapter: BybitAdapter;
    beforeAll(async () => {
      adapter = new BybitAdapter();
      await adapter.connect(BYBIT_TEST_CREDENTIALS);
      orderManager = new OrderManager({ adapters: { bybit: adapter } });
    });
    it('should fetch markets', async () => {
      const markets = await adapter.getMarkets();
      expect(Array.isArray(markets)).toBe(true);
    });
    // Add more Bybit order tests here (placeOrder, cancelOrder, etc.)
  });

  // Coinbase
  describe('CoinbaseAdapter', () => {
    let adapter: CoinbaseAdapter;
    beforeAll(async () => {
      adapter = new CoinbaseAdapter();
      await adapter.connect(COINBASE_TEST_CREDENTIALS);
      orderManager = new OrderManager({ adapters: { coinbase: adapter } });
    });
    it('should fetch markets', async () => {
      const markets = await adapter.getMarkets();
      expect(Array.isArray(markets)).toBe(true);
    });
    // Add more Coinbase order tests here
  });

  // Hyperliquid
  describe('HyperliquidAdapter', () => {
    let adapter: HyperliquidAdapter;
    beforeAll(async () => {
      adapter = new HyperliquidAdapter();
      await adapter.connect(HYPERLIQUID_TEST_CREDENTIALS);
      orderManager = new OrderManager({ adapters: { hyperliquid: adapter } });
    });
    it('should fetch markets', async () => {
      const markets = await adapter.getMarkets();
      expect(Array.isArray(markets)).toBe(true);
    });
    // Add more Hyperliquid order tests here
  });
});
