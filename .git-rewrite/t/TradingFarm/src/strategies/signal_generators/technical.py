"""
Technical Signal Generators

Implements signal generators based on technical analysis indicators.
Provides common technical patterns and indicators for strategy development.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Union, Any, Callable

from .signal_base import SignalGenerator, SignalType, SignalStrength


class TechnicalSignalGenerator(SignalGenerator):
    """
    Base class for technical analysis signal generators.
    
    Provides common methods for technical indicators calculation
    and signal generation.
    """
    
    def __init__(self, name: str = "Technical Signal Generator", 
                description: str = "Generates signals based on technical analysis"):
        """
        Initialize a technical signal generator.
        
        Args:
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
    
    def calculate_sma(self, data: pd.DataFrame, column: str = 'close', 
                     period: int = 20) -> pd.Series:
        """
        Calculate Simple Moving Average.
        
        Args:
            data: Price data
            column: Column to calculate SMA for
            period: SMA period
            
        Returns:
            Series with SMA values
        """
        return data[column].rolling(window=period).mean()
    
    def calculate_ema(self, data: pd.DataFrame, column: str = 'close', 
                     period: int = 20) -> pd.Series:
        """
        Calculate Exponential Moving Average.
        
        Args:
            data: Price data
            column: Column to calculate EMA for
            period: EMA period
            
        Returns:
            Series with EMA values
        """
        return data[column].ewm(span=period, adjust=False).mean()
    
    def calculate_rsi(self, data: pd.DataFrame, column: str = 'close', 
                     period: int = 14) -> pd.Series:
        """
        Calculate Relative Strength Index.
        
        Args:
            data: Price data
            column: Column to calculate RSI for
            period: RSI period
            
        Returns:
            Series with RSI values
        """
        # Calculate price changes
        delta = data[column].diff()
        
        # Separate gains and losses
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        
        # Calculate average gain and loss
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        
        # Calculate RS
        rs = avg_gain / avg_loss
        
        # Calculate RSI
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def calculate_macd(self, data: pd.DataFrame, column: str = 'close', 
                      fast_period: int = 12, slow_period: int = 26,
                      signal_period: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Calculate MACD (Moving Average Convergence Divergence).
        
        Args:
            data: Price data
            column: Column to calculate MACD for
            fast_period: Fast EMA period
            slow_period: Slow EMA period
            signal_period: Signal line period
            
        Returns:
            Tuple of (MACD line, Signal line, Histogram)
        """
        # Calculate fast and slow EMAs
        fast_ema = self.calculate_ema(data, column, fast_period)
        slow_ema = self.calculate_ema(data, column, slow_period)
        
        # Calculate MACD line
        macd_line = fast_ema - slow_ema
        
        # Calculate signal line
        signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
        
        # Calculate histogram
        histogram = macd_line - signal_line
        
        return macd_line, signal_line, histogram
    
    def calculate_bollinger_bands(self, data: pd.DataFrame, column: str = 'close',
                                 period: int = 20, std_dev: float = 2.0) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Calculate Bollinger Bands.
        
        Args:
            data: Price data
            column: Column to calculate Bollinger Bands for
            period: SMA period
            std_dev: Number of standard deviations
            
        Returns:
            Tuple of (Middle Band, Upper Band, Lower Band)
        """
        # Calculate middle band (SMA)
        middle_band = self.calculate_sma(data, column, period)
        
        # Calculate standard deviation
        std = data[column].rolling(window=period).std()
        
        # Calculate upper and lower bands
        upper_band = middle_band + (std * std_dev)
        lower_band = middle_band - (std * std_dev)
        
        return middle_band, upper_band, lower_band
    
    def calculate_stochastic(self, data: pd.DataFrame, k_period: int = 14,
                           d_period: int = 3) -> Tuple[pd.Series, pd.Series]:
        """
        Calculate Stochastic Oscillator.
        
        Args:
            data: Price data with high, low, close columns
            k_period: %K period
            d_period: %D period
            
        Returns:
            Tuple of (%K, %D)
        """
        # Calculate %K
        low_min = data['low'].rolling(window=k_period).min()
        high_max = data['high'].rolling(window=k_period).max()
        
        k = 100 * ((data['close'] - low_min) / (high_max - low_min))
        
        # Calculate %D
        d = k.rolling(window=d_period).mean()
        
        return k, d
    
    def calculate_atr(self, data: pd.DataFrame, period: int = 14) -> pd.Series:
        """
        Calculate Average True Range.
        
        Args:
            data: Price data with high, low, close columns
            period: ATR period
            
        Returns:
            Series with ATR values
        """
        high = data['high']
        low = data['low']
        close = data['close']
        
        # Calculate true range
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        
        tr = pd.DataFrame({'tr1': tr1, 'tr2': tr2, 'tr3': tr3}).max(axis=1)
        
        # Calculate ATR
        atr = tr.rolling(window=period).mean()
        
        return atr
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on technical analysis.
        
        This is a placeholder method that should be overridden
        by specific technical signal generators.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        # Default implementation returns no signals
        result = data.copy()
        result['signal'] = 0
        return result


class MovingAverageCrossSignal(TechnicalSignalGenerator):
    """
    Generates signals based on moving average crossovers.
    
    Identifies buy signals when a fast moving average crosses above
    a slow moving average, and sell signals for the opposite.
    """
    
    def __init__(
        self,
        fast_period: int = 20,
        slow_period: int = 50,
        fast_type: str = 'sma',
        slow_type: str = 'sma',
        price_column: str = 'close',
        name: str = "Moving Average Crossover",
        description: str = "Generates signals based on moving average crossovers"
    ):
        """
        Initialize moving average cross signal generator.
        
        Args:
            fast_period: Fast moving average period
            slow_period: Slow moving average period
            fast_type: Type of fast moving average ('sma' or 'ema')
            slow_type: Type of slow moving average ('sma' or 'ema')
            price_column: Column to calculate moving averages for
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.fast_type = fast_type
        self.slow_type = slow_type
        self.price_column = price_column
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on moving average crossovers.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Calculate fast moving average
        if self.fast_type == 'ema':
            fast_ma = self.calculate_ema(result, self.price_column, self.fast_period)
        else:
            fast_ma = self.calculate_sma(result, self.price_column, self.fast_period)
        
        # Calculate slow moving average
        if self.slow_type == 'ema':
            slow_ma = self.calculate_ema(result, self.price_column, self.slow_period)
        else:
            slow_ma = self.calculate_sma(result, self.price_column, self.slow_period)
        
        # Add moving averages to result
        result[f'{self.fast_type}_{self.fast_period}'] = fast_ma
        result[f'{self.slow_type}_{self.slow_period}'] = slow_ma
        
        # Calculate crossover signals
        result['signal'] = 0  # Initialize with no signal
        
        # Buy signal: fast MA crosses above slow MA
        buy_signal = (fast_ma > slow_ma) & (fast_ma.shift() <= slow_ma.shift())
        result.loc[buy_signal, 'signal'] = SignalType.BUY.value
        
        # Sell signal: fast MA crosses below slow MA
        sell_signal = (fast_ma < slow_ma) & (fast_ma.shift() >= slow_ma.shift())
        result.loc[sell_signal, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'fast_period': self.fast_period,
            'slow_period': self.slow_period,
            'fast_type': self.fast_type,
            'slow_type': self.slow_type,
            'price_column': self.price_column
        })
        return base_dict


class RSISignal(TechnicalSignalGenerator):
    """
    Generates signals based on Relative Strength Index (RSI).
    
    Identifies buy signals when RSI crosses below the oversold level
    and sell signals when RSI crosses above the overbought level.
    """
    
    def __init__(
        self,
        period: int = 14,
        overbought_level: float = 70.0,
        oversold_level: float = 30.0,
        price_column: str = 'close',
        name: str = "RSI Signal",
        description: str = "Generates signals based on RSI overbought/oversold levels"
    ):
        """
        Initialize RSI signal generator.
        
        Args:
            period: RSI period
            overbought_level: Level above which RSI is considered overbought
            oversold_level: Level below which RSI is considered oversold
            price_column: Column to calculate RSI for
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.period = period
        self.overbought_level = overbought_level
        self.oversold_level = oversold_level
        self.price_column = price_column
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on RSI.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Calculate RSI
        rsi = self.calculate_rsi(result, self.price_column, self.period)
        result[f'rsi_{self.period}'] = rsi
        
        # Initialize signal column
        result['signal'] = 0
        
        # Buy signal: RSI crosses below oversold level
        buy_signal = (rsi < self.oversold_level) & (rsi.shift() >= self.oversold_level)
        result.loc[buy_signal, 'signal'] = SignalType.BUY.value
        
        # Sell signal: RSI crosses above overbought level
        sell_signal = (rsi > self.overbought_level) & (rsi.shift() <= self.overbought_level)
        result.loc[sell_signal, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'period': self.period,
            'overbought_level': self.overbought_level,
            'oversold_level': self.oversold_level,
            'price_column': self.price_column
        })
        return base_dict


