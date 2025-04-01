import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { 
  AgentMessage, 
  AgentRole, 
  AgentTask, 
  CoordinationProtocol,
  CoordinationStrategy,
  MessagePriority,
  MessageType,
  AgentConflict,
  ResourceAllocation
} from '../../types/agent-coordination';

export class AgentCoordinationService {
  private supabase;
  private messageHandlers: Map<string, (message: AgentMessage) => Promise<void>> = new Map();
  private activeProtocols: Map<string, CoordinationProtocol> = new Map();
  private pendingTasks: Map<string, AgentTask> = new Map();
  private resourceAllocations: Map<string, ResourceAllocation[]> = new Map();
  private lastHeartbeats: Map<string, number> = new Map();
  private messageQueue: AgentMessage[] = [];
  private isProcessingQueue = false;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Start periodic tasks
    this.startPeriodicTasks();
  }

  /**
   * Register a message handler for a specific agent
   */
  public registerMessageHandler(agentId: string, handler: (message: AgentMessage) => Promise<void>) {
    this.messageHandlers.set(agentId, handler);
  }

  /**
   * Unregister a message handler
   */
  public unregisterMessageHandler(agentId: string) {
    this.messageHandlers.delete(agentId);
  }

  /**
   * Send a message from one agent to another
   */
  public async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const newMessage: AgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
      status: 'sent'
    };

    // Store message in database
    await this.supabase
      .from('agent_messages')
      .insert([newMessage]);
    
    // Add to processing queue
    this.messageQueue.push(newMessage);
    this.processMessageQueue();
    
    // Record metrics
    await this.updateAgentMetrics(newMessage.senderId, 'messagesSent');
    if (newMessage.recipientId) {
      await this.updateAgentMetrics(newMessage.recipientId, 'messagesReceived');
    }
    
    return newMessage.id;
  }

  /**
   * Process the message queue asynchronously
   */
  private async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (!message) continue;
        
        // Handle direct messages
        if (message.recipientId && this.messageHandlers.has(message.recipientId)) {
          const handler = this.messageHandlers.get(message.recipientId);
          if (handler) {
            await handler(message);
            
            // Update message status
            await this.supabase
              .from('agent_messages')
              .update({ status: 'delivered' })
              .eq('id', message.id);
          }
        } 
        // Handle role-based messages
        else if (message.recipientRole) {
          // Find all agents with the given role
          const { data: agents } = await this.supabase
            .from('agents')
            .select('id')
            .eq('role', message.recipientRole);
          
          if (agents && agents.length > 0) {
            for (const agent of agents) {
              if (this.messageHandlers.has(agent.id)) {
                const handler = this.messageHandlers.get(agent.id);
                if (handler) {
                  await handler(message);
                }
              }
            }
            
            // Update message status
            await this.supabase
              .from('agent_messages')
              .update({ status: 'delivered' })
              .eq('id', message.id);
          }
        }
        // Handle broadcast messages
        else if (message.type === MessageType.BROADCAST) {
          for (const [agentId, handler] of this.messageHandlers.entries()) {
            // Don't send broadcast back to sender
            if (agentId !== message.senderId) {
              await handler(message);
            }
          }
          
          // Update message status
          await this.supabase
            .from('agent_messages')
            .update({ status: 'delivered' })
            .eq('id', message.id);
        }
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessingQueue = false;
      
      // If more messages arrived during processing, process them
      if (this.messageQueue.length > 0) {
        this.processMessageQueue();
      }
    }
  }

  /**
   * Update agent metrics
   */
  private async updateAgentMetrics(agentId: string, metricType: string) {
    // Get current metrics or create new ones
    const { data: metrics } = await this.supabase
      .from('agent_coordination_metrics')
      .select('*')
      .eq('agentId', agentId)
      .single();
    
    if (metrics) {
      // Update existing metrics
      const updates: any = {
        updatedAt: Date.now()
      };
      
      updates[metricType] = (metrics[metricType] || 0) + 1;
      
      await this.supabase
        .from('agent_coordination_metrics')
        .update(updates)
        .eq('agentId', agentId);
    } else {
      // Create new metrics
      const newMetrics: any = {
        agentId,
        messagesSent: 0,
        messagesReceived: 0,
        tasksAssigned: 0,
        tasksCompleted: 0,
        conflictsInitiated: 0,
        conflictsResolved: 0,
        collaborationScore: 50,
        decisionQualityScore: 50,
        responseTimeAverage: 0,
        updatedAt: Date.now()
      };
      
      newMetrics[metricType] = 1;
      
      await this.supabase
        .from('agent_coordination_metrics')
        .insert([newMetrics]);
    }
  }

  /**
   * Create and register a coordination protocol
   */
  public async createProtocol(protocol: Omit<CoordinationProtocol, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newProtocol: CoordinationProtocol = {
      ...protocol,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Store protocol in database
    await this.supabase
      .from('coordination_protocols')
      .insert([newProtocol]);
    
    // Add to active protocols
    if (newProtocol.active) {
      this.activeProtocols.set(newProtocol.id, newProtocol);
    }
    
    return newProtocol.id;
  }

  /**
   * Assign a task to an agent
   */
  public async assignTask(task: Omit<AgentTask, 'id' | 'status' | 'startedAt' | 'completedAt'>): Promise<string> {
    const newTask: AgentTask = {
      ...task,
      id: uuidv4(),
      status: 'pending',
      startedAt: undefined,
      completedAt: undefined
    };
    
    // Store task in database
    await this.supabase
      .from('agent_tasks')
      .insert([newTask]);
    
    // Add to pending tasks
    this.pendingTasks.set(newTask.id, newTask);
    
    // Update metrics
    await this.updateAgentMetrics(newTask.assignedAgentId, 'tasksAssigned');
    
    // Notify agent about new task
    await this.sendMessage({
      senderId: 'system',
      senderName: 'System',
      senderRole: AgentRole.COORDINATOR,
      recipientId: newTask.assignedAgentId,
      type: MessageType.COMMAND,
      priority: MessagePriority.HIGH,
      content: JSON.stringify(newTask),
      requiresAcknowledgment: true,
      requiresResponse: true,
      metadata: { taskId: newTask.id }
    });
    
    return newTask.id;
  }

  /**
   * Update a task's status
   */
  public async updateTaskStatus(taskId: string, status: AgentTask['status'], result?: any, error?: string): Promise<void> {
    const updates: Partial<AgentTask> = { status };
    
    if (status === 'in_progress' && !this.pendingTasks.get(taskId)?.startedAt) {
      updates.startedAt = Date.now();
    }
    
    if (['completed', 'failed', 'canceled'].includes(status)) {
      updates.completedAt = Date.now();
      
      if (status === 'completed') {
        updates.result = result;
        
        // Get assigned agent ID
        const task = this.pendingTasks.get(taskId);
        if (task) {
          await this.updateAgentMetrics(task.assignedAgentId, 'tasksCompleted');
        }
      } else if (status === 'failed') {
        updates.error = error;
      }
    }
    
    // Update in database
    await this.supabase
      .from('agent_tasks')
      .update(updates)
      .eq('id', taskId);
    
    // Update pending tasks map
    const task = this.pendingTasks.get(taskId);
    if (task) {
      this.pendingTasks.set(taskId, { ...task, ...updates });
      
      if (['completed', 'failed', 'canceled'].includes(status)) {
        this.pendingTasks.delete(taskId);
      }
    }
  }

  /**
   * Allocate resources to an agent
   */
  public async allocateResources(allocation: Omit<ResourceAllocation, 'timestamp'>): Promise<void> {
    const newAllocation: ResourceAllocation = {
      ...allocation,
      timestamp: Date.now()
    };
    
    // Store in database
    await this.supabase
      .from('resource_allocations')
      .insert([newAllocation]);
    
    // Update resource allocations map
    const agentAllocations = this.resourceAllocations.get(allocation.agentId) || [];
    agentAllocations.push(newAllocation);
    this.resourceAllocations.set(allocation.agentId, agentAllocations);
  }

  /**
   * Record an agent heartbeat
   */
  public recordHeartbeat(agentId: string): void {
    this.lastHeartbeats.set(agentId, Date.now());
  }

  /**
   * Detect and record a conflict between agents
   */
  public async detectConflict(conflict: Omit<AgentConflict, 'id' | 'status' | 'detectedAt' | 'resolvedAt'>): Promise<string> {
    const newConflict: AgentConflict = {
      ...conflict,
      id: uuidv4(),
      status: 'detected',
      detectedAt: Date.now()
    };
    
    // Store in database
    await this.supabase
      .from('agent_conflicts')
      .insert([newConflict]);
    
    // Notify agents involved
    for (const agentId of newConflict.agentIds) {
      await this.sendMessage({
        senderId: 'system',
        senderName: 'Conflict Detector',
        senderRole: AgentRole.COORDINATOR,
        recipientId: agentId,
        type: MessageType.ALERT,
        priority: newConflict.severity === 'critical' ? MessagePriority.CRITICAL : MessagePriority.HIGH,
        content: `Conflict detected: ${newConflict.description}`,
        requiresAcknowledgment: true,
        requiresResponse: false,
        metadata: { conflictId: newConflict.id }
      });
      
      await this.updateAgentMetrics(agentId, 'conflictsInitiated');
    }
    
    return newConflict.id;
  }

  /**
   * Resolve a conflict
   */
  public async resolveConflict(conflictId: string, resolutionStrategy: string, resolvedByAgentId: string): Promise<void> {
    // Update in database
    await this.supabase
      .from('agent_conflicts')
      .update({
        status: 'resolved',
        resolutionStrategy,
        resolvedAt: Date.now()
      })
      .eq('id', conflictId);
    
    // Update metrics
    await this.updateAgentMetrics(resolvedByAgentId, 'conflictsResolved');
    
    // Get conflict details
    const { data: conflict } = await this.supabase
      .from('agent_conflicts')
      .select('*')
      .eq('id', conflictId)
      .single();
    
    if (conflict) {
      // Notify all involved agents
      for (const agentId of conflict.agentIds) {
        await this.sendMessage({
          senderId: 'system',
          senderName: 'Conflict Resolver',
          senderRole: AgentRole.COORDINATOR,
          recipientId: agentId,
          type: MessageType.NOTIFICATION,
          priority: MessagePriority.MEDIUM,
          content: `Conflict resolved: ${conflict.description} using strategy: ${resolutionStrategy}`,
          requiresAcknowledgment: false,
          requiresResponse: false,
          metadata: { conflictId }
        });
      }
    }
  }

  /**
   * Start periodic tasks for monitoring and maintenance
   */
  private startPeriodicTasks() {
    // Check for expired messages and tasks every minute
    setInterval(async () => {
      this.checkExpiredItems();
    }, 60000);
    
    // Check for inactive agents every 5 minutes
    setInterval(async () => {
      this.checkInactiveAgents();
    }, 300000);
  }

  /**
   * Check for expired messages and tasks
   */
  private async checkExpiredItems() {
    const now = Date.now();
    
    // Check for expired messages
    const { data: expiredMessages } = await this.supabase
      .from('agent_messages')
      .select('*')
      .lt('expiresAt', now)
      .not('status', 'eq', 'expired');
    
    if (expiredMessages && expiredMessages.length > 0) {
      // Mark messages as expired
      const messageIds = expiredMessages.map(msg => msg.id);
      await this.supabase
        .from('agent_messages')
        .update({ status: 'expired' })
        .in('id', messageIds);
    }
    
    // Check for expired resource allocations
    for (const [agentId, allocations] of this.resourceAllocations.entries()) {
      const validAllocations = allocations.filter(a => !a.expiresAt || a.expiresAt > now);
      this.resourceAllocations.set(agentId, validAllocations);
    }
  }

  /**
   * Check for inactive agents
   */
  private async checkInactiveAgents() {
    const now = Date.now();
    const inactiveThreshold = 10 * 60 * 1000; // 10 minutes
    
    for (const [agentId, lastHeartbeat] of this.lastHeartbeats.entries()) {
      if (now - lastHeartbeat > inactiveThreshold) {
        // Agent is inactive, notify system
        await this.sendMessage({
          senderId: 'system',
          senderName: 'Agent Monitor',
          senderRole: AgentRole.COORDINATOR,
          type: MessageType.ALERT,
          priority: MessagePriority.HIGH,
          content: `Agent ${agentId} has been inactive for more than 10 minutes`,
          requiresAcknowledgment: false,
          requiresResponse: false,
          metadata: { inactiveAgentId: agentId }
        });
      }
    }
  }
}

// Export singleton instance
export const agentCoordinationService = new AgentCoordinationService(); 