"""
ElizaOS Learning Engine
Provides mechanisms for strategy improvement and learning from historical data
"""

import asyncio
import json
import logging
import time
import os
import pickle
import numpy as np
from typing import Dict, List, Any, Optional, Union, Callable, Tuple
from datetime import datetime, timedelta

from .eliza_protocol import MessageType, ElizaProtocol
from .memory_persistence import MemoryPersistence
from ..exchanges.base import MarketData, Order, Position

logger = logging.getLogger(__name__)

class StrategyPerformanceTracker:
    """
    Tracks and analyzes strategy performance metrics.
    """
    
    def __init__(self, strategy_id: str, strategy_name: str):
        self.strategy_id = strategy_id
        self.strategy_name = strategy_name
        self.trades: List[Dict[str, Any]] = []
        self.signals: List[Dict[str, Any]] = []
        self.market_conditions: List[Dict[str, Any]] = []
        self.metrics: Dict[str, Any] = {
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "avg_profit": 0.0,
            "avg_loss": 0.0,
            "max_drawdown": 0.0,
            "sharpe_ratio": 0.0,
            "total_trades": 0,
            "profitable_trades": 0,
            "total_profit": 0.0,
            "total_loss": 0.0,
            "last_updated": int(time.time() * 1000)
        }
    
    def add_trade(self, trade: Dict[str, Any]) -> None:
        """Add a trade to the performance tracker."""
        self.trades.append(trade)
        self._update_metrics()
    
    def add_signal(self, signal: Dict[str, Any]) -> None:
        """Add a signal to the performance tracker."""
        self.signals.append(signal)
    
    def add_market_condition(self, condition: Dict[str, Any]) -> None:
        """Add a market condition snapshot to the performance tracker."""
        self.market_conditions.append(condition)
    
    def _update_metrics(self) -> None:
        """Update performance metrics based on trades."""
        if not self.trades:
            return
        
        # Calculate basic metrics
        total_trades = len(self.trades)
        profitable_trades = sum(1 for t in self.trades if t.get("profit", 0) > 0)
        total_profit = sum(t.get("profit", 0) for t in self.trades if t.get("profit", 0) > 0)
        total_loss = sum(abs(t.get("profit", 0)) for t in self.trades if t.get("profit", 0) < 0)
        
        # Calculate win rate
        win_rate = profitable_trades / total_trades if total_trades > 0 else 0.0
        
        # Calculate profit factor
        profit_factor = total_profit / total_loss if total_loss > 0 else float('inf')
        
        # Calculate average profit and loss
        avg_profit = total_profit / profitable_trades if profitable_trades > 0 else 0.0
        avg_loss = total_loss / (total_trades - profitable_trades) if (total_trades - profitable_trades) > 0 else 0.0
        
        # Calculate drawdown
        equity_curve = self._calculate_equity_curve()
        max_drawdown = self._calculate_max_drawdown(equity_curve)
        
        # Calculate Sharpe ratio
        if len(equity_curve) > 1:
            returns = np.diff(equity_curve) / equity_curve[:-1]
            sharpe_ratio = np.mean(returns) / np.std(returns) * np.sqrt(252) if np.std(returns) > 0 else 0.0
        else:
            sharpe_ratio = 0.0
        
        # Update metrics dictionary
        self.metrics = {
            "win_rate": win_rate,
            "profit_factor": profit_factor,
            "avg_profit": avg_profit,
            "avg_loss": avg_loss,
            "max_drawdown": max_drawdown,
            "sharpe_ratio": sharpe_ratio,
            "total_trades": total_trades,
            "profitable_trades": profitable_trades,
            "total_profit": total_profit,
            "total_loss": total_loss,
            "last_updated": int(time.time() * 1000)
        }
    
    def _calculate_equity_curve(self) -> List[float]:
        """Calculate equity curve from trades."""
        if not self.trades:
            return [1000.0]  # Start with a default equity of 1000
        
        # Sort trades by timestamp
        sorted_trades = sorted(self.trades, key=lambda x: x.get("timestamp", 0))
        
        # Calculate equity curve
        equity = 1000.0  # Start with a default equity of 1000
        curve = [equity]
        
        for trade in sorted_trades:
            profit = trade.get("profit", 0)
            equity += profit
            curve.append(equity)
        
        return curve
    
    def _calculate_max_drawdown(self, equity_curve: List[float]) -> float:
        """Calculate maximum drawdown from equity curve."""
        if len(equity_curve) <= 1:
            return 0.0
        
        max_dd = 0.0
        peak = equity_curve[0]
        
        for equity in equity_curve:
            if equity > peak:
                peak = equity
            
            dd = (peak - equity) / peak if peak > 0 else 0.0
            max_dd = max(max_dd, dd)
        
        return max_dd
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get a comprehensive performance report."""
        return {
            "strategy_id": self.strategy_id,
            "strategy_name": self.strategy_name,
            "metrics": self.metrics,
            "trade_count": len(self.trades),
            "signal_count": len(self.signals),
            "recent_trades": self.trades[-10:] if len(self.trades) > 0 else [],
            "recent_signals": self.signals[-10:] if len(self.signals) > 0 else []
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tracker to dictionary for serialization."""
        return {
            "strategy_id": self.strategy_id,
            "strategy_name": self.strategy_name,
            "metrics": self.metrics,
            "trade_count": len(self.trades),
            "signal_count": len(self.signals)
        }
    
    def save_to_file(self, file_path: str) -> None:
        """Save tracker to a file."""
        with open(file_path, 'wb') as f:
            pickle.dump(self, f)
    
    @classmethod
    def load_from_file(cls, file_path: str) -> 'StrategyPerformanceTracker':
        """Load tracker from a file."""
        with open(file_path, 'rb') as f:
            return pickle.load(f)

