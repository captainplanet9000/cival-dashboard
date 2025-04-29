import React from 'react';
import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TradingAgent, AgentConfig, AgentPerformanceMetrics, TradingStrategy } from '@/types/agent-types';
import { Order, Position, OrderType, OrderSide, OrderStatusType } from '@/types/trading-types';
import { VaultMaster, VaultAccount, VaultTransaction, AccountType, TransactionType, TransactionStatus, ApprovalStatus, VaultStatus } from '@/types/vault-types';

// Create a custom render method that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that includes all providers needed for testing components
 * This ensures components have access to theme, toasts, and react-query during tests
 */
export function renderWithProviders(
  ui: React.ReactNode,
  {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="trading-farm-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Utility to simulate a delay in tests
 * @param ms Milliseconds to wait
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility to create a mock ResizeObserver for testing
 */
export class MockResizeObserver {
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

/**
 * Mock response for Supabase queries
 * @param data The data to return
 * @param error The error to return (if any)
 */
export function mockSupabaseResponse(data: any = {}, error: any = null) {
  return { data, error };
}

/**
 * Create a mock event object
 * @param overrides Properties to override in the event object
 */
export function mockEvent(overrides = {}) {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    ...overrides,
  };
}

/**
 * Utility to test async code within reasonable timeframes
 * @param callback The function to execute
 * @param timeout Maximum time to wait (ms)
 */
export async function waitForAsync(callback: () => Promise<boolean>, timeout = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await callback()) {
      return true;
    }
    await wait(50);
  }
  
  return false;
}

/**
 * Generate mock account summary for tests
 */
export function generateMockAccountSummary() {
  return {
    totalEquity: 12500.75,
    availableBalance: 8000.25,
    unrealizedPnL: 1250.50,
    dailyPnL: 350.25,
    weeklyPnL: 1200.75,
    monthlyPnL: 3500.25,
    allTimePnL: 5000.50,
    currency: 'USDT',
    updatedAt: new Date().getTime()
  };
}

/**
 * Generate mock order data for tests
 * @param count Number of orders to generate
 * @returns Array of mock orders
 */
export function generateMockOrders(count = 5): Order[] {
  const orderTypes: OrderType[] = ['market', 'limit', 'stop', 'stop_market', 'take_profit', 'take_profit_market'];
  const sides: OrderSide[] = ['buy', 'sell'];
  const statuses: OrderStatusType[] = ['new', 'partially_filled', 'filled', 'canceled', 'rejected', 'expired'];
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'DOT/USDT'];
  const exchanges = ['binance', 'coinbase', 'kraken', 'kucoin', 'bybit'];
  
  return Array(count)
    .fill(0)
    .map((_, i) => {
      const symbol = symbols[i % symbols.length];
      const [baseAsset, quoteAsset] = symbol.split('/');
      const price = Math.round(Math.random() * 1000 * 100) / 100;
      const quantity = Math.round(Math.random() * 10 * 1000) / 1000;
      const filledQuantity = Math.round(quantity * (Math.random() * 0.8 + 0.2) * 1000) / 1000;
      
      return {
        id: `order-${Date.now()}-${i}`,
        client_order_id: `client-${Date.now()}-${i}`,
        exchange: exchanges[i % exchanges.length],
        symbol,
        base_asset: baseAsset,
        quote_asset: quoteAsset,
        side: sides[i % sides.length],
        type: orderTypes[i % orderTypes.length],
        status: statuses[i % statuses.length],
        price,
        average_price: Math.round((price * (1 + (Math.random() * 0.02 - 0.01))) * 100) / 100,
        quantity,
        filled_quantity: filledQuantity,
        remaining_quantity: Math.round((quantity - filledQuantity) * 1000) / 1000,
        cost: Math.round(filledQuantity * price * 100) / 100,
        fee: Math.round(filledQuantity * price * 0.001 * 100) / 100,
        fee_asset: quoteAsset,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        last_update: new Date(Date.now() - i * 1800000).toISOString(),
        agent_id: i % 3 === 0 ? `agent-${i + 1}` : undefined,
        strategy_id: i % 3 === 0 ? `strategy-${i + 1}` : undefined,
        farm_id: i % 4 === 0 ? i + 100 : undefined,
        is_testnet: i % 2 === 0,
        metadata: i % 3 === 0 ? { source: 'test-generator', tags: ['mock', 'test'] } : undefined
      };
    });
}

/**
 * Generate mock position data for tests
 * @param count Number of positions to generate
 * @returns Array of mock positions
 */
export function generateMockPositions(count = 3): Position[] {
  const sides: OrderSide[] = ['buy', 'sell'];
  const marginTypes = ['isolated', 'cross'] as const;
  
  return Array(count)
    .fill(0)
    .map((_, i) => ({
      symbol: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'][i % 3],
      side: sides[i % sides.length],
      quantity: Math.round(Math.random() * 10 * 1000) / 1000,
      entryPrice: Math.round(Math.random() * 1000 * 100) / 100,
      markPrice: Math.round(Math.random() * 1000 * 100) / 100,
      liquidationPrice: Math.round(Math.random() * 500),
      marginType: marginTypes[i % marginTypes.length],
      leverage: Math.floor(Math.random() * 20) + 1,
      unrealizedPnl: Math.round(Math.random() * 200 - 100),
      realizedPnl: Math.round(Math.random() * 200 - 50),
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      metadata: { source: 'test-generator' }
    }));
}

