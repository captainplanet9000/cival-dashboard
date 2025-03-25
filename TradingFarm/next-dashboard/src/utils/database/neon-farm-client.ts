'use server';

/**
 * Neon PostgreSQL Farm Management Client
 * 
 * Server-only utility functions for interacting with the Neon database
 * specifically for farm management functionality.
 */

import { Client } from 'pg';
import { 
  Farm, 
  Agent, 
  AgentSettings, 
  AgentInstruction, 
  FarmResource,
  MessageBus,
  StrategyDocument
} from '@/types/farm-management';

// Connection configuration - environment variables should be set in .env.local
const getConnectionConfig = () => ({
  connectionString: process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_bzh81tQOZMIJ@ep-gentle-silence-a5h1nd5p-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Execute a database query with proper connection management
 */
async function executeQuery<T>(queryFn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client(getConnectionConfig());
  
  try {
    await client.connect();
    return await queryFn(client);
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

/**
 * Farm Management Functions
 */

// Fetch all farms
export async function getAllFarms(): Promise<Farm[]> {
  return executeQuery(async (client) => {
    const result = await client.query(`
      SELECT 
        f.id, f.name, f.status, f.created_at, f.last_active, 
        f.performance, f.description, f.priority, 
        f.bossman_model, f.bossman_status,
        COUNT(a.id) AS agent_count,
        COALESCE(
          jsonb_build_object(
            'cpu', MAX(CASE WHEN fr.cpu_usage IS NOT NULL THEN fr.cpu_usage ELSE 0 END),
            'memory', MAX(CASE WHEN fr.memory_usage IS NOT NULL THEN fr.memory_usage ELSE 0 END),
            'bandwidth', MAX(CASE WHEN fr.bandwidth_usage IS NOT NULL THEN fr.bandwidth_usage ELSE 0 END)
          ),
          jsonb_build_object('cpu', 0, 'memory', 0, 'bandwidth', 0)
        ) AS resources
      FROM farms f
      LEFT JOIN agents a ON f.id = a.farm_id
      LEFT JOIN farm_resources fr ON f.id = fr.farm_id AND fr.recorded_at = (
        SELECT MAX(recorded_at) FROM farm_resources 
        WHERE farm_id = f.id
      )
      GROUP BY f.id
      ORDER BY f.priority DESC, f.name
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      agents: parseInt(row.agent_count) || 0,
      createdAt: row.created_at.toISOString(),
      lastActive: row.last_active.toISOString(),
      performance: parseFloat(row.performance) || 0,
      resources: row.resources,
      bossman: {
        model: row.bossman_model,
        status: row.bossman_status,
        instructions: 0 // This will be populated in a separate query if needed
      },
      description: row.description,
      priority: row.priority
    }));
  });
}

// Get specific farm by ID
export async function getFarmById(farmId: string): Promise<Farm | null> {
  return executeQuery(async (client) => {
    const result = await client.query(`
      SELECT 
        f.id, f.name, f.status, f.created_at, f.last_active, 
        f.performance, f.description, f.priority, 
        f.bossman_model, f.bossman_status,
        COUNT(a.id) AS agent_count,
        COALESCE(
          jsonb_build_object(
            'cpu', MAX(CASE WHEN fr.cpu_usage IS NOT NULL THEN fr.cpu_usage ELSE 0 END),
            'memory', MAX(CASE WHEN fr.memory_usage IS NOT NULL THEN fr.memory_usage ELSE 0 END),
            'bandwidth', MAX(CASE WHEN fr.bandwidth_usage IS NOT NULL THEN fr.bandwidth_usage ELSE 0 END)
          ),
          jsonb_build_object('cpu', 0, 'memory', 0, 'bandwidth', 0)
        ) AS resources
      FROM farms f
      LEFT JOIN agents a ON f.id = a.farm_id
      LEFT JOIN farm_resources fr ON f.id = fr.farm_id AND fr.recorded_at = (
        SELECT MAX(recorded_at) FROM farm_resources 
        WHERE farm_id = f.id
      )
      WHERE f.id = $1
      GROUP BY f.id
    `, [farmId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      agents: parseInt(row.agent_count) || 0,
      createdAt: row.created_at.toISOString(),
      lastActive: row.last_active.toISOString(),
      performance: parseFloat(row.performance) || 0,
      resources: row.resources,
      bossman: {
        model: row.bossman_model,
        status: row.bossman_status,
        instructions: 0 // This will be populated in a separate query if needed
      },
      description: row.description,
      priority: row.priority
    };
  });
}

// Create a new farm
export async function createFarm(farm: Omit<Farm, 'id' | 'agents' | 'createdAt' | 'lastActive'>): Promise<Farm> {
  return executeQuery(async (client) => {
    // First, insert the farm
    const farmResult = await client.query(`
      INSERT INTO farms (
        name, status, performance, description, 
        priority, bossman_model, bossman_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      farm.name,
      farm.status,
      farm.performance || 0,
      farm.description,
      farm.priority || 1,
      farm.bossman?.model,
      farm.bossman?.status || 'idle'
    ]);
    
    const newFarm = farmResult.rows[0];
    
    // Then, insert initial resource metrics
    if (farm.resources) {
      await client.query(`
        INSERT INTO farm_resources (
          farm_id, cpu_usage, memory_usage, bandwidth_usage
        ) VALUES ($1, $2, $3, $4)
      `, [
        newFarm.id,
        farm.resources.cpu || 0,
        farm.resources.memory || 0,
        farm.resources.bandwidth || 0
      ]);
    }
    
    return {
      id: newFarm.id,
      name: newFarm.name,
      status: newFarm.status,
      agents: 0,
      createdAt: newFarm.created_at.toISOString(),
      lastActive: newFarm.last_active.toISOString(),
      performance: parseFloat(newFarm.performance) || 0,
      resources: farm.resources || { cpu: 0, memory: 0, bandwidth: 0 },
      bossman: {
        model: newFarm.bossman_model,
        status: newFarm.bossman_status,
        instructions: 0
      },
      description: newFarm.description,
      priority: newFarm.priority
    };
  });
}

// Update farm status
export async function updateFarmStatus(farmId: string, status: string): Promise<boolean> {
  return executeQuery(async (client) => {
    const result = await client.query(`
      UPDATE farms
      SET status = $1, last_active = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [status, farmId]);
    
    return result.rowCount > 0;
  });
}

// Get farm resource history
export async function getFarmResourceHistory(farmId: string, limit = 24): Promise<FarmResource[]> {
  return executeQuery(async (client) => {
    const result = await client.query(`
      SELECT * FROM farm_resources
      WHERE farm_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2
    `, [farmId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      farmId: row.farm_id,
      cpu: row.cpu_usage,
      memory: row.memory_usage,
      bandwidth: row.bandwidth_usage,
      recordedAt: row.recorded_at.toISOString()
    }));
  });
}

// Get message bus activity
export async function getMessageBusActivity(limit = 50): Promise<MessageBus[]> {
  return executeQuery(async (client) => {
    const result = await client.query(`
      SELECT m.*, 
        sf.name as source_farm_name,
        tf.name as target_farm_name
      FROM message_bus m
      LEFT JOIN farms sf ON m.source_farm_id = sf.id
      LEFT JOIN farms tf ON m.target_farm_id = tf.id
      ORDER BY m.sent_at DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      sourceFarmId: row.source_farm_id,
      sourceFarmName: row.source_farm_name,
      targetFarmId: row.target_farm_id,
      targetFarmName: row.target_farm_name,
      messageType: row.message_type,
      content: row.content,
      sentAt: row.sent_at.toISOString(),
      status: row.status,
      priority: row.priority
    }));
  });
}

// Get strategy documents summary
export async function getStrategyDocumentsSummary(): Promise<{ 
  totalCount: number;
  typeDistribution: Record<string, number>;
  recentDocuments: StrategyDocument[];
}> {
  return executeQuery(async (client) => {
    // Get total count and type distribution
    const countResult = await client.query(`
      SELECT
        COUNT(*) as total,
        jsonb_object_agg(
          document_type, 
          COUNT(*)
        ) as type_distribution
      FROM strategy_documents
    `);
    
    // Get recent documents
    const recentResult = await client.query(`
      SELECT * FROM strategy_documents
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    
    return {
      totalCount: parseInt(countResult.rows[0].total) || 0,
      typeDistribution: countResult.rows[0].type_distribution || {},
      recentDocuments: recentResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        documentType: row.document_type,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        source: row.source,
        tags: row.tags || []
      }))
    };
  });
}

// Get agents by farm
export async function getAgentsByFarm(farmId: string): Promise<Agent[]> {
  return executeQuery(async (client) => {
    const result = await client.query(`
      SELECT 
        a.id, a.name, a.status, a.type, a.performance,
        a.trades, a.win_rate, a.created_at, a.specialization,
        a.level, a.description,
        jsonb_build_object(
          'risk_level', s.risk_level,
          'max_drawdown', s.max_drawdown,
          'position_sizing', s.position_sizing,
          'trades_per_day', s.trades_per_day,
          'automation_level', s.automation_level,
          'timeframes', s.timeframes,
          'indicators', s.indicators
        ) as settings
      FROM agents a
      LEFT JOIN agent_settings s ON a.id = s.agent_id
      WHERE a.farm_id = $1
      ORDER BY a.performance DESC, a.name
    `, [farmId]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      type: row.type,
      performance: parseFloat(row.performance) || 0,
      trades: parseInt(row.trades) || 0,
      winRate: parseFloat(row.win_rate) || 0,
      createdAt: row.created_at.toISOString(),
      specialization: row.specialization || [],
      level: row.level,
      description: row.description,
      settings: row.settings || {}
    }));
  });
}

// Get agent instructions
export async function getAgentInstructions(agentId: string): Promise<AgentInstruction[]> {
  return executeQuery(async (client) => {
    const result = await client.query(`
      SELECT * FROM agent_instructions
      WHERE agent_id = $1
      ORDER BY created_at DESC
    `, [agentId]);
    
    return result.rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      content: row.content,
      createdAt: row.created_at.toISOString(),
      enabled: row.enabled,
      category: row.category,
      impact: row.impact
    }));
  });
}

// Export default client with all functions
const neonFarmClient = {
  getAllFarms,
  getFarmById,
  createFarm,
  updateFarmStatus,
  getFarmResourceHistory,
  getMessageBusActivity,
  getStrategyDocumentsSummary,
  getAgentsByFarm,
  getAgentInstructions
};

export default neonFarmClient;
