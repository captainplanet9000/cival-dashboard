/**
 * Type definitions for the Farm Management dashboard
 * 
 * These types align with the Neon PostgreSQL database schema
 * and integrate with the Trading Farm dashboard design system.
 */

// Farm Status Types
export type FarmStatus = 'active' | 'paused' | 'offline' | 'maintenance' | 'error';
export type BossmanStatus = 'coordinating' | 'idle' | 'learning' | 'offline' | 'error';
export type BossmanModel = 'ElizaOS-Basic' | 'ElizaOS-Advanced' | 'ElizaOS-Expert';

// Agent Types
export type AgentRole = 'trader' | 'analyst' | 'risk-manager' | 'coordinator';
export type AgentStatus = 'active' | 'paused' | 'training' | 'offline';
export type AgentType = 'trend' | 'reversal' | 'arbitrage' | 'custom';
export type AgentLevel = 'basic' | 'advanced' | 'expert';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AutomationLevel = 'none' | 'semi' | 'full';
export type InstructionCategory = 'general' | 'risk' | 'market' | 'timing' | 'strategy';
export type InstructionImpact = 'low' | 'medium' | 'high';
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | 'Daily' | 'Weekly';

// Message Bus Types
export type MessageStatus = 'sent' | 'delivered' | 'failed';
export type MessageType = 'command' | 'data' | 'alert' | 'coordination' | 'status';

// Strategy Document Types
export type DocumentType = 'strategy' | 'analysis' | 'research' | 'risk' | 'technical' | 'fundamental';

// Farm Interfaces
export interface BossmanInfo {
  model: string;
  status: 'coordinating' | 'idle' | 'error';
}

export interface FarmResources {
  cpu: number;
  memory: number;
  storage?: number;
  network?: number;
}

// Farm Stats Interface
export interface FarmStats {
  farms: {
    activeFarms: number;
    totalFarms: number;
    pausedFarms: number;
    errorFarms: number;
  };
  messageBus: {
    load: number;
    recentActivity: Array<{
      id: string;
      messageType: string;
      content: string;
      sentAt: string;
      status: string;
      priority: number;
    }>;
    successRate: number;
    messagesProcessed24h: number;
  };
  strategyDocuments: {
    totalCount: number;
    typeDistribution: Record<string, number>;
    recentDocuments: Array<{
      id: string;
      title: string;
      type: string;
      createdAt: string;
      lastUpdated: string;
      source: string;
      relevanceScore: number;
    }>;
  };
  performance: {
    averagePerformance: number;
    topPerformer: Farm | null;
    worstPerformer: Farm | null;
  };
  system: {
    status: string;
    lastUpdated: string;
    apiLatency: number;
    cpuLoad: number;
    memoryUsage: number;
  };
  bossman: {
    coordinating: number;
    models: {
      [key: string]: number;
    };
  };
  infrastructure: {
    cpuUtilization: number;
    memoryUtilization: number;
    networkUtilization: number;
  };
}

export interface Farm {
  id: string;
  name: string;
  status: FarmStatus;
  agents: number;
  createdAt: string;
  lastActive: string;
  performance: number;
  resources: FarmResources;
  bossman: BossmanInfo;
}

export interface FarmResource {
  id: string;
  farmId: string;
  cpu: number;
  memory: number;
  bandwidth: number;
  recordedAt: string;
}

export interface FarmOverview {
  totalFarms: number;
  activeFarms: number;
  pausedFarms: number;
  offlineFarms: number;
  totalAgents: number;
  activeAgents: number;
  messageBusHealth: number; // percentage
  knowledgeBaseHealth: number; // percentage
}

// Agent Interfaces
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  type: AgentType;
  performance: number;
  trades: number;
  winRate: number;
  createdAt: string;
  specialization: string[];
  level: AgentLevel;
  description?: string;
  settings?: AgentSettings;
}

export interface AgentSettings {
  risk_level?: RiskLevel;
  max_drawdown?: number;
  position_sizing?: number;
  trades_per_day?: number;
  automation_level?: AutomationLevel;
  timeframes?: TimeFrame[];
  indicators?: string[];
}

export interface AgentInstruction {
  id: string;
  agentId: string;
  content: string;
  createdAt: string;
  enabled: boolean;
  category: InstructionCategory;
  impact: InstructionImpact;
}

// Message Bus
export interface MessageBus {
  id: string;
  sourceFarmId?: string;
  sourceFarmName?: string;
  targetFarmId?: string;
  targetFarmName?: string;
  messageType: MessageType;
  content: any;
  sentAt: string;
  status: MessageStatus;
  priority: number;
}

export interface MessageBusOverview {
  totalMessages24h: number;
  successRate: number;
  avgLatency: number;
  byType: Record<MessageType, number>;
}

// Strategy Documents
export interface StrategyDocument {
  id: string;
  title: string;
  type: 'analysis' | 'strategy' | 'report' | 'guide';
  createdAt: string;
  lastUpdated: string;
  source: string;
  relevanceScore: number;
}

// Farm Creation
export interface CreateFarmPayload {
  name: string;
  description?: string;
  bossman: {
    model: BossmanModel;
  };
  priority?: number;
}

export interface FarmCreateRequest {
  name: string;
  initialStatus?: FarmStatus;
  bossmanModel?: string;
}

export interface MessageBusActivity {
  id: string;
  timestamp: string;
  sourceId: string;
  targetId: string;
  messageType: 'command' | 'data' | 'alert' | 'coordination' | 'status';
  priority: number;
  size: number;
}

// Charts data types
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface MessageFlowData {
  source: string;
  target: string;
  value: number;
  type: MessageType;
}
