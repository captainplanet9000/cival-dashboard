export enum AgentRole {
  COORDINATOR = 'coordinator',
  EXECUTOR = 'executor',
  ANALYZER = 'analyzer',
  RISK_MANAGER = 'risk_manager',
  OBSERVER = 'observer'
}

export interface AgentPermissions {
  canIssueCommands: boolean;
  canOverrideDecisions: boolean;
  canAccessFunds: boolean;
  fundAccessLimit: number;
  canModifyStrategies: boolean;
  canRecruitAgents: boolean;
}

export enum MessagePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum MessageType {
  COMMAND = 'command',
  NOTIFICATION = 'notification',
  REQUEST = 'request',
  RESPONSE = 'response',
  BROADCAST = 'broadcast',
  ALERT = 'alert'
}

export interface AgentMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: AgentRole;
  recipientId?: string;
  recipientRole?: AgentRole;
  type: MessageType;
  priority: MessagePriority;
  content: string;
  metadata?: Record<string, any>;
  timestamp: number;
  expiresAt?: number;
  requiresAcknowledgment: boolean;
  requiresResponse: boolean;
  parentMessageId?: string;
  status: 'sent' | 'delivered' | 'read' | 'acknowledged' | 'responded' | 'expired' | 'failed';
}

export enum CoordinationStrategy {
  HIERARCHICAL = 'hierarchical',
  CONSENSUS = 'consensus',
  AUCTION = 'auction',
  MARKET = 'market',
  VOTING = 'voting'
}

export interface ResourceAllocation {
  agentId: string;
  resourceType: 'computing' | 'memory' | 'network' | 'funds' | 'time';
  amount: number;
  priority: number;
  timestamp: number;
  expiresAt?: number;
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  assignedAgentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  priority: number;
  dependencies: string[]; // IDs of tasks that must be completed first
  estimatedDuration: number; // in milliseconds
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

export interface CoordinationProtocol {
  id: string;
  name: string;
  strategy: CoordinationStrategy;
  participatingAgentIds: string[];
  participatingRoles: AgentRole[];
  rules: CoordinationRule[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CoordinationRule {
  id: string;
  condition: string; // JavaScript condition expression
  action: string; // JavaScript action expression
  priority: number;
  description: string;
}

export interface AgentConflict {
  id: string;
  agentIds: string[];
  resourceType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'resolving' | 'resolved' | 'escalated';
  resolutionStrategy?: string;
  detectedAt: number;
  resolvedAt?: number;
}

export interface AgentRelationship {
  agentId1: string;
  agentId2: string;
  relationship: 'superior' | 'subordinate' | 'peer' | 'competitor' | 'collaborator';
  trust: number; // 0-100
  createdAt: number;
  updatedAt: number;
}

export interface AgentCoordinationMetrics {
  agentId: string;
  messagesSent: number;
  messagesReceived: number;
  tasksAssigned: number;
  tasksCompleted: number;
  conflictsInitiated: number;
  conflictsResolved: number;
  collaborationScore: number; // 0-100
  decisionQualityScore: number; // 0-100
  responseTimeAverage: number; // in milliseconds
  updatedAt: number;
} 