class LearningEngine:
    """
    Learning engine for ElizaOS agents.
    
    Responsibilities:
    1. Track strategy performance
    2. Analyze market conditions
    3. Generate insights for strategy improvement
    4. Implement reinforcement learning
    """
    
    def __init__(self, memory_persistence: Optional[MemoryPersistence] = None):
        """
        Initialize the learning engine.
        
        Args:
            memory_persistence: Memory persistence layer (optional)
        """
        self.memory_persistence = memory_persistence
        
        # Strategy performance trackers
        self.performance_trackers: Dict[str, StrategyPerformanceTracker] = {}
        
        # Market condition analyzers
        self.market_analyzers: Dict[str, Callable] = {
            "volatility": self._analyze_volatility,
            "trend": self._analyze_trend,
            "liquidity": self._analyze_liquidity,
            "correlation": self._analyze_correlation
        }
        
        # Learning models
        self.models: Dict[str, Any] = {}
        
        # Optimization metrics
        self.optimization_metrics: Dict[str, Any] = {
            "last_optimization": int(time.time() * 1000),
            "optimization_count": 0,
            "improvement_rate": 0.0
        }
        
        # Learning state
        self.learning_enabled = True
        self.auto_optimize = False
        
        logger.info("Initialized learning engine")
    
    def register_strategy(self, strategy_id: str, strategy_name: str) -> None:
        """
        Register a strategy for performance tracking and learning.
        
        Args:
            strategy_id: Unique identifier for the strategy
            strategy_name: Human-readable name for the strategy
        """
        if strategy_id not in self.performance_trackers:
            self.performance_trackers[strategy_id] = StrategyPerformanceTracker(
                strategy_id=strategy_id,
                strategy_name=strategy_name
            )
            logger.info(f"Registered strategy for learning: {strategy_name} ({strategy_id})")
    
    def record_trade(self, strategy_id: str, trade_data: Dict[str, Any]) -> None:
        """
        Record a trade for learning.
        
        Args:
            strategy_id: ID of the strategy
            trade_data: Trade data
        """
        if strategy_id not in self.performance_trackers:
            logger.warning(f"Strategy {strategy_id} not registered for learning")
            return
        
        # Add timestamp if not present
        if "timestamp" not in trade_data:
            trade_data["timestamp"] = int(time.time() * 1000)
        
        self.performance_trackers[strategy_id].add_trade(trade_data)
        
        # Store trade in memory persistence if available
        if self.memory_persistence:
            self.memory_persistence.create_memory(
                agent_id=strategy_id,
                memory_type="trade",
                title=f"Trade: {trade_data.get('symbol')} {trade_data.get('side')}",
                content=trade_data,
                tags=["trade", trade_data.get("symbol", ""), trade_data.get("side", "")],
                importance=0.6 if trade_data.get("profit", 0) > 0 else 0.7
            )
        
        logger.debug(f"Recorded trade for strategy {strategy_id}: {trade_data.get('id', 'unknown')}")
    
    def record_signal(self, strategy_id: str, signal_data: Dict[str, Any]) -> None:
        """
        Record a signal for learning.
        
        Args:
            strategy_id: ID of the strategy
            signal_data: Signal data
        """
        if strategy_id not in self.performance_trackers:
            logger.warning(f"Strategy {strategy_id} not registered for learning")
            return
        
        # Add timestamp if not present
        if "timestamp" not in signal_data:
            signal_data["timestamp"] = int(time.time() * 1000)
        
        self.performance_trackers[strategy_id].add_signal(signal_data)
        
        # Store signal in memory persistence if available
        if self.memory_persistence:
            self.memory_persistence.create_memory(
                agent_id=strategy_id,
                memory_type="signal",
                title=f"Signal: {signal_data.get('symbol')} {signal_data.get('signal_type')}",
                content=signal_data,
                tags=["signal", signal_data.get("symbol", ""), signal_data.get("signal_type", "")],
                importance=0.5
            )
        
        logger.debug(f"Recorded signal for strategy {strategy_id}")
    
    def record_market_condition(
        self, 
        strategy_id: str, 
        symbol: str, 
        market_data: MarketData,
        additional_metrics: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Record market condition for learning.
        
        Args:
            strategy_id: ID of the strategy
            symbol: Market symbol
            market_data: Market data
            additional_metrics: Additional market metrics
        """
        if strategy_id not in self.performance_trackers:
            logger.warning(f"Strategy {strategy_id} not registered for learning")
            return
        
        # Create market condition snapshot
        condition = {
            "timestamp": int(time.time() * 1000),
            "symbol": symbol,
            "market_data": market_data.to_dict()
        }
        
        if additional_metrics:
            condition["metrics"] = additional_metrics
        
        self.performance_trackers[strategy_id].add_market_condition(condition)
        
        # Store market condition in memory persistence if available
        if self.memory_persistence:
            # Only store significant market conditions to avoid cluttering memory
            # This could be based on volatility, liquidity changes, etc.
            volatility = self._analyze_volatility(market_data)
            if volatility["volatility_level"] in ["high", "extreme"]:
                self.memory_persistence.create_memory(
                    agent_id=strategy_id,
                    memory_type="market_condition",
                    title=f"Market Condition: {symbol} - {volatility['volatility_level']} volatility",
                    content={**condition, "analysis": volatility},
                    tags=["market_condition", symbol, volatility["volatility_level"]],
                    importance=0.7 if volatility["volatility_level"] == "extreme" else 0.6
                )
        
        logger.debug(f"Recorded market condition for strategy {strategy_id}: {symbol}")
    
    def get_strategy_performance(self, strategy_id: str) -> Optional[Dict[str, Any]]:
        """
        Get performance metrics for a strategy.
        
        Args:
            strategy_id: ID of the strategy
            
        Returns:
            Performance metrics or None if strategy not found
        """
        if strategy_id not in self.performance_trackers:
            logger.warning(f"Strategy {strategy_id} not registered for learning")
            return None
        
        return self.performance_trackers[strategy_id].get_performance_report()
    
    def get_all_strategies_performance(self) -> Dict[str, Dict[str, Any]]:
        """
        Get performance metrics for all strategies.
        
        Returns:
            Dictionary mapping strategy IDs to performance metrics
        """
        return {
            strategy_id: tracker.to_dict()
            for strategy_id, tracker in self.performance_trackers.items()
        }
    
    def analyze_market(
        self, 
        symbol: str, 
        market_data: MarketData,
        analysis_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze market conditions for a symbol.
        
        Args:
            symbol: Market symbol
            market_data: Market data
            analysis_types: Types of analysis to perform (default: all)
            
        Returns:
            Analysis results
        """
        if not analysis_types:
            analysis_types = list(self.market_analyzers.keys())
        
        results = {
            "symbol": symbol,
            "timestamp": int(time.time() * 1000),
            "analysis": {}
        }
        
        for analysis_type in analysis_types:
            if analysis_type in self.market_analyzers:
                analyzer = self.market_analyzers[analysis_type]
                try:
                    analysis_result = analyzer(market_data)
                    results["analysis"][analysis_type] = analysis_result
                except Exception as e:
                    logger.error(f"Error analyzing {analysis_type} for {symbol}: {e}")
        
        return results
    
    def _analyze_volatility(self, market_data: MarketData) -> Dict[str, Any]:
        """
        Analyze market volatility.
        
        Args:
            market_data: Market data
            
        Returns:
            Volatility analysis
        """
        # In a real implementation, this would use historical price data
        # For this example, we'll use a simple spread-based calculation
        bid = market_data.bid
        ask = market_data.ask
        
        if bid is None or ask is None or bid <= 0:
            return {
                "volatility": 0.0,
                "volatility_level": "unknown"
            }
        
        # Calculate bid-ask spread as percentage
        spread_pct = (ask - bid) / bid
        
        # Categorize volatility level
        if spread_pct < 0.001:  # 0.1%
            level = "low"
        elif spread_pct < 0.005:  # 0.5%
            level = "medium"
        elif spread_pct < 0.01:  # 1%
            level = "high"
        else:
            level = "extreme"
        
        return {
            "volatility": spread_pct,
            "volatility_level": level,
            "bid": bid,
            "ask": ask,
            "spread": ask - bid,
            "spread_pct": spread_pct
        }
    
    def _analyze_trend(self, market_data: MarketData) -> Dict[str, Any]:
        """
        Analyze market trend.
        
        Args:
            market_data: Market data
            
        Returns:
            Trend analysis
        """
        # In a real implementation, this would use historical price data
        # For this example, we'll return a placeholder result
        return {
            "trend": "neutral",
            "strength": 0.0,
            "duration": 0
        }
    
    def _analyze_liquidity(self, market_data: MarketData) -> Dict[str, Any]:
        """
        Analyze market liquidity.
        
        Args:
            market_data: Market data
            
        Returns:
            Liquidity analysis
        """
        # In a real implementation, this would analyze order book depth
        # For this example, we'll return a placeholder result
        return {
            "liquidity_level": "medium",
            "order_book_depth": 0.0
        }
    
    def _analyze_correlation(self, market_data: MarketData) -> Dict[str, Any]:
        """
        Analyze market correlation.
        
        Args:
            market_data: Market data
            
        Returns:
            Correlation analysis
        """
        # In a real implementation, this would analyze correlation with other assets
        # For this example, we'll return a placeholder result
        return {
            "correlations": {}
        }
    
    def generate_strategy_insights(self, strategy_id: str) -> Dict[str, Any]:
        """
        Generate insights for strategy improvement.
        
        Args:
            strategy_id: ID of the strategy
            
        Returns:
            Strategy insights
        """
        if strategy_id not in self.performance_trackers:
            logger.warning(f"Strategy {strategy_id} not registered for learning")
            return {"error": f"Strategy {strategy_id} not found"}
        
        tracker = self.performance_trackers[strategy_id]
        performance = tracker.get_performance_report()
        
        # Generate insights based on performance metrics
        insights = {
            "timestamp": int(time.time() * 1000),
            "strategy_id": strategy_id,
            "strategy_name": tracker.strategy_name,
            "performance_summary": performance["metrics"],
            "observations": [],
            "recommendations": []
        }
        
        # Add observations based on metrics
        metrics = performance["metrics"]
        
        if metrics["win_rate"] < 0.4:
            insights["observations"].append("Low win rate indicates potential issues with entry/exit timing")
            insights["recommendations"].append("Review entry conditions to improve signal quality")
        
        if metrics["profit_factor"] < 1.2:
            insights["observations"].append("Low profit factor indicates risk/reward ratio needs improvement")
            insights["recommendations"].append("Adjust take profit and stop loss levels to improve risk/reward ratio")
        
        if metrics["max_drawdown"] > 0.15:
            insights["observations"].append("High maximum drawdown indicates potential risk management issues")
            insights["recommendations"].append("Implement stricter risk controls to limit drawdown")
        
        # Add observation about trade frequency
        trade_count = metrics["total_trades"]
        days = 30  # Assuming data is from the last 30 days
        
        if trade_count / days < 0.5:
            insights["observations"].append("Low trade frequency may indicate overly restrictive entry conditions")
            insights["recommendations"].append("Consider relaxing entry criteria to capture more opportunities")
        elif trade_count / days > 5:
            insights["observations"].append("High trade frequency may lead to excessive trading costs")
            insights["recommendations"].append("Consider adding filters to reduce false signals")
        
        # Store insights in memory if available
        if self.memory_persistence:
            self.memory_persistence.create_memory(
                agent_id=strategy_id,
                memory_type="insights",
                title=f"Strategy Insights: {tracker.strategy_name}",
                content=insights,
                tags=["insights", "strategy", "performance"],
                importance=0.8
            )
        
        return insights
    
    def optimize_strategy_parameters(
        self, 
        strategy_id: str,
        parameter_ranges: Dict[str, List[Any]],
        objective_function: str = "sharpe_ratio"
    ) -> Dict[str, Any]:
        """
        Optimize strategy parameters using historical data.
        
        Args:
            strategy_id: ID of the strategy
            parameter_ranges: Ranges of parameters to test
            objective_function: Metric to optimize for
            
        Returns:
            Optimization results
        """
        if strategy_id not in self.performance_trackers:
            logger.warning(f"Strategy {strategy_id} not registered for learning")
            return {"error": f"Strategy {strategy_id} not found"}
        
        # In a real implementation, this would use a proper optimization algorithm
        # For this example, we'll return a placeholder result
        optimization_result = {
            "timestamp": int(time.time() * 1000),
            "strategy_id": strategy_id,
            "objective_function": objective_function,
            "original_parameters": {},
            "optimized_parameters": {param: values[0] for param, values in parameter_ranges.items()},
            "improvement": 0.1,
            "iterations": 10,
            "message": "Strategy parameters optimized successfully"
        }
        
        # Update optimization metrics
        self.optimization_metrics["last_optimization"] = int(time.time() * 1000)
        self.optimization_metrics["optimization_count"] += 1
        
        # Store optimization result in memory if available
        if self.memory_persistence:
            self.memory_persistence.create_memory(
                agent_id=strategy_id,
                memory_type="optimization",
                title=f"Strategy Optimization: {self.performance_trackers[strategy_id].strategy_name}",
                content=optimization_result,
                tags=["optimization", "strategy", "parameters"],
                importance=0.7
            )
        
        logger.info(f"Optimized parameters for strategy {strategy_id}")
        
        return optimization_result
    
    def save_state(self, directory: str) -> None:
        """
        Save learning engine state to disk.
        
        Args:
            directory: Directory to save state in
        """
        os.makedirs(directory, exist_ok=True)
        
        # Save performance trackers
        for strategy_id, tracker in self.performance_trackers.items():
            file_path = os.path.join(directory, f"strategy_{strategy_id}.pkl")
            tracker.save_to_file(file_path)
        
        # Save optimization metrics
        metrics_path = os.path.join(directory, "optimization_metrics.json")
        with open(metrics_path, 'w') as f:
            json.dump(self.optimization_metrics, f)
        
        logger.info(f"Saved learning engine state to {directory}")
    
    def load_state(self, directory: str) -> None:
        """
        Load learning engine state from disk.
        
        Args:
            directory: Directory to load state from
        """
        if not os.path.exists(directory):
            logger.warning(f"State directory {directory} does not exist")
            return
        
        # Load performance trackers
        for file_name in os.listdir(directory):
            if file_name.startswith("strategy_") and file_name.endswith(".pkl"):
                file_path = os.path.join(directory, file_name)
                try:
                    tracker = StrategyPerformanceTracker.load_from_file(file_path)
                    self.performance_trackers[tracker.strategy_id] = tracker
                    logger.info(f"Loaded performance tracker for strategy {tracker.strategy_id}")
                except Exception as e:
                    logger.error(f"Error loading performance tracker from {file_path}: {e}")
        
        # Load optimization metrics
        metrics_path = os.path.join(directory, "optimization_metrics.json")
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, 'r') as f:
                    self.optimization_metrics = json.load(f)
            except Exception as e:
                logger.error(f"Error loading optimization metrics from {metrics_path}: {e}")
        
        logger.info(f"Loaded learning engine state from {directory}")
    
    def enable_learning(self, enabled: bool = True) -> None:
        """
        Enable or disable learning.
        
        Args:
            enabled: Whether learning is enabled
        """
        self.learning_enabled = enabled
        logger.info(f"Learning {'enabled' if enabled else 'disabled'}")
    
    def enable_auto_optimize(self, enabled: bool = True) -> None:
        """
        Enable or disable automatic optimization.
        
        Args:
            enabled: Whether automatic optimization is enabled
        """
        self.auto_optimize = enabled
        logger.info(f"Auto-optimization {'enabled' if enabled else 'disabled'}")
    
    def process_eliza_request(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a request from an ElizaOS agent.
        
        Args:
            message: Message from agent
            
        Returns:
            Response message
        """
        command = message.get("command", "")
        content = message.get("content", {})
        
        if command == "get_strategy_performance":
            strategy_id = content.get("strategy_id")
            if not strategy_id:
                return {"error": "Missing strategy_id parameter"}
            
            performance = self.get_strategy_performance(strategy_id)
            return {"performance": performance}
        
        elif command == "generate_insights":
            strategy_id = content.get("strategy_id")
            if not strategy_id:
                return {"error": "Missing strategy_id parameter"}
            
            insights = self.generate_strategy_insights(strategy_id)
            return {"insights": insights}
        
        elif command == "optimize_strategy":
            strategy_id = content.get("strategy_id")
            parameter_ranges = content.get("parameter_ranges")
            objective_function = content.get("objective_function", "sharpe_ratio")
            
            if not strategy_id:
                return {"error": "Missing strategy_id parameter"}
            if not parameter_ranges:
                return {"error": "Missing parameter_ranges parameter"}
            
            optimization_result = self.optimize_strategy_parameters(
                strategy_id=strategy_id,
                parameter_ranges=parameter_ranges,
                objective_function=objective_function
            )
            
            return {"optimization": optimization_result}
        
        elif command == "analyze_market":
            symbol = content.get("symbol")
            market_data_dict = content.get("market_data")
            analysis_types = content.get("analysis_types")
            
            if not symbol:
                return {"error": "Missing symbol parameter"}
            if not market_data_dict:
                return {"error": "Missing market_data parameter"}
            
            # Convert dictionary to MarketData object
            market_data = MarketData(
                symbol=market_data_dict.get("symbol", ""),
                exchange=market_data_dict.get("exchange", ""),
                timestamp=market_data_dict.get("timestamp", 0),
                bid=market_data_dict.get("bid"),
                ask=market_data_dict.get("ask")
            )
            
            analysis = self.analyze_market(
                symbol=symbol,
                market_data=market_data,
                analysis_types=analysis_types
            )
            
            return {"analysis": analysis}
        
        elif command == "enable_learning":
            enabled = content.get("enabled", True)
            self.enable_learning(enabled)
            return {"success": True, "learning_enabled": self.learning_enabled}
        
        elif command == "enable_auto_optimize":
            enabled = content.get("enabled", True)
            self.enable_auto_optimize(enabled)
            return {"success": True, "auto_optimize": self.auto_optimize}
        
        return {"error": f"Unknown command: {command}"}
