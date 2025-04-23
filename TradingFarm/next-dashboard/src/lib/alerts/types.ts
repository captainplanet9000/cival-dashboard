/**
 * Alert System Types
 * 
 * Core types for the alerting system to notify users of
 * important trading events, errors, and critical conditions.
 */

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Alert status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

/**
 * Alert category
 */
export enum AlertCategory {
  SYSTEM = 'system',
  TRADING = 'trading',
  RISK = 'risk',
  ACCOUNT = 'account',
  PERFORMANCE = 'performance',
  STRATEGY = 'strategy',
  SECURITY = 'security',
  COMPLIANCE = 'compliance'
}

/**
 * Alert source
 */
export enum AlertSource {
  AGENT = 'agent',
  EXCHANGE = 'exchange',
  RISK_MANAGER = 'risk_manager',
  STRATEGY = 'strategy',
  SYSTEM = 'system',
  USER = 'user'
}

/**
 * Alert model
 */
export interface Alert {
  id: string;
  userId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  source: AlertSource;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  dismissedAt?: string;
  expiresAt?: string;
  metadata: Record<string, any>;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionRequired?: boolean;
  actions?: AlertAction[];
}

/**
 * Alert action for user response
 */
export interface AlertAction {
  id: string;
  label: string;
  type: 'dismiss' | 'acknowledge' | 'resolve' | 'view' | 'custom';
  url?: string;
  apiEndpoint?: string;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

/**
 * Alert rule for automated alert generation
 */
export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  message: string;
  actionRequired: boolean;
  category: AlertCategory;
  throttlingPeriod?: number; // in minutes
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
  cooldownPeriod?: number; // in minutes
}

/**
 * Alert condition for rules
 */
export interface AlertCondition {
  type: 'threshold' | 'pattern' | 'status' | 'comparison';
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'not_contains';
  value: any;
  duration?: number; // in minutes
  entityType?: string;
  entityId?: string;
}

/**
 * Alert notification preferences
 */
export interface AlertNotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  minSeverity: AlertSeverity;
  categories: AlertCategory[];
  doNotDisturbStart?: string; // HH:MM format
  doNotDisturbEnd?: string; // HH:MM format
  throttlingPeriod?: number; // in minutes
  disabled: boolean;
}

/**
 * Alert stats summary
 */
export interface AlertStats {
  totalActive: number;
  totalUnacknowledged: number;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
  actionRequired: number;
}
