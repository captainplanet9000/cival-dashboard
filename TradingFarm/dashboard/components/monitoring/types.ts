// Types for system health monitoring

export interface SystemMetric {
  timestamp: string;
  value: number;
}

export interface SystemResource {
  id: string;
  name: string;
  current: number;
  max: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  history: SystemMetric[];
}

export interface ExchangeStatus {
  id: string;
  name: string;
  connected: boolean;
  lastSyncTime: string; 
  apiRateLimit: {
    current: number;
    max: number;
    resetTime: string;
  };
  latency: number; // in ms
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  errors: {
    timestamp: string;
    message: string;
  }[];
}

export interface DatabaseMetric {
  id: string;
  name: string;
  queryLatency: number; // in ms
  connectionCount: number;
  status: 'operational' | 'degraded' | 'down';
  errorRate: number; // percentage
  diskUsage: {
    used: number;
    total: number;
    unit: string;
  };
}

export interface StrategyPerformance {
  id: string;
  name: string;
  executionLatency: number; // in ms
  lastExecutionTime: string;
  errorCount: number;
  status: 'running' | 'paused' | 'error';
}

export interface SystemStatus {
  id: string;
  lastUpdated: string;
  uptime: number; // in seconds
  cpu: SystemResource;
  memory: SystemResource;
  disk: SystemResource;
  network: {
    in: SystemResource;
    out: SystemResource;
  };
  processes: number;
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface MonitoringData {
  system: SystemStatus;
  exchanges: ExchangeStatus[];
  databases: DatabaseMetric[];
  strategies: StrategyPerformance[];
  errorLogs: {
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    message: string;
  }[];
}
