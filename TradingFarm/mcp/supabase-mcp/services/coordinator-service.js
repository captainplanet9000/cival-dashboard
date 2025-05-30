/**
 * Agent Coordinator Service
 * 
 * Implements the central coordinator that oversees all specialized trading agents.
 * Responsible for task assignment, workflow orchestration, and agent management.
 */

const { executeQuery } = require('../supabase-client');
const logger = require('../logger');
const { TABLES } = require('../config');
const { 
  TaskTypes, 
  TaskStatus,
  AgentSpecializations,
  WorkflowTypes,
  validateTaskAssignment,
  validateWorkflow,
  formatTaskAssignment,
  formatWorkflow
} = require('../models/agent-coordinator-model');

/**
 * Create a new task assignment
 * @param {Object} taskData - Task assignment data
 * @returns {Promise<Object>} Created task assignment
 */
async function createTaskAssignment(taskData) {
  try {
    // Validate the task data
    const validationResult = validateTaskAssignment(taskData);
    if (!validationResult.isValid) {
      throw new Error(`Invalid task data: ${validationResult.errors.join(', ')}`);
    }
    
    // Format the record for storage
    const formattedTask = formatTaskAssignment(taskData);
    
    // Store the task in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.agentTaskAssignments)
        .insert(formattedTask)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to create task assignment: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error('No task assignment was created');
    }
    
    // Notify the agent about the task
    await notifyAgentAboutTask(result.data[0]);
    
    logger.info(`Created task assignment: ${result.data[0].id} (${formattedTask.task_type})`);
    return result.data[0];
  } catch (error) {
    logger.error(`Error in createTaskAssignment: ${error.message}`);
    throw error;
  }
}

/**
 * Update a task assignment status
 * @param {string} taskId - ID of the task assignment
 * @param {Object} updateData - Update data with status and results
 * @returns {Promise<Object>} Updated task assignment
 */
