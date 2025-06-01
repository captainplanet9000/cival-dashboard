/**
 * Mock Farm Management System
 * Provides persistent farm data and management functions for development and testing
 */

import { v4 as uuidv4 } from 'uuid';
import { mockFarms as initialMockFarms } from './mocks';

// Define types
export interface FarmStatusSummary {
  goals_total: number;
  goals_completed: number;
  goals_in_progress: number;
  goals_not_started: number;
  goals_cancelled: number;
  agents_total: number;
  agents_active: number;
  updated_at?: string;
}

export interface MockAgent {
  id: string;
  name: string;
  farm_id: string;
  status: 'active' | 'paused' | 'stopped';
  is_active?: boolean;
  exchange: string;
  strategy: string;
  goal_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockElizaAgent {
  id: string;
  name: string;
  farm_id: string;
  status: 'active' | 'paused' | 'stopped';
  goal_id?: string | null;
  capabilities: string[];
  created_at: string;
  updated_at: string;
}

export interface MockFarm {
  id: string;
  name: string;
  description?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  agents_count?: number;
  status?: string;
  exchange?: string;
  api_keys?: any;
  config?: any;
  status_summary?: FarmStatusSummary;
  performance_metrics?: {
    win_rate?: number;
    profit_factor?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
  };
}

// Create a singleton for mock farms that persists during the session
class MockFarmManager {
  private farms: MockFarm[] = [];
  private agents: MockAgent[] = [];
  private elizaAgents: MockElizaAgent[] = [];
  private isInitialized = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  // Initialize with default farms if no farms exist
  initialize() {
    if (!this.isInitialized) {
      // Check if we already have farms
      if (this.farms.length === 0) {
        // Start with our initial mock farms and add some additional properties
        this.farms = initialMockFarms.map(farm => ({
          ...farm,
          agents_count: Math.floor(Math.random() * 5) + 1,
          active_agents_count: Math.floor(Math.random() * 3) + 1,
          goals_count: Math.floor(Math.random() * 10) + 1,
          completed_goals_count: Math.floor(Math.random() * 5),
          balance_usd: Math.floor(Math.random() * 100000) + 5000,
          performance_7d: (Math.random() * 10) - 2, // -2% to +8%
          strategies: ['Trend Following', 'Mean Reversion', 'Sentiment Analysis'],
          markets: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
          status_summary: {
            goals_total: Math.floor(Math.random() * 10) + 1,
            goals_completed: Math.floor(Math.random() * 5),
            goals_in_progress: Math.floor(Math.random() * 3) + 1,
            goals_not_started: Math.floor(Math.random() * 2),
            goals_cancelled: 0,
            agents_total: Math.floor(Math.random() * 5) + 1,
            agents_active: Math.floor(Math.random() * 3) + 1,
            updated_at: new Date().toISOString()
          }
        }));
      }
      
      // Save to localStorage
      this.saveToLocalStorage();
      this.isInitialized = true;
    }
  }

  // Load farms from localStorage if available
  private loadFromLocalStorage() {
    if (typeof window !== 'undefined') {
      const storedFarms = localStorage.getItem('tradingFarmMockFarms');
      const storedAgents = localStorage.getItem('tradingFarmMockAgents');
      const storedElizaAgents = localStorage.getItem('tradingFarmMockElizaAgents');
      
      if (storedFarms) {
        try {
          this.farms = JSON.parse(storedFarms);
          this.isInitialized = true;
        } catch (error) {
          console.error('Failed to parse stored farms', error);
          this.farms = [];
        }
      }

      if (storedAgents) {
        try {
          this.agents = JSON.parse(storedAgents);
        } catch (error) {
          console.error('Failed to parse stored agents', error);
          this.agents = [];
        }
      }

      if (storedElizaAgents) {
        try {
          this.elizaAgents = JSON.parse(storedElizaAgents);
        } catch (error) {
          console.error('Failed to parse stored ElizaOS agents', error);
          this.elizaAgents = [];
        }
      }
    }
  }

