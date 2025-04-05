import { v4 as uuidv4 } from 'uuid';

/**
 * Mock agent data for testing and development
 */
export interface MockAgent {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// Create some predefined agents for development
const createMockAgents = (): MockAgent[] => {
  const now = new Date().toISOString();
  
  return [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Trading Bot Alpha',
      description: 'Primary trading bot for BTC/ETH on Binance',
      owner_id: DEFAULT_USER_ID,
      created_at: now,
      updated_at: now
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Market Analyzer',
      description: 'Analyzes market trends and provides insights',
      owner_id: DEFAULT_USER_ID,
      created_at: now,
      updated_at: now
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Sentiment Tracker',
      description: 'Tracks social media sentiment for crypto assets',
      owner_id: DEFAULT_USER_ID,
      created_at: now,
      updated_at: now
    }
  ];
};

// Initial mock data
export const mockAgents: MockAgent[] = createMockAgents();

// Function to reset to default data
export const resetAgentMockData = (): void => {
  mockAgents.length = 0;
  createMockAgents().forEach(agent => mockAgents.push(agent));
};

// Function to create a new mock agent
export const createMockAgent = (
  name: string,
  description: string | null = null,
  owner_id: string = DEFAULT_USER_ID
): MockAgent => {
  const now = new Date().toISOString();
  const newAgent: MockAgent = {
    id: uuidv4(),
    name,
    description,
    owner_id,
    created_at: now,
    updated_at: now
  };
  
  mockAgents.push(newAgent);
  return newAgent;
}; 