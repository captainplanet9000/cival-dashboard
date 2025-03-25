/**
 * Neon PostgreSQL client for Trading Farm system
 * Handles structured data for user accounts, farms, strategies, trades, etc.
 */
import { Pool, PoolClient } from 'pg';
import { NEON_CONFIG } from './config';

// Type definitions for the main database entities
export interface Farm {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'maintenance';
  boss_man_model: string;
  created_at: Date;
  agent_count?: number;
  strategy_count?: number;
}

export interface Agent {
  id: string;
  farm_id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'training';
  performance: number;
  allocation: number;
  created_at: Date;
  trades?: number;
  win_rate?: number;
  vector_id?: string;
  wins?: number;
  losses?: number;
  profit_factor?: number;
  max_drawdown?: number;
  risk_score?: number;
  last_trade_time?: Date | string;
}

export interface Strategy {
  id: string;
  farm_id: string;
  name: string;
  parameters: Record<string, any>;
  status: 'active' | 'paused' | 'backtest';
  performance: number;
  created_at: Date;
}

export interface Trade {
  id: string;
  strategy_id: string;
  symbol: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  direction: 'long' | 'short';
  status: 'open' | 'closed' | 'pending';
  pnl: number | null;
  entry_time: Date;
  exit_time: Date | null;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  timeline_days: number;
  created_at: Date;
  completed_at: Date | null;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  direction: 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  farm_id?: string; // Optional link to farm
}

// Main database client class
class NeonClient {
  private pool: Pool | null = null;
  private connectionString: string;
  
  constructor(connectionString?: string) {
    // Use provided connection string or default from config
    this.connectionString = connectionString || 
      (NEON_CONFIG.connectionString as string) ||
      '';
    
    if (!this.connectionString) {
      console.error('Missing Neon database connection string');
    }
  }
  
