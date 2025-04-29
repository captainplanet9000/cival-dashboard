/**
 * Trading-specific analytics utilities for Trading Farm Dashboard
 * Provides specialized tracking functions for trading-related actions and performance metrics
 */

import { useAnalytics } from './analytics-provider';

/**
 * Hook for tracking trading-specific analytics events
 */
export const useTradingAnalytics = () => {
  const { trackEvent } = useAnalytics();

  /**
   * Track an order creation event
   * @param orderDetails Order details to track
   */
  const trackOrderCreated = (orderDetails: {
    orderId: string;
    symbol: string;
    type: string;
    side: 'buy' | 'sell';
    amount: number;
    price?: number;
    exchange: string;
    strategy?: string;
    stopPrice?: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
    leverage?: number;
  }) => {
    trackEvent(
      'trading',
      'create',
      `Order-${orderDetails.orderId}`,
      orderDetails.amount * (orderDetails.price || 0),
      {
        orderId: orderDetails.orderId,
        symbol: orderDetails.symbol,
        orderType: orderDetails.type,
        orderSide: orderDetails.side,
        amount: orderDetails.amount,
        price: orderDetails.price,
        exchange: orderDetails.exchange,
        strategy: orderDetails.strategy,
        stopPrice: orderDetails.stopPrice,
        takeProfitPrice: orderDetails.takeProfitPrice,
        stopLossPrice: orderDetails.stopLossPrice,
        leverage: orderDetails.leverage,
        orderValue: orderDetails.amount * (orderDetails.price || 0),
      }
    );
  };

  /**
   * Track an order execution/fill event
   * @param executionDetails Execution details to track
   */
  const trackOrderExecuted = (executionDetails: {
    orderId: string;
    symbol: string;
    type: string;
    side: 'buy' | 'sell';
    amount: number;
    executedPrice: number;
    exchange: string;
    strategy?: string;
    executionTime: number; // ms from order placement to execution
    slippage?: number; // percentage difference from intended price
    fees?: number;
    positionId?: string;
  }) => {
    trackEvent(
      'trading',
      'execute',
      `Execution-${executionDetails.orderId}`,
      executionDetails.amount * executionDetails.executedPrice,
      {
        orderId: executionDetails.orderId,
        symbol: executionDetails.symbol,
        orderType: executionDetails.type,
        orderSide: executionDetails.side,
        amount: executionDetails.amount,
        executedPrice: executionDetails.executedPrice,
        exchange: executionDetails.exchange,
        strategy: executionDetails.strategy,
        executionTime: executionDetails.executionTime,
        slippage: executionDetails.slippage,
        fees: executionDetails.fees,
        positionId: executionDetails.positionId,
        executedValue: executionDetails.amount * executionDetails.executedPrice,
      }
    );
  };

  /**
   * Track when a position is closed
   * @param positionDetails Position closure details to track
   */
  const trackPositionClosed = (positionDetails: {
    positionId: string;
    symbol: string;
    entryPrice: number;
    exitPrice: number;
    amount: number;
    side: 'long' | 'short';
    exchange: string;
    strategy?: string;
    holdingPeriod: number; // in milliseconds
    pnl: number;
    pnlPercentage: number;
    fees: number;
    exitReason: 'take_profit' | 'stop_loss' | 'manual' | 'strategy' | 'liquidation' | 'other';
  }) => {
    // Calculate performance metrics
    const absolutePnl = positionDetails.pnl;
    const relativePnl = positionDetails.pnlPercentage;
    const netPnl = absolutePnl - positionDetails.fees;
    const holdingPeriodHours = positionDetails.holdingPeriod / (1000 * 60 * 60);

    trackEvent(
      'trading', 
      'update',
      `Position-${positionDetails.positionId}`,
      absolutePnl,
      {
        positionId: positionDetails.positionId,
        symbol: positionDetails.symbol,
        entryPrice: positionDetails.entryPrice,
        exitPrice: positionDetails.exitPrice,
        amount: positionDetails.amount,
        side: positionDetails.side,
        exchange: positionDetails.exchange,
        strategy: positionDetails.strategy,
        holdingPeriod: positionDetails.holdingPeriod,
        holdingPeriodHours,
        absolutePnl,
        relativePnl,
        fees: positionDetails.fees,
        netPnl,
        exitReason: positionDetails.exitReason,
        isProfit: netPnl > 0,
        positionValue: positionDetails.amount * positionDetails.entryPrice,
      }
    );
  };

  /**
   * Track strategy performance metrics
   * @param strategyMetrics Strategy performance metrics to track
   */
  const trackStrategyPerformance = (strategyMetrics: {
    strategyId: string;
    strategyName: string;
    period: 'daily' | 'weekly' | 'monthly' | 'all_time';
    startDate: string;
    endDate: string;
    trades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalPnl: number;
    averageTrade: number;
    averageHoldingPeriod: number; // in hours
    bestTrade: number;
    worstTrade: number;
  }) => {
    trackEvent(
      'strategy',
      'update',
      `Strategy-${strategyMetrics.strategyId}`,
      strategyMetrics.totalPnl,
      {
        strategyId: strategyMetrics.strategyId,
        strategyName: strategyMetrics.strategyName,
        period: strategyMetrics.period,
        startDate: strategyMetrics.startDate,
        endDate: strategyMetrics.endDate,
        trades: strategyMetrics.trades,
        winRate: strategyMetrics.winRate,
        profitFactor: strategyMetrics.profitFactor,
        sharpeRatio: strategyMetrics.sharpeRatio,
        maxDrawdown: strategyMetrics.maxDrawdown,
        totalPnl: strategyMetrics.totalPnl,
        averageTrade: strategyMetrics.averageTrade,
        averageHoldingPeriod: strategyMetrics.averageHoldingPeriod,
        bestTrade: strategyMetrics.bestTrade,
        worstTrade: strategyMetrics.worstTrade,
      }
    );
  };

  /**
   * Track risk management adjustments
   * @param riskAdjustment Risk settings adjustment details
   */
  const trackRiskAdjustment = (riskAdjustment: {
    profileId: string;
    maxPositionSize: number;
    maxPositionSizeChange?: number;
    maxDrawdown: number;
    maxDrawdownChange?: number;
    maxDailyLoss: number;
    maxDailyLossChange?: number;
    maxOpenPositions: number;
    maxOpenPositionsChange?: number;
    appliedToStrategies: string[];
    reason?: string;
  }) => {
    trackEvent(
      'risk_management',
      'update',
      `RiskProfile-${riskAdjustment.profileId}`,
      undefined,
      {
        profileId: riskAdjustment.profileId,
        maxPositionSize: riskAdjustment.maxPositionSize,
        maxPositionSizeChange: riskAdjustment.maxPositionSizeChange,
        maxDrawdown: riskAdjustment.maxDrawdown,
        maxDrawdownChange: riskAdjustment.maxDrawdownChange,
        maxDailyLoss: riskAdjustment.maxDailyLoss,
        maxDailyLossChange: riskAdjustment.maxDailyLossChange,
        maxOpenPositions: riskAdjustment.maxOpenPositions,
        maxOpenPositionsChange: riskAdjustment.maxOpenPositionsChange,
        appliedToStrategies: riskAdjustment.appliedToStrategies,
        reason: riskAdjustment.reason,
      }
    );
  };

  /**
   * Track portfolio performance metrics
   * @param portfolioMetrics Portfolio performance metrics to track
   */
  const trackPortfolioPerformance = (portfolioMetrics: {
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time';
    startDate: string;
    endDate: string;
    startValue: number;
    endValue: number;
    deposits: number;
    withdrawals: number;
    pnl: number;
    pnlPercentage: number;
    sharpeRatio: number;
    sortingRatio: number;
    maxDrawdown: number;
    volatility: number;
    bestDay: { date: string; pnl: number };
    worstDay: { date: string; pnl: number };
    winningDays: number;
    losingDays: number;
    totalTradingDays: number;
  }) => {
    // Calculate derived metrics
    const winRate = portfolioMetrics.totalTradingDays > 0 
      ? portfolioMetrics.winningDays / portfolioMetrics.totalTradingDays 
      : 0;
    
    const netReturn = ((portfolioMetrics.endValue - portfolioMetrics.startValue - portfolioMetrics.deposits + portfolioMetrics.withdrawals) / 
      portfolioMetrics.startValue) * 100;

    trackEvent(
      'performance',
      'update',
      `Portfolio-${portfolioMetrics.period}`,
      portfolioMetrics.pnl,
      {
        period: portfolioMetrics.period,
        startDate: portfolioMetrics.startDate,
        endDate: portfolioMetrics.endDate,
        startValue: portfolioMetrics.startValue,
        endValue: portfolioMetrics.endValue,
        deposits: portfolioMetrics.deposits,
        withdrawals: portfolioMetrics.withdrawals,
        pnl: portfolioMetrics.pnl,
        pnlPercentage: portfolioMetrics.pnlPercentage,
        netReturn,
        sharpeRatio: portfolioMetrics.sharpeRatio,
        sortingRatio: portfolioMetrics.sortingRatio,
        maxDrawdown: portfolioMetrics.maxDrawdown,
        volatility: portfolioMetrics.volatility,
        bestDay: portfolioMetrics.bestDay,
        worstDay: portfolioMetrics.worstDay,
        winningDays: portfolioMetrics.winningDays,
        losingDays: portfolioMetrics.losingDays,
        totalTradingDays: portfolioMetrics.totalTradingDays,
        winRate,
      }
    );
  };

  /**
   * Track trading errors for monitoring and improvement
   * @param errorDetails Error details to track
   */
  const trackTradingError = (errorDetails: {
    errorCode: string;
    errorMessage: string;
    context: 'order_creation' | 'order_execution' | 'strategy_execution' | 'position_management' | 'exchange_connection' | 'other';
    orderId?: string;
    strategyId?: string;
    symbol?: string;
    exchange?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoveryAction?: string;
    userImpact: 'none' | 'delayed' | 'financial' | 'critical';
  }) => {
    trackEvent(
      'error',
      'error',
      `Trading-${errorDetails.errorCode}`,
      undefined,
      {
        errorCode: errorDetails.errorCode,
        errorMessage: errorDetails.errorMessage,
        context: errorDetails.context,
        orderId: errorDetails.orderId,
        strategyId: errorDetails.strategyId,
        symbol: errorDetails.symbol,
        exchange: errorDetails.exchange,
        severity: errorDetails.severity,
        recoveryAction: errorDetails.recoveryAction,
        userImpact: errorDetails.userImpact,
        timestamp: new Date().toISOString(),
      }
    );
  };

  return {
    trackOrderCreated,
    trackOrderExecuted,
    trackPositionClosed,
    trackStrategyPerformance,
    trackRiskAdjustment,
    trackPortfolioPerformance,
    trackTradingError,
  };
};
