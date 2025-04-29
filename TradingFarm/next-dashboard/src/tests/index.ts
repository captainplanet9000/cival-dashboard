// @ts-nocheck
/**
 * Trading Farm Dashboard Test Suite
 * 
 * This file serves as an entry point for all tests and documentation about the testing approach.
 * 
 * Testing Architecture:
 * 
 * 1. Unit Tests: Testing individual functions and utilities
 *    - Located in .test.ts files alongside the implementation
 *    - Focus on data manipulation, formatting, and core logic
 * 
 * 2. Component Tests: Testing React components in isolation
 *    - Located in .test.tsx files alongside the components
 *    - Use React Testing Library for component rendering and interaction
 *    - Mock dependencies like Recharts, TanStack Table, etc.
 * 
 * 3. Integration Tests: Testing how components work together
 *    - Located in src/tests/integration/
 *    - Focus on key workflows and features
 * 
 * 4. E2E Tests: Testing full user workflows in a browser
 *    - Located in src/e2e/
 *    - Use Playwright to simulate real user interactions
 * 
 * Running Tests:
 * - Unit and Component Tests: `npm run test`
 * - E2E Tests: `npm run test:e2e`
 * - All Tests with Coverage: `npm run test:coverage`
 */

export * from './setup';

// Re-export test utilities that may be used across test files
export const TEST_UTILS = {
  // Add common test utilities here as needed
  mockDateFns: () => {
    return {
      format: vi.fn().mockImplementation((date, format) => '2025-04-10'),
      formatDistanceToNow: vi.fn().mockImplementation(() => '5 days ago'),
      formatDistance: vi.fn().mockImplementation(() => '5 days'),
      parseISO: vi.fn().mockImplementation((dateString) => new Date('2025-04-10')),
      isAfter: vi.fn().mockImplementation(() => false),
      isBefore: vi.fn().mockImplementation(() => true),
      differenceInCalendarDays: vi.fn().mockImplementation(() => 5),
      startOfDay: vi.fn().mockImplementation(() => new Date('2025-04-10')),
      endOfDay: vi.fn().mockImplementation(() => new Date('2025-04-10T23:59:59')),
    };
  },
  
  mockRecharts: () => {
    return {
      ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="responsive-container">{children}</div>
      ),
      LineChart: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="line-chart">{children}</div>
      ),
      AreaChart: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="area-chart">{children}</div>
      ),
      PieChart: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="pie-chart">{children}</div>
      ),
      RadialBarChart: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="radial-chart">{children}</div>
      ),
      BarChart: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="bar-chart">{children}</div>
      ),
      Line: vi.fn().mockImplementation(props => (
        <div data-testid="line" data-props={JSON.stringify(props)} />
      )),
      Area: vi.fn().mockImplementation(props => (
        <div data-testid="area" data-props={JSON.stringify(props)} />
      )),
      Pie: vi.fn().mockImplementation(props => (
        <div data-testid="pie" data-props={JSON.stringify(props)} />
      )),
      RadialBar: vi.fn().mockImplementation(props => (
        <div data-testid="radial-bar" data-props={JSON.stringify(props)} />
      )),
      Bar: vi.fn().mockImplementation(props => (
        <div data-testid="bar" data-props={JSON.stringify(props)} />
      )),
      XAxis: vi.fn().mockImplementation(props => (
        <div data-testid="x-axis" data-props={JSON.stringify(props)} />
      )),
      YAxis: vi.fn().mockImplementation(props => (
        <div data-testid="y-axis" data-props={JSON.stringify(props)} />
      )),
      CartesianGrid: vi.fn().mockImplementation(props => (
        <div data-testid="cartesian-grid" data-props={JSON.stringify(props)} />
      )),
      Tooltip: vi.fn().mockImplementation(props => (
        <div data-testid="tooltip" data-props={JSON.stringify(props)} />
      )),
      Legend: vi.fn().mockImplementation(props => (
        <div data-testid="legend" data-props={JSON.stringify(props)} />
      )),
      Cell: vi.fn().mockImplementation(props => (
        <div data-testid="cell" data-props={JSON.stringify(props)} />
      )),
    };
  },
  
  mockSupabase: () => {
    return {
      createServerClient: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation(callback => callback({ data: [], error: null })),
        }),
      })),
      createBrowserClient: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation(callback => callback({ data: [], error: null })),
        }),
      })),
    };
  },
};
