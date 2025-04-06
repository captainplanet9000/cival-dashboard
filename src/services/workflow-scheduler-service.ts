import { FarmAgent } from './farm/farm-service';
import { WorkflowType } from '@/components/agents/AgentWorkflow';

// Schedule frequency options
export type ScheduleFrequency = 
  | 'ONCE' 
  | 'HOURLY' 
  | 'DAILY' 
  | 'WEEKLY' 
  | 'MONTHLY' 
  | 'CUSTOM';

// Schedule definition
export interface WorkflowSchedule {
  id: string;
  name: string;
  description?: string;
  agentId: number | string;
  workflowId: string;
  workflowType: WorkflowType;
  input: string;
  frequency: ScheduleFrequency;
  cronExpression?: string; // For CUSTOM frequency
  nextRunTime: Date;
  lastRunTime?: Date;
  lastResult?: {
    success: boolean;
    result?: string;
    error?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Schedule creation parameters
export interface CreateScheduleParams {
  name: string;
  description?: string;
  agentId: number | string;
  workflowId: string;
  workflowType: WorkflowType;
  input: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  runImmediately?: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * WorkflowSchedulerService - Manages scheduling and execution of agent workflows
 */
class WorkflowSchedulerService {
  private static instance: WorkflowSchedulerService;
  private schedules: WorkflowSchedule[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): WorkflowSchedulerService {
    if (!WorkflowSchedulerService.instance) {
      WorkflowSchedulerService.instance = new WorkflowSchedulerService();
    }
    return WorkflowSchedulerService.instance;
  }

  /**
   * Create a new workflow schedule
   * @param params Schedule parameters
   */
  public async createSchedule(params: CreateScheduleParams): Promise<WorkflowSchedule> {
    try {
      // In a real implementation, this would make an API call to create a schedule
      // For now, we'll create a mock schedule
      
      const nextRunTime = this.calculateNextRunTime(
        params.frequency, 
        params.cronExpression, 
        params.startDate
      );
      
      const newSchedule: WorkflowSchedule = {
        id: crypto.randomUUID(),
        name: params.name,
        description: params.description,
        agentId: params.agentId,
        workflowId: params.workflowId,
        workflowType: params.workflowType,
        input: params.input,
        frequency: params.frequency,
        cronExpression: params.cronExpression,
        nextRunTime,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add to local cache
      this.schedules.push(newSchedule);
      
      // If runImmediately is true, trigger execution now
      if (params.runImmediately) {
        this.executeScheduledWorkflow(newSchedule.id).catch(err => {
          console.error('Error executing immediate workflow:', err);
        });
      }
      
      return newSchedule;
    } catch (error: any) {
      console.error('Error creating workflow schedule:', error);
      throw new Error(`Failed to create workflow schedule: ${error.message}`);
    }
  }

  /**
   * Get all workflow schedules
   */
  public async getSchedules(): Promise<WorkflowSchedule[]> {
    try {
      // In a real implementation, this would fetch schedules from an API
      return this.schedules;
    } catch (error: any) {
      console.error('Error fetching workflow schedules:', error);
      throw new Error(`Failed to fetch workflow schedules: ${error.message}`);
    }
  }

  /**
   * Get workflow schedules for a specific agent
   * @param agentId The ID of the agent to get schedules for
   */
  public async getSchedulesForAgent(agentId: number | string): Promise<WorkflowSchedule[]> {
    try {
      // Filter schedules by agent ID
      return this.schedules.filter(schedule => schedule.agentId === agentId);
    } catch (error: any) {
      console.error(`Error fetching workflow schedules for agent ${agentId}:`, error);
      throw new Error(`Failed to fetch workflow schedules for agent: ${error.message}`);
    }
  }

  /**
   * Get a specific workflow schedule by ID
   * @param scheduleId The ID of the schedule to get
   */
  public async getScheduleById(scheduleId: string): Promise<WorkflowSchedule | undefined> {
    try {
      return this.schedules.find(schedule => schedule.id === scheduleId);
    } catch (error: any) {
      console.error(`Error fetching workflow schedule ${scheduleId}:`, error);
      throw new Error(`Failed to fetch workflow schedule: ${error.message}`);
    }
  }

  /**
   * Update a workflow schedule
   * @param scheduleId The ID of the schedule to update
   * @param updates The updates to apply
   */
  public async updateSchedule(
    scheduleId: string, 
    updates: Partial<Omit<WorkflowSchedule, 'id' | 'createdAt'>>
  ): Promise<WorkflowSchedule> {
    try {
      const scheduleIndex = this.schedules.findIndex(s => s.id === scheduleId);
      
      if (scheduleIndex === -1) {
        throw new Error(`Schedule with ID ${scheduleId} not found`);
      }
      
      // Update schedule
      const updatedSchedule = {
        ...this.schedules[scheduleIndex],
        ...updates,
        updatedAt: new Date()
      };
      
      // If frequency or cron expression changed, recalculate next run time
      if (updates.frequency || updates.cronExpression) {
        updatedSchedule.nextRunTime = this.calculateNextRunTime(
          updatedSchedule.frequency,
          updatedSchedule.cronExpression
        );
      }
      
      this.schedules[scheduleIndex] = updatedSchedule;
      
      return updatedSchedule;
    } catch (error: any) {
      console.error(`Error updating workflow schedule ${scheduleId}:`, error);
      throw new Error(`Failed to update workflow schedule: ${error.message}`);
    }
  }

  /**
   * Delete a workflow schedule
   * @param scheduleId The ID of the schedule to delete
   */
  public async deleteSchedule(scheduleId: string): Promise<boolean> {
    try {
      const initialLength = this.schedules.length;
      this.schedules = this.schedules.filter(s => s.id !== scheduleId);
      
      return initialLength > this.schedules.length;
    } catch (error: any) {
      console.error(`Error deleting workflow schedule ${scheduleId}:`, error);
      throw new Error(`Failed to delete workflow schedule: ${error.message}`);
    }
  }

  /**
   * Activate a workflow schedule
   * @param scheduleId The ID of the schedule to activate
   */
  public async activateSchedule(scheduleId: string): Promise<WorkflowSchedule> {
    return this.updateSchedule(scheduleId, { 
      isActive: true,
      nextRunTime: this.calculateNextRunTime('ONCE') // Calculate next run time from now
    });
  }

  /**
   * Deactivate a workflow schedule
   * @param scheduleId The ID of the schedule to deactivate
   */
  public async deactivateSchedule(scheduleId: string): Promise<WorkflowSchedule> {
    return this.updateSchedule(scheduleId, { isActive: false });
  }

  /**
   * Manually trigger execution of a scheduled workflow
   * @param scheduleId The ID of the schedule to execute
   */
  public async executeScheduledWorkflow(scheduleId: string): Promise<{
    success: boolean;
    result?: string;
    error?: string;
  }> {
    try {
      const schedule = await this.getScheduleById(scheduleId);
      
      if (!schedule) {
        throw new Error(`Schedule with ID ${scheduleId} not found`);
      }
      
      console.log(`Executing scheduled workflow: ${schedule.name} (${scheduleId})`);
      
      // In a real implementation, this would call the workflow execution API
      // For now, we'll simulate execution with a mock result
      const mockResult: {
        success: boolean;
        result?: string;
        error?: string;
      } = {
        success: Math.random() > 0.2, // 80% chance of success
        result: schedule.workflowType === 'MARKET_ANALYSIS' 
          ? 'Market analysis completed. Bullish trend detected for BTC. Resistance at $52,500.'
          : schedule.workflowType === 'RISK_ASSESSMENT'
          ? 'Risk assessment completed. Portfolio volatility: 12.5%. Correlation between BTC and ETH: 0.72.'
          : schedule.workflowType === 'TRADE_EXECUTION'
          ? 'Trade executed successfully. Bought 0.12 BTC at $51,350. Fee: 0.0012 BTC.'
          : 'Portfolio rebalanced. Current allocation: BTC (40.1%), ETH (30.2%), SOL (19.8%), USDC (9.9%).'
      };
      
      // Add random error for failed executions
      if (!mockResult.success) {
        const errors = [
          'Insufficient balance for trade execution',
          'Exchange API rate limit exceeded',
          'Network connectivity issues',
          'Authentication failed'
        ];
        mockResult.error = errors[Math.floor(Math.random() * errors.length)];
        mockResult.result = undefined; // Remove result for failed executions
      }
      
      // Update schedule with execution result
      const lastRunTime = new Date();
      const nextRunTime = this.calculateNextRunTime(
        schedule.frequency,
        schedule.cronExpression,
        lastRunTime
      );
      
      await this.updateSchedule(scheduleId, {
        lastRunTime,
        nextRunTime,
        lastResult: mockResult
      });
      
      return mockResult;
    } catch (error: any) {
      console.error(`Error executing scheduled workflow ${scheduleId}:`, error);
      
      // Update schedule with error
      const schedule = await this.getScheduleById(scheduleId);
      if (schedule) {
        const lastRunTime = new Date();
        const nextRunTime = this.calculateNextRunTime(
          schedule.frequency,
          schedule.cronExpression,
          lastRunTime
        );
        
        await this.updateSchedule(scheduleId, {
          lastRunTime,
          nextRunTime,
          lastResult: {
            success: false,
            error: error.message || 'Unknown error during execution'
          }
        });
      }
      
      return {
        success: false,
        error: error.message || 'Failed to execute scheduled workflow'
      };
    }
  }

  /**
   * Calculate the next run time based on frequency and optional cron expression
   * @param frequency The schedule frequency
   * @param cronExpression Optional cron expression for CUSTOM frequency
   * @param fromDate Optional date to calculate from (defaults to now)
   */
  private calculateNextRunTime(
    frequency: ScheduleFrequency,
    cronExpression?: string,
    fromDate?: Date
  ): Date {
    const now = fromDate || new Date();
    const nextRun = new Date(now);
    
    switch (frequency) {
      case 'ONCE':
        // For one-time schedules, set next run time to now + 1 minute
        nextRun.setMinutes(nextRun.getMinutes() + 1);
        break;
      case 'HOURLY':
        // Set to the next hour
        nextRun.setHours(nextRun.getHours() + 1);
        nextRun.setMinutes(0);
        nextRun.setSeconds(0);
        break;
      case 'DAILY':
        // Set to tomorrow at the same time
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'WEEKLY':
        // Set to next week on the same day and time
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'MONTHLY':
        // Set to next month on the same day and time
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'CUSTOM':
        // For custom schedules with cron expressions, we'd parse the cron expression
        // Since this is complex, we'll just add a random time between 1 hour and 1 day
        const randomHours = Math.floor(Math.random() * 24) + 1;
        nextRun.setHours(nextRun.getHours() + randomHours);
        break;
    }
    
    return nextRun;
  }

  /**
   * Get due schedules that should be executed now
   */
  public async getDueSchedules(): Promise<WorkflowSchedule[]> {
    const now = new Date();
    return this.schedules.filter(schedule => 
      schedule.isActive && 
      schedule.nextRunTime <= now
    );
  }

  /**
   * Process all due schedules (would be called by a cron job in a real implementation)
   */
  public async processDueSchedules(): Promise<void> {
    try {
      const dueSchedules = await this.getDueSchedules();
      
      console.log(`Found ${dueSchedules.length} due schedules`);
      
      // Execute each due schedule
      for (const schedule of dueSchedules) {
        console.log(`Processing due schedule: ${schedule.name} (${schedule.id})`);
        
        try {
          await this.executeScheduledWorkflow(schedule.id);
        } catch (error) {
          console.error(`Failed to execute schedule ${schedule.id}:`, error);
          // Continue with next schedule even if one fails
        }
      }
    } catch (error) {
      console.error('Error processing due schedules:', error);
    }
  }
}

// Export singleton instance
export const workflowSchedulerService = WorkflowSchedulerService.getInstance(); 