/**
 * Generate mock trading data for tests
 * @param count Number of items to generate
 * @returns Array of mock trading data
 */
export function generateMockTradingData(count = 10) {
  return Array(count)
    .fill(0)
    .map((_, i) => ({
      id: `trade-${i}`,
      symbol: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'][i % 3],
      price: Math.round(Math.random() * 1000 * 100) / 100,
      amount: Math.round(Math.random() * 10 * 1000) / 1000,
      side: i % 2 === 0 ? 'buy' : 'sell',
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    }));
}

/**
 * Generate mock VaultMaster data for tests
 * @param count Number of vault masters to generate
 * @returns Array of mock vault masters
 */
export function generateMockVaultMasters(count = 3): VaultMaster[] {
  const statuses: VaultStatus[] = ['active', 'frozen', 'pending', 'closed'];
  
  return Array(count)
    .fill(0)
    .map((_, i) => ({
      id: i + 1,
      owner_id: `user-${i % 3 + 1}`,
      name: `Test Vault ${i + 1}`,
      description: `Test vault description ${i + 1}`,
      status: statuses[i % statuses.length],
      requires_approval: i % 2 === 0,
      approval_threshold: i % 2 === 0 ? 1 : 2,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 43200000).toISOString()
    }));
}

/**
 * Generate mock VaultAccount data for tests
 * @param vaultId The vault ID these accounts belong to
 * @param count Number of vault accounts to generate
 * @returns Array of mock vault accounts
 */
export function generateMockVaultAccounts(vaultId: number, count = 3): VaultAccount[] {
  const accountTypes: AccountType[] = ['trading', 'operational', 'reserve', 'fee', 'investment', 'custody'];
  const currencies = ['USD', 'EUR', 'BTC', 'ETH'];
  const statuses: VaultStatus[] = ['active', 'frozen', 'pending', 'closed'];
  
  return Array(count)
    .fill(0)
    .map((_, i) => ({
      id: i + 1,
      vault_id: vaultId,
      farm_id: i % 2 === 0 ? i + 100 : undefined,
      name: `Account ${i + 1}`,
      account_type: accountTypes[i % accountTypes.length],
      address: i % 3 === 0 ? `0x${Math.random().toString(16).slice(2)}` : undefined,
      network: i % 3 === 0 ? 'ethereum' : undefined,
      exchange: i % 4 === 0 ? 'binance' : undefined,
      currency: currencies[i % currencies.length],
      balance: Math.round(Math.random() * 10000 * 100) / 100,
      reserved_balance: Math.round(Math.random() * 1000 * 100) / 100,
      status: statuses[i % statuses.length],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 43200000).toISOString(),
      last_updated: new Date(Date.now() - i * 3600000).toISOString()
    }));
}

/**
 * Generate mock VaultTransaction data for tests
 * @param accountId The account ID these transactions belong to
 * @param count Number of vault transactions to generate
 * @returns Array of mock vault transactions
 */
export function generateMockVaultTransactions(accountId: number, count = 10): VaultTransaction[] {
  const transactionTypes: TransactionType[] = ['deposit', 'withdrawal', 'transfer', 'trade', 'fee', 'interest', 'allocation', 'reward'];
  const statuses: TransactionStatus[] = ['pending', 'approved', 'completed', 'failed', 'cancelled'];
  const approvalStatuses: ApprovalStatus[] = ['not_required', 'pending', 'approved', 'rejected'];
  
  return Array(count)
    .fill(0)
    .map((_, i) => ({
      id: i + 1,
      account_id: accountId,
      reference_id: i % 2 === 0 ? `REF-${Date.now()}-${i}` : undefined,
      type: transactionTypes[i % transactionTypes.length],
      subtype: i % 3 === 0 ? 'recurring' : undefined,
      amount: Math.round(Math.random() * 1000 * 100) / 100,
      currency: 'USD',
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      status: statuses[i % statuses.length],
      approval_status: approvalStatuses[i % approvalStatuses.length],
      approved_by: i % 4 === 0 ? `user-${i % 3 + 1}` : undefined,
      approved_at: i % 4 === 0 ? new Date(Date.now() - i * 1800000).toISOString() : undefined,
      tx_hash: i % 3 === 0 ? `0x${Math.random().toString(16).slice(2)}` : undefined,
      source_account_id: i % 3 === 1 ? accountId - 1 : undefined,
      destination_account_id: i % 3 === 1 ? accountId + 1 : undefined,
      external_source: i % 5 === 2 ? 'bank_transfer' : undefined,
      external_destination: i % 5 === 3 ? 'exchange' : undefined,
      fee: i % 2 === 0 ? Math.round(Math.random() * 10 * 100) / 100 : undefined,
      fee_currency: i % 2 === 0 ? 'USD' : undefined,
      metadata: i % 4 === 0 ? { source: 'test', priority: 'high' } : undefined,
      note: i % 3 === 0 ? `Transaction note ${i + 1}` : undefined,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
      updated_at: new Date(Date.now() - i * 1800000).toISOString()
    }));
}

/**
 * Mock implementation of window.matchMedia
 * @param matches Whether the media query should match
 */
export function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