  // Save farms to localStorage
  private saveToLocalStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tradingFarmMockFarms', JSON.stringify(this.farms));
      localStorage.setItem('tradingFarmMockAgents', JSON.stringify(this.agents));
      localStorage.setItem('tradingFarmMockElizaAgents', JSON.stringify(this.elizaAgents));
    }
  }

  // Get all farms
  getAllFarms(): MockFarm[] {
    this.initialize();
    return this.farms;
  }

  // Get farm by ID
  getFarmById(id: string): MockFarm | undefined {
    this.initialize();
    return this.farms.find(farm => farm.id === id);
  }

  // Get farms by owner ID
  getFarmsByOwnerId(ownerId: string): MockFarm[] {
    this.initialize();
    return this.farms.filter(farm => farm.user_id === ownerId);
  }

  // Create a new farm
  createFarm(farmData: Partial<MockFarm>): MockFarm {
    this.initialize();
    
    const newFarm: MockFarm = {
      id: farmData.id || uuidv4(),
      name: farmData.name || 'New Farm',
      description: farmData.description || '',
      user_id: farmData.user_id || 'mock-user-id',
      created_at: farmData.created_at || new Date().toISOString(),
      updated_at: farmData.updated_at || new Date().toISOString(),
      agents_count: 0,
      status: farmData.status || 'active',
      exchange: farmData.exchange || 'binance',
      api_keys: farmData.api_keys || {},
      config: farmData.config || {},
      status_summary: {
        goals_total: 0,
        goals_completed: 0,
        goals_in_progress: 0,
        goals_not_started: 0,
        goals_cancelled: 0,
        agents_total: 0,
        agents_active: 0,
        updated_at: new Date().toISOString()
      },
      performance_metrics: {
        win_rate: 0,
        profit_factor: 0,
        sharpe_ratio: 0,
        max_drawdown: 0
      }
    };

    // Add the new farm to our collection
    this.farms.push(newFarm);
    this.saveToLocalStorage();

    return newFarm;
  }

  // Update an existing farm
  updateFarm(id: string, farmData: Partial<MockFarm>): MockFarm | undefined {
    this.initialize();
    
    const farmIndex = this.farms.findIndex(farm => farm.id === id);
    if (farmIndex === -1) return undefined;

    // Update the farm with the new data
    this.farms[farmIndex] = {
      ...this.farms[farmIndex],
      ...farmData,
      updated_at: new Date().toISOString()
    };

    this.saveToLocalStorage();
    return this.farms[farmIndex];
  }

  // Delete a farm
  deleteFarm(id: string): boolean {
    this.initialize();
    
    const farmIndex = this.farms.findIndex(farm => farm.id === id);
    if (farmIndex === -1) return false;

    // Remove the farm
    this.farms.splice(farmIndex, 1);
    this.saveToLocalStorage();
    
    return true;
  }

  // Get farm status summary
  getFarmStatusSummary(farmId: string): FarmStatusSummary | null {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return null;
    
    if (!farm.status_summary) {
      farm.status_summary = {
        goals_total: 0,
        goals_completed: 0,
        goals_in_progress: 0,
        goals_not_started: 0,
        goals_cancelled: 0,
        agents_total: 0,
        agents_active: 0,
        updated_at: new Date().toISOString()
      };
    }
    
    return farm.status_summary;
  }

  // Refresh farm status summary
  refreshFarmStatusSummary(farmId: string): FarmStatusSummary | null {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return null;
    
    // Count agents
    const standardAgents = this.agents.filter(agent => 
      agent.farm_id === farmId
    );
    
    const elizaAgents = this.elizaAgents.filter(agent => 
      agent.farm_id === farmId
    );
    
    const agentsTotal = standardAgents.length + elizaAgents.length;
    const agentsActive = standardAgents.filter(a => a.is_active || a.status === 'active').length + 
                         elizaAgents.filter(a => a.status === 'active').length;
    
    // Create or update status summary
    farm.status_summary = {
      goals_total: farm.status_summary?.goals_total || 0,
      goals_completed: farm.status_summary?.goals_completed || 0,
      goals_in_progress: farm.status_summary?.goals_in_progress || 0,
      goals_not_started: farm.status_summary?.goals_not_started || 0,
      goals_cancelled: farm.status_summary?.goals_cancelled || 0,
      agents_total: agentsTotal,
      agents_active: agentsActive,
      updated_at: new Date().toISOString()
    };
    
    // Update agents count
    farm.agents_count = agentsTotal;
    
    this.saveToLocalStorage();
    
    return farm.status_summary;
  }

  // Assign goal to agent
  assignGoalToAgent(farmId: string, goalId: string, agentId: string, isElizaAgent: boolean = false): boolean {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return false;
    
    if (isElizaAgent) {
      const agentIndex = this.elizaAgents.findIndex(agent => agent.id === agentId && agent.farm_id === farmId);
      if (agentIndex === -1) return false;
      
      this.elizaAgents[agentIndex].goal_id = goalId;
      this.saveToLocalStorage();
    } else {
      const agentIndex = this.agents.findIndex(agent => agent.id === agentId && agent.farm_id === farmId);
      if (agentIndex === -1) return false;
      
      this.agents[agentIndex].goal_id = goalId;
      this.saveToLocalStorage();
    }
    
    return true;
  }

  // Unassign goal from agent
  unassignGoalFromAgent(farmId: string, agentId: string, isElizaAgent: boolean = false): boolean {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return false;
    
    if (isElizaAgent) {
      const agentIndex = this.elizaAgents.findIndex(agent => agent.id === agentId && agent.farm_id === farmId);
      if (agentIndex === -1) return false;
      
      this.elizaAgents[agentIndex].goal_id = null;
      this.saveToLocalStorage();
    } else {
      const agentIndex = this.agents.findIndex(agent => agent.id === agentId && agent.farm_id === farmId);
      if (agentIndex === -1) return false;
      
      this.agents[agentIndex].goal_id = null;
      this.saveToLocalStorage();
    }
    
    return true;
  }

  // Get agents by goal
  getAgentsByGoal(farmId: string, goalId: string): { agents: MockAgent[], elizaAgents: MockElizaAgent[] } | null {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return null;
    
    const agents = this.agents.filter(agent => 
      agent.farm_id === farmId && agent.goal_id === goalId
    );
    
    const elizaAgents = this.elizaAgents.filter(agent => 
      agent.farm_id === farmId && agent.goal_id === goalId
    );
    
    return { agents, elizaAgents };
  }

  // Count agents by farm
  countAgentsByFarm(farmId: string): { total: number, active: number, elizaTotal: number, elizaActive: number } | null {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return null;
    
    const standardAgents = this.agents.filter(agent => agent.farm_id === farmId);
    const elizaAgents = this.elizaAgents.filter(agent => agent.farm_id === farmId);
    
    const total = standardAgents.length;
    const active = standardAgents.filter(a => a.is_active || a.status === 'active').length;
    const elizaTotal = elizaAgents.length;
    const elizaActive = elizaAgents.filter(a => a.status === 'active').length;
    
    return { total, active, elizaTotal, elizaActive };
  }

  // Get agents for a farm
  getAgents(farmId: string): MockAgent[] | null {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return null;
    
    return this.agents.filter(agent => agent.farm_id === farmId);
  }

  // Get ElizaOS agents for a farm
  getElizaAgents(farmId: string): MockElizaAgent[] | null {
    const farm = this.farms.find(farm => farm.id === farmId);
    if (!farm) return null;
    
    return this.elizaAgents.filter(agent => agent.farm_id === farmId);
  }
}

