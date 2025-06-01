/**
 * Risk Management Types
 * 
 * Core types for the trading risk management system
 */

export interface RiskParameters {
  // Position sizing
  maxPositionSize: number;             // Maximum position size as percentage of available capital
  maxPositionSizeAbsolute: number;     // Maximum position size as absolute value
  maxLeverage: number;                 // Maximum leverage allowed
  
  // Loss prevention
  stopLossPercentage: number;          // Default stop loss percentage per trade
  maxDrawdownPercentage: number;       // Maximum portfolio drawdown allowed before halting trading
  trailingStopEnabled: boolean;        // Whether trailing stops are enabled
  trailingStopActivationPercent: number; // Profit percentage required to activate trailing stop
  trailingStopDistance: number;        // Distance to maintain for trailing stop
  
  // Exposure limits
  maxOpenPositions: number;            // Maximum number of concurrent open positions
  maxSymbolExposure: number;           // Maximum exposure to a single symbol (percentage)
  maxSectorExposure: number;           // Maximum exposure to a single sector (percentage)
  
  // Circuit breakers
  volatilityCircuitBreaker: number;    // Halt trading if volatility exceeds this percentage
  dailyLossCircuitBreaker: number;     // Halt trading if daily loss exceeds this percentage
  
  // Diversification
  minDiversificationCount: number;     // Minimum number of different assets to hold
  correlationThreshold: number;        // Maximum correlation allowed between positions
  
  // Time-based parameters
  tradingHoursStart: string;           // Trading hours start time (format: "HH:MM")
  tradingHoursEnd: string;             // Trading hours end time (format: "HH:MM")
  timeZone: string;                    // Time zone for trading hours
  excludedDays: string[];              // Days to exclude from trading (e.g., "Saturday", "Sunday")
  
  // Signal confirmation
  minSignalConfirmations: number;      // Minimum number of signals required to confirm a trade
  signalTimeoutMinutes: number;        // How long signals remain valid

  // Custom rules
  customRiskRules: Record<string, any>; // Custom strategy-specific risk rules
}

export interface PositionSizingResult {
  recommendedPositionSize: number;     // Recommended position size in base currency
  maxAllowedPositionSize: number;      // Maximum allowed position size in base currency
  sizeReason: string;                  // Explanation for the position size recommendation
  riskAmount: number;                  // Amount at risk if stop loss is hit
  riskPercentage: number;              // Percentage of capital at risk
  leverageUsed: number | null;         // Leverage used for this position (if applicable)
  isWithinLimits: boolean;             // Whether the position is within risk limits
  limitingFactor: string | null;       // Which limit is constraining the position size
}

export interface RiskAssessment {
  isAllowed: boolean;                  // Whether the trade is allowed based on risk parameters
  riskScore: number;                   // Risk score from 0-100 (higher is riskier)
  positionSizing: PositionSizingResult; // Position sizing details
  reasons: string[];                   // Reasons for the risk assessment
  warnings: string[];                  // Warnings about the trade
  stopLossPrice: number | null;        // Recommended stop loss price
  takeProfitPrice: number | null;      // Recommended take profit price
  adjustedParameters: Partial<RiskParameters>; // Any adjusted risk parameters for this specific trade
}

export interface PortfolioRiskSnapshot {
  timestamp: number;                   // Timestamp of the snapshot
  totalEquity: number;                 // Total portfolio value
  totalExposure: number;               // Total market exposure
  currentDrawdown: number;             // Current drawdown percentage
  exposureBySymbol: Record<string, number>; // Exposure breakdown by symbol
  exposureBySector: Record<string, number>; // Exposure breakdown by sector
  leverageUtilization: number;         // Percentage of max leverage currently used
  riskScore: number;                   // Overall portfolio risk score
  diversificationScore: number;        // How well the portfolio is diversified
  correlationMatrix: Record<string, Record<string, number>>; // Correlation between positions
  circuitBreakerWarnings: string[];    // Active circuit breaker warnings
}

export enum RiskLevel {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
  CUSTOM = 'custom'
}

