/**
 * Agent Cooperation Service
 * 
 * Business logic for handling agent cooperation in Trading Farm.
 * Manages cooperation records, notifications, and decision processes.
 */

const { executeQuery } = require('../supabase-client');
const logger = require('../logger');
const { TABLES } = require('../config');
const { 
  CooperationTypes, 
  CooperationStatus,
  validateCooperationRecord,
  formatCooperationRecord
} = require('../models/cooperation-model');

/**
 * Create a new cooperation record
 * @param {Object} cooperationData - Cooperation data
 * @returns {Promise<Object>} Created cooperation record
 */
async function createCooperation(cooperationData) {
  try {
    // Validate the cooperation data
    const validationResult = validateCooperationRecord(cooperationData);
    if (!validationResult.isValid) {
      throw new Error(`Invalid cooperation data: ${validationResult.errors.join(', ')}`);
    }
    
    // Format the record for storage
    const formattedRecord = formatCooperationRecord(cooperationData);
    
    // Store the record in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.agentCooperation)
        .insert(formattedRecord)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to create cooperation record: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error('No cooperation record was created');
    }
    
    // Process notifications for the receiving agent
    await processCooperationNotification(result.data[0]);
    
    logger.info(`Created cooperation record: ${result.data[0].id} (${formattedRecord.cooperation_type})`);
    return result.data[0];
  } catch (error) {
    logger.error(`Error in createCooperation: ${error.message}`);
    throw error;
  }
}

/**
 * Update a cooperation record with response
 * @param {string} cooperationId - ID of the cooperation record
 * @param {Object} updateData - Update data with status and response
 * @returns {Promise<Object>} Updated cooperation record
 */
