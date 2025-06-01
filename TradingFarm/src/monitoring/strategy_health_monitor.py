"""
Strategy Health Monitoring System

Provides automated monitoring of trading strategy health including:
- Performance metrics tracking
- Degradation detection
- Anomaly detection
- Performance alerts
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union, Set
from datetime import datetime, timedelta
import json
import os
import numpy as np
from enum import Enum

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    """Health status indicators."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class PerformanceMetric(Enum):
    """Key performance metrics to track."""
    WIN_RATE = "win_rate"
    PROFIT_FACTOR = "profit_factor"
    SHARPE_RATIO = "sharpe_ratio"
    SORTINO_RATIO = "sortino_ratio"
    MAX_DRAWDOWN = "max_drawdown"
    AVERAGE_PROFIT = "average_profit"
    AVERAGE_LOSS = "average_loss"
    EXPECTANCY = "expectancy"
    SLIPPAGE = "slippage"
    EXECUTION_QUALITY = "execution_quality"


class StrategyHealthThresholds:
    """Thresholds for strategy health metrics."""
    
    def __init__(
        self,
        win_rate_warning: float = 0.4,
        win_rate_critical: float = 0.3,
        profit_factor_warning: float = 1.2,
        profit_factor_critical: float = 1.0,
        sharpe_ratio_warning: float = 0.5,
        sharpe_ratio_critical: float = 0.0,
        max_drawdown_warning: float = 15.0,  # Percent
        max_drawdown_critical: float = 25.0,  # Percent
        slippage_warning: float = 0.3,  # Percent
        slippage_critical: float = 0.5,  # Percent
        lookback_periods: int = 30  # Days to look back for comparing performance
    ):
        """
        Initialize thresholds.
        
        Args:
            win_rate_warning: Warning threshold for win rate
            win_rate_critical: Critical threshold for win rate
            profit_factor_warning: Warning threshold for profit factor
            profit_factor_critical: Critical threshold for profit factor
            sharpe_ratio_warning: Warning threshold for Sharpe ratio
            sharpe_ratio_critical: Critical threshold for Sharpe ratio
            max_drawdown_warning: Warning threshold for max drawdown percentage
            max_drawdown_critical: Critical threshold for max drawdown percentage
            slippage_warning: Warning threshold for slippage percentage
            slippage_critical: Critical threshold for slippage percentage
            lookback_periods: Number of days to look back for baseline comparison
        """
        self.thresholds = {
            PerformanceMetric.WIN_RATE: {
                HealthStatus.WARNING: win_rate_warning,
                HealthStatus.CRITICAL: win_rate_critical
            },
            PerformanceMetric.PROFIT_FACTOR: {
                HealthStatus.WARNING: profit_factor_warning,
                HealthStatus.CRITICAL: profit_factor_critical
            },
            PerformanceMetric.SHARPE_RATIO: {
                HealthStatus.WARNING: sharpe_ratio_warning,
                HealthStatus.CRITICAL: sharpe_ratio_critical
            },
            PerformanceMetric.MAX_DRAWDOWN: {
                HealthStatus.WARNING: max_drawdown_warning,
                HealthStatus.CRITICAL: max_drawdown_critical
            },
            PerformanceMetric.SLIPPAGE: {
                HealthStatus.WARNING: slippage_warning,
                HealthStatus.CRITICAL: slippage_critical
            }
        }
        self.lookback_periods = lookback_periods
    
    def get_threshold(self, metric: PerformanceMetric, level: HealthStatus) -> float:
        """
        Get threshold for a specific metric and level.
        
        Args:
            metric: Performance metric
            level: Health status level
            
        Returns:
            Threshold value
        """
        return self.thresholds.get(metric, {}).get(level, 0.0)
    
    def evaluate_metric(self, metric: PerformanceMetric, value: float) -> HealthStatus:
        """
        Evaluate a metric against thresholds.
        
        Args:
            metric: Performance metric
            value: Metric value
            
        Returns:
            Health status
        """
        if metric not in self.thresholds:
            return HealthStatus.UNKNOWN
        
        # For metrics where lower is worse (win rate, profit factor, sharpe ratio)
        if metric in [PerformanceMetric.WIN_RATE, PerformanceMetric.PROFIT_FACTOR, 
                     PerformanceMetric.SHARPE_RATIO, PerformanceMetric.SORTINO_RATIO,
                     PerformanceMetric.EXPECTANCY, PerformanceMetric.EXECUTION_QUALITY]:
            
            if value <= self.thresholds[metric][HealthStatus.CRITICAL]:
                return HealthStatus.CRITICAL
            elif value <= self.thresholds[metric][HealthStatus.WARNING]:
                return HealthStatus.WARNING
            else:
                return HealthStatus.HEALTHY
        
        # For metrics where higher is worse (drawdown, slippage)
        elif metric in [PerformanceMetric.MAX_DRAWDOWN, PerformanceMetric.SLIPPAGE]:
            if value >= self.thresholds[metric][HealthStatus.CRITICAL]:
                return HealthStatus.CRITICAL
            elif value >= self.thresholds[metric][HealthStatus.WARNING]:
                return HealthStatus.WARNING
            else:
                return HealthStatus.HEALTHY
        
        return HealthStatus.UNKNOWN
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert thresholds to dictionary."""
        return {
            "thresholds": {
                metric.value: {
                    level.value: value for level, value in levels.items()
                } for metric, levels in self.thresholds.items()
            },
            "lookback_periods": self.lookback_periods
        }


class StrategyHealthMonitor:
    """
    Monitors the health of trading strategies.
    
    Features:
    - Real-time performance tracking
    - Strategy degradation detection
    - Performance anomaly detection
    - Alert generation
    """
    
    def __init__(
        self,
        strategy_id: str,
        thresholds: Optional[StrategyHealthThresholds] = None,
        history_file: Optional[str] = None
    ):
        """
        Initialize strategy health monitor.
        
        Args:
            strategy_id: ID of the strategy to monitor
            thresholds: Thresholds for health metrics
            history_file: Path to history file
        """
        self.strategy_id = strategy_id
        self.thresholds = thresholds or StrategyHealthThresholds()
        self.history_file = history_file
        
        # Performance history
        self.performance_history: List[Dict[str, Any]] = []
        self.current_metrics: Dict[PerformanceMetric, float] = {}
        self.baseline_metrics: Dict[PerformanceMetric, float] = {}
        self.alerts: List[Dict[str, Any]] = []
        
        # Load history if available
        if history_file and os.path.exists(history_file):
            self._load_history()
        
        logger.info(f"Strategy Health Monitor initialized for strategy {strategy_id}")
    
    def _load_history(self) -> None:
        """Load performance history from file."""
        try:
            with open(self.history_file, 'r') as f:
                data = json.load(f)
            
            self.performance_history = data.get('performance_history', [])
            self.alerts = data.get('alerts', [])
            
            logger.info(f"Loaded {len(self.performance_history)} historical records")
        except Exception as e:
            logger.error(f"Error loading history: {str(e)}")
    
    def _save_history(self) -> None:
        """Save performance history to file."""
        if not self.history_file:
            return
        
        try:
            with open(self.history_file, 'w') as f:
                json.dump({
                    'performance_history': self.performance_history,
                    'alerts': self.alerts
                }, f, indent=2)
            
            logger.info(f"Saved {len(self.performance_history)} historical records")
        except Exception as e:
            logger.error(f"Error saving history: {str(e)}")
    
    def update_metrics(self, metrics: Dict[str, float], timestamp: Optional[datetime] = None) -> None:
        """
        Update performance metrics.
        
        Args:
            metrics: Performance metrics dictionary
            timestamp: Timestamp for the metrics (defaults to now)
        """
        timestamp = timestamp or datetime.now()
        
        # Convert string metrics to enum
        enum_metrics = {}
        for metric_str, value in metrics.items():
            try:
                metric = PerformanceMetric(metric_str)
                enum_metrics[metric] = value
            except ValueError:
                logger.warning(f"Unknown metric: {metric_str}")
        
        # Update current metrics
        self.current_metrics.update(enum_metrics)
        
        # Add to history
        self.performance_history.append({
            'timestamp': timestamp.isoformat(),
            'metrics': {k.value: v for k, v in enum_metrics.items()}
        })
        
        # Update baseline if needed
        if not self.baseline_metrics:
            self._calculate_baseline_metrics()
        
        # Check for health issues
        self._check_health(timestamp)
        
        # Save history
        self._save_history()
        
        logger.info(f"Updated {len(enum_metrics)} metrics for strategy {self.strategy_id}")
    
    def _calculate_baseline_metrics(self) -> None:
        """Calculate baseline metrics from historical data."""
        if not self.performance_history:
            logger.warning("No history available to calculate baseline metrics")
            return
        
        # Get lookback period
        lookback_date = datetime.now() - timedelta(days=self.thresholds.lookback_periods)
        
        # Filter historical records within lookback period
        baseline_records = []
        for record in self.performance_history:
            try:
                record_date = datetime.fromisoformat(record['timestamp'])
                if record_date >= lookback_date:
                    baseline_records.append(record)
            except (ValueError, KeyError):
                continue
        
        if not baseline_records:
            logger.warning(f"No records found within lookback period ({self.thresholds.lookback_periods} days)")
            return
        
        # Calculate average for each metric
        baseline = {}
        for metric in PerformanceMetric:
            values = []
            for record in baseline_records:
                if metric.value in record.get('metrics', {}):
                    values.append(record['metrics'][metric.value])
            
            if values:
                baseline[metric] = sum(values) / len(values)
        
        self.baseline_metrics = baseline
        logger.info(f"Calculated baseline metrics from {len(baseline_records)} historical records")
    
    def _check_health(self, timestamp: datetime) -> None:
        """
        Check strategy health and generate alerts.
        
        Args:
            timestamp: Current timestamp
        """
        health_issues = []
        
        # Check each metric against thresholds
        for metric, value in self.current_metrics.items():
            status = self.thresholds.evaluate_metric(metric, value)
            
            if status in [HealthStatus.WARNING, HealthStatus.CRITICAL]:
                health_issues.append({
                    'metric': metric.value,
                    'value': value,
                    'status': status.value,
                    'threshold': (self.thresholds.get_threshold(metric, HealthStatus.WARNING) 
                                if status == HealthStatus.WARNING else
                                self.thresholds.get_threshold(metric, HealthStatus.CRITICAL))
                })
        
        # Check for degradation compared to baseline
        if self.baseline_metrics:
            for metric, baseline_value in self.baseline_metrics.items():
                if metric in self.current_metrics:
                    current_value = self.current_metrics[metric]
                    
                    # Calculate percent change
                    if baseline_value != 0:
                        percent_change = ((current_value - baseline_value) / abs(baseline_value)) * 100
                    else:
                        percent_change = 0
                    
                    # Check if degradation is significant (>20% worse)
                    is_degraded = False
                    
                    # For metrics where higher is better
                    if metric in [PerformanceMetric.WIN_RATE, PerformanceMetric.PROFIT_FACTOR, 
                                PerformanceMetric.SHARPE_RATIO, PerformanceMetric.SORTINO_RATIO,
                                PerformanceMetric.EXPECTANCY, PerformanceMetric.EXECUTION_QUALITY]:
                        
                        if percent_change < -20:  # 20% worse
                            is_degraded = True
                    
                    # For metrics where lower is better
                    elif metric in [PerformanceMetric.MAX_DRAWDOWN, PerformanceMetric.SLIPPAGE]:
                        if percent_change > 20:  # 20% worse
                            is_degraded = True
                    
                    if is_degraded:
                        health_issues.append({
                            'metric': metric.value,
                            'value': current_value,
                            'baseline': baseline_value,
                            'percent_change': percent_change,
                            'status': 'degraded'
                        })
        
        # Generate alerts for health issues
        if health_issues:
            alert = {
                'timestamp': timestamp.isoformat(),
                'strategy_id': self.strategy_id,
                'issues': health_issues,
                'overall_status': (HealthStatus.CRITICAL.value if any(i['status'] == HealthStatus.CRITICAL.value 
                                                               for i in health_issues if 'status' in i)
                                else HealthStatus.WARNING.value)
            }
            
            self.alerts.append(alert)
            logger.warning(f"Strategy health alert generated for {self.strategy_id}: "
                          f"{len(health_issues)} issues detected")
            
            # TODO: Send alert to notification system
        
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get current health status.
        
        Returns:
            Health status report
        """
        # Calculate overall status
        overall_status = HealthStatus.HEALTHY
        
        for metric, value in self.current_metrics.items():
            status = self.thresholds.evaluate_metric(metric, value)
            
            if status == HealthStatus.CRITICAL:
                overall_status = HealthStatus.CRITICAL
                break
            elif status == HealthStatus.WARNING and overall_status != HealthStatus.CRITICAL:
                overall_status = HealthStatus.WARNING
        
        # Prepare metrics report
        metrics_report = {}
        for metric, value in self.current_metrics.items():
            status = self.thresholds.evaluate_metric(metric, value)
            baseline = self.baseline_metrics.get(metric)
            
            metrics_report[metric.value] = {
                'value': value,
                'status': status.value,
                'baseline': baseline,
                'percent_change': ((value - baseline) / abs(baseline)) * 100 if baseline else None
            }
        
        # Count alerts in last 24 hours
        recent_alerts = 0
        cutoff = datetime.now() - timedelta(hours=24)
        
        for alert in self.alerts:
            try:
                alert_time = datetime.fromisoformat(alert['timestamp'])
                if alert_time >= cutoff:
                    recent_alerts += 1
            except (ValueError, KeyError):
                continue
        
        return {
            'timestamp': datetime.now().isoformat(),
            'strategy_id': self.strategy_id,
            'overall_status': overall_status.value,
            'metrics': metrics_report,
            'recent_alerts': recent_alerts,
            'total_alerts': len(self.alerts)
        }
