/**
 * Mock Farm Goals and Tasks Data
 * Complements the main mock data for the Trading Farm
 */

// Farm goals
export const mockGoals = [
  {
    id: 'goal-1',
    farm_id: 'farm-1',
    title: 'Maximize BTC/ETH ratio trading',
    description: 'Capitalize on the BTC/ETH ratio fluctuations to maximize BTC holdings',
    status: 'active',
    priority: 'high',
    type: 'trading',
    target_metric: 'btc_holdings',
    target_value: 2.5,
    current_value: 1.25,
    start_date: '2025-02-01T00:00:00Z',
    end_date: '2025-05-01T00:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    assigned_agents: ['agent-1', 'agent-3'],
    metrics: {
      progress: 50,
      success_probability: 75,
      roi_estimate: 22.5
    }
  },
  {
    id: 'goal-2',
    farm_id: 'farm-1',
    title: 'Stablecoin yield optimization',
    description: 'Maximize yield from stablecoin holdings through strategic allocation',
    status: 'active',
    priority: 'medium',
    type: 'yield',
    target_metric: 'annual_percentage_yield',
    target_value: 8.5,
    current_value: 6.2,
    start_date: '2025-03-01T00:00:00Z',
    end_date: '2025-06-01T00:00:00Z',
    created_at: '2025-02-25T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z',
    assigned_agents: ['agent-4'],
    metrics: {
      progress: 35,
      success_probability: 90,
      roi_estimate: 8.5
    }
  },
  {
    id: 'goal-3',
    farm_id: 'farm-2',
    title: 'Market volatility hedging',
    description: 'Implement cross-asset hedging strategies to reduce portfolio volatility',
    status: 'active',
    priority: 'high',
    type: 'hedging',
    target_metric: 'portfolio_volatility',
    target_value: 15,
    current_value: 23.8,
    start_date: '2025-02-15T00:00:00Z',
    end_date: '2025-04-15T00:00:00Z',
    created_at: '2025-02-10T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z',
    assigned_agents: ['agent-2', 'agent-5'],
    metrics: {
      progress: 65,
      success_probability: 80,
      roi_estimate: -2.5 // Negative ROI but reduced volatility
    }
  },
  {
    id: 'goal-4',
    farm_id: 'farm-2',
    title: 'Arbitrage opportunity monitoring',
    description: 'Develop and deploy cross-exchange arbitrage monitoring system',
    status: 'planning',
    priority: 'medium',
    type: 'arbitrage',
    target_metric: 'monthly_arbitrage_profit',
    target_value: 5000,
    current_value: 0,
    start_date: '2025-04-15T00:00:00Z',
    end_date: '2025-07-15T00:00:00Z',
    created_at: '2025-03-30T00:00:00Z',
    updated_at: '2025-03-30T00:00:00Z',
    assigned_agents: [],
    metrics: {
      progress: 0,
      success_probability: 65,
      roi_estimate: 15.0
    }
  },
  {
    id: 'goal-5',
    farm_id: 'farm-1',
    title: 'SOL accumulation strategy',
    description: 'Strategic accumulation of SOL during market dips using ML predictions',
    status: 'completed',
    priority: 'medium',
    type: 'accumulation',
    target_metric: 'sol_holdings',
    target_value: 500,
    current_value: 520,
    start_date: '2025-01-05T00:00:00Z',
    end_date: '2025-03-05T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-03-06T00:00:00Z',
    assigned_agents: ['agent-3'],
    metrics: {
      progress: 100,
      success_probability: 100,
      roi_estimate: 18.3
    }
  }
];

