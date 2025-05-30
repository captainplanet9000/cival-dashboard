/**
 * API Mock Handlers
 * Using MSW (Mock Service Worker) to mock API requests during development
 */
import { http, HttpResponse, delay } from 'msw';

// In-memory mock database
interface ExampleItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface MarketData {
  symbol: string;
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change?: number;
  percentage?: number;
}

// Mock data
let exampleItems: ExampleItem[] = [
  {
    id: '1',
    title: 'Learn about API integration',
    completed: true,
    createdAt: '2023-01-15T08:00:00.000Z',
  },
  {
    id: '2',
    title: 'Implement circuit breakers',
    completed: false,
    createdAt: '2023-01-16T09:30:00.000Z',
  },
  {
    id: '3',
    title: 'Add validation with Zod',
    completed: false,
    createdAt: '2023-01-17T10:15:00.000Z',
  },
];

const marketData: Record<string, MarketData> = {
  'BTC/USD': {
    symbol: 'BTC/USD',
    timestamp: Date.now(),
    datetime: new Date().toISOString(),
    open: 34500,
    high: 35100,
    low: 34200,
    close: 34950,
    volume: 1200,
    change: 450,
    percentage: 1.3,
  },
  'ETH/USD': {
    symbol: 'ETH/USD',
    timestamp: Date.now(),
    datetime: new Date().toISOString(),
    open: 1950,
    high: 2010,
    low: 1930,
    close: 1990,
    volume: 5500,
    change: 40,
    percentage: 2.05,
  },
};

// API response helper
const apiResponse = <T>(data: T | null, error: string | null = null, status = 200) => {
  return {
    data,
    error,
    status,
    success: !error,
  };
};

// Rate limiting and simulated failures
let requestCounter = 0;
const FAILURE_RATE = 0.1; // 10% of requests will fail
const RANDOM_DELAY = true; // Add random delay to simulate network latency

// Mock API handlers
export const handlers = [
  // Get example items
  http.get('/api/simulation/examples', async () => {
    // Simulate random failure
    if (Math.random() < FAILURE_RATE) {
      return HttpResponse.json(
        apiResponse(null, 'Internal server error'),
        { status: 500 }
      );
    }
    
    // Simulate network delay
    if (RANDOM_DELAY) {
      await delay(Math.random() * 300);
    }
    
    return HttpResponse.json(
      apiResponse(exampleItems),
      { status: 200 }
    );
  }),
  
  // Add example item
  http.post('/api/simulation/examples', async ({ request }) => {
    const body = await request.json() as { title: string; completed?: boolean };
    const { title, completed = false } = body;
    
    // Validate input
    if (!title || typeof title !== 'string') {
      return HttpResponse.json(
        apiResponse(null, 'Title is required and must be a string'),
        { status: 400 }
      );
    }
    
    // Create new item
    const newItem: ExampleItem = {
      id: (exampleItems.length + 1).toString(),
      title,
      completed,
      createdAt: new Date().toISOString(),
    };
    
    // Add to collection
    exampleItems = [...exampleItems, newItem];
    
    // Add some delay to make optimistic update visible
    await delay(500);
    
    return HttpResponse.json(
      apiResponse(exampleItems),
      { status: 200 }
    );
  }),
  
  // Update example item
  http.patch('/api/simulation/examples/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as Partial<ExampleItem>;
    
    // Find item
    const itemIndex = exampleItems.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return HttpResponse.json(
        apiResponse(null, `Item with id ${id} not found`),
        { status: 404 }
      );
    }
    
    // Update item
    exampleItems = exampleItems.map((item, index) => 
      index === itemIndex ? { ...item, ...updates } : item
    );
    
    // Add some delay to make optimistic update visible
    await delay(300);
    
    return HttpResponse.json(
      apiResponse(exampleItems),
      { status: 200 }
    );
  }),
  
  // Delete example item
  http.delete('/api/simulation/examples/:id', ({ params }) => {
    const { id } = params;
    
    // Find item
    const itemIndex = exampleItems.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      return HttpResponse.json(
        apiResponse(null, `Item with id ${id} not found`),
        { status: 404 }
      );
    }
    
    // Remove item
    exampleItems = exampleItems.filter(item => item.id !== id);
    
    return HttpResponse.json(
      apiResponse({ success: true }),
      { status: 200 }
    );
  }),
  
  // Get market data
  http.get('/api/exchange/markets/:symbol/ticker', async ({ params }) => {
    requestCounter++;
    
    // Force failure every 10 requests to test circuit breaker
    if (requestCounter % 10 === 0) {
      return HttpResponse.json(
        apiResponse(null, 'Service temporarily unavailable'),
        { status: 503 }
      );
    }
    
    const { symbol } = params;
    const data = marketData[symbol as string];
    
    if (!data) {
      return HttpResponse.json(
        apiResponse(null, `Market data for ${symbol} not found`),
        { status: 404 }
      );
    }
    
    // Update timestamp and datetime for fresh data
    const updatedData = {
      ...data,
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
      // Simulate price movements
      close: data.close * (1 + (Math.random() * 0.02 - 0.01)),
    };
    
    // Update stored data
    marketData[symbol as string] = updatedData;
    
    return HttpResponse.json(
      apiResponse(updatedData),
      { status: 200 }
    );
  }),
  
  // Get all markets
  http.get('/api/exchange/markets', async () => {
    const markets = [
      {
        id: 'BTC/USD',
        symbol: 'BTC/USD',
        base: 'BTC',
        quote: 'USD',
        active: true,
        precision: {
          price: 1,
          amount: 8,
        },
        limits: {
          amount: {
            min: 0.0001,
            max: null,
          },
          price: {
            min: 0.01,
            max: null,
          },
        },
      },
      {
        id: 'ETH/USD',
        symbol: 'ETH/USD',
        base: 'ETH',
        quote: 'USD',
        active: true,
        precision: {
          price: 2,
          amount: 8,
        },
        limits: {
          amount: {
            min: 0.001,
            max: null,
          },
          price: {
            min: 0.01,
            max: null,
          },
        },
      },
    ];
    
    await delay(100);
    
    return HttpResponse.json(
      apiResponse(markets),
      { status: 200 }
    );
  }),
  
  // Create order
  http.post('/api/exchange/orders', async ({ request }) => {
    const body = await request.json() as {
      symbol: string;
      side: string;
      type: string;
      amount: number;
      price?: number;
    };
    
    const { symbol, side, type, amount, price } = body;
    
    // Validate required fields
    if (!symbol || !side || !type || !amount) {
      return HttpResponse.json(
        apiResponse(null, 'Missing required fields: symbol, side, type, amount'),
        { status: 400 }
      );
    }
    
    // Create order
    const order = {
      id: `order-${Date.now()}`,
      symbol,
      type,
      side,
      price: price || null,
      amount,
      filled: 0,
      status: 'open',
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
    };
    
    await delay(300);
    
    return HttpResponse.json(
      apiResponse(order),
      { status: 200 }
    );
  }),
  
  // Monitoring endpoint
  http.post('/api/monitoring/events', async () => {
    // Just acknowledge receipt of monitoring events
    return HttpResponse.json(
      { success: true },
      { status: 200 }
    );
  }),
  
  // Monitoring metrics endpoint
  http.post('/api/monitoring/metrics', async () => {
    // Just acknowledge receipt of monitoring metrics
    return HttpResponse.json(
      { success: true },
      { status: 200 }
    );
  }),
]; 