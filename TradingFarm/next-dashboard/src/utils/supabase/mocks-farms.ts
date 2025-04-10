import { mockApi } from './mocks-supabase';
import { v4 as uuidv4 } from 'uuid';

// Mock farm data
const mockFarms = [
  {
    id: '31e9b572-d329-4c58-a1b7-8b1c29a9322f',
    name: 'Crypto Harvester',
    description: 'A farm focused on DeFi yield optimization',
    owner_id: 'f24c5fa4-b642-4c12-a3b9-685e67d81171',
    created_at: new Date('2025-03-01T00:00:00.000Z').toISOString(),
    updated_at: new Date('2025-03-15T00:00:00.000Z').toISOString(),
    status: 'active',
    balance: 10000.5,
    currency: 'USD',
    target_apy: 12.5,
    risk_level: 'medium',
  },
  {
    id: '7a8c4f9e-d2b1-4e3a-8c7d-5f6e4a3b2c1d',
    name: 'NFT Trader',
    description: 'Specializes in NFT trading strategies',
    owner_id: 'f24c5fa4-b642-4c12-a3b9-685e67d81171',
    created_at: new Date('2025-02-15T00:00:00.000Z').toISOString(),
    updated_at: new Date('2025-03-10T00:00:00.000Z').toISOString(),
    status: 'active',
    balance: 25000,
    currency: 'USD',
    target_apy: 18,
    risk_level: 'high',
  },
];

// Farm handlers
export const mockFarmHandlers = [
  // Get all farms
  mockApi.on('from.farms.select.*').respond((args) => {
    if (args.eq && args.eq[0] === 'id') {
      const id = args.eq[1];
      const farm = mockFarms.find((f) => f.id === id);
      if (farm) {
        return [farm];
      }
      return [];
    }

    if (args.eq && args.eq[0] === 'owner_id') {
      const owner_id = args.eq[1];
      return mockFarms.filter((f) => f.owner_id === owner_id);
    }

    return mockFarms;
  }),

  // Create farm
  mockApi.on('from.farms.insert').respond((args) => {
    const newFarm = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active',
      ...args.values,
    };
    mockFarms.push(newFarm);
    return { status: 201, data: [newFarm] };
  }),

  // Update farm
  mockApi.on('from.farms.update').respond((args) => {
    const { set, eq } = args;
    if (eq && eq[0] === 'id') {
      const id = eq[1];
      const farmIndex = mockFarms.findIndex((f) => f.id === id);
      if (farmIndex !== -1) {
        mockFarms[farmIndex] = {
          ...mockFarms[farmIndex],
          ...set,
          updated_at: new Date().toISOString(),
        };
        return { status: 204 };
      }
    }
    return { status: 404 };
  }),

  // Delete farm
  mockApi.on('from.farms.delete').respond((args) => {
    if (args.eq && args.eq[0] === 'id') {
      const id = args.eq[1];
      const farmIndex = mockFarms.findIndex((f) => f.id === id);
      if (farmIndex !== -1) {
        mockFarms.splice(farmIndex, 1);
        return { status: 204 };
      }
    }
    return { status: 404 };
  }),
];
