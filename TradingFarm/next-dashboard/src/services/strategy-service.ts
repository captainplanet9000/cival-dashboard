import { TRADING_EVENTS } from '../constants/socket-events';
import { Strategy, StrategyTemplate, StrategyType, PerformanceData } from '../types/strategy';
import { socketService } from './socket-service';

// Default endpoint for strategy API
const STRATEGY_API_ENDPOINT = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Service for managing trading strategies with real-time updates
 */
export class StrategyService {
  private static instance: StrategyService;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  private constructor() {
    this.setupSocketListeners();
  }

  public static getInstance(): StrategyService {
    if (!StrategyService.instance) {
      StrategyService.instance = new StrategyService();
    }
    return StrategyService.instance;
  }

  /**
   * Initialize socket connection and listeners
   */
  private setupSocketListeners(): void {
    if (!this.connected) {
      socketService.onConnectionChange((connected) => {
        console.log('Strategy service socket connection change:', connected);
        this.connected = connected;
        this.reconnectAttempts = connected ? 0 : this.reconnectAttempts;
      });

      // Strategy events
      socketService.on(TRADING_EVENTS.STRATEGY_CREATED, (data) => {
        this.notifyListeners(TRADING_EVENTS.STRATEGY_CREATED, data);
      });

      socketService.on(TRADING_EVENTS.STRATEGY_UPDATED, (data) => {
        this.notifyListeners(TRADING_EVENTS.STRATEGY_UPDATED, data);
      });

      socketService.on(TRADING_EVENTS.STRATEGY_DELETED, (data) => {
        this.notifyListeners(TRADING_EVENTS.STRATEGY_DELETED, data);
      });

      socketService.on(TRADING_EVENTS.STRATEGY_STATUS_CHANGED, (data) => {
        this.notifyListeners(TRADING_EVENTS.STRATEGY_STATUS_CHANGED, data);
      });

      socketService.on(TRADING_EVENTS.STRATEGY_PERFORMANCE_UPDATE, (data) => {
        this.notifyListeners(TRADING_EVENTS.STRATEGY_PERFORMANCE_UPDATE, data);
      });
    }
  }