class MACDSignal(TechnicalSignalGenerator):
    """
    Generates signals based on MACD (Moving Average Convergence Divergence).
    
    Identifies buy signals when the MACD line crosses above the signal line,
    and sell signals when it crosses below.
    """
    
    def __init__(
        self,
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9,
        price_column: str = 'close',
        name: str = "MACD Signal",
        description: str = "Generates signals based on MACD crossovers"
    ):
        """
        Initialize MACD signal generator.
        
        Args:
            fast_period: Fast EMA period
            slow_period: Slow EMA period
            signal_period: Signal line period
            price_column: Column to calculate MACD for
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.signal_period = signal_period
        self.price_column = price_column
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on MACD.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Calculate MACD
        macd_line, signal_line, histogram = self.calculate_macd(
            result, self.price_column, self.fast_period, self.slow_period, self.signal_period
        )
        
        # Add MACD components to result
        result['macd_line'] = macd_line
        result['macd_signal'] = signal_line
        result['macd_histogram'] = histogram
        
        # Initialize signal column
        result['signal'] = 0
        
        # Buy signal: MACD line crosses above signal line
        buy_signal = (macd_line > signal_line) & (macd_line.shift() <= signal_line.shift())
        result.loc[buy_signal, 'signal'] = SignalType.BUY.value
        
        # Sell signal: MACD line crosses below signal line
        sell_signal = (macd_line < signal_line) & (macd_line.shift() >= signal_line.shift())
        result.loc[sell_signal, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'fast_period': self.fast_period,
            'slow_period': self.slow_period,
            'signal_period': self.signal_period,
            'price_column': self.price_column
        })
        return base_dict


class BollingerBandsSignal(TechnicalSignalGenerator):
    """
    Generates signals based on Bollinger Bands.
    
    Identifies mean reversion signals when price touches the bands.
    """
    
    def __init__(
        self,
        period: int = 20,
        std_dev: float = 2.0,
        price_column: str = 'close',
        mean_reversion: bool = True,
        name: str = "Bollinger Bands Signal",
        description: str = "Generates signals based on Bollinger Bands"
    ):
        """
        Initialize Bollinger Bands signal generator.
        
        Args:
            period: SMA period
            std_dev: Number of standard deviations
            price_column: Column to calculate Bollinger Bands for
            mean_reversion: If True, generate mean reversion signals,
                           otherwise generate breakout signals
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.period = period
        self.std_dev = std_dev
        self.price_column = price_column
        self.mean_reversion = mean_reversion
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on Bollinger Bands.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Calculate Bollinger Bands
        middle_band, upper_band, lower_band = self.calculate_bollinger_bands(
            result, self.price_column, self.period, self.std_dev
        )
        
        # Add Bollinger Bands to result
        result['bb_middle'] = middle_band
        result['bb_upper'] = upper_band
        result['bb_lower'] = lower_band
        
        # Calculate price relative to bands
        price = result[self.price_column]
        
        # Initialize signal column
        result['signal'] = 0
        
        if self.mean_reversion:
            # Mean reversion strategy
            
            # Buy signal: price crosses below lower band
            buy_signal = (price <= lower_band) & (price.shift() > lower_band.shift())
            result.loc[buy_signal, 'signal'] = SignalType.BUY.value
            
            # Sell signal: price crosses above upper band
            sell_signal = (price >= upper_band) & (price.shift() < upper_band.shift())
            result.loc[sell_signal, 'signal'] = SignalType.SELL.value
        else:
            # Breakout strategy
            
            # Buy signal: price crosses above upper band
            buy_signal = (price > upper_band) & (price.shift() <= upper_band.shift())
            result.loc[buy_signal, 'signal'] = SignalType.BUY.value
            
            # Sell signal: price crosses below lower band
            sell_signal = (price < lower_band) & (price.shift() >= lower_band.shift())
            result.loc[sell_signal, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'period': self.period,
            'std_dev': self.std_dev,
            'price_column': self.price_column,
            'mean_reversion': self.mean_reversion
        })
        return base_dict


