import logging
import asyncio
import pandas as pd
from typing import Dict, List, Any, Optional, Type, Set
from datetime import datetime

from ..strategies.base import BaseStrategy, Signal, SignalType
from ..strategies.elliott_wave import ElliottWaveStrategy
from ..strategies.darvas_box import DarvasBoxStrategy
from ..strategies.renko import RenkoChartStrategy
from ..strategies.ichimoku import IchimokuCloudStrategy
from ..strategies.alligator import AlligatorStrategy
from .base import WorkflowStep

logger = logging.getLogger(__name__)

class StrategyInitializationStep(WorkflowStep):
    """Initialize trading strategies with the appropriate configuration."""
    
    def __init__(self, strategies: List[Type[BaseStrategy]], timeframes: List[str], symbols: List[str]):
        super().__init__("Strategy Initialization")
        self.strategy_classes = strategies
        self.timeframes = timeframes
        self.symbols = symbols
        self.strategies = []
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize the trading strategies."""
        self.strategies = []
        
        for strategy_class in self.strategy_classes:
            try:
                strategy = strategy_class(self.timeframes, self.symbols)
                self.strategies.append(strategy)
                logger.info(f"Initialized {strategy.name} strategy")
            except Exception as e:
                logger.error(f"Error initializing {strategy_class.__name__}: {str(e)}", exc_info=True)
        
        # Store initialized strategies in context
        context['strategies'] = self.strategies
        return context


class DataUpdateStep(WorkflowStep):
    """Update strategies with the latest market data."""
    
    def __init__(self, use_merged_data: bool = True):
        super().__init__("Strategy Data Update")
        self.use_merged_data = use_merged_data
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Update strategies with the latest market data."""
        if 'strategies' not in context:
            logger.warning("No strategies found in context. Skipping data update.")
            return context
        
        strategies = context['strategies']
        
        if self.use_merged_data:
            if 'merged_data' not in context:
                logger.warning("No merged data found in context. Skipping data update.")
                return context
            
            data = context['merged_data']
        else:
            # Default to using the primary market data
            if 'market_data' not in context or not context['market_data']:
                logger.warning("No market data found in context. Skipping data update.")
                return context
            
            # Use the first available exchange's data
            first_exchange = next(iter(context['market_data'].keys()))
            data = context['market_data'][first_exchange]
        
        # Update each strategy with the market data
        for strategy in strategies:
            try:
                for symbol in strategy.symbols:
                    if symbol not in data:
                        logger.warning(f"No data found for symbol {symbol}. Skipping strategy update.")
                        continue
                    
                    for timeframe in strategy.timeframes:
                        if timeframe not in data[symbol]:
                            logger.warning(f"No {timeframe} data found for symbol {symbol}. Skipping strategy update.")
                            continue
                        
                        df = data[symbol][timeframe]
                        if df is None or df.empty:
                            logger.warning(f"Empty {timeframe} data for symbol {symbol}. Skipping strategy update.")
                            continue
                        
                        strategy.update_data(symbol, timeframe, df)
                
                logger.info(f"Updated {strategy.name} strategy with latest market data")
            
            except Exception as e:
                logger.error(f"Error updating {strategy.name} with market data: {str(e)}", exc_info=True)
        
        return context


