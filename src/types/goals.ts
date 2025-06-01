export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'missed';

export type GoalType = 'profit' | 'roi' | 'trade_count' | 'win_rate' | 'custom';

export type MetricCalculation = 'absolute' | 'percentage' | 'count' | 'ratio' | 'custom';

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  goal_type: GoalType;
  status: GoalStatus;
  target_value: number | null;
  current_value: number | null;
  progress_percentage: number;
  metric_calculation: MetricCalculation;
  start_date: string | null;
  target_date: string | null;
  farm_id: string | null;
  agent_id: string | null;
  parent_goal_id: string | null;
  archived: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExtendedGoal extends Goal {
  farm_name?: string;
  agent_name?: string;
  parent?: {
    id: string;
    name: string;
  };
  subgoals?: Goal[];
  history?: GoalHistory[];
}

export interface GoalHistory {
  id: string;
  goal_id: string;
  value: number;
  progress_percentage: number;
  recorded_at: string;
  metadata: Record<string, any>;
}

export interface CreateGoalRequest {
  name: string;
  description: string;
  goal_type: GoalType;
  target_value: number;
  metric_calculation: MetricCalculation;
  start_date: string;
  target_date: string;
  farm_id: string;
  agent_id: string;
  parent_goal_id: string;
  metadata: Record<string, any>;
}

export interface UpdateGoalRequest {
  name?: string;
  description?: string;
  goal_type?: GoalType;
  status?: GoalStatus;
  target_value?: number;
  current_value?: number;
  progress_percentage?: number;
  metric_calculation?: MetricCalculation;
  start_date?: string;
  target_date?: string;
  farm_id?: string;
  agent_id?: string;
  parent_goal_id?: string;
  archived?: boolean;
  metadata?: Record<string, any>;
}

export interface GoalFilters {
  status?: GoalStatus[];
  goalType?: GoalType[];
  farmId?: string;
  agentId?: string;
  includeArchived?: boolean;
  includeCompleted?: boolean;
  searchQuery?: string;
} 