/**
 * Report Generation Service
 * Generates reports for monitoring data in various formats (PDF, CSV)
 */

import { createServerClient } from '@/utils/supabase/server';
import { TradingAlert, AlertLevel, AlertRuleType } from './alert-management-service';
import { format } from 'date-fns';

// Common interfaces for report data
interface ReportOptions {
  format: 'pdf' | 'csv' | 'json';
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeHeaders?: boolean;
  title?: string;
  description?: string;
  timezone?: string;
}

interface ReportMetadata {
  title: string;
  description?: string;
  generatedAt: string;
  generatedBy: string;
  reportPeriod?: {
    from: string;
    to: string;
  };
  filtersSummary?: string[];
}

interface ReportResult {
  success: boolean;
  metadata: ReportMetadata;
  data?: any;
  url?: string;
  filename?: string;
  error?: string;
}

export class ReportGenerationService {
  /**
   * Generate an alert history report
   */
  static async generateAlertReport(
    userId: string,
    options: ReportOptions
  ): Promise<ReportResult> {
    try {
      const supabase = await createServerClient();
      
      // Build query for alerts
      let query = supabase
        .from('trading_alerts')
        .select('*')
        .eq('user_id', userId);
      
      // Apply filters
      if (options.filters) {
        if (options.filters.farm_id) {
          query = query.eq('farm_id', options.filters.farm_id);
        }
        if (options.filters.strategy_id) {
          query = query.eq('strategy_id', options.filters.strategy_id);
        }
        if (options.filters.agent_id) {
          query = query.eq('agent_id', options.filters.agent_id);
        }
        if (options.filters.exchange) {
          query = query.eq('exchange', options.filters.exchange);
        }
        if (options.filters.level) {
          query = query.eq('level', options.filters.level);
        }
        if (options.filters.alert_type) {
          query = query.eq('alert_type', options.filters.alert_type);
        }
        if (options.filters.start_date) {
          query = query.gte('created_at', options.filters.start_date);
        }
        if (options.filters.end_date) {
          query = query.lte('created_at', options.filters.end_date);
        }
        if (options.filters.acknowledged === true) {
          query = query.eq('is_acknowledged', true);
        } else if (options.filters.acknowledged === false) {
          query = query.eq('is_acknowledged', false);
        }
      }
      
      // Apply sorting
      if (options.sortBy) {
        query = query.order(options.sortBy, { ascending: options.sortOrder === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      // Execute query
      const { data: alerts, error } = await query;
      
      if (error) throw error;
      
      // Format the alerts data based on the requested format
      const result = this.formatAlertReport(userId, alerts || [], options);
      
      return result;
    } catch (error) {
      console.error('Error generating alert report:', error);
      return {
        success: false,
        metadata: {
          title: options.title || 'Alert History Report',
          generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          generatedBy: userId,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Generate a monitoring metrics report
   */
  static async generateMonitoringReport(
    userId: string,
    options: ReportOptions
  ): Promise<ReportResult> {
    try {
      const supabase = await createServerClient();
      
      // Determine date range
      const endDate = options.filters?.end_date || new Date().toISOString();
      const startDate = options.filters?.start_date || 
        new Date(new Date(endDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get farm information if filtered
      const farmId = options.filters?.farm_id;
      
      // Collect agent metrics
      const { data: agentMetrics, error: agentError } = await supabase
        .from('agent_monitoring')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });
      
      if (agentError) throw agentError;
      
      // Collect exchange metrics
      const { data: exchangeMetrics, error: exchangeError } = await supabase
        .from('exchange_monitoring')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });
      
      if (exchangeError) throw exchangeError;
      
      // Collect alert statistics
      const { data: alertStats, error: alertError } = await supabase
        .from('trading_alerts')
        .select('level, alert_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (alertError) throw alertError;
      
      // Format the monitoring report
      const reportData = {
        agent_metrics: agentMetrics || [],
        exchange_metrics: exchangeMetrics || [],
        alert_statistics: this.calculateAlertStatistics(alertStats || []),
        period: {
          start_date: startDate,
          end_date: endDate,
        },
      };
      
      // Format the report based on the requested format
      const result = this.formatMonitoringReport(userId, reportData, options);
      
      return result;
    } catch (error) {
      console.error('Error generating monitoring report:', error);
      return {
        success: false,
        metadata: {
          title: options.title || 'Monitoring Metrics Report',
          generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          generatedBy: userId,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Generate a trading compliance report
   */
  static async generateComplianceReport(
    userId: string,
    options: ReportOptions
  ): Promise<ReportResult> {
    try {
      const supabase = await createServerClient();
      
      // Determine date range
      const endDate = options.filters?.end_date || new Date().toISOString();
      const startDate = options.filters?.start_date || 
        new Date(new Date(endDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Get audit logs
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false });
      
      if (auditError) throw auditError;
      
      // Get critical alerts
      const { data: criticalAlerts, error: alertError } = await supabase
        .from('trading_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('level', 'error')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      
      if (alertError) throw alertError;
      
      // Format the compliance report
      const reportData = {
        audit_logs: auditLogs || [],
        critical_alerts: criticalAlerts || [],
        period: {
          start_date: startDate,
          end_date: endDate,
        },
      };
      
      // Format the report based on the requested format
      const result = this.formatComplianceReport(userId, reportData, options);
      
      return result;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      return {
        success: false,
        metadata: {
          title: options.title || 'Trading Compliance Report',
          generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          generatedBy: userId,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Format alert report in the requested format
   */
  private static formatAlertReport(
    userId: string,
    alerts: TradingAlert[],
    options: ReportOptions
  ): ReportResult {
    // Generate report metadata
    const metadata: ReportMetadata = {
      title: options.title || 'Alert History Report',
      description: options.description,
      generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      generatedBy: userId,
    };
    
    // Add report period if date filters are provided
    if (options.filters?.start_date || options.filters?.end_date) {
      metadata.reportPeriod = {
        from: options.filters?.start_date || 'beginning',
        to: options.filters?.end_date || 'now',
      };
    }
    
    // Add filters summary
    const filtersSummary: string[] = [];
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          filtersSummary.push(`${key.replace('_', ' ')}: ${value}`);
        }
      });
    }
    if (filtersSummary.length > 0) {
      metadata.filtersSummary = filtersSummary;
    }
    
    // Format data based on requested format
    switch (options.format) {
      case 'csv':
        return this.formatAlertReportAsCsv(alerts, metadata);
      case 'pdf':
        return this.formatAlertReportAsPdf(alerts, metadata);
      case 'json':
      default:
        return {
          success: true,
          metadata,
          data: alerts,
          filename: `alert_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`,
        };
    }
  }
  
  /**
   * Format monitoring report in the requested format
   */
  private static formatMonitoringReport(
    userId: string,
    data: any,
    options: ReportOptions
  ): ReportResult {
    // Generate report metadata
    const metadata: ReportMetadata = {
      title: options.title || 'Monitoring Metrics Report',
      description: options.description,
      generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      generatedBy: userId,
      reportPeriod: {
        from: data.period.start_date,
        to: data.period.end_date,
      },
    };
    
    // Format data based on requested format
    switch (options.format) {
      case 'csv':
        return this.formatMonitoringReportAsCsv(data, metadata);
      case 'pdf':
        return this.formatMonitoringReportAsPdf(data, metadata);
      case 'json':
      default:
        return {
          success: true,
          metadata,
          data,
          filename: `monitoring_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`,
        };
    }
  }
  
  /**
   * Format compliance report in the requested format
   */
  private static formatComplianceReport(
    userId: string,
    data: any,
    options: ReportOptions
  ): ReportResult {
    // Generate report metadata
    const metadata: ReportMetadata = {
      title: options.title || 'Trading Compliance Report',
      description: options.description,
      generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      generatedBy: userId,
      reportPeriod: {
        from: data.period.start_date,
        to: data.period.end_date,
      },
    };
    
    // Format data based on requested format
    switch (options.format) {
      case 'csv':
        return this.formatComplianceReportAsCsv(data, metadata);
      case 'pdf':
        return this.formatComplianceReportAsPdf(data, metadata);
      case 'json':
      default:
        return {
          success: true,
          metadata,
          data,
          filename: `compliance_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`,
        };
    }
  }
  
  /**
   * Format alert report as CSV
   */
  private static formatAlertReportAsCsv(
    alerts: TradingAlert[],
    metadata: ReportMetadata
  ): ReportResult {
    // CSV Header
    let csv = 'ID,Date,Level,Type,Message,Farm ID,Strategy ID,Agent ID,Exchange,Read,Acknowledged\n';
    
    // CSV Rows
    alerts.forEach(alert => {
      const row = [
        alert.id,
        alert.created_at,
        alert.level,
        alert.alert_type,
        `"${alert.message?.replace(/"/g, '""')}"`,
        alert.farm_id || '',
        alert.strategy_id || '',
        alert.agent_id || '',
        alert.exchange || '',
        alert.is_read ? 'Yes' : 'No',
        alert.is_acknowledged ? 'Yes' : 'No',
      ];
      csv += row.join(',') + '\n';
    });
    
    return {
      success: true,
      metadata,
      data: csv,
      filename: `alert_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`,
    };
  }
  
  /**
   * Format monitoring report as CSV
   */
  private static formatMonitoringReportAsCsv(
    data: any,
    metadata: ReportMetadata
  ): ReportResult {
    // For simplicity, we'll create multiple CSV sections
    
    // Agent Metrics CSV
    let agentCsv = 'Timestamp,Agent ID,Agent Name,Status,Success Rate,Error Count,Last Execution Time\n';
    data.agent_metrics.forEach((metric: any) => {
      const row = [
        metric.timestamp,
        metric.agent_id,
        `"${metric.agent_name?.replace(/"/g, '""')}"`,
        metric.status,
        metric.success_rate,
        metric.error_count,
        metric.last_execution_time,
      ];
      agentCsv += row.join(',') + '\n';
    });
    
    // Exchange Metrics CSV
    let exchangeCsv = 'Timestamp,Exchange,Status,API Usage,API Limit,Response Time\n';
    data.exchange_metrics.forEach((metric: any) => {
      const row = [
        metric.timestamp,
        metric.exchange,
        metric.status,
        metric.api_usage,
        metric.api_limit,
        metric.response_time,
      ];
      exchangeCsv += row.join(',') + '\n';
    });
    
    // Alert Statistics CSV
    let alertCsv = 'Alert Level,Alert Type,Count\n';
    Object.entries(data.alert_statistics).forEach(([level, types]: [string, any]) => {
      Object.entries(types).forEach(([type, count]: [string, any]) => {
        alertCsv += `${level},${type},${count}\n`;
      });
    });
    
    // Combine the CSVs with section headers
    const combinedCsv = 
      '# AGENT METRICS\n' + agentCsv + '\n\n' +
      '# EXCHANGE METRICS\n' + exchangeCsv + '\n\n' +
      '# ALERT STATISTICS\n' + alertCsv;
    
    return {
      success: true,
      metadata,
      data: combinedCsv,
      filename: `monitoring_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`,
    };
  }
  
  /**
   * Format compliance report as CSV
   */
  private static formatComplianceReportAsCsv(
    data: any,
    metadata: ReportMetadata
  ): ReportResult {
    // Audit Logs CSV
    let auditCsv = 'Timestamp,User ID,Action,Resource,IP Address,Status,Details\n';
    data.audit_logs.forEach((log: any) => {
      const row = [
        log.timestamp,
        log.user_id,
        log.action,
        log.resource,
        log.ip_address,
        log.status,
        `"${JSON.stringify(log.details)?.replace(/"/g, '""')}"`,
      ];
      auditCsv += row.join(',') + '\n';
    });
    
    // Critical Alerts CSV
    let alertCsv = 'Date,Type,Message,Farm ID,Strategy ID,Agent ID,Exchange,Acknowledged\n';
    data.critical_alerts.forEach((alert: any) => {
      const row = [
        alert.created_at,
        alert.alert_type,
        `"${alert.message?.replace(/"/g, '""')}"`,
        alert.farm_id || '',
        alert.strategy_id || '',
        alert.agent_id || '',
        alert.exchange || '',
        alert.is_acknowledged ? 'Yes' : 'No',
      ];
      alertCsv += row.join(',') + '\n';
    });
    
    // Combine the CSVs with section headers
    const combinedCsv = 
      '# AUDIT LOGS\n' + auditCsv + '\n\n' +
      '# CRITICAL ALERTS\n' + alertCsv;
    
    return {
      success: true,
      metadata,
      data: combinedCsv,
      filename: `compliance_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`,
    };
  }
  
  /**
   * Format alert report as PDF
   * This is a placeholder - in a real implementation, you would use a PDF generation library
   */
  private static formatAlertReportAsPdf(
    alerts: TradingAlert[],
    metadata: ReportMetadata
  ): ReportResult {
    // In a real implementation, this would use a PDF generation library like PDFKit or jsPDF
    // For this example, we'll just return a placeholder message
    
    return {
      success: true,
      metadata,
      data: 'PDF generation would be implemented with an actual PDF library',
      filename: `alert_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`,
      url: '/api/monitoring/reports/download?id=placeholder',
    };
  }
  
  /**
   * Format monitoring report as PDF
   * This is a placeholder - in a real implementation, you would use a PDF generation library
   */
  private static formatMonitoringReportAsPdf(
    data: any,
    metadata: ReportMetadata
  ): ReportResult {
    // In a real implementation, this would use a PDF generation library
    // For this example, we'll just return a placeholder message
    
    return {
      success: true,
      metadata,
      data: 'PDF generation would be implemented with an actual PDF library',
      filename: `monitoring_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`,
      url: '/api/monitoring/reports/download?id=placeholder',
    };
  }
  
  /**
   * Format compliance report as PDF
   * This is a placeholder - in a real implementation, you would use a PDF generation library
   */
  private static formatComplianceReportAsPdf(
    data: any,
    metadata: ReportMetadata
  ): ReportResult {
    // In a real implementation, this would use a PDF generation library
    // For this example, we'll just return a placeholder message
    
    return {
      success: true,
      metadata,
      data: 'PDF generation would be implemented with an actual PDF library',
      filename: `compliance_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`,
      url: '/api/monitoring/reports/download?id=placeholder',
    };
  }
  
  /**
   * Calculate alert statistics
   */
  private static calculateAlertStatistics(alerts: Array<{
    level: AlertLevel;
    alert_type: AlertRuleType;
    created_at: string;
  }>): Record<AlertLevel, Record<string, number>> {
    const statistics: Record<AlertLevel, Record<string, number>> = {
      info: {},
      warning: {},
      error: {},
    };
    
    alerts.forEach(alert => {
      if (!statistics[alert.level][alert.alert_type]) {
        statistics[alert.level][alert.alert_type] = 0;
      }
      statistics[alert.level][alert.alert_type]++;
    });
    
    return statistics;
  }
}