  // Initialize connection pool
  public async initialize(): Promise<void> {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: true,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      });
      
      // Test connection
      try {
        const client = await this.pool.connect();
        console.log('Successfully connected to Neon PostgreSQL database');
        client.release();
      } catch (error) {
        console.error('Failed to connect to Neon PostgreSQL database:', error);
        throw error;
      }
    }
  }
  
  // Get client from pool
  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      await this.initialize();
    }
    return this.pool!.connect();
  }
  
  // Create the database schema if it doesn't exist
  public async setupSchema(): Promise<void> {
    const client = await this.getClient();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Create schemas if they don't exist
      for (const schema of Object.values(NEON_CONFIG.schemas)) {
        await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      }
      
      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEON_CONFIG.schemas.farms}.farms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          boss_man_model VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEON_CONFIG.schemas.farms}.agents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          farm_id UUID NOT NULL REFERENCES ${NEON_CONFIG.schemas.farms}.farms(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          performance DECIMAL(10,2),
          allocation DECIMAL(10,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEON_CONFIG.schemas.trading}.strategies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          farm_id UUID NOT NULL REFERENCES ${NEON_CONFIG.schemas.farms}.farms(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          parameters JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          performance DECIMAL(10,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEON_CONFIG.schemas.trading}.trades (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          strategy_id UUID NOT NULL REFERENCES ${NEON_CONFIG.schemas.trading}.strategies(id) ON DELETE CASCADE,
          symbol VARCHAR(50) NOT NULL,
          entry_price DECIMAL(20,8) NOT NULL,
          exit_price DECIMAL(20,8),
          quantity DECIMAL(20,8) NOT NULL,
          direction VARCHAR(10) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          pnl DECIMAL(20,8),
          entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          exit_time TIMESTAMP WITH TIME ZONE
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEON_CONFIG.schemas.users}.goals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          target_value DECIMAL(20,8) NOT NULL,
          current_value DECIMAL(20,8) NOT NULL DEFAULT 0,
          timeline_days INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEON_CONFIG.schemas.wallet}.transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          amount DECIMAL(20,8) NOT NULL,
          direction VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          farm_id UUID REFERENCES ${NEON_CONFIG.schemas.farms}.farms(id) ON DELETE SET NULL
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${NEON_CONFIG.schemas.trading}.agent_trades (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID NOT NULL,
          symbol VARCHAR(50) NOT NULL,
          entry_price DECIMAL(20,8) NOT NULL,
          exit_price DECIMAL(20,8),
          quantity DECIMAL(20,8) NOT NULL,
          direction VARCHAR(10) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          pnl DECIMAL(20,8),
          entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          exit_time TIMESTAMP WITH TIME ZONE
        )
      `);
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('Database schema setup complete');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('Failed to setup database schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Close all connections
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
  
  // Farm CRUD operations
  public async createFarm(farm: Omit<Farm, 'id' | 'created_at'>): Promise<Farm> {
    const client = await this.getClient();
    
    try {
      const { rows } = await client.query(
        `INSERT INTO ${NEON_CONFIG.schemas.farms}.farms 
         (name, status, boss_man_model) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [farm.name, farm.status, farm.boss_man_model]
      );
      
      return rows[0];
    } finally {
      client.release();
    }
  }
  
  public async getFarms(): Promise<Farm[]> {
    const client = await this.getClient();
    
    try {
      const { rows } = await client.query(`
        SELECT 
          f.*,
          (SELECT COUNT(*) FROM ${NEON_CONFIG.schemas.farms}.agents WHERE farm_id = f.id) as agent_count,
          (SELECT COUNT(*) FROM ${NEON_CONFIG.schemas.trading}.strategies WHERE farm_id = f.id) as strategy_count
        FROM ${NEON_CONFIG.schemas.farms}.farms f
        ORDER BY created_at DESC
      `);
      
      return rows;
    } finally {
      client.release();
    }
  }
  
  public async getFarmById(id: string): Promise<Farm | null> {
    const client = await this.getClient();
    
    try {
      const { rows } = await client.query(`
        SELECT 
          f.*,
          (SELECT COUNT(*) FROM ${NEON_CONFIG.schemas.farms}.agents WHERE farm_id = f.id) as agent_count,
          (SELECT COUNT(*) FROM ${NEON_CONFIG.schemas.trading}.strategies WHERE farm_id = f.id) as strategy_count
        FROM ${NEON_CONFIG.schemas.farms}.farms f
        WHERE f.id = $1
      `, [id]);
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      client.release();
    }
  }
  
  public async updateFarm(id: string, farm: Partial<Farm>): Promise<Farm | null> {
    const client = await this.getClient();
    
    try {
      // Build SET clause dynamically based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (farm.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(farm.name);
        paramIndex++;
      }
      
      if (farm.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(farm.status);
        paramIndex++;
      }
      
      if (farm.boss_man_model !== undefined) {
        updates.push(`boss_man_model = $${paramIndex}`);
        values.push(farm.boss_man_model);
        paramIndex++;
      }
      
      if (updates.length === 0) {
        return this.getFarmById(id);
      }
      
      values.push(id);
      
      const { rows } = await client.query(
        `UPDATE ${NEON_CONFIG.schemas.farms}.farms 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        values
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      client.release();
    }
  }
  
  public async deleteFarm(id: string): Promise<boolean> {
    const client = await this.getClient();
    
    try {
      const { rowCount } = await client.query(
        `DELETE FROM ${NEON_CONFIG.schemas.farms}.farms WHERE id = $1`,
        [id]
      );
      
      return rowCount !== null && rowCount > 0;
    } finally {
      client.release();
    }
  }
  
  // Agent CRUD operations
  public async createAgent(agent: Omit<Agent, 'id' | 'created_at'>): Promise<Agent> {
    const client = await this.getClient();
    
    try {
      const { rows } = await client.query(
        `INSERT INTO ${NEON_CONFIG.schemas.farms}.agents 
         (farm_id, name, type, status, performance, allocation) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [agent.farm_id, agent.name, agent.type, agent.status, agent.performance, agent.allocation]
      );
      
      return rows[0];
    } finally {
      client.release();
    }
  }
  
  public async getAgents(farmId?: string): Promise<Agent[]> {
    const client = await this.getClient();
    
    try {
      let query = `
        SELECT * FROM ${NEON_CONFIG.schemas.farms}.agents
      `;
      
      const values: any[] = [];
      if (farmId) {
        query += ' WHERE farm_id = $1';
        values.push(farmId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const { rows } = await client.query(query, values);
      return rows;
    } finally {
      client.release();
    }
  }
  
  public async getAgent(id: string): Promise<Agent | null> {
    const client = await this.getClient();
    
    try {
      const { rows } = await client.query(
        `SELECT * FROM ${NEON_CONFIG.schemas.farms}.agents WHERE id = $1`,
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      client.release();
    }
  }
  
  public async updateAgent(id: string, agent: Partial<Agent>): Promise<Agent | null> {
    const client = await this.getClient();
    
    try {
      // Build SET clause dynamically based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(agent)) {
        if (key !== 'id' && key !== 'created_at') {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (updates.length === 0) {
        return this.getAgent(id);
      }
      
      values.push(id);
      
      const { rows } = await client.query(
        `UPDATE ${NEON_CONFIG.schemas.farms}.agents 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        values
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      client.release();
    }
  }
  
  public async deleteAgent(id: string): Promise<boolean> {
    const client = await this.getClient();
    
    try {
      const { rowCount } = await client.query(
        `DELETE FROM ${NEON_CONFIG.schemas.farms}.agents WHERE id = $1`,
        [id]
      );
      
      return rowCount !== null && rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Agent Trade CRUD operations
  public async createAgentTrade(trade: Omit<any, 'id'>): Promise<any> {
    const client = await this.getClient();
    
    try {
      const fields = Object.keys(trade);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(trade);
      
      const { rows } = await client.query(
        `INSERT INTO ${NEON_CONFIG.schemas.trading}.agent_trades 
         (${fields.join(', ')}) 
         VALUES (${placeholders}) 
         RETURNING *`,
        values
      );
      
      return rows[0];
    } finally {
      client.release();
    }
  }
  
  public async getAgentTrades(agentId: string): Promise<any[]> {
    const client = await this.getClient();
    
    try {
      const { rows } = await client.query(
        `SELECT * FROM ${NEON_CONFIG.schemas.trading}.agent_trades 
         WHERE agent_id = $1
         ORDER BY created_at DESC`,
        [agentId]
      );
      
      return rows;
    } finally {
      client.release();
    }
  }
  
  public async getAgentTrade(id: string): Promise<any | null> {
    const client = await this.getClient();
    
    try {
      const { rows } = await client.query(
        `SELECT * FROM ${NEON_CONFIG.schemas.trading}.agent_trades WHERE id = $1`,
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      client.release();
    }
  }
  
  public async updateAgentTrade(id: string, trade: Partial<any>): Promise<any | null> {
    const client = await this.getClient();
    
    try {
      // Build SET clause dynamically based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      for (const [key, value] of Object.entries(trade)) {
        if (key !== 'id') {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (updates.length === 0) {
        return this.getAgentTrade(id);
      }
      
      values.push(id);
      
      const { rows } = await client.query(
        `UPDATE ${NEON_CONFIG.schemas.trading}.agent_trades 
         SET ${updates.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        values
      );
      
      return rows.length > 0 ? rows[0] : null;
    } finally {
      client.release();
    }
  }
  
  public async deleteAgentTrade(id: string): Promise<boolean> {
    const client = await this.getClient();
    
    try {
      const { rowCount } = await client.query(
        `DELETE FROM ${NEON_CONFIG.schemas.trading}.agent_trades WHERE id = $1`,
        [id]
      );
      
      return rowCount !== null && rowCount > 0;
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const neonClient = new NeonClient();
export default neonClient;