async function updateTaskStatus(taskId, updateData) {
  try {
    // Validate status if provided
    if (updateData.status && !Object.values(TaskStatus).includes(updateData.status)) {
      throw new Error(`Invalid status: ${updateData.status}`);
    }
    
    // Prepare update object
    const update = {
      updated_at: new Date().toISOString()
    };
    
    if (updateData.status) {
      update.status = updateData.status;
      
      // Set completed time if task is completed
      if (updateData.status === TaskStatus.COMPLETED) {
        update.completed_at = new Date().toISOString();
      }
    }
    
    if (updateData.parameters) update.parameters = updateData.parameters;
    if (updateData.metadata) update.metadata = updateData.metadata;
    
    // Update the task in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.agentTaskAssignments)
        .update(update)
        .eq('id', taskId)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to update task assignment: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error(`Task assignment not found: ${taskId}`);
    }
    
    // Handle task status change
    if (updateData.status) {
      await handleTaskStatusChange(result.data[0]);
    }
    
    logger.info(`Updated task assignment: ${taskId} to status ${updateData.status || 'unchanged'}`);
    return result.data[0];
  } catch (error) {
    logger.error(`Error in updateTaskStatus: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new workflow
 * @param {Object} workflowData - Workflow data
 * @returns {Promise<Object>} Created workflow
 */
async function createWorkflow(workflowData) {
  try {
    // Validate the workflow data
    const validationResult = validateWorkflow(workflowData);
    if (!validationResult.isValid) {
      throw new Error(`Invalid workflow data: ${validationResult.errors.join(', ')}`);
    }
    
    // Format the record for storage
    const formattedWorkflow = formatWorkflow(workflowData);
    
    // Store the workflow in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.agentWorkflows)
        .insert(formattedWorkflow)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to create workflow: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error('No workflow was created');
    }
    
    // If the workflow is sequential, start the first task
    if (formattedWorkflow.workflow_type === WorkflowTypes.SEQUENTIAL && 
        formattedWorkflow.tasks && 
        formattedWorkflow.tasks.length > 0) {
      await startNextWorkflowTask(result.data[0]);
    }
    
    // If the workflow is parallel, start all tasks
    if (formattedWorkflow.workflow_type === WorkflowTypes.PARALLEL && 
        formattedWorkflow.tasks && 
        formattedWorkflow.tasks.length > 0) {
      await startParallelWorkflowTasks(result.data[0]);
    }
    
    logger.info(`Created workflow: ${result.data[0].id} (${formattedWorkflow.name})`);
    return result.data[0];
  } catch (error) {
    logger.error(`Error in createWorkflow: ${error.message}`);
    throw error;
  }
}

/**
 * Get tasks by status or agent
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Task assignments
 */
async function getTasks(filters = {}) {
  try {
    // Build query based on filters
    const result = await executeQuery((client) => {
      let query = client.from(TABLES.agentTaskAssignments).select('*');
      
      // Apply filters
      if (filters.task_id) {
        query = query.eq('task_id', filters.task_id);
      }
      
      if (filters.agent_id) {
        query = query.eq('agent_id', filters.agent_id);
      }
      
      if (filters.task_type) {
        query = query.eq('task_type', filters.task_type);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      
      // Sorting and pagination
      query = query.order('priority', { ascending: true })
                  .order('created_at', { ascending: true });
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
      
      return query;
    });
    
    if (result.error) {
      throw new Error(`Failed to fetch tasks: ${result.error.message}`);
    }
    
    return result.data || [];
  } catch (error) {
    logger.error(`Error in getTasks: ${error.message}`);
    throw error;
  }
}

/**
 * Find agent by specialization
 * @param {string} specialization - Agent specialization to find
 * @param {Object} options - Additional options for filtering
 * @returns {Promise<Object>} Best matching agent
 */
async function findAgentBySpecialization(specialization, options = {}) {
  try {
    // Query agents with the requested specialization
    const result = await executeQuery((client) => {
      // In a real implementation, this would query the agent registry
      // For now, we'll simulate with a mock response
      
      // This would be a real query in production:
      // return client.from('agent_registry')
      //   .select('*')
      //   .eq('specialization', specialization)
      //   .eq('status', 'active')
      //   .order('performance_metrics->success_rate', { ascending: false })
      //   .limit(1);
      
      // Simulated response for development
      return {
        data: [{
          id: 'sim123',
          agent_id: `agent_${specialization}_1`,
          name: `${specialization.charAt(0).toUpperCase() + specialization.slice(1)} Agent`,
          specialization: specialization,
          status: 'active',
          performance_metrics: {
            success_rate: 0.85,
            tasks_completed: 120,
            avg_completion_time: 45.2
          }
        }],
        error: null
      };
    });
    
    if (result.error) {
      throw new Error(`Failed to find agent: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      logger.warn(`No agent found with specialization: ${specialization}`);
      return null;
    }
    
    return result.data[0];
  } catch (error) {
    logger.error(`Error in findAgentBySpecialization: ${error.message}`);
    throw error;
  }
}

/**
 * Assign task to best matching agent
 * @param {Object} taskData - Task data without agent_id
 * @returns {Promise<Object>} Created task assignment
 */
async function assignTaskToAgent(taskData) {
  try {
    if (!taskData.task_type) {
      throw new Error('Task type is required');
    }
    
    // Determine which specialization is needed for this task type
    const specialization = mapTaskTypeToSpecialization(taskData.task_type);
    
    // Find the best agent for this specialization
    const agent = await findAgentBySpecialization(specialization);
    
    if (!agent) {
      throw new Error(`No suitable agent found for task type: ${taskData.task_type}`);
    }
    
    // Assign the task to the selected agent
    taskData.agent_id = agent.agent_id;
    
    // Create the task assignment
    return await createTaskAssignment(taskData);
  } catch (error) {
    logger.error(`Error in assignTaskToAgent: ${error.message}`);
    throw error;
  }
}

/**
 * Map task type to agent specialization
 * @param {string} taskType - Task type from TaskTypes enum
 * @returns {string} Matching specialization from AgentSpecializations enum
 * @private
 */
