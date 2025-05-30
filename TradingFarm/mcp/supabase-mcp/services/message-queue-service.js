/**
 * Message Queue Service
 * 
 * Business logic for the message queue system that enables
 * asynchronous communication between trading agents.
 */

const { executeQuery } = require('../supabase-client');
const logger = require('../logger');
const { TABLES } = require('../config');
const { 
  MessageTypes, 
  MessagePriority,
  MessageStatus,
  DeliveryModes,
  validateMessage,
  formatMessage
} = require('../models/message-queue-model');

/**
 * Send a message to the queue
 * @param {Object} message - Message to send
 * @returns {Promise<Object>} Queued message record
 */
async function sendMessage(message) {
  try {
    // Validate the message
    const validationResult = validateMessage(message);
    if (!validationResult.isValid) {
      throw new Error(`Invalid message: ${validationResult.errors.join(', ')}`);
    }
    
    // Format the message for storage
    const formattedMessage = formatMessage(message);
    
    // Store the message in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .insert(formattedMessage)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to send message: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error('No message was queued');
    }
    
    logger.info(`Queued message: ${result.data[0].message_id} from ${formattedMessage.sender_id} to ${formattedMessage.recipient_id || 'broadcast'}`);
    
    // For broadcasts, also add a reference to the realtime channel
    if (message.type === MessageTypes.BROADCAST) {
      await notifyRealtimeChannel(result.data[0]);
    }
    
    return result.data[0];
  } catch (error) {
    logger.error(`Error in sendMessage: ${error.message}`);
    throw error;
  }
}

/**
 * Retrieve messages for a specific agent
 * @param {string} agentId - Agent ID to retrieve messages for
 * @param {Object} options - Options for retrieving messages
 * @returns {Promise<Array>} Array of message records
 */
async function getMessagesForAgent(agentId, options = {}) {
  try {
    const { limit = 20, status, type, since, priority, sender_id } = options;
    
    // Build query based on options
    const result = await executeQuery((client) => {
      let query = client.from(TABLES.messageQueue)
        .select('*')
        .or(`recipient_id.eq.${agentId},recipient_id.is.null`) // Direct messages or broadcasts
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Apply filters
      if (status) {
        query = query.eq('status', status);
      } else {
        // If no status filter, default to undelivered messages
        query = query.in('status', [MessageStatus.QUEUED, MessageStatus.PROCESSING]);
      }
      
      if (type) {
        query = query.eq('type', type);
      }
      
      if (since) {
        query = query.gte('created_at', since);
      }
      
      if (priority) {
        query = query.eq('priority', priority);
      }
      
      if (sender_id) {
        query = query.eq('sender_id', sender_id);
      }
      
      return query;
    });
    
    if (result.error) {
      throw new Error(`Failed to retrieve messages: ${result.error.message}`);
    }
    
    return result.data || [];
  } catch (error) {
    logger.error(`Error in getMessagesForAgent: ${error.message}`);
    throw error;
  }
}

/**
 * Mark a message as delivered
 * @param {string} messageId - Message ID
 * @param {string} recipientId - Recipient agent ID
 * @returns {Promise<Object>} Updated message record
 */
async function markMessageDelivered(messageId, recipientId) {
  try {
    // First, get the message
    const messageResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .select('*')
        .eq('message_id', messageId)
        .single());
    
    if (messageResult.error || !messageResult.data) {
      throw new Error(`Message not found: ${messageId}`);
    }
    
    const message = messageResult.data;
    
    // Check if recipient is valid
    if (message.recipient_id && message.recipient_id !== recipientId) {
      throw new Error(`Message ${messageId} is not intended for recipient ${recipientId}`);
    }
    
    // Update message status
    const now = new Date().toISOString();
    const updateResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .update({
          status: MessageStatus.DELIVERED,
          delivered_at: now,
          updated_at: now
        })
        .eq('message_id', messageId)
        .select());
    
    if (updateResult.error) {
      throw new Error(`Failed to mark message as delivered: ${updateResult.error.message}`);
    }
    
    if (!updateResult.data || updateResult.data.length === 0) {
      throw new Error(`Message not found: ${messageId}`);
    }
    
    logger.info(`Marked message ${messageId} as delivered to ${recipientId}`);
    
    // After delivery, move to message history
    const archiveResult = await archiveMessage(messageId, MessageStatus.DELIVERED);
    
    return updateResult.data[0];
  } catch (error) {
    logger.error(`Error in markMessageDelivered: ${error.message}`);
    throw error;
  }
}

