// Types for the alert system

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertCategory {
  SYSTEM = 'system',
  EXCHANGE = 'exchange',
  STRATEGY = 'strategy',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  DATABASE = 'database',
  ELIZAOS = 'elizaos'
}

export enum AlertStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export enum DeliveryChannel {
  APP = 'app',
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  PUSH = 'push'
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  source: string;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

export interface AlertAction {
  id: string;
  label: string;
  actionType: 'resolve' | 'acknowledge' | 'view_details' | 'run_command' | 'navigate';
  destination?: string; // URL or command to run
}

export interface AlertFilter {
  severity?: AlertSeverity[];
  category?: AlertCategory[];
  status?: AlertStatus[];
  source?: string[];
  timeRange?: {
    from: Date;
    to: Date;
  };
  search?: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  schedule?: NotificationSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCondition {
  id: string;
  type: 'severity' | 'category' | 'source' | 'message_contains' | 'count_threshold';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface NotificationAction {
  id: string;
  channel: DeliveryChannel;
  template?: string;
  recipients?: string[];
  throttle?: {
    maxAlerts: number;
    periodMinutes: number;
  };
  webhookUrl?: string;
}

export interface NotificationSchedule {
  activeTimeStart: string; // HH:MM format
  activeTimeEnd: string; // HH:MM format
  activeDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  timezone: string;
}

export interface AlertSummary {
  total: number;
  unread: number;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
}