class PatternRecognitionSignal(TechnicalSignalGenerator):
    """
    Generates signals based on chart patterns.
    
    Identifies various chart patterns such as double tops/bottoms,
    head and shoulders, triangles, etc.
    """
    
    def __init__(
        self,
        patterns: List[str] = None,
        name: str = "Pattern Recognition Signal",
        description: str = "Generates signals based on chart patterns"
    ):
        """
        Initialize pattern recognition signal generator.
        
        Args:
            patterns: List of patterns to recognize
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.patterns = patterns or ['double_top', 'double_bottom']
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on chart patterns.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # Call pattern detection methods for each requested pattern
        for pattern in self.patterns:
            if pattern == 'double_top':
                self._detect_double_top(result)
            elif pattern == 'double_bottom':
                self._detect_double_bottom(result)
            # Add more pattern detection methods as needed
        
        return result
    
    def _detect_double_top(self, data: pd.DataFrame) -> None:
        """
        Detect double top pattern.
        
        Args:
            data: DataFrame with price data
        """
        # Simple double top detection algorithm
        # Find local peaks in a lookback period
        window = 10
        
        # Initialize pattern column
        data['double_top'] = False
        
        for i in range(window * 2, len(data)):
            # Get section of data to analyze
            section = data.iloc[i-window*2:i]
            
            # Find local highs
            is_peak = (section['high'] > section['high'].shift()) & (section['high'] > section['high'].shift(-1))
            peaks = section[is_peak]
            
            # Check for two similar peaks
            if len(peaks) >= 2:
                last_two_peaks = peaks.iloc[-2:]
                
                # Check if peak heights are within 2% of each other
                peak_heights = last_two_peaks['high'].values
                if len(peak_heights) >= 2:
                    peak_diff_pct = abs(peak_heights[1] - peak_heights[0]) / peak_heights[0]
                    
                    if peak_diff_pct < 0.02:
                        # Check if there's a valley between peaks
                        peak_indices = last_two_peaks.index
                        if len(peak_indices) >= 2:
                            between_section = section.loc[peak_indices[0]:peak_indices[1]]
                            valley = between_section['low'].min()
                            
                            # Check if current price is below the valley
                            current_price = data.iloc[i]['close']
                            if current_price < valley:
                                data.loc[data.index[i], 'double_top'] = True
                                data.loc[data.index[i], 'signal'] = SignalType.SELL.value
    
    def _detect_double_bottom(self, data: pd.DataFrame) -> None:
        """
        Detect double bottom pattern.
        
        Args:
            data: DataFrame with price data
        """
        # Simple double bottom detection algorithm
        # Find local valleys in a lookback period
        window = 10
        
        # Initialize pattern column
        data['double_bottom'] = False
        
        for i in range(window * 2, len(data)):
            # Get section of data to analyze
            section = data.iloc[i-window*2:i]
            
            # Find local lows
            is_valley = (section['low'] < section['low'].shift()) & (section['low'] < section['low'].shift(-1))
            valleys = section[is_valley]
            
            # Check for two similar valleys
            if len(valleys) >= 2:
                last_two_valleys = valleys.iloc[-2:]
                
                # Check if valley depths are within 2% of each other
                valley_depths = last_two_valleys['low'].values
                if len(valley_depths) >= 2:
                    valley_diff_pct = abs(valley_depths[1] - valley_depths[0]) / valley_depths[0]
                    
                    if valley_diff_pct < 0.02:
                        # Check if there's a peak between valleys
                        valley_indices = last_two_valleys.index
                        if len(valley_indices) >= 2:
                            between_section = section.loc[valley_indices[0]:valley_indices[1]]
                            peak = between_section['high'].max()
                            
                            # Check if current price is above the peak
                            current_price = data.iloc[i]['close']
                            if current_price > peak:
                                data.loc[data.index[i], 'double_bottom'] = True
                                data.loc[data.index[i], 'signal'] = SignalType.BUY.value
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'patterns': self.patterns
        })
        return base_dict
