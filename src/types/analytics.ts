export interface PerformanceMetrics {
  // Time-based metrics
  startTimestamp: number;
  endTimestamp: number;
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'custom';
  
  // Financial metrics
  totalPnL: number;
  absoluteReturn: number;
  percentageReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  volatility: number;
  
  // Trading metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  
  // Efficiency metrics
  averageHoldingTime: number;
  tradesPerDay: number;
  recoveryFactor: number;
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
    type: 'behavioral' | 'performance' | 'risk';
    description: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: number;
  }[];
  improvementScore: number; // 0-100
  comparisonToBaseline: {
    metric: string;
    baselineValue: number;
    currentValue: number;
    percentageDifference: number;
  }[];
}

export interface StrategyPrediction {
  strategyId: string;
  strategyName: string;
  predictionTimeframe: string;
  confidenceLevel: number; // 0-1
  expectedReturn: number;
  probabilityDistribution: {
    returnLevel: number;
    probability: number;
  }[];
  marketConditions: {
    scenario: string;
    probability: number;
    expectedPerformance: number;
  }[];
  riskAssessment: {
    expectedDrawdown: number;
    varLevel95: number;
    stressTestResults: {
      scenario: string;
      impact: number;
    }[];
  };
  recommendations: {
    action: string;
    reasoning: string;
    priority: 'low' | 'medium' | 'high';
  }[];
}

export interface PortfolioAnalytics {
  timestamp: number;
  allocations: {
    assetClass: string;
    percentage: number;
    absoluteValue: number;
  }[];
  riskMetrics: {
    portfolioVolatility: number;
    correlationMatrix: Record<string, Record<string, number>>;
    varLevel95: number;
    expectedShortfall: number;
    stressTestResults: Record<string, number>;
  };
  performanceAttribution: {
    assetClass: string;
    contribution: number;
    weightEffect: number;
    selectionEffect: number;
  }[];
  diversificationScore: number; // 0-100
  efficiencyFrontier: {
    risk: number;
    return: number;
    isOptimal: boolean;
  }[];
  rebalancingRecommendations: {
    assetClass: string;
    currentAllocation: number;
    targetAllocation: number;
    reasoning: string;
  }[];
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

export interface AnalyticsInsight {
  id: string;
  timestamp: number;
  category: 'performance' | 'risk' | 'behavior' | 'opportunity';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  relatedEntities: {
    type: 'agent' | 'strategy' | 'market' | 'asset';
    id: string;
    name: string;
  }[];
  recommendations: string[];
  visualizations?: VisualizationConfig[];
  aiConfidence: number; // 0-1
  dismissed: boolean;
} 