/**
 * Coordinator Routes
 * 
 * API endpoints for the central agent coordinator in Trading Farm.
 * Provides task management, workflow orchestration, and agent communication.
 */

const express = require('express');
const router = express.Router();
const coordinatorService = require('../services/coordinator-service');
const messageQueueService = require('../services/message-queue-service');
const logger = require('../logger');

/**
 * @route   POST /api/coordinator/tasks
 * @desc    Create a new task assignment
 * @access  Public
 */
router.post('/tasks', async (req, res) => {
  try {
    const task = await coordinatorService.createTaskAssignment(req.body);
    return res.status(201).json(task);
  } catch (error) {
    logger.error(`Error creating task: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/tasks
 * @desc    Get tasks with optional filtering
 * @access  Public
 */
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await coordinatorService.getTasks(req.query);
    return res.json(tasks);
  } catch (error) {
    logger.error(`Error getting tasks: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/coordinator/tasks/:taskId
 * @desc    Update task status or details
 * @access  Public
 */
router.put('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await coordinatorService.updateTaskStatus(taskId, req.body);
    return res.json(task);
  } catch (error) {
    logger.error(`Error updating task: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/workflows
 * @desc    Create a new workflow
 * @access  Public
 */
router.post('/workflows', async (req, res) => {
  try {
    const workflow = await coordinatorService.createWorkflow(req.body);
    return res.status(201).json(workflow);
  } catch (error) {
    logger.error(`Error creating workflow: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/assign-task
 * @desc    Assign a task to the best matching agent
 * @access  Public
 */
router.post('/assign-task', async (req, res) => {
  try {
    const task = await coordinatorService.assignTaskToAgent(req.body);
    return res.status(201).json(task);
  } catch (error) {
    logger.error(`Error assigning task: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/messages
 * @desc    Send a new message
 * @access  Public
 */
router.post('/messages', async (req, res) => {
  try {
    const message = await messageQueueService.sendMessage(req.body);
    return res.status(201).json(message);
  } catch (error) {
    logger.error(`Error sending message: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/messages
 * @desc    Get messages for an agent
 * @access  Public
 */
router.get('/messages', async (req, res) => {
  try {
    if (!req.query.agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }
    
    const messages = await messageQueueService.getMessagesForAgent(
      req.query.agent_id, 
      {
        status: req.query.status,
        message_type: req.query.message_type,
        sender_id: req.query.sender_id,
        topic: req.query.topic,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      }
    );
    
    return res.json(messages);
  } catch (error) {
    logger.error(`Error getting messages: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/coordinator/messages/:messageId/delivered
 * @desc    Mark a message as delivered
 * @access  Public
 */
router.put('/messages/:messageId/delivered', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await messageQueueService.markMessageDelivered(messageId);
    return res.json(message);
  } catch (error) {
    logger.error(`Error marking message as delivered: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/coordinator/messages/:messageId/processed
 * @desc    Mark a message as processed
 * @access  Public
 */
router.put('/messages/:messageId/processed', async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await messageQueueService.markMessageProcessed(messageId);
    return res.json(message);
  } catch (error) {
    logger.error(`Error marking message as processed: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/broadcast
 * @desc    Send a broadcast message to all agents
 * @access  Public
 */
router.post('/broadcast', async (req, res) => {
  try {
    const message = await messageQueueService.broadcastMessage(req.body);
    return res.status(201).json(message);
  } catch (error) {
    logger.error(`Error broadcasting message: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/publish
 * @desc    Publish a message to a topic
 * @access  Public
 */
router.post('/publish', async (req, res) => {
  try {
    const message = await messageQueueService.publishToTopic(req.body);
    return res.status(201).json(message);
  } catch (error) {
    logger.error(`Error publishing message: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/subscriptions
 * @desc    Subscribe an agent to a topic
 * @access  Public
 */
router.post('/subscriptions', async (req, res) => {
  try {
    const { agent_id, topic, filter_criteria } = req.body;
    
    if (!agent_id || !topic) {
      return res.status(400).json({ error: 'agent_id and topic are required' });
    }
    
    const subscription = await messageQueueService.subscribeToTopic(
      agent_id, 
      topic, 
      filter_criteria || {}
    );
    
    return res.status(201).json(subscription);
  } catch (error) {
    logger.error(`Error creating subscription: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/coordinator/subscriptions
 * @desc    Unsubscribe an agent from a topic
 * @access  Public
 */
router.delete('/subscriptions', async (req, res) => {
  try {
    const { agent_id, topic } = req.query;
    
    if (!agent_id || !topic) {
      return res.status(400).json({ error: 'agent_id and topic are required' });
    }
    
    await messageQueueService.unsubscribeFromTopic(agent_id, topic);
    
    return res.json({ success: true, message: `Unsubscribed agent ${agent_id} from topic ${topic}` });
  } catch (error) {
    logger.error(`Error deleting subscription: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/subscriptions
 * @desc    Get subscriptions for an agent
 * @access  Public
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const { agent_id } = req.query;
    
    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }
    
    const activeOnly = req.query.active_only !== 'false';
    const subscriptions = await messageQueueService.getSubscriptions(agent_id, activeOnly);
    
    return res.json(subscriptions);
  } catch (error) {
    logger.error(`Error getting subscriptions: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/schedule-message
 * @desc    Schedule a message for future delivery
 * @access  Public
 */
router.post('/schedule-message', async (req, res) => {
  try {
    const { message, delivery_time } = req.body;
    
    if (!message || !delivery_time) {
      return res.status(400).json({ error: 'message and delivery_time are required' });
    }
    
    const scheduledMessage = await messageQueueService.scheduleMessage(message, delivery_time);
    
    return res.status(201).json(scheduledMessage);
  } catch (error) {
    logger.error(`Error scheduling message: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/task-types
 * @desc    Get available task types
 * @access  Public
 */
router.get('/task-types', (req, res) => {
  try {
    return res.json(coordinatorService.TaskTypes);
  } catch (error) {
    logger.error(`Error getting task types: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/message-types
 * @desc    Get available message types
 * @access  Public
 */
router.get('/message-types', (req, res) => {
  try {
    return res.json(messageQueueService.MessageTypes);
  } catch (error) {
    logger.error(`Error getting message types: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Agent Coordinator Routes
 * 
 * API endpoints for the central coordinator that manages all specialized agents.
 * Allows for agent registration, status updates, and coordination of trading decisions.
 */

/**
 * @route   POST /api/coordinator/agents
 * @desc    Register a new agent with the coordinator
 * @access  Public
 */
router.post('/agents', async (req, res) => {
  try {
    const agentData = req.body;
    const result = await coordinatorService.registerAgent(agentData);
    
    res.status(201).json(result);
  } catch (error) {
    logger.error(`Error registering agent: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/agents
 * @desc    Get all registered agents
 * @access  Public
 */
router.get('/agents', async (req, res) => {
  try {
    const { status, specialization } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (specialization) filters.specialization = specialization;
    
    const agents = await coordinatorService.getAgents(filters);
    
    res.json(agents);
  } catch (error) {
    logger.error(`Error getting agents: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/agents/:agentId
 * @desc    Get a specific agent by ID
 * @access  Public
 */
router.get('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await coordinatorService.getAgentById(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    logger.error(`Error getting agent: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/coordinator/agents/:agentId
 * @desc    Update an agent's details
 * @access  Public
 */
router.put('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const updateData = req.body;
    
    const result = await coordinatorService.updateAgent(agentId, updateData);
    
    res.json(result);
  } catch (error) {
    logger.error(`Error updating agent: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/coordinator/agents/:agentId/status
 * @desc    Update an agent's status
 * @access  Public
 */
router.patch('/agents/:agentId/status', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const result = await coordinatorService.updateAgentStatus(agentId, status);
    
    res.json(result);
  } catch (error) {
    logger.error(`Error updating agent status: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/coordinator/agents/:agentId/metrics
 * @desc    Update an agent's performance metrics
 * @access  Public
 */
router.patch('/agents/:agentId/metrics', async (req, res) => {
  try {
    const { agentId } = req.params;
    const metrics = req.body;
    
    if (!metrics || Object.keys(metrics).length === 0) {
      return res.status(400).json({ error: 'Performance metrics are required' });
    }
    
    const result = await coordinatorService.updateAgentPerformanceMetrics(agentId, metrics);
    
    res.json(result);
  } catch (error) {
    logger.error(`Error updating agent metrics: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/specialists/:specialization
 * @desc    Get agents with a specific specialization
 * @access  Public
 */
router.get('/specialists/:specialization', async (req, res) => {
  try {
    const { specialization } = req.params;
    const { limit } = req.query;
    
    const specialists = await coordinatorService.getSpecialistAgents(
      specialization, 
      limit ? parseInt(limit, 10) : 3
    );
    
    res.json(specialists);
  } catch (error) {
    logger.error(`Error getting specialist agents: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/coordinator/decisions
 * @desc    Request a decision coordination
 * @access  Public
 */
router.post('/decisions', async (req, res) => {
  try {
    const { decision_type, data, mode } = req.body;
    
    if (!decision_type) {
      return res.status(400).json({ error: 'Decision type is required' });
    }
    
    if (!data) {
      return res.status(400).json({ error: 'Decision data is required' });
    }
    
    const result = await coordinatorService.coordinateDecision(decision_type, data, mode);
    
    res.status(202).json(result);
  } catch (error) {
    logger.error(`Error coordinating decision: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/specializations
 * @desc    Get all available agent specializations
 * @access  Public
 */
router.get('/specializations', (req, res) => {
  try {
    const specializations = Object.entries(coordinatorService.AgentSpecializations)
      .map(([key, value]) => ({ 
        id: value, 
        name: key.toLowerCase().replace(/_/g, ' ') 
      }));
    
    res.json(specializations);
  } catch (error) {
    logger.error(`Error getting specializations: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/statuses
 * @desc    Get all possible agent statuses
 * @access  Public
 */
router.get('/statuses', (req, res) => {
  try {
    const statuses = Object.entries(coordinatorService.AgentStatus)
      .map(([key, value]) => ({ 
        id: value, 
        name: key.toLowerCase().replace(/_/g, ' ') 
      }));
    
    res.json(statuses);
  } catch (error) {
    logger.error(`Error getting statuses: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/coordinator/decision-modes
 * @desc    Get all available decision coordination modes
 * @access  Public
 */
router.get('/decision-modes', (req, res) => {
  try {
    const modes = Object.entries(coordinatorService.DecisionModes)
      .map(([key, value]) => ({ 
        id: value, 
        name: key.toLowerCase().replace(/_/g, ' '),
        description: getDecisionModeDescription(value)
      }));
    
    res.json(modes);
  } catch (error) {
    logger.error(`Error getting decision modes: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a human-readable description of a decision mode
 * @param {string} mode - Decision mode
 * @returns {string} Description
 * @private
 */
function getDecisionModeDescription(mode) {
  const descriptions = {
    democratic: 'Each agent gets one vote of equal weight',
    meritocratic: 'Votes weighted by agent performance history',
    authoritative: 'Coordinator makes final decision with agent input',
    domain_specialist: 'Specialist in relevant domain makes decision',
    consensus: 'Consensus required among all agents'
  };
  
  return descriptions[mode] || 'No description available';
}

module.exports = router; 