/**
 * Message Queue Routes
 * 
 * API endpoints for the message queue system that enables
 * asynchronous communication between trading agents.
 */

const express = require('express');
const router = express.Router();
const messageQueueService = require('../services/message-queue-service');
const logger = require('../logger');

/**
 * @route   POST /api/messages
 * @desc    Send a message to the queue
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const message = req.body;
    const result = await messageQueueService.sendMessage(message);
    
    res.status(201).json(result);
  } catch (error) {
    logger.error(`Error sending message: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/messages/agent/:agentId
 * @desc    Get messages for a specific agent
 * @access  Public
 */
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, type, since, priority, sender_id, limit } = req.query;
    
    const options = {};
    if (status) options.status = status;
    if (type) options.type = type;
    if (since) options.since = since;
    if (priority) options.priority = priority;
    if (sender_id) options.sender_id = sender_id;
    if (limit) options.limit = parseInt(limit, 10);
    
    const messages = await messageQueueService.getMessagesForAgent(agentId, options);
    
    res.json(messages);
  } catch (error) {
    logger.error(`Error getting messages: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/messages/:messageId/deliver
 * @desc    Mark a message as delivered
 * @access  Public
 */
router.patch('/:messageId/deliver', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { recipient_id } = req.body;
    
    if (!recipient_id) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }
    
    const result = await messageQueueService.markMessageDelivered(messageId, recipient_id);
    
    res.json(result);
  } catch (error) {
    logger.error(`Error marking message as delivered: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PATCH /api/messages/:messageId/read
 * @desc    Mark a message as read
 * @access  Public
 */
router.patch('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { recipient_id } = req.body;
    
    if (!recipient_id) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }
    
    const result = await messageQueueService.markMessageRead(messageId, recipient_id);
    
    res.json(result);
  } catch (error) {
    logger.error(`Error marking message as read: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/messages/:messageId/respond
 * @desc    Respond to a message
 * @access  Public
 */
router.post('/:messageId/respond', async (req, res) => {
  try {
    const { messageId } = req.params;
    const responseData = req.body;
    
    if (!responseData.sender_id) {
      return res.status(400).json({ error: 'Sender ID is required' });
    }
    
    const result = await messageQueueService.respondToMessage(messageId, responseData);
    
    res.status(201).json(result);
  } catch (error) {
    logger.error(`Error responding to message: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/messages/types
 * @desc    Get all available message types
 * @access  Public
 */
router.get('/types', (req, res) => {
  try {
    const types = Object.entries(messageQueueService.MessageTypes)
      .map(([key, value]) => ({ 
        id: value, 
        name: key.toLowerCase().replace(/_/g, ' '),
        description: getMessageTypeDescription(value)
      }));
    
    res.json(types);
  } catch (error) {
    logger.error(`Error getting message types: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/messages/priorities
 * @desc    Get all available message priorities
 * @access  Public
 */
router.get('/priorities', (req, res) => {
  try {
    const priorities = Object.entries(messageQueueService.MessagePriority)
      .map(([key, value]) => ({ 
        id: value, 
        name: key.toLowerCase().replace(/_/g, ' '),
        level: getPriorityLevel(value)
      }));
    
    // Sort by priority level
    priorities.sort((a, b) => a.level - b.level);
    
    res.json(priorities);
  } catch (error) {
    logger.error(`Error getting message priorities: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/messages/cleanup
 * @desc    Clean up expired messages
 * @access  Public
 */
router.post('/cleanup', async (req, res) => {
  try {
    const count = await messageQueueService.cleanupExpiredMessages();
    
    res.json({ message: `Cleaned up ${count} expired messages`, count });
  } catch (error) {
    logger.error(`Error cleaning up messages: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a human-readable description of a message type
 * @param {string} type - Message type
 * @returns {string} Description
 * @private
 */
function getMessageTypeDescription(type) {
  const descriptions = {
    registration: 'Agent registration with the system',
    status_update: 'Status update from an agent',
    signal: 'Trading signal from an agent',
    market_data: 'Market data update',
    order_execution: 'Order execution notification',
    position_update: 'Position update',
    risk_alert: 'Risk management alert',
    command: 'Command for an agent to execute',
    query: 'Query or request to an agent',
    response: 'Response to a query',
    broadcast: 'Broadcast message to all agents',
    decision: 'Coordinator decision',
    system: 'System/health message'
  };
  
  return descriptions[type] || 'No description available';
}

/**
 * Get the numeric level of a priority
 * @param {string} priority - Priority value
 * @returns {number} Priority level (lower number = higher priority)
 * @private
 */
function getPriorityLevel(priority) {
  const levels = {
    critical: 1,
    high: 2,
    normal: 3,
    low: 4,
    info: 5
  };
  
  return levels[priority] || 3;
}

module.exports = router; 