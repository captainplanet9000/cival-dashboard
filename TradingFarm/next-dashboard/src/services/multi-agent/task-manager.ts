import { RedisCacheService, CacheNamespace, CacheExpiration } from '@/utils/redis/cache-service';
import { RedisPubSubService, PubSubChannel } from '@/utils/redis/pubsub-service';
import { getRedisClient } from '@/utils/redis/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  Task, 
  TaskPriority, 
  TaskStatus, 
  TaskType, 
  TaskResult,
  TASK_CAPABILITIES 
} from './types';
import { createServerClient } from '@/utils/supabase/server';

/**
 * TaskManager
 * Handles task creation, storage, retrieval, and lifecycle management
 */
export class TaskManager {
  private static instance: TaskManager;
  private cache: RedisCacheService;
  private pubsub: RedisPubSubService;
  private redisClient: any;
  
  private constructor() {
    this.cache = new RedisCacheService();
    this.pubsub = new RedisPubSubService();
    this.redisClient = getRedisClient();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }
  
  /**
   * Create a new task
   */
  public async createTask(
    type: TaskType,
    farmId: string,
    description: string,
    parameters: Record<string, any>,
    priority: TaskPriority = TaskPriority.MEDIUM,
    deadline?: number,
    parentTaskId?: string,
    requiredCapabilities?: string[]
  ): Promise<Task> {
    // Generate unique task ID
    const taskId = `task_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Get capabilities required for this task type if not explicitly provided
    const capabilities = requiredCapabilities || TASK_CAPABILITIES[type] || [];
    
    // Create task object
    const task: Task = {
      id: taskId,
      type,
      priority,
      farmId,
      description,
      parameters,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parentTaskId,
      requiredCapabilities: capabilities,
    };
    
    if (deadline) {
      task.deadline = deadline;
    }
    
    // Store task in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `task_${taskId}`,
      task,
      deadline ? (deadline - Date.now()) : CacheExpiration.DAY
    );
    
    // Add to pending tasks sorted set (score is priority * 1000000 + timestamp for sorting)
    await this.redisClient.zadd(
      `trading-farm:farm:${farmId}:pending_tasks`, 
      priority * 1000000 + Date.now(),
      taskId
    );
    
    // Publish task creation event
    await this.pubsub.publish(
      PubSubChannel.FARM_UPDATES,
      farmId,
      {
        type: 'task_created',
        farmId,
        taskId,
        taskType: type,
        priority,
        timestamp: Date.now(),
      }
    );
    
    // If this is a subtask, update parent task
    if (parentTaskId) {
      await this.addSubtaskToParent(parentTaskId, taskId);
    }
    
    // Store in database for persistence
    try {
      const supabase = await createServerClient();
      await supabase.from('farm_tasks').insert({
        id: taskId,
        farm_id: farmId,
        task_type: type,
        description,
        parameters: parameters,
        priority: priority,
        status: TaskStatus.PENDING,
        parent_task_id: parentTaskId || null,
        required_capabilities: capabilities,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
    } catch (error) {
      console.error('Failed to store task in database:', error);
    }
    
    return task;
  }
  
  /**
   * Update task status
   */
  public async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: any,
    error?: string,
    progress?: number
  ): Promise<Task | null> {
    // Get current task
    const task = await this.getTask(taskId);
    
    if (!task) {
      console.error(`Cannot update status for non-existent task: ${taskId}`);
      return null;
    }
    
    // Update task object
    const updatedTask: Task = {
      ...task,
      status,
      updatedAt: Date.now(),
    };
    
    if (result !== undefined) {
      updatedTask.result = result;
    }
    
    if (error !== undefined) {
      updatedTask.error = error;
    }
    
    if (progress !== undefined) {
      updatedTask.progress = progress;
    }
    
    // Store updated task in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `task_${taskId}`,
      updatedTask,
      task.deadline ? (task.deadline - Date.now()) : CacheExpiration.DAY
    );
    
    // Update task status in appropriate Redis sorted sets
    const oldStatusSet = `trading-farm:farm:${task.farmId}:${task.status}_tasks`;
    const newStatusSet = `trading-farm:farm:${task.farmId}:${status}_tasks`;
    
    // Remove from old status set
    await this.redisClient.zrem(oldStatusSet, taskId);
    
    // Add to new status set
    await this.redisClient.zadd(
      newStatusSet,
      task.priority * 1000000 + Date.now(),
      taskId
    );
    
    // Publish task update event
    await this.pubsub.publish(
      PubSubChannel.FARM_UPDATES,
      task.farmId,
      {
        type: 'task_updated',
        farmId: task.farmId,
        taskId,
        previousStatus: task.status,
        newStatus: status,
        timestamp: Date.now(),
      }
    );
    
    // If assigned to agents, notify them about the update
    if (task.assignedTo && task.assignedTo.length > 0) {
      for (const agentId of task.assignedTo) {
        await this.pubsub.publishAgentAction(
          agentId,
          'task_update',
          {
            taskId,
            status,
            result,
            error,
            progress,
            timestamp: Date.now(),
          }
        );
      }
    }
    
    // Update in database
    try {
      const supabase = await createServerClient();
      await supabase.from('farm_tasks').update({
        status: status,
        result: result || null,
        error: error || null,
        progress: progress || null,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId);
    } catch (error) {
      console.error('Failed to update task in database:', error);
    }
    
    return updatedTask;
  }
  
  /**
   * Get task by ID
   */
  public async getTask(taskId: string): Promise<Task | null> {
    return await this.cache.get<Task>(CacheNamespace.FARM_STATE, `task_${taskId}`);
  }
  
  /**
   * Assign task to agents
   */
  public async assignTaskToAgents(
    taskId: string,
    agentIds: string[]
  ): Promise<boolean> {
    // Get current task
    const task = await this.getTask(taskId);
    
    if (!task) {
      console.error(`Cannot assign non-existent task: ${taskId}`);
      return false;
    }
    
    // Update task with assigned agents
    const updatedTask: Task = {
      ...task,
      assignedTo: agentIds,
      status: TaskStatus.ASSIGNED,
      updatedAt: Date.now(),
    };
    
    // Store updated task in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `task_${taskId}`,
      updatedTask,
      task.deadline ? (task.deadline - Date.now()) : CacheExpiration.DAY
    );
    
    // Update task status in Redis sorted sets
    await this.redisClient.zrem(`trading-farm:farm:${task.farmId}:${task.status}_tasks`, taskId);
    await this.redisClient.zadd(
      `trading-farm:farm:${task.farmId}:assigned_tasks`,
      task.priority * 1000000 + Date.now(),
      taskId
    );
    
    // For each agent, add task to their assigned tasks
    for (const agentId of agentIds) {
      await this.redisClient.zadd(
        `trading-farm:agent:${agentId}:assigned_tasks`,
        task.priority * 1000000 + Date.now(),
        taskId
      );
      
      // Notify agent about task assignment
      await this.pubsub.publishAgentAction(
        agentId,
        'task_assigned',
        {
          taskId,
          taskType: task.type,
          parameters: task.parameters,
          priority: task.priority,
          deadline: task.deadline,
          timestamp: Date.now(),
        }
      );
    }
    
    // Update in database
    try {
      const supabase = await createServerClient();
      await supabase.from('farm_tasks').update({
        status: TaskStatus.ASSIGNED,
        assigned_to: agentIds,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId);
      
      // Create agent task assignments
      for (const agentId of agentIds) {
        await supabase.from('agent_task_assignments').insert({
          agent_id: agentId,
          task_id: taskId,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
        });
      }
    } catch (error) {
      console.error('Failed to update task assignment in database:', error);
    }
    
    return true;
  }
  
  /**
   * Submit task result from an agent
   */
  public async submitTaskResult(taskResult: TaskResult): Promise<boolean> {
    const { taskId, agentId, status, result, error, completedAt } = taskResult;
    
    // Get current task
    const task = await this.getTask(taskId);
    
    if (!task) {
      console.error(`Cannot submit result for non-existent task: ${taskId}`);
      return false;
    }
    
    // Verify agent is assigned to this task
    if (!task.assignedTo?.includes(agentId)) {
      console.error(`Agent ${agentId} is not assigned to task ${taskId}`);
      return false;
    }
    
    // Update task with result
    await this.updateTaskStatus(taskId, status, result, error);
    
    // Remove task from agent's assigned tasks
    await this.redisClient.zrem(
      `trading-farm:agent:${agentId}:assigned_tasks`,
      taskId
    );
    
    // Add to agent's completed tasks
    await this.redisClient.zadd(
      `trading-farm:agent:${agentId}:completed_tasks`,
      completedAt,
      taskId
    );
    
    // Update agent task assignment in database
    try {
      const supabase = await createServerClient();
      await supabase.from('agent_task_assignments').update({
        status: status.toLowerCase(),
        completed_at: new Date(completedAt).toISOString(),
        result: result || null,
        error: error || null,
      }).eq('agent_id', agentId).eq('task_id', taskId);
    } catch (error) {
      console.error('Failed to update agent task assignment in database:', error);
    }
    
    return true;
  }
  
  /**
   * Get pending tasks for a farm
   */
  public async getPendingTasks(farmId: string, limit: number = 10): Promise<Task[]> {
    // Get task IDs from sorted set
    const taskIds = await this.redisClient.zrevrange(
      `trading-farm:farm:${farmId}:pending_tasks`,
      0,
      limit - 1
    );
    
    if (!taskIds || taskIds.length === 0) {
      return [];
    }
    
    // Get task details
    const tasks: Task[] = [];
    
    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }
    
    return tasks;
  }
  
  /**
   * Get tasks by status for a farm
   */
  public async getTasksByStatus(farmId: string, status: TaskStatus, limit: number = 10): Promise<Task[]> {
    // Get task IDs from sorted set
    const taskIds = await this.redisClient.zrevrange(
      `trading-farm:farm:${farmId}:${status}_tasks`,
      0,
      limit - 1
    );
    
    if (!taskIds || taskIds.length === 0) {
      return [];
    }
    
    // Get task details
    const tasks: Task[] = [];
    
    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }
    
    return tasks;
  }
  
  /**
   * Get assigned tasks for an agent
   */
  public async getAgentTasks(agentId: string, limit: number = 10): Promise<Task[]> {
    // Get task IDs from sorted set
    const taskIds = await this.redisClient.zrevrange(
      `trading-farm:agent:${agentId}:assigned_tasks`,
      0,
      limit - 1
    );
    
    if (!taskIds || taskIds.length === 0) {
      return [];
    }
    
    // Get task details
    const tasks: Task[] = [];
    
    for (const taskId of taskIds) {
      const task = await this.getTask(taskId);
      if (task) {
        tasks.push(task);
      }
    }
    
    return tasks;
  }
  
  /**
   * Add subtask to parent task
   */
  private async addSubtaskToParent(parentTaskId: string, subtaskId: string): Promise<void> {
    // Get parent task
    const parentTask = await this.getTask(parentTaskId);
    
    if (!parentTask) {
      console.error(`Parent task ${parentTaskId} not found for subtask ${subtaskId}`);
      return;
    }
    
    // Update subtask IDs array
    const subtaskIds = parentTask.subtaskIds || [];
    subtaskIds.push(subtaskId);
    
    // Update parent task
    const updatedTask: Task = {
      ...parentTask,
      subtaskIds,
      updatedAt: Date.now(),
    };
    
    // Store updated task in cache
    await this.cache.set(
      CacheNamespace.FARM_STATE,
      `task_${parentTaskId}`,
      updatedTask,
      parentTask.deadline ? (parentTask.deadline - Date.now()) : CacheExpiration.DAY
    );
    
    // Update in database
    try {
      const supabase = await createServerClient();
      await supabase.from('farm_tasks').update({
        subtask_ids: subtaskIds,
        updated_at: new Date().toISOString(),
      }).eq('id', parentTaskId);
    } catch (error) {
      console.error('Failed to update parent task in database:', error);
    }
  }
  
  /**
   * Check and update status of expired tasks
   */
  public async processExpiredTasks(): Promise<number> {
    const now = Date.now();
    let expiredCount = 0;
    
    try {
      // Get all pending and assigned tasks with deadlines
      const pendingKeys = await this.redisClient.keys('trading-farm:farm:*:pending_tasks');
      const assignedKeys = await this.redisClient.keys('trading-farm:farm:*:assigned_tasks');
      
      const allKeys = [...pendingKeys, ...assignedKeys];
      
      for (const key of allKeys) {
        // Get task IDs from sorted set
        const taskIds = await this.redisClient.zrange(key, 0, -1);
        
        for (const taskId of taskIds) {
          const task = await this.getTask(taskId);
          
          if (task && task.deadline && task.deadline < now) {
            // Task has expired
            await this.updateTaskStatus(
              task.id,
              TaskStatus.EXPIRED,
              null,
              'Task deadline expired'
            );
            expiredCount++;
          }
        }
      }
      
      return expiredCount;
    } catch (error) {
      console.error('Error processing expired tasks:', error);
      return 0;
    }
  }
}