function mapTaskTypeToSpecialization(taskType) {
  // Map from task types to the specialization that handles them
  const taskToSpecializationMap = {
    [TaskTypes.MARKET_ANALYSIS]: AgentSpecializations.MARKET_ANALYSIS,
    [TaskTypes.TRADE_EXECUTION]: AgentSpecializations.EXECUTION,
    [TaskTypes.RISK_MANAGEMENT]: AgentSpecializations.RISK_MANAGEMENT,
    [TaskTypes.PORTFOLIO_BALANCING]: AgentSpecializations.PORTFOLIO_OPTIMIZATION,
    [TaskTypes.STRATEGY_OPTIMIZATION]: AgentSpecializations.GENERAL,
    [TaskTypes.DATA_COLLECTION]: AgentSpecializations.GENERAL,
    [TaskTypes.SYSTEM_MAINTENANCE]: AgentSpecializations.GENERAL,
    [TaskTypes.PERFORMANCE_REPORTING]: AgentSpecializations.GENERAL
  };
  
  return taskToSpecializationMap[taskType] || AgentSpecializations.GENERAL;
}

/**
 * Notify agent about a new task
 * @param {Object} task - Task assignment
 * @returns {Promise<void>}
 * @private
 */
async function notifyAgentAboutTask(task) {
  try {
    // In a real implementation, this would send a message to the agent
    // For now, we just log the notification
    logger.info(`Notifying agent ${task.agent_id} about task ${task.task_id}`);
    
    // This would be implemented using the message queue in production
    // For example:
    // await messageQueueService.sendMessage({
    //   sender_id: 'coordinator',
    //   recipient_id: task.agent_id,
    //   message_type: MessageTypes.COMMAND,
    //   delivery_mode: DeliveryModes.DIRECT,
    //   payload: {
    //     command: 'PROCESS_TASK',
    //     task_id: task.task_id,
    //     task_data: task
    //   }
    // });
  } catch (error) {
    logger.error(`Error notifying agent about task: ${error.message}`);
  }
}

/**
 * Handle task status changes
 * @param {Object} task - Updated task
 * @returns {Promise<void>}
 * @private
 */
async function handleTaskStatusChange(task) {
  try {
    if (task.status === TaskStatus.COMPLETED) {
      logger.info(`Task ${task.task_id} completed by agent ${task.agent_id}`);
      
      // Check if this task is part of a workflow
      const workflows = await getWorkflowsContainingTask(task.task_id);
      
      for (const workflow of workflows) {
        // Update workflow progress
        await updateWorkflowProgress(workflow, task);
      }
    } else if (task.status === TaskStatus.FAILED) {
      logger.warn(`Task ${task.task_id} failed by agent ${task.agent_id}`);
      
      // Handle task failure (retries, notifications, etc.)
      await handleTaskFailure(task);
    }
  } catch (error) {
    logger.error(`Error handling task status change: ${error.message}`);
  }
}

/**
 * Get workflows containing a specific task
 * @param {string} taskId - Task ID to look for
 * @returns {Promise<Array>} Workflows containing this task
 * @private
 */
async function getWorkflowsContainingTask(taskId) {
  try {
    // This is a simplification - in a real implementation, we'd query the workflows table
    // and search for the task ID in the tasks array
    const result = await executeQuery((client) => 
      client.from(TABLES.agentWorkflows)
        .select('*')
        .filter('tasks', 'cs', `{"task_id":"${taskId}"}`));
    
    if (result.error) {
      throw new Error(`Failed to fetch workflows: ${result.error.message}`);
    }
    
    return result.data || [];
  } catch (error) {
    logger.error(`Error getting workflows containing task: ${error.message}`);
    return [];
  }
}

/**
 * Start the next task in a sequential workflow
 * @param {Object} workflow - Workflow object
 * @returns {Promise<void>}
 * @private
 */
async function startNextWorkflowTask(workflow) {
  try {
    if (workflow.workflow_type !== WorkflowTypes.SEQUENTIAL) {
      return;
    }
    
    // Find the first incomplete task
    const nextTask = workflow.tasks.find(task => {
      // Check if the task exists in our task assignments
      // If not, it hasn't been started yet
      return !task.completed;
    });
    
    if (nextTask) {
      // Create a task assignment for this task
      await createTaskAssignment({
        task_id: nextTask.task_id,
        task_type: nextTask.task_type,
        parameters: nextTask.parameters || {},
        priority: nextTask.priority || 3,
        metadata: {
          workflow_id: workflow.workflow_id,
          workflow_step: workflow.tasks.indexOf(nextTask)
        }
      });
    } else {
      // All tasks completed - update workflow status
      await updateWorkflowStatus(workflow.id, 'completed');
    }
  } catch (error) {
    logger.error(`Error starting next workflow task: ${error.message}`);
  }
}

