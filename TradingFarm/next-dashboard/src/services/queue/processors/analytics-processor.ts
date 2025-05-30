/**
 * Analytics Processor
 * Handles background jobs for data analysis, reporting, and metrics calculations
 */
import { Job } from 'bull';
import { QueueNames, QueueService } from '../queue-service';
import { createServerClient } from '@/utils/supabase/server';

// Job types
export enum AnalyticsJobTypes {
  GENERATE_DAILY_REPORT = 'generate-daily-report',
  CALCULATE_PERFORMANCE_METRICS = 'calculate-performance-metrics',
  AGGREGATE_TRADE_DATA = 'aggregate-trade-data',
  UPDATE_DASHBOARD_METRICS = 'update-dashboard-metrics',
  RISK_ANALYSIS = 'risk-analysis',
}

// Job data types
export interface GenerateDailyReportJobData {
  userId: string;
  date: string;
  farmIds?: string[];
  includeMarketData?: boolean;
  includePerformanceMetrics?: boolean;
  format?: 'json' | 'csv' | 'pdf';
  notifyUser?: boolean;
}

export interface CalculatePerformanceMetricsJobData {
  userId: string;
  farmId?: string;
  agentId?: string;
  strategyId?: string;
  startDate: string;
  endDate: string;
  metrics?: string[]; // List of metrics to calculate
}

export interface AggregateTradeDateJobData {
  userId: string;
  farmId?: string;
  interval: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
}

export interface UpdateDashboardMetricsJobData {
  userId: string;
  farmIds?: string[];
  metricTypes?: string[];
  forceRefresh?: boolean;
}

export interface RiskAnalysisJobData {
  userId: string;
  farmId?: string;
  positionIds?: string[];
  considerCorrelations?: boolean;
  scenarioAnalysis?: boolean;
  stressTestParameters?: Record<string, any>;
}

/**
 * Initialize all analytics processors
 */
