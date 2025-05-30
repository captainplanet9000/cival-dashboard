/**
 * Risk Management Types
 * 
 * Types for the risk management system that complement the main database types.
 */

import { Database } from './database.types';

// Re-export the Json type for convenience
export type Json = Database['public']['Json'];

// Risk Profile Types
export type RiskProfile = Database['public']['Tables']['risk_profiles']['Row'];
export type RiskProfileInsert = Database['public']['Tables']['risk_profiles']['Insert'];
export type RiskProfileUpdate = Database['public']['Tables']['risk_profiles']['Update'];

// Circuit Breaker Types
export type CircuitBreaker = Database['public']['Tables']['circuit_breakers']['Row'];
export type CircuitBreakerInsert = Database['public']['Tables']['circuit_breakers']['Insert'];
export type CircuitBreakerUpdate = Database['public']['Tables']['circuit_breakers']['Update'];

// Risk Event Types
export type RiskEvent = Database['public']['Tables']['risk_events']['Row'];
export type RiskEventInsert = Database['public']['Tables']['risk_events']['Insert'];
export type RiskEventUpdate = Database['public']['Tables']['risk_events']['Update'];

// Position Sizing Rule Types
export type PositionSizingRule = Database['public']['Tables']['position_sizing_rules']['Row'];
export type PositionSizingRuleInsert = Database['public']['Tables']['position_sizing_rules']['Insert'];
export type PositionSizingRuleUpdate = Database['public']['Tables']['position_sizing_rules']['Update'];

// Enhanced Types for UI Components
export interface RiskMetrics {
  drawdown: number;
  dailyLoss: number;
  maxPositionSize: number;
  volatility?: number;
}

export type CircuitBreakerTriggerType = 'drawdown' | 'volatility' | 'manual';
export type CircuitBreakerStatus = 'active' | 'triggered' | 'reset';
export type RiskEventSeverity = 'info' | 'warning' | 'critical';
export type PositionSizingMethod = 'fixed' | 'risk_percent' | 'volatility_adjusted' | 'kelly';

// Risk Dashboard UI Component Types
export interface RiskDashboardProps {
  userId?: string;
}

export interface RiskProfileCardProps {
  profile: RiskProfile;
  onSave: (profile: RiskProfileUpdate) => Promise<void>;
  onDelete?: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
}

export interface CircuitBreakerCardProps {
  circuitBreaker: CircuitBreaker;
  onSave: (config: CircuitBreakerUpdate) => Promise<void>;
  onToggle: (enabled: boolean) => Promise<void>;
}

export interface PositionSizingCalculatorProps {
  capital: number;
  riskPerTrade: number;
  stopLossPercent: number;
  method?: PositionSizingMethod;
  additionalParams?: Record<string, any>;
  onCalculate?: (size: number) => void;
}

export interface RiskEventCardProps {
  event: RiskEvent;
  onAcknowledge: (eventId: number) => Promise<void>;
}
