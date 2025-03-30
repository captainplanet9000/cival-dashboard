/**
 * Agent Client Example
 * 
 * A simple client for trading agents to interact with the Supabase MCP server.
 * Demonstrates how to use the coordinator and message queue for agent cooperation.
 */

const axios = require('axios');

class AgentClient {
  /**
   * Create a new agent client
   * @param {Object} config - Client configuration
   * @param {string} config.baseUrl - Base URL of the MCP server
   * @param {string} config.agentId - ID of the agent
   * @param {string} config.agentName - Name of the agent
   * @param {string} config.specialization - Agent specialization
   */
  constructor(config) {
    this.baseUrl = config.baseUrl || 'http://localhost:3007';
    this.agentId = config.agentId;
    this.agentName = config.agentName;
    this.specialization = config.specialization;
    
    // Create axios instance with base URL
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Agent-ID': this.agentId
      }
    });
    
    // Track subscriptions
    this.subscriptions = new Set();
    
    console.log(`Agent client initialized for ${this.agentName} (${this.agentId})`);
  }
  
  /**
   * Register with message queue topics
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Subscribe to broadcasts
      await this.subscribeToTopic('broadcasts');
      
      // Subscribe to specialization-specific messages
      await this.subscribeToTopic(`specialization.${this.specialization}`);
      
      // Subscribe to agent-specific messages
      await this.subscribeToTopic(`agent.${this.agentId}`);
      
      console.log(`Agent ${this.agentId} initialized and subscribed to core topics`);
    } catch (error) {
      console.error(`Error initializing agent: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get tasks assigned to this agent
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by task status
   * @param {string} options.task_type - Filter by task type
   * @returns {Promise<Array>} Array of tasks
   */
  async getTasks(options = {}) {
    try {
      const response = await this.http.get('/api/coordinator/tasks', {
        params: {
          agent_id: this.agentId,
          ...options
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting tasks: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update task status
   * @param {string} taskId - ID of the task
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated task
   */
  async updateTaskStatus(taskId, updateData) {
    try {
      const response = await this.http.put(`/api/coordinator/tasks/${taskId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating task: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get messages for this agent
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of messages
   */
  async getMessages(options = {}) {
    try {
      const response = await this.http.get('/api/coordinator/messages', {
        params: {
          agent_id: this.agentId,
          ...options
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting messages: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Send a direct message to another agent
   * @param {string} recipientId - ID of the recipient
   * @param {string} messageType - Type of message
   * @param {Object} payload - Message payload
   * @returns {Promise<Object>} Sent message
   */
  async sendDirectMessage(recipientId, messageType, payload) {
    try {
      const message = {
        sender_id: this.agentId,
        recipient_id: recipientId,
        message_type: messageType,
        payload: payload
      };
      
      const response = await this.http.post('/api/coordinator/messages', message);
      return response.data;
    } catch (error) {
      console.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Send a broadcast message to all agents
   * @param {string} messageType - Type of message
   * @param {Object} payload - Message payload
   * @returns {Promise<Object>} Sent message
   */
  async broadcastMessage(messageType, payload) {
    try {
      const message = {
        sender_id: this.agentId,
        message_type: messageType,
        payload: payload
      };
      
      const response = await this.http.post('/api/coordinator/broadcast', message);
      return response.data;
    } catch (error) {
      console.error(`Error broadcasting message: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Publish a message to a topic
   * @param {string} topic - Topic to publish to
   * @param {string} messageType - Type of message
   * @param {Object} payload - Message payload
   * @returns {Promise<Object>} Published message
   */
  async publishToTopic(topic, messageType, payload) {
    try {
      const message = {
        sender_id: this.agentId,
        topic: topic,
        message_type: messageType,
        payload: payload
      };
      
      const response = await this.http.post('/api/coordinator/publish', message);
      return response.data;
    } catch (error) {
      console.error(`Error publishing to topic: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Subscribe to a topic
   * @param {string} topic - Topic to subscribe to
   * @param {Object} filterCriteria - Filter criteria for messages
   * @returns {Promise<Object>} Subscription
   */
  async subscribeToTopic(topic, filterCriteria = {}) {
    try {
      const subscription = {
        agent_id: this.agentId,
        topic: topic,
        filter_criteria: filterCriteria
      };
      
      const response = await this.http.post('/api/coordinator/subscriptions', subscription);
      this.subscriptions.add(topic);
      return response.data;
    } catch (error) {
      console.error(`Error subscribing to topic: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Unsubscribe from a topic
   * @param {string} topic - Topic to unsubscribe from
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribeFromTopic(topic) {
    try {
      const response = await this.http.delete('/api/coordinator/subscriptions', {
        params: {
          agent_id: this.agentId,
          topic: topic
        }
      });
      
      this.subscriptions.delete(topic);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from topic: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Mark a message as delivered
   * @param {string} messageId - ID of the message
   * @returns {Promise<Object>} Updated message
   */
  async markMessageDelivered(messageId) {
    try {
      const response = await this.http.put(`/api/coordinator/messages/${messageId}/delivered`, {});
      return response.data;
    } catch (error) {
      console.error(`Error marking message as delivered: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Mark a message as processed
   * @param {string} messageId - ID of the message
   * @returns {Promise<Object>} Updated message
   */
  async markMessageProcessed(messageId) {
    try {
      const response = await this.http.put(`/api/coordinator/messages/${messageId}/processed`, {});
      return response.data;
    } catch (error) {
      console.error(`Error marking message as processed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Request cooperation from another agent
   * @param {string} targetAgentId - ID of the agent to cooperate with
   * @param {string} cooperationType - Type of cooperation
   * @param {Object} details - Cooperation details
   * @returns {Promise<Object>} Cooperation request message
   */
  async requestCooperation(targetAgentId, cooperationType, details) {
    try {
      return await this.sendDirectMessage(targetAgentId, 'COOPERATION_REQUEST', {
        cooperation_type: cooperationType,
        details: details,
        request_id: `req_${Date.now()}_${this.agentId}`,
        requesting_agent: {
          id: this.agentId,
          name: this.agentName,
          specialization: this.specialization
        }
      });
    } catch (error) {
      console.error(`Error requesting cooperation: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Respond to a cooperation request
   * @param {Object} request - Original cooperation request message
   * @param {boolean} accepted - Whether the request is accepted
   * @param {Object} response - Response details
   * @returns {Promise<Object>} Cooperation response message
   */
  async respondToCooperation(request, accepted, response) {
    try {
      return await this.sendDirectMessage(request.sender_id, 'COOPERATION_RESPONSE', {
        cooperation_type: request.payload.cooperation_type,
        request_id: request.payload.request_id,
        accepted: accepted,
        response: response,
        responding_agent: {
          id: this.agentId,
          name: this.agentName,
          specialization: this.specialization
        }
      });
    } catch (error) {
      console.error(`Error responding to cooperation: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Process messages in a loop
   * @param {Function} messageHandler - Function to handle messages
   * @param {number} pollingInterval - How often to check for messages (ms)
   */
  async startMessageProcessingLoop(messageHandler, pollingInterval = 5000) {
    const processMessages = async () => {
      try {
        // Get unprocessed messages
        const messages = await this.getMessages({ status: 'queued' });
        
        // Process each message
        for (const message of messages) {
          try {
            // Mark as delivered
            await this.markMessageDelivered(message.message_id);
            
            // Process the message
            await messageHandler(message);
            
            // Mark as processed
            await this.markMessageProcessed(message.message_id);
          } catch (error) {
            console.error(`Error processing message ${message.message_id}: ${error.message}`);
          }
        }
      } catch (error) {
        console.error(`Error in message processing loop: ${error.message}`);
      }
    };
    
    // Start the processing loop
    setInterval(processMessages, pollingInterval);
    console.log(`Started message processing loop for agent ${this.agentId}`);
    
    // Process messages immediately
    await processMessages();
  }
}

module.exports = AgentClient; 