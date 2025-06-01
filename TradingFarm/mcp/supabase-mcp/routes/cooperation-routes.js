/**
 * Agent Cooperation Routes
 * 
 * API endpoints for agent cooperation data in Trading Farm.
 * Enables agents to collaborate, share signals, and coordinate trading decisions.
 */

const express = require('express');
const router = express.Router();
const { executeQuery } = require('../supabase-client');
const logger = require('../logger');
const { TABLES } = require('../config');

/**
 * @route   GET /api/agent-cooperation
 * @desc    Get all agent cooperation records
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery((client) => 
      client.from(TABLES.agentCooperation).select('*'));
    
    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }
    
    res.json(result.data || []);
  } catch (error) {
    logger.error(`Error fetching cooperation records: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch cooperation records' });
  }
});

/**
 * @route   GET /api/agent-cooperation/:id
 * @desc    Get a specific agent cooperation record
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await executeQuery((client) => 
      client.from(TABLES.agentCooperation)
        .select('*')
        .eq('id', req.params.id)
        .single());
    
    if (result.error) {
      return res.status(404).json({ error: 'Cooperation record not found' });
    }
    
    res.json(result.data);
  } catch (error) {
    logger.error(`Error fetching cooperation record ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch cooperation record' });
  }
});

/**
 * @route   POST /api/agent-cooperation
 * @desc    Create a new agent cooperation record
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    // Validate request
    const { initiator_agent_id, receiver_agent_id, cooperation_type, data, metadata } = req.body;
    
    if (!initiator_agent_id || !receiver_agent_id || !cooperation_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create cooperation record
    const cooperationRecord = {
      initiator_agent_id,
      receiver_agent_id,
      cooperation_type,
      data: data || {},
      metadata: metadata || {},
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await executeQuery((client) => 
      client.from(TABLES.agentCooperation).insert(cooperationRecord).select());
    
    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }
    
    logger.info(`Created cooperation record: ${initiator_agent_id} -> ${receiver_agent_id} (${cooperation_type})`);
    res.status(201).json(result.data[0]);
  } catch (error) {
    logger.error(`Error creating cooperation record: ${error.message}`);
    res.status(500).json({ error: 'Failed to create cooperation record' });
  }
});

/**
 * @route   PUT /api/agent-cooperation/:id
 * @desc    Update an agent cooperation record
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { status, response_data, metadata } = req.body;
    
    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (status) updateData.status = status;
    if (response_data) updateData.response_data = response_data;
    if (metadata) updateData.metadata = metadata;
    
    const result = await executeQuery((client) => 
      client.from(TABLES.agentCooperation)
        .update(updateData)
        .eq('id', req.params.id)
        .select());
    
    if (result.error || !result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'Cooperation record not found' });
    }
    
    logger.info(`Updated cooperation record ${req.params.id} status: ${status}`);
    res.json(result.data[0]);
  } catch (error) {
    logger.error(`Error updating cooperation record ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to update cooperation record' });
  }
});

/**
 * @route   GET /api/agent-cooperation/agent/:agentId
 * @desc    Get cooperation records for a specific agent (as initiator or receiver)
 * @access  Public
 */
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;
    
    let query = executeQuery((client) => {
      let baseQuery = client.from(TABLES.agentCooperation)
        .select('*')
        .or(`initiator_agent_id.eq.${agentId},receiver_agent_id.eq.${agentId}`);
      
      if (status) {
        baseQuery = baseQuery.eq('status', status);
      }
      
      return baseQuery.order('created_at', { ascending: false });
    });
    
    const result = await query;
    
    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }
    
    res.json(result.data || []);
  } catch (error) {
    logger.error(`Error fetching cooperation records for agent ${req.params.agentId}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch cooperation records' });
  }
});

/**
 * @route   GET /api/agent-cooperation/type/:cooperationType
 * @desc    Get cooperation records of a specific type
 * @access  Public
 */
router.get('/type/:cooperationType', async (req, res) => {
  try {
    const result = await executeQuery((client) => 
      client.from(TABLES.agentCooperation)
        .select('*')
        .eq('cooperation_type', req.params.cooperationType)
        .order('created_at', { ascending: false }));
    
    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }
    
    res.json(result.data || []);
  } catch (error) {
    logger.error(`Error fetching cooperation records of type ${req.params.cooperationType}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch cooperation records' });
  }
});

module.exports = router; 