// Tasks for each goal
export const mockTasks = [
  // Tasks for Goal 1
  {
    id: 'task-1-1',
    goal_id: 'goal-1',
    title: 'Set up BTC/ETH ratio monitoring',
    description: 'Configure alerts and monitoring for the BTC/ETH ratio',
    status: 'completed',
    priority: 'high',
    assigned_agent: 'agent-1',
    start_date: '2025-02-01T00:00:00Z',
    due_date: '2025-02-07T00:00:00Z',
    completed_date: '2025-02-05T00:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-02-05T00:00:00Z'
  },
  {
    id: 'task-1-2',
    goal_id: 'goal-1',
    title: 'Develop ratio trading algorithm',
    description: 'Create algorithm to determine optimal trade timing based on ratio thresholds',
    status: 'completed',
    priority: 'high',
    assigned_agent: 'agent-3',
    start_date: '2025-02-08T00:00:00Z',
    due_date: '2025-02-25T00:00:00Z',
    completed_date: '2025-02-23T00:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-02-23T00:00:00Z'
  },
  {
    id: 'task-1-3',
    goal_id: 'goal-1',
    title: 'Test algorithm with historical data',
    description: 'Backtest ratio trading algorithm against historical market data',
    status: 'completed',
    priority: 'medium',
    assigned_agent: 'agent-1',
    start_date: '2025-02-24T00:00:00Z',
    due_date: '2025-03-10T00:00:00Z',
    completed_date: '2025-03-08T00:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-03-08T00:00:00Z'
  },
  {
    id: 'task-1-4',
    goal_id: 'goal-1',
    title: 'Deploy live trading system',
    description: 'Deploy ratio trading algorithm to live environment with safety limits',
    status: 'in_progress',
    priority: 'high',
    assigned_agent: 'agent-3',
    start_date: '2025-03-11T00:00:00Z',
    due_date: '2025-03-25T00:00:00Z',
    completed_date: null,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  },
  {
    id: 'task-1-5',
    goal_id: 'goal-1',
    title: 'Optimize trading parameters',
    description: 'Fine-tune algorithm parameters based on live performance data',
    status: 'not_started',
    priority: 'medium',
    assigned_agent: 'agent-1',
    start_date: '2025-03-26T00:00:00Z',
    due_date: '2025-04-15T00:00:00Z',
    completed_date: null,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z'
  },

  // Tasks for Goal 2
  {
    id: 'task-2-1',
    goal_id: 'goal-2',
    title: 'Research yield opportunities',
    description: 'Analyze current stablecoin yield opportunities across DeFi protocols',
    status: 'completed',
    priority: 'high',
    assigned_agent: 'agent-4',
    start_date: '2025-03-01T00:00:00Z',
    due_date: '2025-03-10T00:00:00Z',
    completed_date: '2025-03-09T00:00:00Z',
    created_at: '2025-02-25T00:00:00Z',
    updated_at: '2025-03-09T00:00:00Z'
  },
  {
    id: 'task-2-2',
    goal_id: 'goal-2',
    title: 'Risk assessment of protocols',
    description: 'Evaluate risk profiles of identified yield opportunities',
    status: 'completed',
    priority: 'high',
    assigned_agent: 'agent-4',
    start_date: '2025-03-11T00:00:00Z',
    due_date: '2025-03-20T00:00:00Z',
    completed_date: '2025-03-18T00:00:00Z',
    created_at: '2025-02-25T00:00:00Z',
    updated_at: '2025-03-18T00:00:00Z'
  },
  {
    id: 'task-2-3',
    goal_id: 'goal-2',
    title: 'Create allocation strategy',
    description: 'Develop optimal allocation strategy across multiple yield sources',
    status: 'in_progress',
    priority: 'medium',
    assigned_agent: 'agent-4',
    start_date: '2025-03-21T00:00:00Z',
    due_date: '2025-04-05T00:00:00Z',
    completed_date: null,
    created_at: '2025-02-25T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z'
  },

  // Tasks for Goal 3
  {
    id: 'task-3-1',
    goal_id: 'goal-3',
    title: 'Portfolio volatility analysis',
    description: 'Analyze historical volatility patterns of current portfolio assets',
    status: 'completed',
    priority: 'high',
    assigned_agent: 'agent-2',
    start_date: '2025-02-15T00:00:00Z',
    due_date: '2025-02-25T00:00:00Z',
    completed_date: '2025-02-23T00:00:00Z',
    created_at: '2025-02-10T00:00:00Z',
    updated_at: '2025-02-23T00:00:00Z'
  },
  {
    id: 'task-3-2',
    goal_id: 'goal-3',
    title: 'Identify hedge instruments',
    description: 'Identify optimal instruments for hedging crypto portfolio volatility',
    status: 'completed',
    priority: 'medium',
    assigned_agent: 'agent-5',
    start_date: '2025-02-26T00:00:00Z',
    due_date: '2025-03-10T00:00:00Z',
    completed_date: '2025-03-08T00:00:00Z',
    created_at: '2025-02-10T00:00:00Z',
    updated_at: '2025-03-08T00:00:00Z'
  },
  {
    id: 'task-3-3',
    goal_id: 'goal-3',
    title: 'Implement hedging strategy',
    description: 'Deploy automated hedging strategy with dynamic hedge ratios',
    status: 'in_progress',
    priority: 'high',
    assigned_agent: 'agent-2',
    start_date: '2025-03-11T00:00:00Z',
    due_date: '2025-03-25T00:00:00Z',
    completed_date: null,
    created_at: '2025-02-10T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z'
  }
];

