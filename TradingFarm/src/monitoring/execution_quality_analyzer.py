"""
Execution Quality Analysis System

Provides monitoring and analysis of trade execution quality with:
- Slippage monitoring and analysis
- Execution speed tracking
- Market impact assessment
- Cost analysis
- Performance reporting
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union, Set
from datetime import datetime, timedelta
import json
import os
import numpy as np
from enum import Enum
import pandas as pd

logger = logging.getLogger(__name__)

class ExecutionQualityMetric(Enum):
    """Execution quality metrics."""
    PRICE_SLIPPAGE = "price_slippage"  # Difference between expected and actual price
    SLIPPAGE_COST = "slippage_cost"  # Cost of slippage in currency
    SLIPPAGE_PERCENT = "slippage_percent"  # Slippage as percentage of expected price
    EXECUTION_SPEED = "execution_speed"  # Time from submission to execution in milliseconds
    MARKET_IMPACT = "market_impact"  # Price movement caused by the trade
    FILL_QUALITY = "fill_quality"  # Overall quality score (0-100)
    FILL_RATE = "fill_rate"  # Percentage of order quantity filled
    EXECUTION_COST = "execution_cost"  # Total cost including fees and slippage
    QUOTE_LATENCY = "quote_latency"  # Latency in milliseconds between quote and execution


class ExecutionQualityReport:
    """Report on execution quality for analysis and optimization."""
    
    def __init__(
        self,
        strategy_id: str,
        exchange: str,
        symbol: str,
        period_start: datetime,
        period_end: datetime,
        trades_analyzed: int,
        metrics: Dict[str, float]
    ):
        """
        Initialize execution quality report.
        
        Args:
            strategy_id: ID of the strategy
            exchange: Exchange name
            symbol: Trading symbol
            period_start: Start of analysis period
            period_end: End of analysis period
            trades_analyzed: Number of trades analyzed
            metrics: Quality metrics
        """
        self.strategy_id = strategy_id
        self.exchange = exchange
        self.symbol = symbol
        self.period_start = period_start
        self.period_end = period_end
        self.trades_analyzed = trades_analyzed
        self.metrics = metrics
        self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary."""
        return {
            "strategy_id": self.strategy_id,
            "exchange": self.exchange,
            "symbol": self.symbol,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "trades_analyzed": self.trades_analyzed,
            "metrics": self.metrics,
            "timestamp": self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExecutionQualityReport':
        """Create report from dictionary."""
        return cls(
            strategy_id=data.get("strategy_id", ""),
            exchange=data.get("exchange", ""),
            symbol=data.get("symbol", ""),
            period_start=datetime.fromisoformat(data.get("period_start", datetime.now().isoformat())),
            period_end=datetime.fromisoformat(data.get("period_end", datetime.now().isoformat())),
            trades_analyzed=data.get("trades_analyzed", 0),
            metrics=data.get("metrics", {})
        )
    
    def get_score(self) -> float:
        """
        Get overall execution quality score (0-100).
        
        Returns:
            Execution quality score
        """
        score = self.metrics.get(ExecutionQualityMetric.FILL_QUALITY.value, 0)
        return score


class ExecutionQualityAnalyzer:
    """
    Analyzes execution quality of trades to identify issues and optimize performance.
    
    Features:
    - Slippage tracking and analysis
    - Execution timing analysis
    - Market impact assessment
    - Historical trend analysis
    - Exchange comparison
    """
    
    def __init__(
        self,
        history_file: Optional[str] = None,
        alert_threshold_slippage: float = 0.5,  # 0.5% slippage threshold for alerts
        alert_threshold_score: float = 70  # Minimum acceptable execution quality score
    ):
        """
        Initialize execution quality analyzer.
        
        Args:
            history_file: Path to history file
            alert_threshold_slippage: Slippage percentage threshold for alerts
            alert_threshold_score: Score threshold for alerts
        """
        self.history_file = history_file
        self.alert_threshold_slippage = alert_threshold_slippage
        self.alert_threshold_score = alert_threshold_score
        
        # Execution quality reports
        self.reports: List[ExecutionQualityReport] = []
        self.alerts: List[Dict[str, Any]] = []
        
        # Load history if available
        if history_file and os.path.exists(history_file):
            self._load_history()
        
        logger.info(f"Execution Quality Analyzer initialized")
    
    def _load_history(self) -> None:
        """Load execution quality history from file."""
        try:
            with open(self.history_file, 'r') as f:
                data = json.load(f)
            
            self.reports = [ExecutionQualityReport.from_dict(r) for r in data.get('reports', [])]
            self.alerts = data.get('alerts', [])
            
            logger.info(f"Loaded {len(self.reports)} historical reports")
        except Exception as e:
            logger.error(f"Error loading history: {str(e)}")
    
    def _save_history(self) -> None:
        """Save execution quality history to file."""
        if not self.history_file:
            return
        
        try:
            with open(self.history_file, 'w') as f:
                json.dump({
                    'reports': [r.to_dict() for r in self.reports],
                    'alerts': self.alerts
                }, f, indent=2)
            
            logger.info(f"Saved {len(self.reports)} historical reports")
        except Exception as e:
            logger.error(f"Error saving history: {str(e)}")
    
    def analyze_trades(self, trades: List[Dict[str, Any]], 
                       strategy_id: str, exchange: str, symbol: str) -> ExecutionQualityReport:
        """
        Analyze trade execution quality.
        
        Args:
            trades: List of executed trades
            strategy_id: ID of the strategy
            exchange: Exchange name
            symbol: Trading symbol
            
        Returns:
            Execution quality report
        """
        if not trades:
            logger.warning(f"No trades provided for analysis")
            return ExecutionQualityReport(
                strategy_id=strategy_id,
                exchange=exchange,
                symbol=symbol,
                period_start=datetime.now(),
                period_end=datetime.now(),
                trades_analyzed=0,
                metrics={}
            )
        
        # Extract timestamps
        try:
            timestamps = [datetime.fromisoformat(t.get('timestamp', datetime.now().isoformat())) 
                         for t in trades]
            period_start = min(timestamps)
            period_end = max(timestamps)
        except (ValueError, KeyError):
            period_start = datetime.now() - timedelta(days=1)
            period_end = datetime.now()
        
        # Calculate execution quality metrics
        price_slippages = []
        slippage_costs = []
        slippage_percents = []
        execution_speeds = []
        market_impacts = []
        fill_rates = []
        execution_costs = []
        
        for trade in trades:
            try:
                # Extract trade data
                expected_price = trade.get('expected_price', 0)
                actual_price = trade.get('actual_price', 0)
                quantity = trade.get('quantity', 0)
                submission_time = datetime.fromisoformat(trade.get('submission_time', datetime.now().isoformat()))
                execution_time = datetime.fromisoformat(trade.get('execution_time', datetime.now().isoformat()))
                filled_quantity = trade.get('filled_quantity', 0)
                fees = trade.get('fees', 0)
                
                # Pre-trade price
                pre_trade_price = trade.get('pre_trade_price', expected_price)
                
                # Post-trade price (5 minutes after execution)
                post_trade_price = trade.get('post_trade_price', actual_price)
                
                # Calculate metrics
                if expected_price > 0:
                    # Slippage calculations
                    price_slippage = actual_price - expected_price
                    price_slippages.append(price_slippage)
                    
                    slippage_cost = price_slippage * filled_quantity
                    slippage_costs.append(slippage_cost)
                    
                    slippage_percent = (price_slippage / expected_price) * 100
                    slippage_percents.append(slippage_percent)
                
                # Execution speed
                execution_speed = (execution_time - submission_time).total_seconds() * 1000  # milliseconds
                execution_speeds.append(execution_speed)
                
                # Market impact
                if pre_trade_price > 0:
                    market_impact = ((actual_price - pre_trade_price) / pre_trade_price) * 100
                    market_impacts.append(market_impact)
                
                # Fill rate
                if quantity > 0:
                    fill_rate = (filled_quantity / quantity) * 100
                    fill_rates.append(fill_rate)
                
                # Execution cost
                execution_cost = fees + (slippage_cost if slippage_cost else 0)
                execution_costs.append(execution_cost)
                
            except Exception as e:
                logger.error(f"Error analyzing trade: {str(e)}")
        
        # Calculate aggregate metrics
        metrics = {}
        
        if price_slippages:
            metrics[ExecutionQualityMetric.PRICE_SLIPPAGE.value] = np.mean(price_slippages)
        
        if slippage_costs:
            metrics[ExecutionQualityMetric.SLIPPAGE_COST.value] = np.sum(slippage_costs)
        
        if slippage_percents:
            metrics[ExecutionQualityMetric.SLIPPAGE_PERCENT.value] = np.mean(slippage_percents)
        
        if execution_speeds:
            metrics[ExecutionQualityMetric.EXECUTION_SPEED.value] = np.mean(execution_speeds)
        
        if market_impacts:
            metrics[ExecutionQualityMetric.MARKET_IMPACT.value] = np.mean(market_impacts)
        
        if fill_rates:
            metrics[ExecutionQualityMetric.FILL_RATE.value] = np.mean(fill_rates)
        
        if execution_costs:
            metrics[ExecutionQualityMetric.EXECUTION_COST.value] = np.sum(execution_costs)
        
        # Calculate overall fill quality score (0-100)
        fill_quality = 100.0
        
        # Penalize for slippage
        if ExecutionQualityMetric.SLIPPAGE_PERCENT.value in metrics:
            slippage_percent = metrics[ExecutionQualityMetric.SLIPPAGE_PERCENT.value]
            
            if abs(slippage_percent) > 2.0:
                fill_quality -= 30
            elif abs(slippage_percent) > 1.0:
                fill_quality -= 20
            elif abs(slippage_percent) > 0.5:
                fill_quality -= 10
            elif abs(slippage_percent) > 0.1:
                fill_quality -= 5
        
        # Penalize for slow execution
        if ExecutionQualityMetric.EXECUTION_SPEED.value in metrics:
            execution_speed = metrics[ExecutionQualityMetric.EXECUTION_SPEED.value]
            
            if execution_speed > 5000:  # 5 seconds
                fill_quality -= 20
            elif execution_speed > 2000:  # 2 seconds
                fill_quality -= 10
            elif execution_speed > 1000:  # 1 second
                fill_quality -= 5
        
        # Penalize for poor fill rate
        if ExecutionQualityMetric.FILL_RATE.value in metrics:
            fill_rate = metrics[ExecutionQualityMetric.FILL_RATE.value]
            
            if fill_rate < 50:
                fill_quality -= 30
            elif fill_rate < 80:
                fill_quality -= 15
            elif fill_rate < 95:
                fill_quality -= 5
        
        # Penalize for market impact
        if ExecutionQualityMetric.MARKET_IMPACT.value in metrics:
            market_impact = metrics[ExecutionQualityMetric.MARKET_IMPACT.value]
            
            if abs(market_impact) > 1.0:
                fill_quality -= 20
            elif abs(market_impact) > 0.5:
                fill_quality -= 10
            elif abs(market_impact) > 0.1:
                fill_quality -= 5
        
        # Ensure score is within bounds
        fill_quality = max(0, min(100, fill_quality))
        metrics[ExecutionQualityMetric.FILL_QUALITY.value] = fill_quality
        
        # Create report
        report = ExecutionQualityReport(
            strategy_id=strategy_id,
            exchange=exchange,
            symbol=symbol,
            period_start=period_start,
            period_end=period_end,
            trades_analyzed=len(trades),
            metrics=metrics
        )
        
        # Add to history
        self.reports.append(report)
        
        # Check for quality issues and generate alerts
        self._check_quality(report)
        
        # Save history
        self._save_history()
        
        logger.info(f"Analyzed {len(trades)} trades for {strategy_id} on {exchange} ({symbol})")
        return report
    
    def _check_quality(self, report: ExecutionQualityReport) -> None:
        """
        Check execution quality and generate alerts.
        
        Args:
            report: Execution quality report
        """
        issues = []
        
        # Check slippage
        slippage_percent = report.metrics.get(ExecutionQualityMetric.SLIPPAGE_PERCENT.value)
        if slippage_percent is not None and abs(slippage_percent) > self.alert_threshold_slippage:
            issues.append({
                'metric': ExecutionQualityMetric.SLIPPAGE_PERCENT.value,
                'value': slippage_percent,
                'threshold': self.alert_threshold_slippage,
                'description': f"Slippage ({slippage_percent:.2f}%) exceeds threshold ({self.alert_threshold_slippage:.2f}%)"
            })
        
        # Check overall quality score
        fill_quality = report.metrics.get(ExecutionQualityMetric.FILL_QUALITY.value)
        if fill_quality is not None and fill_quality < self.alert_threshold_score:
            issues.append({
                'metric': ExecutionQualityMetric.FILL_QUALITY.value,
                'value': fill_quality,
                'threshold': self.alert_threshold_score,
                'description': f"Execution quality score ({fill_quality:.1f}) below threshold ({self.alert_threshold_score:.1f})"
            })
        
        # Generate alert if issues found
        if issues:
            alert = {
                'timestamp': datetime.now().isoformat(),
                'strategy_id': report.strategy_id,
                'exchange': report.exchange,
                'symbol': report.symbol,
                'issues': issues,
                'report_timestamp': report.timestamp.isoformat()
            }
            
            self.alerts.append(alert)
            logger.warning(f"Execution quality alert generated for {report.strategy_id} on {report.exchange}: "
                          f"{len(issues)} issues detected")
            
            # TODO: Send alert to notification system
    
    def get_exchange_comparison(self, symbol: str, lookback_days: int = 30) -> Dict[str, Any]:
        """
        Compare execution quality across exchanges.
        
        Args:
            symbol: Trading symbol
            lookback_days: Days to look back
            
        Returns:
            Exchange comparison report
        """
        # Filter reports for the symbol and time period
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        filtered_reports = []
        for report in self.reports:
            if (report.symbol == symbol and 
                report.timestamp >= cutoff and 
                ExecutionQualityMetric.FILL_QUALITY.value in report.metrics):
                filtered_reports.append(report)
        
        if not filtered_reports:
            logger.warning(f"No execution quality data available for {symbol} in the last {lookback_days} days")
            return {
                'symbol': symbol,
                'lookback_days': lookback_days,
                'exchanges': [],
                'timestamp': datetime.now().isoformat()
            }
        
        # Group by exchange
        exchange_data = {}
        
        for report in filtered_reports:
            exchange = report.exchange
            
            if exchange not in exchange_data:
                exchange_data[exchange] = {
                    'reports': [],
                    'avg_quality': 0,
                    'avg_slippage': 0,
                    'avg_speed': 0,
                    'trades_analyzed': 0
                }
            
            exchange_data[exchange]['reports'].append(report)
        
        # Calculate averages for each exchange
        exchange_summary = []
        
        for exchange, data in exchange_data.items():
            reports = data['reports']
            
            # Extract metrics from reports
            qualities = [r.metrics.get(ExecutionQualityMetric.FILL_QUALITY.value, 0) for r in reports]
            slippages = [r.metrics.get(ExecutionQualityMetric.SLIPPAGE_PERCENT.value, 0) for r in reports 
                        if ExecutionQualityMetric.SLIPPAGE_PERCENT.value in r.metrics]
            speeds = [r.metrics.get(ExecutionQualityMetric.EXECUTION_SPEED.value, 0) for r in reports
                     if ExecutionQualityMetric.EXECUTION_SPEED.value in r.metrics]
            trades = sum(r.trades_analyzed for r in reports)
            
            # Calculate averages
            avg_quality = sum(qualities) / len(qualities) if qualities else 0
            avg_slippage = sum(slippages) / len(slippages) if slippages else 0
            avg_speed = sum(speeds) / len(speeds) if speeds else 0
            
            exchange_summary.append({
                'exchange': exchange,
                'avg_quality': avg_quality,
                'avg_slippage': avg_slippage,
                'avg_speed': avg_speed,
                'reports_count': len(reports),
                'trades_analyzed': trades
            })
        
        # Sort by quality (descending)
        exchange_summary.sort(key=lambda x: x['avg_quality'], reverse=True)
        
        return {
            'symbol': symbol,
            'lookback_days': lookback_days,
            'exchanges': exchange_summary,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_slippage_trend(self, strategy_id: str, exchange: str, 
                          symbol: str, lookback_days: int = 30) -> Dict[str, Any]:
        """
        Analyze slippage trends over time.
        
        Args:
            strategy_id: ID of the strategy
            exchange: Exchange name
            symbol: Trading symbol
            lookback_days: Days to look back
            
        Returns:
            Slippage trend analysis
        """
        # Filter reports
        cutoff = datetime.now() - timedelta(days=lookback_days)
        
        filtered_reports = []
        for report in self.reports:
            if (report.strategy_id == strategy_id and 
                report.exchange == exchange and 
                report.symbol == symbol and 
                report.timestamp >= cutoff and 
                ExecutionQualityMetric.SLIPPAGE_PERCENT.value in report.metrics):
                filtered_reports.append(report)
        
        if not filtered_reports:
            logger.warning(f"No slippage data available for {strategy_id} on {exchange} ({symbol}) "
                          f"in the last {lookback_days} days")
            return {
                'strategy_id': strategy_id,
                'exchange': exchange,
                'symbol': symbol,
                'lookback_days': lookback_days,
                'data_points': [],
                'trend': 'unknown',
                'timestamp': datetime.now().isoformat()
            }
        
        # Extract data points
        data_points = []
        
        for report in filtered_reports:
            data_points.append({
                'timestamp': report.timestamp.isoformat(),
                'slippage': report.metrics[ExecutionQualityMetric.SLIPPAGE_PERCENT.value],
                'trades_analyzed': report.trades_analyzed
            })
        
        # Sort by timestamp
        data_points.sort(key=lambda x: x['timestamp'])
        
        # Analyze trend
        if len(data_points) >= 2:
            # Simple linear regression using numpy
            x = np.arange(len(data_points))
            y = np.array([p['slippage'] for p in data_points])
            
            slope, _ = np.polyfit(x, y, 1)
            
            if slope > 0.1:
                trend = 'deteriorating'
            elif slope < -0.1:
                trend = 'improving'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'
        
        return {
            'strategy_id': strategy_id,
            'exchange': exchange,
            'symbol': symbol,
            'lookback_days': lookback_days,
            'data_points': data_points,
            'trend': trend,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_quality_summary(self) -> Dict[str, Any]:
        """
        Get summary of execution quality across all strategies and exchanges.
        
        Returns:
            Execution quality summary
        """
        # Filter recent reports (last 7 days)
        cutoff = datetime.now() - timedelta(days=7)
        recent_reports = [r for r in self.reports if r.timestamp >= cutoff]
        
        if not recent_reports:
            logger.warning("No recent execution quality data available")
            return {
                'timestamp': datetime.now().isoformat(),
                'strategies': [],
                'exchanges': [],
                'overall_quality': 0,
                'alert_count': len([a for a in self.alerts 
                                   if datetime.fromisoformat(a['timestamp']) >= cutoff])
            }
        
        # Group by strategy and exchange
        strategy_data = {}
        exchange_data = {}
        
        for report in recent_reports:
            # Strategy grouping
            if report.strategy_id not in strategy_data:
                strategy_data[report.strategy_id] = {
                    'reports': [],
                    'exchanges': set(),
                    'symbols': set(),
                    'avg_quality': 0
                }
            
            strategy_data[report.strategy_id]['reports'].append(report)
            strategy_data[report.strategy_id]['exchanges'].add(report.exchange)
            strategy_data[report.strategy_id]['symbols'].add(report.symbol)
            
            # Exchange grouping
            if report.exchange not in exchange_data:
                exchange_data[report.exchange] = {
                    'reports': [],
                    'strategies': set(),
                    'symbols': set(),
                    'avg_quality': 0
                }
            
            exchange_data[report.exchange]['reports'].append(report)
            exchange_data[report.exchange]['strategies'].add(report.strategy_id)
            exchange_data[report.exchange]['symbols'].add(report.symbol)
        
        # Calculate averages for strategies
        strategy_summary = []
        
        for strategy_id, data in strategy_data.items():
            reports = data['reports']
            
            # Calculate average quality
            qualities = [r.metrics.get(ExecutionQualityMetric.FILL_QUALITY.value, 0) for r in reports
                        if ExecutionQualityMetric.FILL_QUALITY.value in r.metrics]
            
            avg_quality = sum(qualities) / len(qualities) if qualities else 0
            data['avg_quality'] = avg_quality
            
            strategy_summary.append({
                'strategy_id': strategy_id,
                'avg_quality': avg_quality,
                'exchanges': list(data['exchanges']),
                'symbols': list(data['symbols']),
                'reports_count': len(reports)
            })
        
        # Calculate averages for exchanges
        exchange_summary = []
        
        for exchange, data in exchange_data.items():
            reports = data['reports']
            
            # Calculate average quality
            qualities = [r.metrics.get(ExecutionQualityMetric.FILL_QUALITY.value, 0) for r in reports
                        if ExecutionQualityMetric.FILL_QUALITY.value in r.metrics]
            
            avg_quality = sum(qualities) / len(qualities) if qualities else 0
            data['avg_quality'] = avg_quality
            
            exchange_summary.append({
                'exchange': exchange,
                'avg_quality': avg_quality,
                'strategies': list(data['strategies']),
                'symbols': list(data['symbols']),
                'reports_count': len(reports)
            })
        
        # Sort summaries by quality
        strategy_summary.sort(key=lambda x: x['avg_quality'], reverse=True)
        exchange_summary.sort(key=lambda x: x['avg_quality'], reverse=True)
        
        # Calculate overall average quality
        all_qualities = [r.metrics.get(ExecutionQualityMetric.FILL_QUALITY.value, 0) for r in recent_reports
                       if ExecutionQualityMetric.FILL_QUALITY.value in r.metrics]
        
        overall_quality = sum(all_qualities) / len(all_qualities) if all_qualities else 0
        
        # Count recent alerts
        recent_alerts = len([a for a in self.alerts 
                           if datetime.fromisoformat(a['timestamp']) >= cutoff])
        
        return {
            'timestamp': datetime.now().isoformat(),
            'strategies': strategy_summary,
            'exchanges': exchange_summary,
            'overall_quality': overall_quality,
            'alert_count': recent_alerts
        }