export function initializeAnalyticsProcessors(): void {
  // Generate daily report processor
  QueueService.registerProcessor<GenerateDailyReportJobData, any>(
    QueueNames.ANALYTICS,
    AnalyticsJobTypes.GENERATE_DAILY_REPORT,
    async (job) => {
      const { 
        userId, 
        date, 
        farmIds, 
        includeMarketData, 
        includePerformanceMetrics, 
        format, 
        notifyUser 
      } = job.data;
      
      try {
        console.log(`Generating daily report for user ${userId} for date ${date}`);
        await job.progress(10);
        
        const supabase = await createServerClient();
        
        // Step 1: Gather trade data for the day
        let query = supabase
          .from('trades')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', `${date}T00:00:00Z`)
          .lte('created_at', `${date}T23:59:59Z`);
          
        if (farmIds?.length) {
          query = query.in('farm_id', farmIds);
        }
        
        const { data: trades } = await query;
        await job.progress(30);
        
        // Step 2: Gather position data
        const { data: positions } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId)
          .or(`created_at.gte.${date}T00:00:00Z,status.eq.open`);
          
        await job.progress(50);
        
        // Step 3: Calculate performance metrics if requested
        let performanceMetrics = null;
        if (includePerformanceMetrics) {
          // Get profit/loss for the day
          const { data: dailyPnL } = await supabase.rpc('calculate_daily_pnl', {
            p_user_id: userId,
            p_date: date
          });
          
          // Get win/loss ratio
          const { data: winLossRatio } = await supabase.rpc('calculate_win_loss_ratio', {
            p_user_id: userId,
            p_start_date: `${date}T00:00:00Z`,
            p_end_date: `${date}T23:59:59Z`
          });
          
          performanceMetrics = {
            dailyPnL,
            winLossRatio,
            // Additional metrics would be calculated here
          };
        }
        await job.progress(70);
        
        // Step 4: Include market data summaries if requested
        let marketData = null;
        if (includeMarketData) {
          // Get traded symbols from the day's trades
          const symbols = [...new Set(trades.map(t => t.symbol))];
          
          // Get market data summaries for those symbols
          const { data: marketSummaries } = await supabase
            .from('market_data_daily')
            .select('*')
            .in('symbol', symbols)
            .eq('date', date);
            
          marketData = marketSummaries;
        }
        await job.progress(90);
        
        // Step 5: Format and save the report
        const report = {
          userId,
          date,
          generatedAt: new Date().toISOString(),
          trades: trades || [],
          positions: positions || [],
          performanceMetrics,
          marketData,
        };
        
        // Generate appropriate format
        let formattedReport;
        let contentType;
        
        switch (format) {
          case 'csv':
            formattedReport = convertToCSV(report);
            contentType = 'text/csv';
            break;
          case 'pdf':
            // This would use a PDF generation library in a real implementation
            formattedReport = JSON.stringify(report); // Placeholder
            contentType = 'application/json';
            break;
          case 'json':
          default:
            formattedReport = JSON.stringify(report, null, 2);
            contentType = 'application/json';
        }
        
        // Save the report
        const reportFileName = `daily-report-${userId}-${date}.${format || 'json'}`;
        await supabase.storage
          .from('reports')
          .upload(`daily/${reportFileName}`, formattedReport, {
            contentType,
            cacheControl: '3600'
          });
          
        // Store metadata in database
        const { data: savedReport } = await supabase
          .from('reports')
          .insert({
            user_id: userId,
            report_type: 'daily',
            report_date: date,
            file_path: `daily/${reportFileName}`,
            file_format: format || 'json',
            metadata: {
              tradeCount: trades?.length || 0,
              positionCount: positions?.length || 0,
              farmIds: farmIds || [],
              includesMarketData: !!includeMarketData,
              includesPerformanceMetrics: !!includePerformanceMetrics
            }
          })
          .select()
          .single();
        
        // Notify user if requested
        if (notifyUser) {
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              type: 'report_ready',
              title: `Daily Report for ${date} is ready`,
              message: `Your requested daily report for ${date} is now available.`,
              data: {
                reportId: savedReport.id,
                reportPath: savedReport.file_path
              },
              read: false
            });
        }
        
        await job.progress(100);
        return savedReport;
      } catch (error) {
        console.error(`Error generating daily report for user ${userId}:`, error);
        throw error;
      }
    }
  );
  
  // Calculate performance metrics processor
  QueueService.registerProcessor<CalculatePerformanceMetricsJobData, any>(
    QueueNames.ANALYTICS,
    AnalyticsJobTypes.CALCULATE_PERFORMANCE_METRICS,
    async (job) => {
      const { 
        userId, 
        farmId, 
        agentId, 
        strategyId, 
        startDate, 
        endDate, 
        metrics 
      } = job.data;
      
      try {
        console.log(`Calculating performance metrics for user ${userId} from ${startDate} to ${endDate}`);
        
        const supabase = await createServerClient();
        const results: Record<string, any> = {};
        
        // Define which metrics to calculate
        const metricsToCalculate = metrics || [
          'total_pnl', 
          'win_rate', 
          'profit_factor', 
          'sharpe_ratio', 
          'max_drawdown',
          'avg_trade_duration',
          'roi'
        ];
        
        // Build base query params
        const baseParams = {
          p_user_id: userId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_farm_id: farmId || null,
          p_agent_id: agentId || null,
          p_strategy_id: strategyId || null
        };
        
        let progress = 0;
        const progressStep = 100 / metricsToCalculate.length;
        
        // Calculate each requested metric
        for (const metric of metricsToCalculate) {
          try {
            let result;
            
            switch (metric) {
              case 'total_pnl':
                result = await supabase.rpc('calculate_total_pnl', baseParams);
                break;
              case 'win_rate':
                result = await supabase.rpc('calculate_win_rate', baseParams);
                break;
              case 'profit_factor':
                result = await supabase.rpc('calculate_profit_factor', baseParams);
                break;
              case 'sharpe_ratio':
                result = await supabase.rpc('calculate_sharpe_ratio', baseParams);
                break;
              case 'max_drawdown':
                result = await supabase.rpc('calculate_max_drawdown', baseParams);
                break;
              case 'avg_trade_duration':
                result = await supabase.rpc('calculate_avg_trade_duration', baseParams);
                break;
              case 'roi':
                result = await supabase.rpc('calculate_roi', baseParams);
                break;
              default:
                result = { data: null, error: `Unknown metric: ${metric}` };
            }
            
            results[metric] = result.data;
          } catch (metricError) {
            console.error(`Error calculating ${metric}:`, metricError);
            results[metric] = { error: metricError.message };
          }
          
          // Update progress
          progress += progressStep;
          await job.progress(Math.min(100, Math.round(progress)));
        }
        
        // Store the calculated metrics in the performance_metrics table
        await supabase
          .from('performance_metrics')
          .insert({
            user_id: userId,
            farm_id: farmId || null,
            agent_id: agentId || null,
            strategy_id: strategyId || null,
            start_date: startDate,
            end_date: endDate,
            metrics: results,
            calculated_at: new Date().toISOString()
          });
        
        return results;
      } catch (error) {
        console.error(`Error calculating performance metrics for user ${userId}:`, error);
        throw error;
      }
    }
  );
  
  // Aggregate trade data processor
  QueueService.registerProcessor<AggregateTradeDateJobData, any>(
    QueueNames.ANALYTICS,
    AnalyticsJobTypes.AGGREGATE_TRADE_DATA,
    async (job) => {
      const { userId, farmId, interval, startDate, endDate } = job.data;
      
      try {
        console.log(`Aggregating trade data for user ${userId} with interval ${interval}`);
        
        const supabase = await createServerClient();
        
        // Different SQL based on the interval
        let aggregationFunctionName: string;
        let tableName: string;
        
        switch (interval) {
          case 'daily':
            aggregationFunctionName = 'aggregate_trades_daily';
            tableName = 'trade_aggregates_daily';
            break;
          case 'weekly':
            aggregationFunctionName = 'aggregate_trades_weekly';
            tableName = 'trade_aggregates_weekly';
            break;
          case 'monthly':
            aggregationFunctionName = 'aggregate_trades_monthly';
            tableName = 'trade_aggregates_monthly';
            break;
          default:
            throw new Error(`Invalid interval: ${interval}`);
        }
        
        // Call the appropriate aggregation function
        const { data: aggregates, error } = await supabase.rpc(aggregationFunctionName, {
          p_user_id: userId,
          p_farm_id: farmId || null,
          p_start_date: startDate,
          p_end_date: endDate
        });
        
        if (error) throw error;
        
        // Clear old aggregates for this period if they exist
        await supabase
          .from(tableName)
          .delete()
          .eq('user_id', userId)
          .gte('period_start', startDate)
          .lte('period_end', endDate);
          
        if (farmId) {
          await supabase.from(tableName).delete().eq('farm_id', farmId);
        }
        
        // Insert the new aggregates
        if (aggregates && aggregates.length > 0) {
          await supabase.from(tableName).insert(aggregates);
        }
        
        return { 
          aggregatedRecords: aggregates?.length || 0,
          interval,
          startDate,
          endDate 
        };
      } catch (error) {
        console.error(`Error aggregating trade data for user ${userId}:`, error);
        throw error;
      }
    }
  );
  
  // Update dashboard metrics processor
  QueueService.registerProcessor<UpdateDashboardMetricsJobData, any>(
    QueueNames.ANALYTICS,
    AnalyticsJobTypes.UPDATE_DASHBOARD_METRICS,
    async (job) => {
      const { userId, farmIds, metricTypes, forceRefresh } = job.data;
      
      try {
        console.log(`Updating dashboard metrics for user ${userId}`);
        
        const supabase = await createServerClient();
        const metrics: Record<string, any> = {};
        
        // Define which metric types to update
        const typesToUpdate = metricTypes || [
          'portfolio_summary',
          'active_positions',
          'recent_trades',
          'profit_loss',
          'farm_performance'
        ];
        
        let progress = 0;
        const progressStep = 100 / typesToUpdate.length;
        
        // Update each metric type
        for (const metricType of typesToUpdate) {
          try {
            switch (metricType) {
              case 'portfolio_summary': {
                // Get portfolio summary data
                const { data: portfolioSummary } = await supabase.rpc('get_portfolio_summary', {
                  p_user_id: userId
                });
                metrics.portfolioSummary = portfolioSummary;
                break;
              }
              
              case 'active_positions': {
                // Get active positions
                let query = supabase
                  .from('positions')
                  .select('*')
                  .eq('user_id', userId)
                  .eq('status', 'open')
                  .order('created_at', { ascending: false });
                  
                if (farmIds?.length) {
                  query = query.in('farm_id', farmIds);
                }
                
                const { data: activePositions } = await query;
                metrics.activePositions = activePositions;
                break;
              }
              
              case 'recent_trades': {
                // Get recent trades
                let query = supabase
                  .from('trades')
                  .select('*')
                  .eq('user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(20);
                  
                if (farmIds?.length) {
                  query = query.in('farm_id', farmIds);
                }
                
                const { data: recentTrades } = await query;
                metrics.recentTrades = recentTrades;
                break;
              }
              
              case 'profit_loss': {
                // Get profit/loss data for various timeframes
                const timeframes = ['daily', 'weekly', 'monthly', 'yearly'];
                const pnlMetrics: Record<string, any> = {};
                
                for (const timeframe of timeframes) {
                  const { data: pnlData } = await supabase.rpc('get_profit_loss_by_timeframe', {
                    p_user_id: userId,
                    p_timeframe: timeframe,
                    p_farm_ids: farmIds || null
                  });
                  
                  pnlMetrics[timeframe] = pnlData;
                }
                
                metrics.profitLoss = pnlMetrics;
                break;
              }
              
              case 'farm_performance': {
                // Get performance by farm
                const { data: farmPerformance } = await supabase.rpc('get_farm_performance', {
                  p_user_id: userId,
                  p_farm_ids: farmIds || null
                });
                
                metrics.farmPerformance = farmPerformance;
                break;
              }
            }
          } catch (metricError) {
            console.error(`Error updating ${metricType} metrics:`, metricError);
            metrics[metricType] = { error: metricError.message };
          }
          
          // Update progress
          progress += progressStep;
          await job.progress(Math.min(100, Math.round(progress)));
        }
        
        // Store or update the dashboard metrics
        const now = new Date().toISOString();
        
        const { data: existingMetrics } = await supabase
          .from('dashboard_metrics')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (existingMetrics && !forceRefresh) {
          // Update existing record
          await supabase
            .from('dashboard_metrics')
            .update({
              metrics,
              updated_at: now
            })
            .eq('id', existingMetrics.id);
        } else {
          // Insert new record or force refresh
          if (existingMetrics) {
            await supabase
              .from('dashboard_metrics')
              .delete()
              .eq('id', existingMetrics.id);
          }
          
          await supabase
            .from('dashboard_metrics')
            .insert({
              user_id: userId,
              metrics,
              created_at: now,
              updated_at: now
            });
        }
        
        return {
          updatedMetricTypes: typesToUpdate,
          timestamp: now
        };
      } catch (error) {
        console.error(`Error updating dashboard metrics for user ${userId}:`, error);
        throw error;
      }
    }
  );
  
  // Risk analysis processor
  QueueService.registerProcessor<RiskAnalysisJobData, any>(
    QueueNames.ANALYTICS,
    AnalyticsJobTypes.RISK_ANALYSIS,
    async (job) => {
      const { 
        userId, 
        farmId, 
        positionIds, 
        considerCorrelations, 
        scenarioAnalysis, 
        stressTestParameters 
      } = job.data;
      
      try {
        console.log(`Performing risk analysis for user ${userId}`);
        
        const supabase = await createServerClient();
        
        // Step 1: Get portfolio positions
        let positionsQuery = supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'open');
          
        if (farmId) {
          positionsQuery = positionsQuery.eq('farm_id', farmId);
        }
        
        if (positionIds?.length) {
          positionsQuery = positionsQuery.in('id', positionIds);
        }
        
        const { data: positions } = await positionsQuery;
        
        if (!positions || positions.length === 0) {
          return { 
            riskScore: 0, 
            message: 'No open positions found for risk analysis' 
          };
        }
        
        await job.progress(20);
        
        // Step 2: Calculate Value at Risk (VaR)
        const { data: valueAtRisk } = await supabase.rpc('calculate_value_at_risk', {
          p_user_id: userId,
          p_farm_id: farmId || null,
          p_position_ids: positionIds || null,
          p_confidence_level: 0.95
        });
        
        await job.progress(40);
        
        // Step 3: Calculate correlation matrix if requested
        let correlationMatrix = null;
        
        if (considerCorrelations && positions.length > 1) {
          // Get unique symbols from positions
          const symbols = [...new Set(positions.map(p => p.symbol))];
          
          if (symbols.length > 1) {
            const { data: correlations } = await supabase.rpc('calculate_correlation_matrix', {
              p_symbols: symbols,
              p_days: 30
            });
            
            correlationMatrix = correlations;
          }
        }
        
        await job.progress(60);
        
        // Step 4: Perform scenario analysis if requested
        let scenarioResults = null;
        
        if (scenarioAnalysis) {
          const scenarios = stressTestParameters?.scenarios || [
            { name: 'market_crash', priceMovePercent: -20 },
            { name: 'moderate_decline', priceMovePercent: -10 },
            { name: 'moderate_rally', priceMovePercent: 10 },
            { name: 'strong_rally', priceMovePercent: 20 }
          ];
          
          scenarioResults = {};
          
          for (const scenario of scenarios) {
            const { data: scenarioImpact } = await supabase.rpc('calculate_scenario_impact', {
              p_user_id: userId,
              p_position_ids: positionIds || null,
              p_price_move_percent: scenario.priceMovePercent
            });
            
            scenarioResults[scenario.name] = scenarioImpact;
          }
        }
        
        await job.progress(80);
        
        // Step 5: Calculate overall risk score
        const { data: riskScore } = await supabase.rpc('calculate_portfolio_risk_score', {
          p_user_id: userId,
          p_farm_id: farmId || null,
          p_position_ids: positionIds || null
        });
        
        // Compile all risk analysis results
        const riskAnalysis = {
          timestamp: new Date().toISOString(),
          userId,
          farmId: farmId || null,
          positionCount: positions.length,
          portfolioValue: positions.reduce((sum, pos) => sum + pos.current_value || 0, 0),
          valueAtRisk,
          correlationMatrix,
          scenarioAnalysis: scenarioResults,
          riskScore,
          riskLevel: getRiskLevel(riskScore?.score || 0),
          recommendations: generateRiskRecommendations(riskScore?.score || 0, positions, scenarioResults)
        };
        
        // Store risk analysis results
        await supabase
          .from('risk_analysis')
          .insert({
            user_id: userId,
            farm_id: farmId || null,
            analysis_data: riskAnalysis,
            created_at: new Date().toISOString()
          });
        
        await job.progress(100);
        return riskAnalysis;
      } catch (error) {
        console.error(`Error performing risk analysis for user ${userId}:`, error);
        throw error;
      }
    }
  );
}

