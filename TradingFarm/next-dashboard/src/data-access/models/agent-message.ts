/**
 * Agent Message model for storing communication records
 */
import { BaseEntity } from './base-entity';

export interface AgentMessage extends BaseEntity {
  agent_id: number;
  farm_id: number;
  direction: 'inbound' | 'outbound'; // inbound = from system to agent, outbound = from agent to system
  message_type: 'command' | 'query' | 'response' | 'notification' | 'log';
  content: string;
  metadata?: {
    context?: Record<string, any>;
    source?: string;
    importance?: 'low' | 'normal' | 'high' | 'critical';
    thread_id?: string;
    reply_to_id?: number;
    tags?: string[];
    execution_time_ms?: number;
  };
  is_read: boolean;
  read_at?: string;
  delivery_status: 'pending' | 'delivered' | 'failed' | 'read';
} 