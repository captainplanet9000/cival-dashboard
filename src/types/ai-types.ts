export interface MarketAnalysis {
  symbol: string;
  timestamp: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidenceLevel: number; // 0-1
  trend: {
    direction: 'up' | 'down' | 'sideways';
    strength: number; // 0-1
    timeframe: string;
  };
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  riskAssessment: {
    volatilityLevel: 'low' | 'medium' | 'high';
    marketRisk: number; // 0-1
    idiosyncraticRisk: number; // 0-1
  };
  recommendation: {
    action: 'buy' | 'sell' | 'hold';
    targetPrice?: number;
    stopLoss?: number;
    timeHorizon: string;
    reasoning: string;
  };
  technicalFactors: {
    indicator: string;
    value: number;
    interpretation: string;
  }[];
  fundamentalFactors?: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  newsImpact?: {
    overallSentiment: 'positive' | 'negative' | 'neutral';
    significantHeadlines: string[];
  };
}

export interface StrategyEvaluation {
  strategyName: string;
  overallRating: number; // 0-10
  strengths: string[];
  weaknesses: string[];
  performanceMetrics: {
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    averageProfit?: number;
    averageLoss?: number;
    profitFactor?: number;
  };
  marketConditionAnalysis: {
    condition: string;
    performance: 'strong' | 'average' | 'weak';
    details: string;
  }[];
  optimizationSuggestions: {
    aspect: string;
    currentSetting: string;
    suggestedChange: string;
    expectedImprovement: string;
    confidenceLevel: number; // 0-1
  }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigationSuggestions: string[];
  };
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  parameters: string[];
  responseFormat?: 'text' | 'json' | 'markdown';
  defaultModel: string;
  defaultTemperature: number;
} 