// Progress metrics for goals over time
export const mockGoalProgressHistory = [
  // Goal 1 progress history
  {
    goal_id: 'goal-1',
    timestamp: '2025-02-15T00:00:00Z',
    progress: 10,
    current_value: 1.1,
    notes: 'Initial monitoring setup complete'
  },
  {
    goal_id: 'goal-1',
    timestamp: '2025-03-01T00:00:00Z',
    progress: 25,
    current_value: 1.15,
    notes: 'Algorithm development completed'
  },
  {
    goal_id: 'goal-1',
    timestamp: '2025-03-15T00:00:00Z',
    progress: 40,
    current_value: 1.2,
    notes: 'Backtesting shows promising results'
  },
  {
    goal_id: 'goal-1',
    timestamp: '2025-04-01T00:00:00Z',
    progress: 50,
    current_value: 1.25,
    notes: 'Live trading initiation phase'
  },
  
  // Goal 2 progress history
  {
    goal_id: 'goal-2',
    timestamp: '2025-03-10T00:00:00Z',
    progress: 15,
    current_value: 5.5,
    notes: 'Research phase completed'
  },
  {
    goal_id: 'goal-2',
    timestamp: '2025-03-20T00:00:00Z',
    progress: 25,
    current_value: 5.8,
    notes: 'Risk assessment completed'
  },
  {
    goal_id: 'goal-2',
    timestamp: '2025-04-01T00:00:00Z',
    progress: 35,
    current_value: 6.2,
    notes: 'Initial allocations made to tested protocols'
  },
  
  // Goal 3 progress history
  {
    goal_id: 'goal-3',
    timestamp: '2025-02-25T00:00:00Z',
    progress: 20,
    current_value: 25.0,
    notes: 'Completed volatility analysis'
  },
  {
    goal_id: 'goal-3',
    timestamp: '2025-03-10T00:00:00Z',
    progress: 45,
    current_value: 24.5,
    notes: 'Hedge instruments identified and tested'
  },
  {
    goal_id: 'goal-3',
    timestamp: '2025-03-25T00:00:00Z',
    progress: 65,
    current_value: 23.8,
    notes: 'Initial hedge positions established'
  }
];

// Agent-to-goal assignment history
export const mockAgentAssignments = [
  {
    id: 'assignment-1',
    agent_id: 'agent-1',
    goal_id: 'goal-1',
    assigned_at: '2025-01-16T00:00:00Z',
    assigned_by: 'mock-user-1',
    status: 'active',
    contribution_score: 85
  },
  {
    id: 'assignment-2',
    agent_id: 'agent-3',
    goal_id: 'goal-1',
    assigned_at: '2025-01-20T00:00:00Z',
    assigned_by: 'mock-user-1',
    status: 'active',
    contribution_score: 90
  },
  {
    id: 'assignment-3',
    agent_id: 'agent-4',
    goal_id: 'goal-2',
    assigned_at: '2025-02-26T00:00:00Z',
    assigned_by: 'mock-user-1',
    status: 'active',
    contribution_score: 95
  },
  {
    id: 'assignment-4',
    agent_id: 'agent-2',
    goal_id: 'goal-3',
    assigned_at: '2025-02-12T00:00:00Z',
    assigned_by: 'mock-user-1',
    status: 'active',
    contribution_score: 80
  },
  {
    id: 'assignment-5',
    agent_id: 'agent-5',
    goal_id: 'goal-3',
    assigned_at: '2025-02-15T00:00:00Z',
    assigned_by: 'mock-user-1',
    status: 'active',
    contribution_score: 75
  },
  {
    id: 'assignment-6',
    agent_id: 'agent-3',
    goal_id: 'goal-5',
    assigned_at: '2025-01-02T00:00:00Z',
    assigned_by: 'mock-user-1',
    status: 'completed',
    contribution_score: 100
  }
];

// Helper function to get tasks by goal ID
export function getTasksByGoalId(goalId: string) {
  return mockTasks.filter(task => task.goal_id === goalId);
}

// Helper function to get progress history by goal ID
export function getProgressHistoryByGoalId(goalId: string) {
  return mockGoalProgressHistory.filter(entry => entry.goal_id === goalId);
}

// Helper function to get agent assignments by goal ID
export function getAgentAssignmentsByGoalId(goalId: string) {
  return mockAgentAssignments.filter(assignment => assignment.goal_id === goalId);
}

// Helper function to get goals by farm ID
export function getGoalsByFarmId(farmId: string) {
  return mockGoals.filter(goal => goal.farm_id === farmId);
}
