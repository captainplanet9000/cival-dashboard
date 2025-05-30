import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { I18nProvider } from '@/i18n/i18n-provider';
import { AccessibilityProvider } from '@/components/accessibility/accessibility-provider';
import { Toaster } from '@/components/ui/toaster';

/**
 * Default locale for testing
 */
export const TEST_LOCALE = 'en';

/**
 * Test user data for authenticated states
 */
export const TEST_USER = {
  id: 'test-user-id',
  email: 'test@tradingfarm.com',
  name: 'Test User',
};

/**
 * Options for custom render function
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withReactQuery?: boolean;
  withTheme?: boolean;
  withI18n?: boolean;
  withAccessibility?: boolean;
  withToaster?: boolean;
  locale?: string;
  initialTheme?: 'light' | 'dark' | 'system';
  route?: string;
}

/**
 * Create a wrapper with all provided providers for testing
 */
function createWrapper(options: CustomRenderOptions) {
  const {
    withReactQuery = true,
    withTheme = true,
    withI18n = true,
    withAccessibility = true,
    withToaster = true,
    locale = TEST_LOCALE,
    initialTheme = 'dark',
  } = options;

  return ({ children }: { children: ReactNode }) => {
    // Use this to reset QueryClient for each test
    const queryClient = withReactQuery
      ? new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
              cacheTime: 0,
            },
          },
          logger: {
            log: console.log,
            warn: console.warn,
            error: () => {}, // Silent errors in tests
          },
        })
      : undefined;

    let wrappedChildren = <>{children}</>;

    // Wrap with React Query if enabled
    if (withReactQuery && queryClient) {
      wrappedChildren = (
        <QueryClientProvider client={queryClient}>
          {wrappedChildren}
        </QueryClientProvider>
      );
    }

    // Wrap with Theme Provider if enabled
    if (withTheme) {
      wrappedChildren = (
        <ThemeProvider defaultTheme={initialTheme} storageKey="theme-mode">
          {wrappedChildren}
        </ThemeProvider>
      );
    }

    // Wrap with I18n Provider if enabled
    if (withI18n) {
      wrappedChildren = (
        <I18nProvider initialLocale={locale as any}>
          {wrappedChildren}
        </I18nProvider>
      );
    }

    // Wrap with Accessibility Provider if enabled
    if (withAccessibility) {
      wrappedChildren = (
        <AccessibilityProvider>{wrappedChildren}</AccessibilityProvider>
      );
    }

    // Add Toaster if enabled
    if (withToaster) {
      wrappedChildren = (
        <>
          {wrappedChildren}
          <Toaster />
        </>
      );
    }

    return wrappedChildren;
  };
}

/**
 * Custom render function with all the required providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const wrapper = createWrapper(options);
  
  const user = userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  });

  return {
    user,
    ...render(ui, { wrapper, ...options }),
  };
}

/**
 * Mock API response for testing
 */
export function mockApiResponse<T>(data: T, delay = 0, shouldFail = false) {
  if (shouldFail) {
    return jest.fn().mockImplementation(() => 
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API Error')), delay);
      })
    );
  }
  
  return jest.fn().mockImplementation(() => 
    new Promise((resolve) => {
      setTimeout(() => resolve({ data }), delay);
    })
  );
}

/**
 * Helper to silence specific console messages during tests
 */
export function suppressConsoleMessages(types = ['error', 'warn']) {
  const originalConsole = { ...console };
  beforeAll(() => {
    if (types.includes('error')) {
      console.error = jest.fn();
    }
    if (types.includes('warn')) {
      console.warn = jest.fn();
    }
    if (types.includes('log')) {
      console.log = jest.fn();
    }
  });
  
  afterAll(() => {
    if (types.includes('error')) {
      console.error = originalConsole.error;
    }
    if (types.includes('warn')) {
      console.warn = originalConsole.warn;
    }
    if (types.includes('log')) {
      console.log = originalConsole.log;
    }
  });
}

/**
 * Wait for a specified amount of time in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock Supabase data response
 */
export function mockSupabaseResponse<T>(data: T | null, error: any = null) {
  return {
    data,
    error
  };
}

/**
 * Generate random test data
 */
