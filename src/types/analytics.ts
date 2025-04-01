export interface PerformanceMetrics {
  timeframe: 'day' | 'week' | 'month';
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  totalReturn: number;
  averageReturn: number;
  annualizedReturn: number;
  volatility: number;
  maxDrawdown: number;
  valueAtRisk: number;
  recoveryFactor: number;
  sortinoRatio: number;
  averageWin: number;
  averageLoss: number;
  totalPnL: number;
}

export interface AgentPerformanceAnalysis {
  agentId: string;
  agentName: string;
  agentRole: string;
  metrics: PerformanceMetrics;
  strengths: string[];
  weaknesses: string[];
  aiRecommendations: string[];
  anomalies: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }[];
  improvementScore: number;
  comparisonToBaseline: {
    metric: string;
    percentageDifference: number;
  }[];
  performanceHistory: {
    date: string;
    value: number;
  }[];
  tradeDistribution: {
    range: string;
    count: number;
  }[];
  performanceAttribution: {
    factor: string;
    value: number;
  }[];
}

export interface StrategyPrediction {
  strategyId: string;
  strategyName: string;
  predictionTimeframe: string;
  confidenceLevel: number;
  expectedReturn: number;
  probabilityDistribution: {
    returnLevel: number;
    probability: number;
  }[];
  riskAssessment: {
    expectedDrawdown: number;
    varLevel95: number;
    stressTestResults: {
      scenario: string;
      impact: number;
    }[];
  };
  marketConditions: {
    scenario: string;
    expectedPerformance: number;
  }[];
  recommendations: {
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    actionItems?: string[];
  }[];
  forecastData: {
    date: string;
    expectedReturn: number;
    upperBound: number;
    lowerBound: number;
  }[];
  riskAnalysis: {
    factor: string;
    score: number;
  }[];
  marketImpact: {
    factor: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    probability: number;
  }[];
}

export interface PortfolioAnalytics {
  totalValue: number;
  cashBalance: number;
  marginUsage: number;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  diversificationScore: number;
  assetAllocation: {
    assetClass: string;
    percentage: number;
    value: number;
  }[];
  riskMetrics: {
    metric: string;
    value: number;
    threshold: number;
  }[];
  performanceMetrics: {
    metric: string;
    value: number;
    change: number;
  }[];
  recommendations: {
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }[];
}

export interface AnalyticsInsight {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  recommendation?: string;
  relatedMetrics?: string[];
  dismissed?: boolean;
}

export enum VisualizationType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  CANDLESTICK_CHART = 'candlestick_chart',
  HEATMAP = 'heatmap',
  SCATTER_PLOT = 'scatter_plot',
  PIE_CHART = 'pie_chart',
  RADAR_CHART = 'radar_chart',
  NETWORK_GRAPH = 'network_graph',
  SANKEY_DIAGRAM = 'sankey_diagram',
  BUBBLE_CHART = 'bubble_chart'
}

export interface VisualizationConfig {
  type: VisualizationType;
  title: string;
  description?: string;
  data: any[];
  dimensions: {
    x?: string;
    y?: string;
    size?: string;
    color?: string;
    shape?: string;
  };
  options?: Record<string, any>;
  interactivity?: {
    tooltips: boolean;
    zoom: boolean;
    pan: boolean;
    filtering: boolean;
    drilldown: boolean;
  };
} 