// Create and export the singleton instance
export const mockFarmManager = new MockFarmManager();

// Mock response functions that simulate Supabase responses
export function mockFarmResponse(delay = 200) {
  return {
    // Get all farms
    getAllFarms: () => new Promise<{ data: MockFarm[]; error: null }>(resolve => {
      setTimeout(() => {
        resolve({
          data: mockFarmManager.getAllFarms(),
          error: null
        });
      }, delay);
    }),

    // Get farm by ID
    getFarmById: (id: string) => new Promise<{ data: MockFarm | null; error: null }>(resolve => {
      setTimeout(() => {
        const farm = mockFarmManager.getFarmById(id);
        resolve({
          data: farm || null,
          error: null
        });
      }, delay);
    }),

    // Get farms by owner ID
    getFarmsByOwnerId: (ownerId: string) => new Promise<{ data: MockFarm[]; error: null }>(resolve => {
      setTimeout(() => {
        resolve({
          data: mockFarmManager.getFarmsByOwnerId(ownerId),
          error: null
        });
      }, delay);
    }),

    // Create a new farm
    createFarm: (farmData: Partial<MockFarm>) => new Promise<{ data: MockFarm; error: null }>(resolve => {
      setTimeout(() => {
        const newFarm = mockFarmManager.createFarm(farmData);
        resolve({
          data: newFarm,
          error: null
        });
      }, delay);
    }),

    // Update a farm
    updateFarm: (id: string, farmData: Partial<MockFarm>) => new Promise<{ data: MockFarm | null; error: null }>(resolve => {
      setTimeout(() => {
        const updatedFarm = mockFarmManager.updateFarm(id, farmData);
        resolve({
          data: updatedFarm || null,
          error: null
        });
      }, delay);
    }),

    // Delete a farm
    deleteFarm: (id: string) => new Promise<{ data: { success: boolean }; error: null }>(resolve => {
      setTimeout(() => {
        const success = mockFarmManager.deleteFarm(id);
        resolve({
          data: { success },
          error: null
        });
      }, delay);
    }),

    // Get farm status summary
    getFarmStatusSummary: (farmId: string) => new Promise<{ data: FarmStatusSummary | null; error: null }>(resolve => {
      setTimeout(() => {
        const statusSummary = mockFarmManager.getFarmStatusSummary(farmId);
        resolve({
          data: statusSummary || null,
          error: null
        });
      }, delay);
    }),

    // Refresh farm status summary
    refreshFarmStatusSummary: (farmId: string) => new Promise<{ data: FarmStatusSummary | null; error: null }>(resolve => {
      setTimeout(() => {
        const statusSummary = mockFarmManager.refreshFarmStatusSummary(farmId);
        resolve({
          data: statusSummary || null,
          error: null
        });
      }, delay);
    }),

    // Assign goal to agent
    assignGoalToAgent: (farmId: string, goalId: string, agentId: string, isElizaAgent: boolean = false) => new Promise<{ data: { success: boolean }; error: null }>(resolve => {
      setTimeout(() => {
        const success = mockFarmManager.assignGoalToAgent(farmId, goalId, agentId, isElizaAgent);
        resolve({
          data: { success },
          error: null
        });
      }, delay);
    }),

    // Unassign goal from agent
    unassignGoalFromAgent: (farmId: string, agentId: string, isElizaAgent: boolean = false) => new Promise<{ data: { success: boolean }; error: null }>(resolve => {
      setTimeout(() => {
        const success = mockFarmManager.unassignGoalFromAgent(farmId, agentId, isElizaAgent);
        resolve({
          data: { success },
          error: null
        });
      }, delay);
    }),

    // Get agents by goal
    getAgentsByGoal: (farmId: string, goalId: string) => new Promise<{ data: { agents: MockAgent[], elizaAgents: MockElizaAgent[] } | null; error: null }>(resolve => {
      setTimeout(() => {
        const agents = mockFarmManager.getAgentsByGoal(farmId, goalId);
        resolve({
          data: agents || null,
          error: null
        });
      }, delay);
    }),

    // Count agents by farm
    countAgentsByFarm: (farmId: string) => new Promise<{ data: { total: number, active: number, elizaTotal: number, elizaActive: number } | null; error: null }>(resolve => {
      setTimeout(() => {
        const count = mockFarmManager.countAgentsByFarm(farmId);
        resolve({
          data: count || null,
          error: null
        });
      }, delay);
    }),

    // Get agents for a farm
    getAgents: (farmId: string) => new Promise<{ data: MockAgent[] | null; error: null }>(resolve => {
      setTimeout(() => {
        const agents = mockFarmManager.getAgents(farmId);
        resolve({
          data: agents || null,
          error: null
        });
      }, delay);
    }),

    // Get ElizaOS agents for a farm
    getElizaAgents: (farmId: string) => new Promise<{ data: MockElizaAgent[] | null; error: null }>(resolve => {
      setTimeout(() => {
        const elizaAgents = mockFarmManager.getElizaAgents(farmId);
        resolve({
          data: elizaAgents || null,
          error: null
        });
      }, delay);
    })
  };
}

// Export the mock farm data for direct access
export const mockFarms = mockFarmManager.getAllFarms();