export const generateTestData = {
  /**
   * Generate a random trading order for testing
   */
  order: (overrides = {}) => ({
    id: `order-${Math.random().toString(36).substring(2, 9)}`,
    user_id: TEST_USER.id,
    exchange_credential_id: `exchange-${Math.random().toString(36).substring(2, 9)}`,
    symbol: 'BTC/USD',
    order_type: 'limit',
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    amount: parseFloat((Math.random() * 10).toFixed(4)),
    price: parseFloat((Math.random() * 50000).toFixed(2)),
    status: 'pending',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Generate a random position for testing
   */
  position: (overrides = {}) => ({
    id: `position-${Math.random().toString(36).substring(2, 9)}`,
    user_id: TEST_USER.id,
    exchange_credential_id: `exchange-${Math.random().toString(36).substring(2, 9)}`,
    symbol: 'BTC/USD',
    side: Math.random() > 0.5 ? 'long' : 'short',
    entry_price: parseFloat((Math.random() * 50000).toFixed(2)),
    amount: parseFloat((Math.random() * 10).toFixed(4)),
    current_price: parseFloat((Math.random() * 50000).toFixed(2)),
    status: 'open',
    open_date: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Generate a random strategy for testing
   */
  strategy: (overrides = {}) => ({
    id: `strategy-${Math.random().toString(36).substring(2, 9)}`,
    user_id: TEST_USER.id,
    name: `Test Strategy ${Math.random().toString(36).substring(2, 9)}`,
    description: 'A test strategy for automated testing',
    type: 'indicator',
    parameters: { indicator: 'RSI', period: 14, overbought: 70, oversold: 30 },
    trading_pairs: ['BTC/USD'],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Generate random performance metrics for testing
   */
  performanceMetrics: (overrides = {}) => ({
    id: `metrics-${Math.random().toString(36).substring(2, 9)}`,
    user_id: TEST_USER.id,
    period: 'daily',
    date: new Date().toISOString().split('T')[0],
    total_pnl: parseFloat((Math.random() * 10000 - 5000).toFixed(2)),
    win_rate: parseFloat((Math.random() * 100).toFixed(2)),
    average_trade: parseFloat((Math.random() * 1000 - 500).toFixed(2)),
    sharpe_ratio: parseFloat((Math.random() * 3).toFixed(2)),
    max_drawdown: parseFloat((Math.random() * 50).toFixed(2)),
    total_trades: Math.floor(Math.random() * 100),
    ...overrides
  })
};

/**
 * Type assertion helper for testing
 */
export function assertType<T>(value: T): T {
  return value;
}

/**
 * Wait for loading states or async operations to complete
 */
export async function waitForLoadingToComplete() {
  // First wait for any immediate promises to resolve
  await waitFor(0);
  
  // Then wait a little longer to ensure loading states are updated
  await waitFor(50);
}

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  jest.resetAllMocks();
  global.fetch.mockReset();
}

/**
 * Mock window resize event
 */
export function mockWindowResize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width });
  Object.defineProperty(window, 'innerHeight', { value: height });
  window.dispatchEvent(new Event('resize'));
}

/**
 * Mock an Intersection Observer entry
 */
export function mockIntersection(isIntersecting: boolean) {
  const mockInstance = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };

  window.IntersectionObserver = jest.fn().mockImplementation((callback) => {
    callback([{ isIntersecting }], mockInstance);
    return mockInstance;
  });

  return mockInstance;
}

/**
 * Mock performance timing functions for performance testing
 */
export function mockPerformance() {
  const originalPerformance = { ...performance };
  const performanceMock = {
    now: jest.fn().mockReturnValue(0),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn().mockReturnValue([]),
    getEntriesByName: jest.fn().mockReturnValue([]),
  };

  beforeAll(() => {
    global.performance = { ...originalPerformance, ...performanceMock };
  });

  afterAll(() => {
    global.performance = originalPerformance;
  });

  return performanceMock;
}

export default {
  renderWithProviders,
  mockApiResponse,
  suppressConsoleMessages,
  waitFor,
  mockSupabaseResponse,
  generateTestData,
  assertType,
  waitForLoadingToComplete,
  resetAllMocks,
  mockWindowResize,
  mockIntersection,
  mockPerformance
};
