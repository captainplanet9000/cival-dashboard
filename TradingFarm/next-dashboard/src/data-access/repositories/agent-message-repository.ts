import { BaseRepository } from '../../lib/base-repository';
import { AgentMessage } from '../models/agent-message';

/**
 * Repository for managing agent messages in the database
 */
export class AgentMessageRepository extends BaseRepository<AgentMessage> {
  constructor() {
    super('agent_messages');
  }

  /**
   * Get messages for a specific agent
   */
  async getByAgentId(agentId: number, options: { limit?: number; offset?: number; sortDirection?: 'asc' | 'desc' } = {}) {
    const { limit = 100, offset = 0, sortDirection = 'desc' } = options;
    
    const query = this.client
      .from(this.tableName)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: sortDirection === 'asc' })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    
    if (error) {
      this.handleError(error);
      return [];
    }
    
    return data as AgentMessage[];
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: number[]) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString(),
        delivery_status: 'read' 
      })
      .in('id', messageIds)
      .select();
    
    if (error) {
      this.handleError(error);
      return false;
    }
    
    return true;
  }

  /**
   * Get unread message count for an agent
   */
  async getUnreadCount(agentId: number) {
    const { count, error } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('is_read', false);
    
    if (error) {
      this.handleError(error);
      return 0;
    }
    
    return count || 0;
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(messageId: number, status: AgentMessage['delivery_status']) {
    return this.update(messageId, { delivery_status: status });
  }
} 