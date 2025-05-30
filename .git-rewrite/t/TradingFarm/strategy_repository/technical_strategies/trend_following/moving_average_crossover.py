"""
Moving Average Crossover Strategy
===============================
Implementation of a trend following strategy based on the crossover of two moving averages.
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime

from ...strategy_framework.base_strategy import BaseStrategy
from ...strategy_framework.signal_generator import SignalGenerator
from ...strategy_framework.entry_exit_rules import EntryExitRules
from ...strategy_framework.risk_management import RiskManagement

logger = logging.getLogger(__name__)

class MASignalGenerator(SignalGenerator):
    """Signal generator for Moving Average Crossover strategy."""
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """
        Initialize the Moving Average Crossover signal generator.
        
        Args:
            parameters: Parameters for customizing the generator's behavior
                - fast_ma_period: Period for the fast moving average
                - slow_ma_period: Period for the slow moving average
                - ma_type: Type of moving average (simple, exponential, weighted)
        """
        default_params = {
            'fast_ma_period': 20, 
            'slow_ma_period': 50,
            'ma_type': 'simple'  # simple, exponential, weighted
        }
        
        # Update defaults with any provided parameters
        if parameters:
            default_params.update(parameters)
            
        super().__init__("MA_Crossover_Signal_Generator", default_params)
    
    def generate(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate moving average crossover signals.
        
        Args:
            data: Market data DataFrame with at least 'close' price column
            
        Returns:
            DataFrame with signals added:
                - fast_ma: Fast moving average values
                - slow_ma: Slow moving average values
                - signal: Signal values (1 for buy, -1 for sell, 0 for neutral)
        """
        if data.empty:
            logger.warning("Empty data provided to MA signal generator")
            return data
        
        # Make a copy to avoid modifying the original data
        result = data.copy()
        
        # Get parameters
        fast_period = self.parameters['fast_ma_period']
        slow_period = self.parameters['slow_ma_period']
        ma_type = self.parameters['ma_type']
        
        # Calculate moving averages based on type
        if ma_type.lower() == 'simple':
            result['fast_ma'] = result['close'].rolling(window=fast_period).mean()
            result['slow_ma'] = result['close'].rolling(window=slow_period).mean()
        elif ma_type.lower() == 'exponential':
            result['fast_ma'] = result['close'].ewm(span=fast_period, adjust=False).mean()
            result['slow_ma'] = result['close'].ewm(span=slow_period, adjust=False).mean()
        elif ma_type.lower() == 'weighted':
            weights_fast = np.arange(1, fast_period + 1)
            weights_slow = np.arange(1, slow_period + 1)
            result['fast_ma'] = result['close'].rolling(window=fast_period).apply(
                lambda x: np.sum(weights_fast * x) / weights_fast.sum(), raw=True)
            result['slow_ma'] = result['close'].rolling(window=slow_period).apply(
                lambda x: np.sum(weights_slow * x) / weights_slow.sum(), raw=True)
        else:
            logger.warning(f"Unknown MA type: {ma_type}, using simple")
            result['fast_ma'] = result['close'].rolling(window=fast_period).mean()
            result['slow_ma'] = result['close'].rolling(window=slow_period).mean()
        
        # Initialize signal column with 0s (neutral)
        result['signal'] = 0
        
        # Calculate crossover signals
        # 1 when fast MA crosses above slow MA (bullish)
        # -1 when fast MA crosses below slow MA (bearish)
        for i in range(1, len(result)):
            if pd.notna(result['fast_ma'].iloc[i]) and pd.notna(result['slow_ma'].iloc[i]):
                # Current state
                current_fast_above_slow = result['fast_ma'].iloc[i] > result['slow_ma'].iloc[i]
                
                # Previous state (if available)
                if pd.notna(result['fast_ma'].iloc[i-1]) and pd.notna(result['slow_ma'].iloc[i-1]):
                    prev_fast_above_slow = result['fast_ma'].iloc[i-1] > result['slow_ma'].iloc[i-1]
                    
                    # Check for crossover
                    if current_fast_above_slow and not prev_fast_above_slow:
                        result.loc[result.index[i], 'signal'] = 1  # Bullish crossover
                    elif not current_fast_above_slow and prev_fast_above_slow:
                        result.loc[result.index[i], 'signal'] = -1  # Bearish crossover
        
        # Store signals for later reference
        signals = []
        for idx, row in result[result['signal'] != 0].iterrows():
            signal_type = 'buy' if row['signal'] > 0 else 'sell'
            signal_data = {
                'timestamp': idx,
                'type': signal_type,
                'price': row['close'],
                'fast_ma': row['fast_ma'],
                'slow_ma': row['slow_ma']
            }
            signals.append(signal_data)
        
        self.signals = signals
        
        return result