class SignalGenerationStep(WorkflowStep):
    """Generate trading signals from all strategies."""
    
    def __init__(self):
        super().__init__("Signal Generation")
        self.signals = {}  # Symbol -> List[Signal]
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate trading signals from all strategies."""
        if 'strategies' not in context:
            logger.warning("No strategies found in context. Skipping signal generation.")
            return context
        
        strategies = context['strategies']
        all_signals = {}
        
        for strategy in strategies:
            try:
                for symbol in strategy.symbols:
                    if symbol not in all_signals:
                        all_signals[symbol] = []
                    
                    for timeframe in strategy.timeframes:
                        signals = strategy.generate_signals(symbol, timeframe)
                        all_signals[symbol].extend(signals)
                        
                        if signals:
                            logger.info(f"Generated {len(signals)} signals for {symbol} {timeframe} from {strategy.name}")
            
            except Exception as e:
                logger.error(f"Error generating signals for {strategy.name}: {str(e)}", exc_info=True)
        
        self.signals = all_signals
        context['generated_signals'] = all_signals
        
        # Log summary of signals
        total_signals = sum(len(sigs) for sigs in all_signals.values())
        logger.info(f"Generated a total of {total_signals} signals across {len(all_signals)} symbols")
        
        return context


class SignalFilterStep(WorkflowStep):
    """Filter and prioritize generated signals based on various criteria."""
    
    def __init__(self, min_confidence: float = 0.6, max_signals_per_symbol: int = 2):
        super().__init__("Signal Filtering")
        self.min_confidence = min_confidence
        self.max_signals_per_symbol = max_signals_per_symbol
        self.filtered_signals = {}
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Filter and prioritize signals based on confidence and other criteria."""
        if 'generated_signals' not in context:
            logger.warning("No generated signals found in context. Skipping signal filtering.")
            return context
        
        all_signals = context['generated_signals']
        filtered_signals = {}
        
        # Filter signals by confidence threshold
        for symbol, signals in all_signals.items():
            # Filter by minimum confidence
            confident_signals = [s for s in signals if s.confidence >= self.min_confidence]
            
            if not confident_signals:
                continue
            
            # Sort by confidence (highest first)
            sorted_signals = sorted(confident_signals, key=lambda s: s.confidence, reverse=True)
            
            # Take at most max_signals_per_symbol
            filtered_signals[symbol] = sorted_signals[:self.max_signals_per_symbol]
            
            logger.info(f"Filtered {len(signals)} signals to {len(filtered_signals[symbol])} for {symbol}")
        
        self.filtered_signals = filtered_signals
        context['filtered_signals'] = filtered_signals
        
        # Log summary of filtered signals
        total_filtered = sum(len(sigs) for sigs in filtered_signals.values())
        logger.info(f"Filtered down to {total_filtered} high-confidence signals across {len(filtered_signals)} symbols")
        
        return context


