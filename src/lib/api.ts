import { Farm, Agent, GoalTemplate, Goal, VaultBalance, Transaction } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API client for the backend
export const api = {
  // Farm endpoints
  farms: {
    getAll: async (ownerId?: string): Promise<Farm[]> => {
      const url = ownerId ? `${API_URL}/farms?owner_id=${ownerId}` : `${API_URL}/farms`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch farms: ${response.statusText}`);
      }
      return response.json();
    },
    
    getById: async (farmId: string): Promise<Farm> => {
      const response = await fetch(`${API_URL}/farms/${farmId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch farm: ${response.statusText}`);
      }
      return response.json();
    },
    
    create: async (farm: Omit<Farm, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Farm> => {
      const response = await fetch(`${API_URL}/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farm),
      });
      if (!response.ok) {
        throw new Error(`Failed to create farm: ${response.statusText}`);
      }
      return response.json();
    },
    
    update: async (farmId: string, farm: Partial<Farm>): Promise<Farm> => {
      const response = await fetch(`${API_URL}/farms/${farmId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(farm),
      });
      if (!response.ok) {
        throw new Error(`Failed to update farm: ${response.statusText}`);
      }
      return response.json();
    },
  },
  
  // Agent endpoints
  agents: {
    getByFarmId: async (farmId: string): Promise<Agent[]> => {
      const response = await fetch(`${API_URL}/farms/${farmId}/agents`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }
      return response.json();
    },
    
    getById: async (agentId: string): Promise<Agent> => {
      const response = await fetch(`${API_URL}/agents/${agentId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.statusText}`);
      }
      return response.json();
    },
    
    create: async (agent: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<Agent> => {
      const response = await fetch(`${API_URL}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agent),
      });
      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }
      return response.json();
    },
    
    update: async (agentId: string, agent: Partial<Agent>): Promise<Agent> => {
      const response = await fetch(`${API_URL}/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agent),
      });
      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.statusText}`);
      }
      return response.json();
    },
    
    start: async (agentId: string): Promise<Agent> => {
      const response = await fetch(`${API_URL}/agents/${agentId}/start`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to start agent: ${response.statusText}`);
      }
      return response.json();
    },
    
    stop: async (agentId: string): Promise<Agent> => {
      const response = await fetch(`${API_URL}/agents/${agentId}/stop`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to stop agent: ${response.statusText}`);
      }
      return response.json();
    },
  },
  
  // Vault endpoints
  vault: {
    getBalances: async (farmId: string): Promise<VaultBalance[]> => {
      const response = await fetch(`${API_URL}/farms/${farmId}/vault/balances`);
      if (!response.ok) {
        throw new Error(`Failed to fetch vault balances: ${response.statusText}`);
      }
      return response.json();
    },
    
    getTransactions: async (
      farmId: string, 
      options?: { 
        transaction_type?: string; 
        asset_symbol?: string; 
        limit?: number 
      }
    ): Promise<Transaction[]> => {
      let url = `${API_URL}/farms/${farmId}/vault/transactions`;
      
      if (options) {
        const params = new URLSearchParams();
        if (options.transaction_type) params.append('transaction_type', options.transaction_type);
        if (options.asset_symbol) params.append('asset_symbol', options.asset_symbol);
        if (options.limit) params.append('limit', options.limit.toString());
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      return response.json();
    },
  },
  
  // Goal management endpoints
  goals: {
    getTemplates: async (goalType?: string): Promise<GoalTemplate[]> => {
      const url = goalType ? `${API_URL}/goal-templates?goal_type=${goalType}` : `${API_URL}/goal-templates`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch goal templates: ${response.statusText}`);
      }
      return response.json();
    },
    
    getTemplateById: async (templateId: string): Promise<GoalTemplate> => {
      const response = await fetch(`${API_URL}/goal-templates/${templateId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch goal template: ${response.statusText}`);
      }
      return response.json();
    },
    
    getFarmGoals: async (
      farmId: string, 
      options?: { 
        status?: string; 
        goal_type?: string; 
      }
    ): Promise<Goal[]> => {
      let url = `${API_URL}/farms/${farmId}/goals`;
      
      if (options) {
        const params = new URLSearchParams();
        if (options.status) params.append('status', options.status);
        if (options.goal_type) params.append('goal_type', options.goal_type);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch goals: ${response.statusText}`);
      }
      return response.json();
    },
    
    getById: async (goalId: string): Promise<Goal> => {
      const response = await fetch(`${API_URL}/goals/${goalId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch goal: ${response.statusText}`);
      }
      return response.json();
    },
    
    create: async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'status' | 'progress' | 'last_evaluated_at'>): Promise<Goal> => {
      const response = await fetch(`${API_URL}/farms/${goal.farm_id}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goal),
      });
      if (!response.ok) {
        throw new Error(`Failed to create goal: ${response.statusText}`);
      }
      return response.json();
    },
    
    update: async (goalId: string, goal: Partial<Goal>): Promise<Goal> => {
      const response = await fetch(`${API_URL}/goals/${goalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goal),
      });
      if (!response.ok) {
        throw new Error(`Failed to update goal: ${response.statusText}`);
      }
      return response.json();
    },
    
    updateProgress: async (
      goalId: string, 
      currentValue: number, 
      progress: number, 
      metrics: Record<string, any> = {}
    ): Promise<Goal> => {
      const params = new URLSearchParams({
        current_value: currentValue.toString(),
        progress: progress.toString(),
      });
      
      const response = await fetch(`${API_URL}/goals/${goalId}/progress?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });
      if (!response.ok) {
        throw new Error(`Failed to update goal progress: ${response.statusText}`);
      }
      return response.json();
    },
    
    getMetrics: async (goalId: string, limit?: number): Promise<any[]> => {
      const url = limit ? `${API_URL}/goals/${goalId}/metrics?limit=${limit}` : `${API_URL}/goals/${goalId}/metrics`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch goal metrics: ${response.statusText}`);
      }
      return response.json();
    },
    
    getDependencies: async (goalId: string): Promise<any[]> => {
      const response = await fetch(`${API_URL}/goals/${goalId}/dependencies`);
      if (!response.ok) {
        throw new Error(`Failed to fetch goal dependencies: ${response.statusText}`);
      }
      return response.json();
    },
    
    getActions: async (
      goalId: string, 
      options?: { 
        status?: string; 
        limit?: number 
      }
    ): Promise<any[]> => {
      let url = `${API_URL}/goals/${goalId}/actions`;
      
      if (options) {
        const params = new URLSearchParams();
        if (options.status) params.append('status', options.status);
        if (options.limit) params.append('limit', options.limit.toString());
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch goal actions: ${response.statusText}`);
      }
      return response.json();
    },
  },
  
  // Analytics endpoints
  analytics: {
    getFarmAnalytics: async (farmId: string, timeframe: string = '30d'): Promise<any> => {
      const response = await fetch(`${API_URL}/farms/${farmId}/analytics?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      return response.json();
    },
    
    getAssetPerformance: async (farmId: string): Promise<any[]> => {
      const response = await fetch(`${API_URL}/farms/${farmId}/analytics/assets`);
      if (!response.ok) {
        throw new Error(`Failed to fetch asset performance: ${response.statusText}`);
      }
      return response.json();
    },
    
    getHistoricalBalances: async (farmId: string, timeframe: string = '30d'): Promise<any[]> => {
      const response = await fetch(`${API_URL}/farms/${farmId}/analytics/balances?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch historical balances: ${response.statusText}`);
      }
      return response.json();
    },
    
    getProfitLoss: async (farmId: string, period: string = 'monthly'): Promise<any[]> => {
      const response = await fetch(`${API_URL}/farms/${farmId}/analytics/profit-loss?period=${period}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch profit/loss data: ${response.statusText}`);
      }
      return response.json();
    },
  },
  
  // Brain endpoints
  brain: {
    query: async (farmId: string, query: string, withSynthesis: boolean = false, limit: number = 5): Promise<any> => {
      const response = await fetch(`${API_URL}/farms/${farmId}/brain/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          with_synthesis: withSynthesis,
          limit,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to query brain: ${response.statusText}`);
      }
      return response.json();
    },
  },
};

// Helper function to handle API errors
export const handleApiError = (error: any, setError: (error: string) => void) => {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    setError(error.message);
  } else {
    setError('An unknown error occurred');
  }
}; 