// Helper functions

/**
 * Convert report data to CSV format
 */
function convertToCSV(reportData: any): string {
  // Simple implementation - would be more comprehensive in production
  let csv = '';
  
  // Add trades section
  if (reportData.trades?.length > 0) {
    csv += 'TRADES\n';
    csv += 'ID,Symbol,Side,Quantity,Price,Timestamp\n';
    
    reportData.trades.forEach((trade: any) => {
      csv += `${trade.id},${trade.symbol},${trade.side},${trade.quantity},${trade.price},${trade.created_at}\n`;
    });
    
    csv += '\n';
  }
  
  // Add positions section
  if (reportData.positions?.length > 0) {
    csv += 'POSITIONS\n';
    csv += 'ID,Symbol,Side,Quantity,Entry Price,Current Value,Status\n';
    
    reportData.positions.forEach((position: any) => {
      csv += `${position.id},${position.symbol},${position.side},${position.quantity},${position.entry_price},${position.current_value},${position.status}\n`;
    });
    
    csv += '\n';
  }
  
  // Add performance metrics if available
  if (reportData.performanceMetrics) {
    csv += 'PERFORMANCE METRICS\n';
    Object.entries(reportData.performanceMetrics).forEach(([key, value]) => {
      if (typeof value === 'object') {
        csv += `${key}:\n`;
        Object.entries(value as any).forEach(([subKey, subValue]) => {
          csv += `${subKey},${subValue}\n`;
        });
      } else {
        csv += `${key},${value}\n`;
      }
    });
    
    csv += '\n';
  }
  
  return csv;
}