/**
 * Mark a message as read
 * @param {string} messageId - Message ID
 * @param {string} recipientId - Recipient agent ID
 * @returns {Promise<Object>} Updated message record
 */
async function markMessageRead(messageId, recipientId) {
  try {
    // First check in active queue
    const messageResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .select('*')
        .eq('message_id', messageId)
        .single());
    
    // If not in active queue, check in history
    if (messageResult.error || !messageResult.data) {
      const historyResult = await executeQuery((client) => 
        client.from(TABLES.messageHistory)
          .select('*')
          .eq('message_id', messageId)
          .single());
      
      // If not found in either location
      if (historyResult.error || !historyResult.data) {
        throw new Error(`Message not found: ${messageId}`);
      }
      
      // Update read status in history
      const now = new Date().toISOString();
      const updateResult = await executeQuery((client) => 
        client.from(TABLES.messageHistory)
          .update({
            read_at: now,
            final_status: MessageStatus.READ
          })
          .eq('message_id', messageId)
          .select());
      
      if (updateResult.error) {
        throw new Error(`Failed to mark message as read in history: ${updateResult.error.message}`);
      }
      
      logger.info(`Marked archived message ${messageId} as read by ${recipientId}`);
      return updateResult.data[0];
    }
    
    // Message is in active queue
    const message = messageResult.data;
    
    // Check if recipient is valid
    if (message.recipient_id && message.recipient_id !== recipientId) {
      throw new Error(`Message ${messageId} is not intended for recipient ${recipientId}`);
    }
    
    // Update message status
    const now = new Date().toISOString();
    const updateResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .update({
          status: MessageStatus.READ,
          read_at: now,
          updated_at: now
        })
        .eq('message_id', messageId)
        .select());
    
    if (updateResult.error) {
      throw new Error(`Failed to mark message as read: ${updateResult.error.message}`);
    }
    
    logger.info(`Marked message ${messageId} as read by ${recipientId}`);
    
    // After marking as read, move to message history
    const archiveResult = await archiveMessage(messageId, MessageStatus.READ);
    
    return updateResult.data[0];
  } catch (error) {
    logger.error(`Error in markMessageRead: ${error.message}`);
    throw error;
  }
}

/**
 * Send a response to a message
 * @param {string} originalMessageId - Original message ID
 * @param {Object} responseData - Response message data
 * @returns {Promise<Object>} Response message record
 */
async function respondToMessage(originalMessageId, responseData) {
  try {
    // Find the original message
    const originalResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .select('*')
        .eq('message_id', originalMessageId)
        .single());
    
    if (originalResult.error) {
      // Try looking in message history
      const historyResult = await executeQuery((client) => 
        client.from(TABLES.messageHistory)
          .select('*')
          .eq('message_id', originalMessageId)
          .single());
      
      if (historyResult.error || !historyResult.data) {
        throw new Error(`Original message not found: ${originalMessageId}`);
      }
      
      // Found in history
      const originalMessage = historyResult.data;
      
      // Construct response message
      const responseMessage = {
        sender_id: responseData.sender_id,
        recipient_id: originalMessage.sender_id,
        type: MessageTypes.RESPONSE,
        subject: responseData.subject || `Re: ${originalMessage.subject}`,
        payload: {
          ...responseData.payload,
          in_response_to: originalMessageId,
          original_type: originalMessage.type,
          original_subject: originalMessage.subject
        },
        priority: responseData.priority || originalMessage.priority,
        conversation_id: originalMessage.conversation_id
      };
      
      // Send the response
      const responseRecord = await sendMessage(responseMessage);
      
      // Update the original message in history with the response ID
      await executeQuery((client) => 
        client.from(TABLES.messageHistory)
          .update({
            response_message_id: responseRecord.message_id
          })
          .eq('message_id', originalMessageId));
      
      return responseRecord;
    }
    
    // Original message is still in the queue
    const originalMessage = originalResult.data;
    
    // Construct response message
    const responseMessage = {
      sender_id: responseData.sender_id,
      recipient_id: originalMessage.sender_id,
      type: MessageTypes.RESPONSE,
      subject: responseData.subject || `Re: ${originalMessage.subject}`,
      payload: {
        ...responseData.payload,
        in_response_to: originalMessageId,
        original_type: originalMessage.type,
        original_subject: originalMessage.subject
      },
      priority: responseData.priority || originalMessage.priority,
      conversation_id: originalMessage.conversation_id
    };
    
    // Send the response
    const responseRecord = await sendMessage(responseMessage);
    
    // Mark the original message as delivered and read since we're responding to it
    await markMessageRead(originalMessageId, responseData.sender_id);
    
    return responseRecord;
  } catch (error) {
    logger.error(`Error in respondToMessage: ${error.message}`);
    throw error;
  }
}

