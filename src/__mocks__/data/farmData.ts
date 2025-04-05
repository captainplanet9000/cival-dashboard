import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_USER_ID } from './agentData';

/**
 * Mock farm data for testing and development
 */
export interface MockFarm {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Create some predefined farms for development
const createMockFarms = (): MockFarm[] => {
  const now = new Date().toISOString();
  
  return [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Bitcoin Strategy Farm',
      description: 'Collection of BTC trading strategies',
      owner_id: DEFAULT_USER_ID,
      created_at: now,
      updated_at: now
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      name: 'DeFi Yield Farm',
      description: 'Strategies for optimizing DeFi yields',
      owner_id: DEFAULT_USER_ID,
      created_at: now,
      updated_at: now
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      name: 'Algorithmic Trading Farm',
      description: 'Advanced algorithmic trading strategies',
      owner_id: DEFAULT_USER_ID,
      created_at: now,
      updated_at: now
    }
  ];
};

// Initial mock data
export const mockFarms: MockFarm[] = createMockFarms();

// Function to reset to default data
export const resetFarmMockData = (): void => {
  mockFarms.length = 0;
  createMockFarms().forEach(farm => mockFarms.push(farm));
};

// Function to create a new mock farm
export const createMockFarm = (
  name: string,
  description: string | null = null,
  owner_id: string = DEFAULT_USER_ID
): MockFarm => {
  const now = new Date().toISOString();
  const newFarm: MockFarm = {
    id: uuidv4(),
    name,
    description,
    owner_id,
    created_at: now,
    updated_at: now
  };
  
  mockFarms.push(newFarm);
  return newFarm;
}; 