class MAEntryExitRules(EntryExitRules):
    """Entry and exit rules for Moving Average Crossover strategy."""
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """
        Initialize the Moving Average Crossover entry and exit rules.
        
        Args:
            parameters: Parameters for customizing the rules' behavior
                - confirmation_period: Number of periods to wait for confirmation
                - min_ma_distance_pct: Minimum distance between MAs for valid signal
                - trend_confirmation: Whether to use trend confirmation
                - exit_on_opposite_signal: Whether to exit on opposite signal
        """
        default_params = {
            'confirmation_period': 1,  # Wait for this many periods after signal before entry
            'min_ma_distance_pct': 0.002,  # Minimum 0.2% difference between MAs
            'trend_confirmation': True,  # Use additional trend confirmation
            'exit_on_opposite_signal': True,  # Exit on opposite signal
            'trailing_stop_pct': 0.02,  # 2% trailing stop
            'profit_target_pct': 0.05,  # 5% profit target
            'max_holding_periods': 100,  # Maximum holding periods
        }
        
        # Update defaults with any provided parameters
        if parameters:
            default_params.update(parameters)
            
        super().__init__("MA_Crossover_Entry_Exit_Rules", default_params)
    
    def should_enter(self, current_price: float, signal: Dict[str, Any], 
                    context: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Determine if a trade entry should be executed.
        
        Args:
            current_price: Current market price
            signal: Signal dictionary with trade information
            context: Additional context with market data
            
        Returns:
            Tuple of (should_enter, entry_details)
        """
        should_enter = False
        entry_details = {
            'entry_price': current_price,
            'signal_type': signal.get('type', 'unknown'),
            'entry_time': datetime.now().isoformat(),
            'reason': 'No valid entry condition'
        }
        
        # Only proceed if we have a valid signal
        if signal is not None and signal.get('type') in ['buy', 'sell']:
            # Get the current distance between MAs
            fast_ma = signal.get('fast_ma')
            slow_ma = signal.get('slow_ma')
            
            if fast_ma is not None and slow_ma is not None:
                # Calculate percentage distance between MAs
                ma_distance_pct = abs(fast_ma - slow_ma) / slow_ma
                
                # Buy condition - fast MA crossed above slow MA with sufficient distance
                if signal['type'] == 'buy' and ma_distance_pct >= self.parameters['min_ma_distance_pct']:
                    # Check trend confirmation if enabled
                    trend_ok = True
                    if self.parameters['trend_confirmation'] and context.get('trend_data'):
                        trend = context['trend_data'].get('trend', 'neutral')
                        trend_ok = trend in ['bullish', 'neutral']
                    
                    if trend_ok:
                        should_enter = True
                        entry_details['reason'] = (
                            f"Bullish MA crossover with {ma_distance_pct:.2%} separation"
                        )
                        if self.parameters['trend_confirmation']:
                            entry_details['reason'] += f", trend: {context['trend_data'].get('trend', 'unknown')}"
                
                # Sell condition - fast MA crossed below slow MA with sufficient distance
                elif signal['type'] == 'sell' and ma_distance_pct >= self.parameters['min_ma_distance_pct']:
                    # Check trend confirmation if enabled
                    trend_ok = True
                    if self.parameters['trend_confirmation'] and context.get('trend_data'):
                        trend = context['trend_data'].get('trend', 'neutral')
                        trend_ok = trend in ['bearish', 'neutral']
                    
                    if trend_ok:
                        should_enter = True
                        entry_details['reason'] = (
                            f"Bearish MA crossover with {ma_distance_pct:.2%} separation"
                        )
                        if self.parameters['trend_confirmation']:
                            entry_details['reason'] += f", trend: {context['trend_data'].get('trend', 'unknown')}"
        
        # Record this entry decision
        if should_enter:
            self.record_entry(entry_details)
            
        return should_enter, entry_details
    
    def should_exit(self, current_price: float, entry_price: float,
                  position_data: Dict[str, Any], context: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Determine if a trade exit should be executed.
        
        Args:
            current_price: Current market price
            entry_price: Price at which the trade was entered
            position_data: Data about the current position
            context: Additional context with market data
            
        Returns:
            Tuple of (should_exit, exit_details)
        """
        should_exit = False
        exit_details = {
            'exit_price': current_price,
            'entry_price': entry_price,
            'exit_time': datetime.now().isoformat(),
            'reason': 'No valid exit condition'
        }
        
        # Get position direction and duration
        direction = position_data.get('direction', 'unknown')
        entry_time = position_data.get('entry_time')
        duration = 0
        
        if entry_time and context.get('current_time'):
            # Calculate duration in periods
            try:
                entry_datetime = datetime.fromisoformat(entry_time)
                current_datetime = datetime.fromisoformat(context['current_time'])
                # Assuming duration is in periods, but could be days, hours, etc.
                duration = (current_datetime - entry_datetime).total_seconds() / 3600  # hours
            except (ValueError, TypeError):
                logger.warning("Could not calculate position duration")
        
        # Exit if maximum holding period reached
        max_periods = self.parameters['max_holding_periods']
        if max_periods > 0 and duration >= max_periods:
            should_exit = True
            exit_details['reason'] = f"Maximum holding period reached ({duration:.1f} > {max_periods})"
        
        # Exit based on profit target
        profit_target = self.parameters['profit_target_pct']
        if profit_target > 0:
            if direction == 'long' and (current_price - entry_price) / entry_price >= profit_target:
                should_exit = True
                exit_details['reason'] = f"Profit target reached: {(current_price - entry_price) / entry_price:.2%}"
            elif direction == 'short' and (entry_price - current_price) / entry_price >= profit_target:
                should_exit = True
                exit_details['reason'] = f"Profit target reached: {(entry_price - current_price) / entry_price:.2%}"
        
        # Exit based on trailing stop
        trailing_stop = self.parameters['trailing_stop_pct']
        highest_price = position_data.get('highest_price', entry_price)
        lowest_price = position_data.get('lowest_price', entry_price)
        
        if trailing_stop > 0:
            if direction == 'long' and ((highest_price - current_price) / highest_price) >= trailing_stop:
                should_exit = True
                exit_details['reason'] = (
                    f"Trailing stop triggered: {(highest_price - current_price) / highest_price:.2%}"
                    f" drop from {highest_price}"
                )
            elif direction == 'short' and ((current_price - lowest_price) / lowest_price) >= trailing_stop:
                should_exit = True
                exit_details['reason'] = (
                    f"Trailing stop triggered: {(current_price - lowest_price) / lowest_price:.2%}"
                    f" rise from {lowest_price}"
                )
        
        # Exit on opposite signal if enabled
        if self.parameters['exit_on_opposite_signal'] and context.get('latest_signal'):
            latest_signal = context['latest_signal']
            if (direction == 'long' and latest_signal.get('type') == 'sell') or \
               (direction == 'short' and latest_signal.get('type') == 'buy'):
                should_exit = True
                exit_details['reason'] = f"Opposite signal received: {latest_signal.get('type')}"
        
        # Record this exit decision
        if should_exit:
            self.record_exit(exit_details)
            
        return should_exit, exit_details