export interface RiskProfile {
  id: string;
  name: string;
  description: string;
  level: RiskLevel;
  parameters: RiskParameters;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isDefault: boolean;
}

// Preset risk profiles
export const RISK_PRESETS: Record<RiskLevel, Omit<RiskParameters, 'customRiskRules'>> = {
  [RiskLevel.CONSERVATIVE]: {
    maxPositionSize: 2,
    maxPositionSizeAbsolute: 5000,
    maxLeverage: 1,
    stopLossPercentage: 1.5,
    maxDrawdownPercentage: 5,
    trailingStopEnabled: true,
    trailingStopActivationPercent: 1.0,
    trailingStopDistance: 0.5,
    maxOpenPositions: 5,
    maxSymbolExposure: 20,
    maxSectorExposure: 30,
    volatilityCircuitBreaker: 3,
    dailyLossCircuitBreaker: 2,
    minDiversificationCount: 4,
    correlationThreshold: 0.7,
    tradingHoursStart: "09:30",
    tradingHoursEnd: "16:00",
    timeZone: "America/New_York",
    excludedDays: ["Saturday", "Sunday"],
    minSignalConfirmations: 2,
    signalTimeoutMinutes: 15
  },
  [RiskLevel.MODERATE]: {
    maxPositionSize: 5,
    maxPositionSizeAbsolute: 10000,
    maxLeverage: 3,
    stopLossPercentage: 2.5,
    maxDrawdownPercentage: 10,
    trailingStopEnabled: true,
    trailingStopActivationPercent: 1.5,
    trailingStopDistance: 0.8,
    maxOpenPositions: 10,
    maxSymbolExposure: 30,
    maxSectorExposure: 40,
    volatilityCircuitBreaker: 5,
    dailyLossCircuitBreaker: 3.5,
    minDiversificationCount: 3,
    correlationThreshold: 0.8,
    tradingHoursStart: "09:30",
    tradingHoursEnd: "16:00",
    timeZone: "America/New_York",
    excludedDays: ["Saturday", "Sunday"],
    minSignalConfirmations: 1,
    signalTimeoutMinutes: 30
  },
  [RiskLevel.AGGRESSIVE]: {
    maxPositionSize: 10,
    maxPositionSizeAbsolute: 25000,
    maxLeverage: 5,
    stopLossPercentage: 3.5,
    maxDrawdownPercentage: 15,
    trailingStopEnabled: true,
    trailingStopActivationPercent: 2.0,
    trailingStopDistance: 1.2,
    maxOpenPositions: 15,
    maxSymbolExposure: 40,
    maxSectorExposure: 60,
    volatilityCircuitBreaker: 8,
    dailyLossCircuitBreaker: 5,
    minDiversificationCount: 2,
    correlationThreshold: 0.9,
    tradingHoursStart: "09:30",
    tradingHoursEnd: "16:00",
    timeZone: "America/New_York",
    excludedDays: ["Saturday", "Sunday"],
    minSignalConfirmations: 1,
    signalTimeoutMinutes: 60
  },
  [RiskLevel.CUSTOM]: {
    // Default values for custom profiles
    maxPositionSize: 5,
    maxPositionSizeAbsolute: 10000,
    maxLeverage: 3,
    stopLossPercentage: 2.5,
    maxDrawdownPercentage: 10,
    trailingStopEnabled: true,
    trailingStopActivationPercent: 1.5,
    trailingStopDistance: 0.8,
    maxOpenPositions: 10,
    maxSymbolExposure: 30,
    maxSectorExposure: 40,
    volatilityCircuitBreaker: 5,
    dailyLossCircuitBreaker: 3.5,
    minDiversificationCount: 3,
    correlationThreshold: 0.8,
    tradingHoursStart: "09:30",
    tradingHoursEnd: "16:00",
    timeZone: "America/New_York",
    excludedDays: ["Saturday", "Sunday"],
    minSignalConfirmations: 1,
    signalTimeoutMinutes: 30
  }
};