/**
 * Get risk level based on risk score
 */
function getRiskLevel(riskScore: number): string {
  if (riskScore < 20) return 'Very Low';
  if (riskScore < 40) return 'Low';
  if (riskScore < 60) return 'Moderate';
  if (riskScore < 80) return 'High';
  return 'Very High';
}

/**
 * Generate risk recommendations based on analysis
 */
function generateRiskRecommendations(
  riskScore: number, 
  positions: any[], 
  scenarioResults: any
): string[] {
  const recommendations: string[] = [];
  
  // Recommendations based on risk score
  if (riskScore > 80) {
    recommendations.push('Consider reducing overall position sizes to decrease portfolio risk.');
    recommendations.push('Implement stricter stop-loss levels for high-risk positions.');
  } else if (riskScore > 60) {
    recommendations.push('Review position sizing for highest exposure assets.');
    recommendations.push('Consider hedging strategies for market downside protection.');
  }
  
  // Recommendations based on positions
  const symbolGroups: Record<string, number> = {};
  positions.forEach(pos => {
    const symbol = pos.symbol;
    symbolGroups[symbol] = (symbolGroups[symbol] || 0) + (pos.current_value || 0);
  });
  
  const totalValue = positions.reduce((sum, pos) => sum + (pos.current_value || 0), 0);
  
  for (const [symbol, value] of Object.entries(symbolGroups)) {
    const percentage = (value / totalValue) * 100;
    if (percentage > 20) {
      recommendations.push(`High concentration (${percentage.toFixed(1)}%) in ${symbol}. Consider diversification.`);
    }
  }
  
  // Recommendations based on scenario analysis
  if (scenarioResults?.market_crash?.totalImpact < -25) {
    recommendations.push('Portfolio highly vulnerable to market downturn. Consider adding downside protection.');
  }
  
  // Add general recommendations if none specific
  if (recommendations.length === 0) {
    if (riskScore < 30) {
      recommendations.push('Current risk level is low. Consider if more aggressive positions align with goals.');
    } else {
      recommendations.push('Maintain current risk management procedures.');
    }
  }
  
  return recommendations;
}
