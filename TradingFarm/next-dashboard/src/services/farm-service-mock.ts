/**
 * Mock Farm Service
 * 
 * Used for build process to avoid runtime errors with missing dependencies
 */

export class FarmService {
  async getFarm(id: string) {
    return {
      id,
      name: 'Mock Farm',
      description: 'This is a mock farm for build purposes',
      userId: 'mock-user-id',
      status: 'active'
    };
  }
  
  async getUserFarms(userId: string) {
    return [{
      id: 'mock-farm-id',
      name: 'Mock Farm',
      description: 'This is a mock farm for build purposes',
      userId,
      status: 'active'
    }];
  }

  async createFarm(data: any) {
    return {
      id: 'new-mock-farm-id',
      ...data,
      status: 'active'
    };
  }

  async updateFarm(id: string, data: any) {
    return {
      id,
      ...data,
      status: 'active'
    };
  }

  async deleteFarm(id: string) {
    return { success: true };
  }
}

// Create a default instance to export
const farmService = new FarmService();

// Export both the class and the default instance
export default farmService;