class SignalAggregationStep(WorkflowStep):
    """Aggregate signals from multiple strategies to generate consensus signals."""
    
    def __init__(self, consensus_threshold: int = 2, timeframe_priority: Dict[str, float] = None):
        super().__init__("Signal Aggregation")
        self.consensus_threshold = consensus_threshold
        self.timeframe_priority = timeframe_priority or {
            "1d": 1.0,  # Higher priority for longer timeframes
            "4h": 0.8,
            "1h": 0.6,
            "15m": 0.4,
            "5m": 0.2
        }
        self.consensus_signals = {}
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Aggregate signals to find consensus across strategies and timeframes."""
        if 'filtered_signals' not in context:
            logger.warning("No filtered signals found in context. Skipping signal aggregation.")
            return context
        
        filtered_signals = context['filtered_signals']
        consensus_signals = {}
        
        # Count signal types by symbol
        for symbol, signals in filtered_signals.items():
            if not signals:
                continue
            
            # Group by signal type
            buy_signals = [s for s in signals if s.signal_type == SignalType.BUY]
            sell_signals = [s for s in signals if s.signal_type == SignalType.SELL]
            
            # Calculate weighted consensus
            weighted_buy_consensus = self._calculate_weighted_consensus(buy_signals)
            weighted_sell_consensus = self._calculate_weighted_consensus(sell_signals)
            
            if weighted_buy_consensus >= self.consensus_threshold and weighted_buy_consensus > weighted_sell_consensus:
                # Generate consensus buy signal
                consensus_signal = self._create_consensus_signal(symbol, SignalType.BUY, buy_signals)
                consensus_signals[symbol] = consensus_signal
                logger.info(f"Generated consensus BUY signal for {symbol} with score {weighted_buy_consensus:.2f}")
            
            elif weighted_sell_consensus >= self.consensus_threshold and weighted_sell_consensus > weighted_buy_consensus:
                # Generate consensus sell signal
                consensus_signal = self._create_consensus_signal(symbol, SignalType.SELL, sell_signals)
                consensus_signals[symbol] = consensus_signal
                logger.info(f"Generated consensus SELL signal for {symbol} with score {weighted_sell_consensus:.2f}")
        
        self.consensus_signals = consensus_signals
        context['consensus_signals'] = consensus_signals
        
        # Log summary of consensus signals
        logger.info(f"Generated {len(consensus_signals)} consensus signals")
        
        return context
    
    def _calculate_weighted_consensus(self, signals: List[Signal]) -> float:
        """Calculate weighted consensus score based on signal confidence and timeframe."""
        if not signals:
            return 0.0
        
        total_weight = 0.0
        
        for signal in signals:
            # Base weight is the signal confidence
            weight = signal.confidence
            
            # Apply timeframe priority multiplier
            if signal.timeframe in self.timeframe_priority:
                weight *= self.timeframe_priority[signal.timeframe]
            
            total_weight += weight
        
        return total_weight
    
    def _create_consensus_signal(self, symbol: str, signal_type: SignalType, constituent_signals: List[Signal]) -> Signal:
        """Create a consensus signal from multiple constituent signals."""
        # Use latest timestamp from constituent signals
        latest_timestamp = max(s.timestamp for s in constituent_signals)
        
        # Use latest price
        latest_price = max(s.price for s in constituent_signals if s.timestamp == latest_timestamp)
        
        # Calculate average confidence
        avg_confidence = sum(s.confidence for s in constituent_signals) / len(constituent_signals)
        
        # Collect strategy names that contributed to consensus
        contributing_strategies = {s.strategy_name for s in constituent_signals}
        
        # Collect timeframes that contributed to consensus
        contributing_timeframes = {s.timeframe for s in constituent_signals}
        
        # Create metadata with information about constituent signals
        metadata = {
            'contributing_strategies': list(contributing_strategies),
            'contributing_timeframes': list(contributing_timeframes),
            'consensus_strength': len(constituent_signals),
            'constituent_signals': [
                {
                    'strategy': s.strategy_name,
                    'timeframe': s.timeframe,
                    'confidence': s.confidence,
                    'metadata': s.metadata
                } for s in constituent_signals
            ]
        }
        
        return Signal(
            symbol=symbol,
            signal_type=signal_type,
            price=latest_price,
            timestamp=latest_timestamp,
            confidence=min(avg_confidence * 1.1, 1.0),  # Slight boost for consensus, capped at 1.0
            strategy_name="Consensus",
            timeframe="multiple",
            metadata=metadata
        )


class SignalPersistenceStep(WorkflowStep):
    """Persist generated signals to storage for record-keeping and analysis."""
    
    def __init__(self, save_to_file: bool = True, file_path: str = None):
        super().__init__("Signal Persistence")
        self.save_to_file = save_to_file
        self.file_path = file_path or "signals.json"
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Persist signals to storage."""
        signals_to_save = {}
        
        # Collect all signal types from context
        if 'generated_signals' in context:
            signals_to_save['raw_signals'] = context['generated_signals']
        
        if 'filtered_signals' in context:
            signals_to_save['filtered_signals'] = context['filtered_signals']
        
        if 'consensus_signals' in context:
            signals_to_save['consensus_signals'] = context['consensus_signals']
        
        if not signals_to_save:
            logger.warning("No signals found in context to persist.")
            return context
        
        if self.save_to_file:
            try:
                # Convert signals to serializable dictionary
                serialized_signals = {}
                
                for signal_type, signals_by_symbol in signals_to_save.items():
                    serialized_signals[signal_type] = {}
                    
                    for symbol, signals in signals_by_symbol.items():
                        if isinstance(signals, list):
                            # List of signals
                            serialized_signals[signal_type][symbol] = [
                                s.to_dict() for s in signals
                            ]
                        else:
                            # Single signal (for consensus)
                            serialized_signals[signal_type][symbol] = signals.to_dict()
                
                # Add timestamp
                serialized_signals['timestamp'] = datetime.now().isoformat()
                
                # Save to file
                import json
                with open(self.file_path, 'w') as f:
                    json.dump(serialized_signals, f, indent=2)
                
                logger.info(f"Saved signals to {self.file_path}")
            
            except Exception as e:
                logger.error(f"Error saving signals to file: {str(e)}", exc_info=True)
        
        # Store a reference to the signals in the context
        context['persisted_signals'] = signals_to_save
        return context
