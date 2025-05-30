import { Database } from './database.types';

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'missed';
export type GoalType = 'profit' | 'roi' | 'trade_count' | 'win_rate' | 'custom';
export type MetricCalculation = 'absolute' | 'percentage' | 'count' | 'ratio' | 'custom';

// Base Goal type from database schema
export type Goal = Database['public']['Tables']['goals']['Row'];

// Extended Goal with additional info like farm name, agent name
export interface ExtendedGoal extends Goal {
  farm_name?: string;
  agent_name?: string;
  history?: GoalHistory[];
  children?: ExtendedGoal[];
  parent?: ExtendedGoal;
  timeRemaining?: string; // Calculated field for display
  trendDirection?: 'up' | 'down' | 'flat'; // Calculated from history
  projectedCompletion?: Date; // Calculated based on progress trend
}

// Goal History type from database schema
export type GoalHistory = Database['public']['Tables']['goal_history']['Row'];

// New goal request for creating a goal
export interface CreateGoalRequest {
  name: string;
  description?: string;
  target_value: number;
  start_date?: Date | string;
  target_date?: Date | string;
  goal_type: GoalType;
  metric_calculation?: MetricCalculation;
  farm_id?: string;
  agent_id?: string;
  parent_goal_id?: string;
  metadata?: Record<string, any>;
}

// Update goal request for modifying a goal
export interface UpdateGoalRequest {
  name?: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  progress_percentage?: number;
  start_date?: Date | string;
  target_date?: Date | string;
  status?: GoalStatus;
  goal_type?: GoalType;
  metric_calculation?: MetricCalculation;
  farm_id?: string;
  agent_id?: string;
  parent_goal_id?: string;
  metadata?: Record<string, any>;
  archived?: boolean;
}

// Goal progress statistics
export interface GoalProgress {
  goalId: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDuration: number;
  changeRate: number; // Value change per day
  projectedValue: number; // Projected final value at current rate
  projectedCompletionDate: Date | null; // When goal is expected to be reached
  isBehindSchedule: boolean; // Whether progress is behind linear expectation
  trendsData: {
    dates: string[];
    values: number[];
    progressPercentages: number[];
  };
}

// Goal filter options
export interface GoalFilters {
  status?: GoalStatus[];
  goalType?: GoalType[];
  farmId?: string;
  agentId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  includeArchived?: boolean;
  includeCompleted?: boolean;
}

// Goal performance summary
export interface GoalPerformanceSummary {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  notStartedGoals: number;
  missedGoals: number;
  completionRate: number; // Percentage of completed goals
  averageProgress: number; // Average progress across all goals
  onTrackPercentage: number; // Percentage of goals that are on track
}

// Goal notification settings
export interface GoalNotificationSettings {
  milestones: boolean; // 25%, 50%, 75%, 100%
  completion: boolean; // When goal is completed
  approaching: boolean; // When approaching target date
  missed: boolean; // When goal is missed
  thresholds: {
    approaching: number; // Days before target date to notify
    milestones: number[]; // Custom milestone percentages
  };
} 