/**
 * Archive a message by moving it to message history
 * @param {string} messageId - Message ID
 * @param {string} finalStatus - Final status of the message
 * @returns {Promise<boolean>} Success indicator
 * @private
 */
async function archiveMessage(messageId, finalStatus) {
  try {
    // Get the message from the queue
    const messageResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .select('*')
        .eq('message_id', messageId)
        .single());
    
    if (messageResult.error || !messageResult.data) {
      throw new Error(`Message not found for archiving: ${messageId}`);
    }
    
    const message = messageResult.data;
    
    // Insert into history table
    const historyResult = await executeQuery((client) => 
      client.from(TABLES.messageHistory)
        .insert({
          message_id: message.message_id,
          sender_id: message.sender_id,
          recipient_id: message.recipient_id,
          conversation_id: message.conversation_id,
          type: message.type,
          subject: message.subject,
          payload: message.payload,
          priority: message.priority,
          metadata: message.metadata,
          created_at: message.created_at,
          delivered_at: message.delivered_at || new Date().toISOString(),
          read_at: message.read_at,
          final_status: finalStatus || message.status,
          archived_at: new Date().toISOString()
        })
        .select());
    
    if (historyResult.error) {
      throw new Error(`Failed to archive message: ${historyResult.error.message}`);
    }
    
    // Delete from queue
    const deleteResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .delete()
        .eq('message_id', messageId));
    
    if (deleteResult.error) {
      logger.warn(`Failed to delete message after archiving: ${deleteResult.error.message}`);
      return false;
    }
    
    logger.info(`Archived message ${messageId} with final status ${finalStatus}`);
    return true;
  } catch (error) {
    logger.error(`Error in archiveMessage: ${error.message}`);
    return false;
  }
}

/**
 * Publish a message to the realtime channel
 * @param {Object} message - Message to publish
 * @returns {Promise<boolean>} Success indicator
 * @private
 */
async function notifyRealtimeChannel(message) {
  try {
    const client = require('../supabase-client').getClient();
    
    // Only publish if client has realtime capability
    if (client.channel && typeof client.channel === 'function') {
      const channel = client
        .channel('agent-messages')
        .on('broadcast', { event: 'new_message' }, payload => {
          logger.debug(`Realtime message broadcast: ${payload.message_id}`);
        });
      
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          message_id: message.message_id,
          sender_id: message.sender_id,
          type: message.type,
          subject: message.subject,
          created_at: message.created_at
        }
      });
      
      logger.info(`Notified realtime channel about message ${message.message_id}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.warn(`Error in notifyRealtimeChannel: ${error.message}`);
    return false;
  }
}

/**
 * Clean up expired messages
 * @returns {Promise<number>} Number of messages cleaned up
 */
async function cleanupExpiredMessages() {
  try {
    const now = new Date().toISOString();
    
    // Find expired messages
    const expiredResult = await executeQuery((client) => 
      client.from(TABLES.messageQueue)
        .select('message_id')
        .lt('expires_at', now));
    
    if (expiredResult.error) {
      throw new Error(`Failed to find expired messages: ${expiredResult.error.message}`);
    }
    
    const expiredMessages = expiredResult.data || [];
    
    if (expiredMessages.length === 0) {
      return 0;
    }
    
    // Archive each expired message
    let archivedCount = 0;
    for (const message of expiredMessages) {
      const success = await archiveMessage(message.message_id, MessageStatus.EXPIRED);
      if (success) {
        archivedCount++;
      }
    }
    
    logger.info(`Cleaned up ${archivedCount} expired messages`);
    return archivedCount;
  } catch (error) {
    logger.error(`Error in cleanupExpiredMessages: ${error.message}`);
    return 0;
  }
}

module.exports = {
  sendMessage,
  getMessagesForAgent,
  markMessageDelivered,
  markMessageRead,
  respondToMessage,
  cleanupExpiredMessages,
  MessageTypes,
  MessagePriority,
  MessageStatus,
  DeliveryModes
}; 