/**
 * Start all tasks in a parallel workflow
 * @param {Object} workflow - Workflow object
 * @returns {Promise<void>}
 * @private
 */
async function startParallelWorkflowTasks(workflow) {
  try {
    if (workflow.workflow_type !== WorkflowTypes.PARALLEL) {
      return;
    }
    
    // Start all tasks in parallel
    const taskPromises = workflow.tasks.map(task => {
      return createTaskAssignment({
        task_id: task.task_id,
        task_type: task.task_type,
        parameters: task.parameters || {},
        priority: task.priority || 3,
        metadata: {
          workflow_id: workflow.workflow_id,
          workflow_step: workflow.tasks.indexOf(task)
        }
      });
    });
    
    await Promise.all(taskPromises);
  } catch (error) {
    logger.error(`Error starting parallel workflow tasks: ${error.message}`);
  }
}

/**
 * Update workflow progress based on completed task
 * @param {Object} workflow - Workflow object
 * @param {Object} completedTask - Completed task
 * @returns {Promise<void>}
 * @private
 */
async function updateWorkflowProgress(workflow, completedTask) {
  try {
    // Mark the task as completed in the workflow
    const updatedTasks = workflow.tasks.map(task => {
      if (task.task_id === completedTask.task_id) {
        return {
          ...task,
          completed: true,
          completed_at: completedTask.completed_at
        };
      }
      return task;
    });
    
    // Update the workflow with the new tasks array
    await executeQuery((client) => 
      client.from(TABLES.agentWorkflows)
        .update({
          tasks: updatedTasks,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflow.id));
    
    // For sequential workflows, start the next task
    if (workflow.workflow_type === WorkflowTypes.SEQUENTIAL) {
      // Get the updated workflow
      const updatedWorkflow = {
        ...workflow,
        tasks: updatedTasks
      };
      
      await startNextWorkflowTask(updatedWorkflow);
    }
    
    // Check if all tasks are completed
    const allCompleted = updatedTasks.every(task => task.completed);
    
    if (allCompleted) {
      // Mark the workflow as completed
      await updateWorkflowStatus(workflow.id, 'completed');
    }
  } catch (error) {
    logger.error(`Error updating workflow progress: ${error.message}`);
  }
}

/**
 * Update a workflow's status
 * @param {string} workflowId - Workflow ID
 * @param {string} status - New status
 * @returns {Promise<void>}
 * @private
 */
async function updateWorkflowStatus(workflowId, status) {
  try {
    await executeQuery((client) => 
      client.from(TABLES.agentWorkflows)
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId));
    
    logger.info(`Updated workflow ${workflowId} status to ${status}`);
  } catch (error) {
    logger.error(`Error updating workflow status: ${error.message}`);
  }
}

/**
 * Handle a failed task
 * @param {Object} task - Failed task
 * @returns {Promise<void>}
 * @private
 */
async function handleTaskFailure(task) {
  try {
    // Check if we should retry
    if (task.retries < task.max_retries) {
      // Increment retries and set status back to CREATED
      await executeQuery((client) => 
        client.from(TABLES.agentTaskAssignments)
          .update({
            status: TaskStatus.CREATED,
            retries: task.retries + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id));
      
      logger.info(`Retrying task ${task.task_id} (attempt ${task.retries + 1} of ${task.max_retries})`);
    } else {
      logger.warn(`Task ${task.task_id} failed after ${task.retries} retries`);
      
      // Check if this task is part of a workflow
      const workflows = await getWorkflowsContainingTask(task.task_id);
      
      for (const workflow of workflows) {
        // Update workflow status to failed
        await updateWorkflowStatus(workflow.id, 'failed');
      }
    }
  } catch (error) {
    logger.error(`Error handling task failure: ${error.message}`);
  }
}

module.exports = {
  createTaskAssignment,
  updateTaskStatus,
  createWorkflow,
  getTasks,
  findAgentBySpecialization,
  assignTaskToAgent,
  TaskTypes,
  TaskStatus,
  AgentSpecializations,
  WorkflowTypes
}; 