async function updateCooperation(cooperationId, updateData) {
  try {
    // Validate status if provided
    if (updateData.status && !Object.values(CooperationStatus).includes(updateData.status)) {
      throw new Error(`Invalid status: ${updateData.status}`);
    }
    
    // Prepare update object
    const update = {
      updated_at: new Date().toISOString()
    };
    
    if (updateData.status) update.status = updateData.status;
    if (updateData.response_data) update.response_data = updateData.response_data;
    if (updateData.metadata) update.metadata = updateData.metadata;
    
    // Update the record in Supabase
    const result = await executeQuery((client) => 
      client.from(TABLES.agentCooperation)
        .update(update)
        .eq('id', cooperationId)
        .select());
    
    if (result.error) {
      throw new Error(`Failed to update cooperation record: ${result.error.message}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error(`Cooperation record not found: ${cooperationId}`);
    }
    
    // Process response notification
    if (updateData.status) {
      await processCooperationResponse(result.data[0]);
    }
    
    logger.info(`Updated cooperation record: ${cooperationId} to status ${updateData.status || 'unchanged'}`);
    return result.data[0];
  } catch (error) {
    logger.error(`Error in updateCooperation: ${error.message}`);
    throw error;
  }
}

/**
 * Get cooperation records by specified filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Cooperation records
 */
async function getCooperationRecords(filters = {}) {
  try {
    // Build query based on filters
    const result = await executeQuery((client) => {
      let query = client.from(TABLES.agentCooperation).select('*');
      
      // Apply filters
      if (filters.id) {
        query = query.eq('id', filters.id);
      }
      
      if (filters.initiator_agent_id) {
        query = query.eq('initiator_agent_id', filters.initiator_agent_id);
      }
      
      if (filters.receiver_agent_id) {
        query = query.eq('receiver_agent_id', filters.receiver_agent_id);
      }
      
      if (filters.cooperation_type) {
        query = query.eq('cooperation_type', filters.cooperation_type);
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.agent_id) {
        query = query.or(`initiator_agent_id.eq.${filters.agent_id},receiver_agent_id.eq.${filters.agent_id}`);
      }
      
      // Sorting and pagination
      query = query.order('created_at', { ascending: filters.ascending === true });
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
      
      return query;
    });
    
    if (result.error) {
      throw new Error(`Failed to fetch cooperation records: ${result.error.message}`);
    }
    
    return result.data || [];
  } catch (error) {
    logger.error(`Error in getCooperationRecords: ${error.message}`);
    throw error;
  }
}

/**
 * Process a new cooperation notification
 * @param {Object} cooperationRecord - The cooperation record
 * @returns {Promise<void>}
 * @private
 */
async function processCooperationNotification(cooperationRecord) {
  try {
    // In a real implementation, this would send notifications to the receiving agent
    // For now, we just log the notification
    logger.info(`Cooperation notification: ${cooperationRecord.id} - ${cooperationRecord.cooperation_type} - ${cooperationRecord.initiator_agent_id} -> ${cooperationRecord.receiver_agent_id}`);
    
    // Automatic handling for certain types could go here
    // For example, auto-accepting certain cooperation types
  } catch (error) {
    logger.error(`Error processing cooperation notification: ${error.message}`);
  }
}

/**
 * Process a cooperation response
 * @param {Object} cooperationRecord - The updated cooperation record
 * @returns {Promise<void>}
 * @private
 */
async function processCooperationResponse(cooperationRecord) {
  try {
    // In a real implementation, this would notify the initiating agent about the response
    // For now, we just log the response
    logger.info(`Cooperation response: ${cooperationRecord.id} - ${cooperationRecord.status} - ${cooperationRecord.initiator_agent_id} <- ${cooperationRecord.receiver_agent_id}`);
    
    // Handle accepted cooperation based on type
    if (cooperationRecord.status === CooperationStatus.ACCEPTED) {
      await handleAcceptedCooperation(cooperationRecord);
    }
    
    // Handle rejected cooperation
    if (cooperationRecord.status === CooperationStatus.REJECTED) {
      await handleRejectedCooperation(cooperationRecord);
    }
  } catch (error) {
    logger.error(`Error processing cooperation response: ${error.message}`);
  }
}

/**
 * Handle an accepted cooperation request
 * @param {Object} cooperationRecord - The cooperation record
 * @returns {Promise<void>}
 * @private
 */
async function handleAcceptedCooperation(cooperationRecord) {
  try {
    // Handle different cooperation types
    switch (cooperationRecord.cooperation_type) {
      case CooperationTypes.DECISION_VOTE:
        await processDecisionVote(cooperationRecord);
        break;
        
      case CooperationTypes.RISK_COORDINATION:
        await processRiskCoordination(cooperationRecord);
        break;
        
      case CooperationTypes.EXECUTION_DELEGATION:
        await processExecutionDelegation(cooperationRecord);
        break;
        
      default:
        // No additional handling needed for other types
        break;
    }
  } catch (error) {
    logger.error(`Error handling accepted cooperation: ${error.message}`);
  }
}

/**
 * Handle a rejected cooperation request
 * @param {Object} cooperationRecord - The cooperation record
 * @returns {Promise<void>}
 * @private
 */
async function handleRejectedCooperation(cooperationRecord) {
  try {
    // Log rejection reasons if available
    if (cooperationRecord.response_data && cooperationRecord.response_data.reason) {
      logger.info(`Cooperation rejected (${cooperationRecord.id}): ${cooperationRecord.response_data.reason}`);
    }
    
    // Handle rejection for specific cooperation types
    if (cooperationRecord.cooperation_type === CooperationTypes.EXECUTION_DELEGATION) {
      // Notify initiator that they need to handle execution themselves
      logger.info(`Execution delegation rejected: ${cooperationRecord.id} - Initiator needs to handle execution`);
    }
  } catch (error) {
    logger.error(`Error handling rejected cooperation: ${error.message}`);
  }
}

/**
 * Process a decision vote cooperation
 * @param {Object} cooperationRecord - The cooperation record
 * @returns {Promise<void>}
 * @private
 */
async function processDecisionVote(cooperationRecord) {
  try {
    // In a real implementation, this would tally votes and make a decision
    // For now, we just log the vote
    logger.info(`Decision vote processed: ${cooperationRecord.id}`);
    
    // Update the cooperation record with the vote tally
    const voteData = {
      status: CooperationStatus.COMPLETED,
      metadata: {
        ...cooperationRecord.metadata,
        vote_processed: true,
        processed_at: new Date().toISOString()
      }
    };
    
    await updateCooperation(cooperationRecord.id, voteData);
  } catch (error) {
    logger.error(`Error processing decision vote: ${error.message}`);
  }
}

/**
 * Process a risk coordination cooperation
 * @param {Object} cooperationRecord - The cooperation record
 * @returns {Promise<void>}
 * @private
 */
async function processRiskCoordination(cooperationRecord) {
  try {
    // In a real implementation, this would coordinate risk parameters
    // For now, we just log the coordination
    logger.info(`Risk coordination processed: ${cooperationRecord.id}`);
    
    // Update the cooperation record
    const coordinationData = {
      status: CooperationStatus.COMPLETED,
      metadata: {
        ...cooperationRecord.metadata,
        coordination_processed: true,
        processed_at: new Date().toISOString()
      }
    };
    
    await updateCooperation(cooperationRecord.id, coordinationData);
  } catch (error) {
    logger.error(`Error processing risk coordination: ${error.message}`);
  }
}

/**
 * Process an execution delegation cooperation
 * @param {Object} cooperationRecord - The cooperation record
 * @returns {Promise<void>}
 * @private
 */
async function processExecutionDelegation(cooperationRecord) {
  try {
    // In a real implementation, this would delegate execution to another agent
    // For now, we just log the delegation
    logger.info(`Execution delegation processed: ${cooperationRecord.id}`);
    
    // Update the cooperation record
    const delegationData = {
      status: CooperationStatus.COMPLETED,
      metadata: {
        ...cooperationRecord.metadata,
        delegation_processed: true,
        processed_at: new Date().toISOString()
      }
    };
    
    await updateCooperation(cooperationRecord.id, delegationData);
  } catch (error) {
    logger.error(`Error processing execution delegation: ${error.message}`);
  }
}

module.exports = {
  createCooperation,
  updateCooperation,
  getCooperationRecords,
  CooperationTypes,
  CooperationStatus
}; 