import { mockApi } from './mocks-api';
import { v4 as uuidv4 } from 'uuid';

// Mock user data
const mockUsers = [
  {
    id: 'f24c5fa4-b642-4c12-a3b9-685e67d81171',
    email: 'user@example.com',
    name: 'Demo User',
    avatar_url: null,
    created_at: new Date('2025-01-15T00:00:00.000Z').toISOString(),
    updated_at: new Date('2025-01-15T00:00:00.000Z').toISOString(),
  },
  {
    id: 'a7fc4e9b-3d2c-4a1d-8d14-2f6e56cf82ab',
    email: 'admin@tradingfarm.com',
    name: 'Admin User',
    avatar_url: null,
    created_at: new Date('2025-01-10T00:00:00.000Z').toISOString(),
    updated_at: new Date('2025-01-10T00:00:00.000Z').toISOString(),
  },
];

// User handlers
export const mockUserHandlers = [
  // Get current user
  mockApi.on('auth.getUser').respond(() => {
    return mockUsers[0];
  }),

  // Get user by ID
  mockApi.on('from.users.select.*').respond((args) => {
    if (args.eq && args.eq[0] === 'id') {
      const id = args.eq[1];
      const user = mockUsers.find((u) => u.id === id);
      if (user) {
        return [user];
      }
    }
    return mockUsers;
  }),

  // Update user
  mockApi.on('from.users.update').respond((args) => {
    const { set, eq } = args;
    if (eq && eq[0] === 'id') {
      const id = eq[1];
      const userIndex = mockUsers.findIndex((u) => u.id === id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = {
          ...mockUsers[userIndex],
          ...set,
          updated_at: new Date().toISOString(),
        };
        return { status: 204 };
      }
    }
    return { status: 404 };
  }),

  // Create user
  mockApi.on('from.users.insert').respond((args) => {
    const newUser = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...args.values,
    };
    mockUsers.push(newUser);
    return { status: 201, data: [newUser] };
  }),
];
