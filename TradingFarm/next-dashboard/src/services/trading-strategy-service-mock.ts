/**
 * Mock Trading Strategy Service
 * 
 * Used for build process to avoid runtime errors with missing dependencies
 */

import { FarmService } from './farm-service-mock';

export class TradingStrategyService {
  farmService: FarmService;
  
  constructor(farmService: FarmService) {
    this.farmService = farmService;
  }
  
  async getStrategy(id: number) {
    return {
      id,
      name: 'Mock Strategy',
      description: 'This is a mock strategy for build purposes',
      strategyType: 'mock_strategy',
      status: 'active',
      farmId: 'mock-farm-id',
      userId: 'mock-user-id'
    };
  }
  
  async updateStrategy(id: number, data: any) {
    return {
      id,
      ...data,
      updatedAt: new Date().toISOString()
    };
  }
  
  async deleteStrategy(id: number) {
    return { success: true };
  }
}
