/**
 * Agent Coordinator Service
 * 
 * Business logic for the central coordinator that manages all specialized agents.
 * Handles agent registration, monitoring, and coordination of trading decisions.
 */

const { executeQuery } = require('../supabase-client');
const logger = require('../logger');
const { TABLES } = require('../config');
const { 
  AgentSpecializations, 
  AgentStatus,
  DecisionModes,
  validateAgent,
  formatAgent
} = require('../models/agent-coordinator-model');
const messageQueueService = require('./message-queue-service');
const { MessageTypes, MessagePriority } = require('../models/message-queue-model');

/**
 * Register a new agent with the coordinator
 * @param {Object} agentData - Agent registration data
 * @returns {Promise<Object>} Registered agent record
 */
async function registerAgent(agentData) {
  try {
    // Validate the agent data
    const validationResult = validateAgent(agentData);
    if (!validationResult.isValid) {
      throw new Error(`Invalid agent data: ${validationResult.errors.join(', ')}`);
    }
    
    // Check if agent already exists
    const existingAgent = await getAgentById(agentData.agent_id);
    if (existingAgent) {
      // Update existing agent instead of creating a new one
      return await updateAgent(agentData.agent_id, agentData);
    }
    
    // Format the agent record for storage
    const formattedAgent = formatAgent(agentData);
    
    // Store the agent in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.agents)
        .insert(formattedAgent)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to register agent: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error('No agent was registered');
    }
    
    logger.info(`Registered agent: ${result.data[0].agent_id} (${formattedAgent.specialization})`);
    
    // Send a registration notification to other agents
    await broadcastAgentRegistration(result.data[0]);
    
    return result.data[0];
  } catch (error) {
    logger.error(`Error in registerAgent: ${error.message}`);
    throw error;
  }
}

/**
 * Get an agent by ID
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} Agent record or null if not found
 */
async function getAgentById(agentId) {
  try {
    const result = await executeQuery((client) => 
      client.from(TABLES.agents)
        .select('*')
        .eq('agent_id', agentId)
        .single());
    
    if (result.error || !result.data) {
      return null;
    }
    
    return result.data;
  } catch (error) {
    logger.error(`Error in getAgentById: ${error.message}`);
    return null;
  }
}

/**
 * Update an existing agent
 * @param {string} agentId - Agent ID to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated agent record
 */