  /**
   * Notify all listeners of a specific event
   */
  private notifyListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }

  /**
   * Add a listener for a specific event
   */
  public addListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    // Return cleanup function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Fetch all strategies
   */
  public async getStrategies(): Promise<any[]> {
    console.log('StrategyService: Fetching strategies...');
    try {
      // First try the API endpoint
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies`);
      if (response.ok) {
        const data = await response.json();
        console.log('StrategyService: Successfully fetched strategies from API:', data.length);
        return data;
      }
      
      console.log('StrategyService: API fetch failed, falling back to socket...');
      
      // If API fails, try socket with a reduced timeout
      if (socketService.isConnected) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log('StrategyService: Socket request for strategies timed out, using mock data');
            // On timeout, return mock data instead of rejecting
            resolve(this.getMockStrategies());
          }, 5000); // Reduced timeout from 10s to 5s
          
          socketService.emit(TRADING_EVENTS.GET_STRATEGIES, (err: any, data: any) => {
            clearTimeout(timeout);
            if (err) {
              console.error('StrategyService: Socket error fetching strategies:', err);
              // On error, return mock data instead of rejecting
              resolve(this.getMockStrategies());
            } else {
              console.log('StrategyService: Successfully fetched strategies from socket:', data?.length || 0);
              resolve(data || []);
            }
          });
        });
      }
      
      // If neither API nor socket works, return mock data
      console.log('StrategyService: Socket not connected, using mock data');
      return this.getMockStrategies();
    } catch (err) {
      console.error('StrategyService: Error fetching strategies:', err);
      // On exception, return mock data instead of rejecting
      return this.getMockStrategies();
    }
  }
  
  /**
   * Get mock strategies for development and offline mode
   */
  private getMockStrategies(): any[] {
    console.log('StrategyService: Returning mock strategies');
    return [
      {
        id: 'mock-strategy-1',
        name: 'BTC Momentum',
        status: 'active',
        performance: 8.2,
        description: 'Bitcoin momentum strategy with trend following',
        markets: ['BTC/USDT'],
        timeframe: '4h',
        created: new Date().toISOString(),
      },
      {
        id: 'mock-strategy-2',
        name: 'ETH Scalping',
        status: 'paused',
        performance: 4.7,
        description: 'Ethereum short-term scalping with mean reversion',
        markets: ['ETH/USDT'],
        timeframe: '15m',
        created: new Date().toISOString(),
      },
      {
        id: 'mock-strategy-3',
        name: 'Multi-Asset Trend',
        status: 'active',
        performance: 12.3,
        description: 'Multi-asset trend following with dynamic allocation',
        markets: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
        timeframe: '1h',
        created: new Date().toISOString(),
      }
    ];
  }

  /**
   * Create a new strategy
   */
  public async createStrategy(strategy: StrategyTemplate): Promise<Strategy> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(strategy),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create strategy: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating strategy:', error);
      // Fallback to socket request
      return new Promise((resolve, reject) => {
        socketService.emit(TRADING_EVENTS.CREATE_STRATEGY, strategy, (data: any) => {
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });
    }
  }

  /**
   * Update an existing strategy
   */
  public async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update strategy: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating strategy:', error);
      // Fallback to socket request
      return new Promise((resolve, reject) => {
        socketService.emit(TRADING_EVENTS.UPDATE_STRATEGY, { id, ...updates }, (data: any) => {
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });
    }
  }

  /**
   * Delete a strategy
   */
  public async deleteStrategy(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting strategy:', error);
      // Fallback to socket request
      return new Promise((resolve) => {
        socketService.emit(TRADING_EVENTS.DELETE_STRATEGY, { id }, (success: boolean) => {
          resolve(success);
        });
      });
    }
  }

  /**
   * Change strategy status (active, paused, inactive)
   */
  public async changeStrategyStatus(id: string, status: 'active' | 'paused' | 'inactive'): Promise<Strategy> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to change strategy status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error changing strategy status:', error);
      // Fallback to socket request
      return new Promise((resolve, reject) => {
        socketService.emit(TRADING_EVENTS.CHANGE_STRATEGY_STATUS, { id, status }, (data: any) => {
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });
    }
  }

  /**
   * Get performance data for a strategy
   */
  public async getStrategyPerformance(id: string): Promise<PerformanceData[]> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${id}/performance`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch strategy performance: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching strategy performance:', error);
      // Return mock performance data
      return this.getMockPerformanceData(id);
    }
  }
  
  /**
   * Get mock performance data for development
   */
  private getMockPerformanceData(id: string): PerformanceData[] {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 30 days of data
    
    const data: PerformanceData[] = [];
    let cumulativeReturn = 0;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate random daily return between -1.5% and +2%
      const dailyReturn = (Math.random() * 3.5 - 1.5);
      cumulativeReturn += dailyReturn;
      
      data.push({
        date: date.toISOString(),
        dailyReturn: dailyReturn,
        cumulativeReturn: cumulativeReturn
      });
    }
    
    return data;
  }

  /**
   * Assign a strategy to one or more agents
   */
  public async assignStrategyToAgents(
    strategyId: string, 
    assignments: Array<{
      agentId: string, 
      riskLevel: 'low' | 'medium' | 'high',
      allocation: number
    }>
  ): Promise<boolean> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${strategyId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to assign strategy: ${response.status}`);
      }
      
      // Notify agents through socket
      assignments.forEach(assignment => {
        socketService.emit(TRADING_EVENTS.ASSIGN_STRATEGY, {
          strategyId,
          agentId: assignment.agentId,
          riskLevel: assignment.riskLevel,
          allocation: assignment.allocation
        });
      });
      
      return true;
    } catch (error) {
      console.error('Error assigning strategy to agents:', error);
      // For development, simulate success even on error
      if (process.env.NODE_ENV === 'development') {
        // Still emit the socket events in dev mode for testing
        assignments.forEach(assignment => {
          socketService.emit(TRADING_EVENTS.ASSIGN_STRATEGY, {
            strategyId,
            agentId: assignment.agentId,
            riskLevel: assignment.riskLevel,
            allocation: assignment.allocation
          });
        });
        return true;
      }
      throw error;
    }
  }
  
  /**
   * Get agents assigned to a strategy
   */
  public async getStrategyAgents(strategyId: string): Promise<any[]> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${strategyId}/agents`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch strategy agents: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching strategy agents:', error);
      // Return mock data
      return this.getMockStrategyAgents(strategyId);
    }
  }
  
  /**
   * Get mock strategy agents for development
   */
  private getMockStrategyAgents(strategyId: string): any[] {
    return [
      {
        id: 'agent-1',
        name: 'Alpha Trader',
        riskLevel: 'medium',
        allocation: 25,
        status: 'active',
        performance: 6.4
      },
      {
        id: 'agent-2',
        name: 'Beta Scanner',
        riskLevel: 'high',
        allocation: 15,
        status: 'active',
        performance: 9.2
      }
    ];
  }
  
  /**
   * Remove an agent from a strategy
   */
  public async removeAgentFromStrategy(strategyId: string, agentId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${STRATEGY_API_ENDPOINT}/api/strategies/${strategyId}/agents/${agentId}`, 
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to remove agent from strategy: ${response.status}`);
      }
      
      // Notify via socket
      socketService.emit(TRADING_EVENTS.UNASSIGN_STRATEGY, {
        strategyId,
        agentId
      });
      
      return true;
    } catch (error) {
      console.error('Error removing agent from strategy:', error);
      // For development, still emit socket event
      if (process.env.NODE_ENV === 'development') {
        socketService.emit(TRADING_EVENTS.UNASSIGN_STRATEGY, {
          strategyId,
          agentId
        });
        return true;
      }
      throw error;
    }
  }
  
  /**
   * Run a backtest for a strategy
   */
  public async runBacktest(
    strategyId: string, 
    params: {
      startDate: string,
      endDate: string,
      leverage?: number,
      initialCapital?: number
    }
  ): Promise<any> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${strategyId}/backtest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to run backtest: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error running backtest:', error);
      // Return mock backtest results
      return this.getMockBacktestResults(strategyId);
    }
  }
  
  /**
   * Get mock backtest results
   */
  private getMockBacktestResults(strategyId: string): any {
    return {
      id: `backtest-${Date.now()}`,
      strategyId,
      performance: {
        netProfit: 12.8,
        maxDrawdown: 5.2,
        sharpeRatio: 1.85,
        tradesCount: 32,
        winRate: 68.75,
        avgWin: 1.2,
        avgLoss: -0.8,
        profitFactor: 2.4
      },
      trades: Array(32).fill(0).map((_, i) => ({
        id: `trade-${i}`,
        timestamp: new Date(Date.now() - (32 - i) * 24 * 60 * 60 * 1000).toISOString(),
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        price: 30000 + Math.random() * 10000,
        size: 0.01 + Math.random() * 0.05,
        profit: Math.random() > 0.3 ? (Math.random() * 100) : -(Math.random() * 60),
        duration: Math.floor(Math.random() * 8 * 60) + 'min'
      }))
    };
  }
  
  /**
   * Update strategy status (active, paused, inactive)
   */
  public async updateStrategyStatus(id: string, status: string): Promise<Strategy> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update strategy status: ${response.status}`);
      }
      
      const updatedStrategy = await response.json();
      
      // Notify via socket
      socketService.emit(TRADING_EVENTS.STRATEGY_STATUS_CHANGED, {
        id,
        status
      });
      
      return updatedStrategy;
    } catch (error) {
      console.error('Error updating strategy status:', error);
      
      // For development, simulate a successful update
      if (process.env.NODE_ENV === 'development') {
        console.log(`DEV MODE: Simulating status change for strategy ${id} to ${status}`);
        
        // Find the strategy in our mock data and update its status
        const mockStrategies = this.getMockStrategies();
        const mockStrategy = mockStrategies.find(s => s.id === id);
        
        if (mockStrategy) {
          mockStrategy.status = status;
          mockStrategy.updatedAt = new Date().toISOString();
          
          // Still emit the socket event in dev mode
          socketService.emit(TRADING_EVENTS.STRATEGY_STATUS_CHANGED, {
            id,
            status
          });
          
          // Make sure we return a complete Strategy object with all required properties
          return {
            id: mockStrategy.id,
            name: mockStrategy.name,
            description: mockStrategy.description || '',
            status: mockStrategy.status,
            type: mockStrategy.type || 'custom',
            timeframe: mockStrategy.timeframe || '1h',
            performance: mockStrategy.performance || 0,
            marketIds: mockStrategy.marketIds || [],
            createdAt: mockStrategy.createdAt || new Date().toISOString(),
            updatedAt: mockStrategy.updatedAt || new Date().toISOString(),
            activeTrades: mockStrategy.activeTrades || 0,
            totalTrades: mockStrategy.totalTrades || 0,
            winRate: mockStrategy.winRate || 0
          };
        }
      }
      
      throw error;
    }
  }

  /**
   * Get available strategy templates
   */
  public async getStrategyTemplates(): Promise<StrategyTemplate[]> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/templates`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch strategy templates: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching strategy templates:', error);
      // Fallback to socket request
      return new Promise((resolve) => {
        socketService.emit(TRADING_EVENTS.GET_STRATEGY_TEMPLATES, {}, (data: StrategyTemplate[]) => {
          resolve(data);
        });
      });
    }
  }

  /**
   * Get data about strategy types and configurations
   */
  public async getStrategyTypes(): Promise<StrategyType[]> {
    try {
      const response = await fetch(`${STRATEGY_API_ENDPOINT}/api/strategies/types`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch strategy types: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching strategy types:', error);
      // Fallback to socket request
      return new Promise((resolve) => {
        socketService.emit(TRADING_EVENTS.GET_STRATEGY_TYPES, {}, (data: StrategyType[]) => {
          resolve(data);
        });
      });
    }
  }
}

export const strategyService = StrategyService.getInstance();