async function updateAgent(agentId, updateData) {
  try {
    // Get existing agent
    const existingAgent = await getAgentById(agentId);
    if (!existingAgent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Prepare update object with merged data
    const mergedData = {
      ...existingAgent,
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Validate the merged data
    const validationResult = validateAgent(mergedData);
    if (!validationResult.isValid) {
      throw new Error(`Invalid agent data: ${validationResult.errors.join(', ')}`);
    }
    
    // Format the data
    const formattedAgent = formatAgent(mergedData);
    
    // Update the agent in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.agents)
        .update(formattedAgent)
        .eq('agent_id', agentId)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to update agent: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    logger.info(`Updated agent: ${agentId}`);
    
    // If status changed, broadcast the status update
    if (updateData.status && updateData.status !== existingAgent.status) {
      await broadcastAgentStatusChange(result.data[0]);
    }
    
    return result.data[0];
  } catch (error) {
    logger.error(`Error in updateAgent: ${error.message}`);
    throw error;
  }
}

/**
 * Get all agents, optionally filtered by status or specialization
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of agent records
 */
async function getAgents(filters = {}) {
  try {
    // Build query based on filters
    const result = await executeQuery((client) => {
      let query = client.from(TABLES.agents).select('*');
      
      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.specialization) {
        query = query.eq('specialization', filters.specialization);
      }
      
      // Sorting
      query = query.order('created_at', { ascending: false });
      
      return query;
    });
    
    if (result.error) {
      throw new Error(`Failed to fetch agents: ${result.error.message}`);
    }
    
    return result.data || [];
  } catch (error) {
    logger.error(`Error in getAgents: ${error.message}`);
    throw error;
  }
}

/**
 * Update agent status
 * @param {string} agentId - Agent ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated agent record
 */
async function updateAgentStatus(agentId, status) {
  try {
    if (!Object.values(AgentStatus).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    return await updateAgent(agentId, { 
      status,
      last_active_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error in updateAgentStatus: ${error.message}`);
    throw error;
  }
}

/**
 * Update agent performance metrics
 * @param {string} agentId - Agent ID
 * @param {Object} metrics - Performance metrics
 * @returns {Promise<Object>} Updated agent record
 */
async function updateAgentPerformanceMetrics(agentId, metrics) {
  try {
    // Get existing agent to merge metrics
    const existingAgent = await getAgentById(agentId);
    if (!existingAgent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Merge existing metrics with new metrics
    const mergedMetrics = {
      ...existingAgent.performance_metrics,
      ...metrics,
      last_updated: new Date().toISOString()
    };
    
    return await updateAgent(agentId, { 
      performance_metrics: mergedMetrics,
      last_active_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error in updateAgentPerformanceMetrics: ${error.message}`);
    throw error;
  }
}

/**
 * Get specialist agents for a specific task
 * @param {string} specialization - Agent specialization to find
 * @param {number} limit - Maximum number of agents to return
 * @returns {Promise<Array>} Array of specialist agents
 */
async function getSpecialistAgents(specialization, limit = 3) {
  try {
    if (!Object.values(AgentSpecializations).includes(specialization)) {
      throw new Error(`Invalid specialization: ${specialization}`);
    }
    
    // Get active agents with the specified specialization
    const result = await executeQuery((client) => 
      client.from(TABLES.agents)
        .select('*')
        .eq('specialization', specialization)
        .eq('status', AgentStatus.ACTIVE)
        .order('last_active_at', { ascending: false })
        .limit(limit));
    
    if (result.error) {
      throw new Error(`Failed to fetch specialist agents: ${result.error.message}`);
    }
    
    return result.data || [];
  } catch (error) {
    logger.error(`Error in getSpecialistAgents: ${error.message}`);
    return [];
  }
}

/**
 * Coordinate a decision using input from multiple agents
 * @param {string} decisionType - Type of decision
 * @param {Object} decisionData - Decision data
 * @param {string} decisionMode - Decision mode
 * @returns {Promise<Object>} Decision result
 */
async function coordinateDecision(decisionType, decisionData, decisionMode = DecisionModes.DEMOCRATIC) {
  try {
    logger.info(`Coordinating ${decisionType} decision using ${decisionMode} mode`);
    
    // Determine which agents to involve in the decision
    let agentsToConsult = [];
    
    switch (decisionMode) {
      case DecisionModes.DOMAIN_SPECIALIST:
        // Determine appropriate specialization based on decision type
        let requiredSpecialization;
        
        if (decisionType === 'market_entry') {
          requiredSpecialization = AgentSpecializations.MARKET_ANALYSIS;
        } else if (decisionType === 'risk_adjustment') {
          requiredSpecialization = AgentSpecializations.RISK_MANAGEMENT;
        } else if (decisionType === 'order_execution') {
          requiredSpecialization = AgentSpecializations.EXECUTION;
        } else if (decisionType === 'portfolio_rebalance') {
          requiredSpecialization = AgentSpecializations.PORTFOLIO_OPTIMIZATION;
        } else {
          requiredSpecialization = AgentSpecializations.TECHNICAL_ANALYSIS;
        }
        
        // Get specialist agents
        agentsToConsult = await getSpecialistAgents(requiredSpecialization, 3);
        break;
        
      case DecisionModes.DEMOCRATIC:
      case DecisionModes.MERITOCRATIC:
      case DecisionModes.CONSENSUS:
        // Get agents from all specializations
        agentsToConsult = await getAgents({
          status: AgentStatus.ACTIVE
        });
        break;
        
      case DecisionModes.AUTHORITATIVE:
        // Just get a single agent (coordinator making decision)
        agentsToConsult = await getAgents({
          status: AgentStatus.ACTIVE,
          specialization: AgentSpecializations.EXECUTION  // Default to execution specialist
        });
        
        // Limit to just one agent
        agentsToConsult = agentsToConsult.slice(0, 1);
        break;
    }
    
    // If no agents available, return error
    if (agentsToConsult.length === 0) {
      throw new Error('No agents available for decision making');
    }
    
    // Create a unique ID for this decision
    const decisionId = `decision_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Send decision request to each agent and collect votes
    const votePromises = agentsToConsult.map(agent => {
      return messageQueueService.sendMessage({
        sender_id: 'coordinator',
        recipient_id: agent.agent_id,
        type: MessageTypes.QUERY,
        subject: `Decision request: ${decisionType}`,
        payload: {
          decision_id: decisionId,
          decision_type: decisionType,
          data: decisionData,
          mode: decisionMode,
          response_required: true
        },
        priority: MessagePriority.HIGH,
        ttl_seconds: 30  // Short timeout for decisions
      });
    });
    
    // Wait for all messages to be sent
    await Promise.all(votePromises);
    
    logger.info(`Sent decision request to ${agentsToConsult.length} agents. Decision ID: ${decisionId}`);
    
    // In a real implementation, we would wait for responses and tally them
    // For now, we'll just return a placeholder decision result
    return {
      decision_id: decisionId,
      decision_type: decisionType,
      agents_consulted: agentsToConsult.length,
      status: 'pending',
      mode: decisionMode,
      expected_completion: new Date(Date.now() + 30000).toISOString()  // 30 seconds from now
    };
  } catch (error) {
    logger.error(`Error in coordinateDecision: ${error.message}`);
    throw error;
  }
}

/**
 * Broadcast agent registration to all active agents
 * @param {Object} agent - Newly registered agent
 * @returns {Promise<void>}
 * @private
 */
async function broadcastAgentRegistration(agent) {
  try {
    await messageQueueService.sendMessage({
      sender_id: 'coordinator',
      type: MessageTypes.BROADCAST,
      subject: `New agent registered: ${agent.name}`,
      payload: {
        event: 'agent_registered',
        agent_id: agent.agent_id,
        name: agent.name,
        specialization: agent.specialization,
        capabilities: agent.capabilities
      },
      priority: MessagePriority.NORMAL
    });
    
    logger.info(`Broadcasted registration for agent ${agent.agent_id}`);
  } catch (error) {
    logger.error(`Error broadcasting agent registration: ${error.message}`);
  }
}

/**
 * Broadcast agent status change to all active agents
 * @param {Object} agent - Agent with updated status
 * @returns {Promise<void>}
 * @private
 */
async function broadcastAgentStatusChange(agent) {
  try {
    await messageQueueService.sendMessage({
      sender_id: 'coordinator',
      type: MessageTypes.BROADCAST,
      subject: `Agent status changed: ${agent.name}`,
      payload: {
        event: 'agent_status_changed',
        agent_id: agent.agent_id,
        name: agent.name,
        status: agent.status,
        previous_status: agent.metadata.previous_status || 'unknown'
      },
      priority: agent.status === AgentStatus.SUSPENDED ? MessagePriority.HIGH : MessagePriority.NORMAL
    });
    
    logger.info(`Broadcasted status change for agent ${agent.agent_id} to ${agent.status}`);
  } catch (error) {
    logger.error(`Error broadcasting agent status change: ${error.message}`);
  }
}

module.exports = {
  registerAgent,
  getAgentById,
  updateAgent,
  updateAgentStatus,
  getAgents,
  getSpecialistAgents,
  updateAgentPerformanceMetrics,
  coordinateDecision,
  AgentSpecializations,
  AgentStatus,
  DecisionModes
}; 