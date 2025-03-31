"""
Fundamental Signal Generators

Implements signal generators based on fundamental analysis.
Provides indicators for earnings, valuations, and growth metrics.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Union, Any, Callable

from .signal_base import SignalGenerator, SignalType, SignalStrength


class FundamentalSignalGenerator(SignalGenerator):
    """
    Base class for fundamental analysis signal generators.
    
    Provides common methods for fundamental data analysis
    and signal generation.
    """
    
    def __init__(self, name: str = "Fundamental Signal Generator", 
                description: str = "Generates signals based on fundamental analysis"):
        """
        Initialize a fundamental signal generator.
        
        Args:
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        self.fundamental_data_provider = None
    
    def set_fundamental_data_provider(self, provider):
        """
        Set the fundamental data provider for retrieving data.
        
        Args:
            provider: Fundamental data provider object
        """
        self.fundamental_data_provider = provider
    
    def get_fundamental_data(self, symbol: str, metrics: List[str], 
                           start_date: Optional[str] = None, 
                           end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Get fundamental data for a symbol.
        
        Args:
            symbol: Symbol to get data for
            metrics: List of fundamental metrics to retrieve
            start_date: Start date (optional)
            end_date: End date (optional)
            
        Returns:
            DataFrame with fundamental data
        """
        if self.fundamental_data_provider is not None:
            return self.fundamental_data_provider.get_data(
                symbol, metrics, start_date, end_date
            )
        else:
            # If no provider, generate mock data for testing
            return self._generate_mock_fundamental_data(symbol, metrics, start_date, end_date)
    
    def _generate_mock_fundamental_data(self, symbol: str, metrics: List[str],
                                      start_date: Optional[str] = None,
                                      end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Generate mock fundamental data for testing.
        
        Args:
            symbol: Symbol to generate data for
            metrics: List of fundamental metrics
            start_date: Start date (optional)
            end_date: End date (optional)
            
        Returns:
            DataFrame with mock fundamental data
        """
        # Create a date range (quarterly by default)
        if start_date and end_date:
            date_range = pd.date_range(start=start_date, end=end_date, freq='Q')
        else:
            # Default to last 8 quarters
            end_date = pd.Timestamp.now()
            start_date = end_date - pd.Timedelta(days=365*2)
            date_range = pd.date_range(start=start_date, end=end_date, freq='Q')
        
        # Generate random data for each metric
        np.random.seed(42)  # For reproducibility
        data = pd.DataFrame(index=date_range)
        
        for metric in metrics:
            if metric == 'eps':
                base = 2.0
                volatility = 0.3
            elif metric == 'revenue':
                base = 1000.0
                volatility = 50.0
            elif metric == 'pe_ratio':
                base = 15.0
                volatility = 3.0
            elif metric == 'debt_to_equity':
                base = 0.5
                volatility = 0.1
            elif metric == 'profit_margin':
                base = 0.15
                volatility = 0.03
            elif metric == 'price_to_book':
                base = 2.0
                volatility = 0.5
            else:
                base = 1.0
                volatility = 0.2
            
            # Generate slightly increasing trend with noise
            trend = np.linspace(0, 0.2, len(date_range))
            noise = np.random.normal(0, volatility, len(date_range))
            values = base * (1 + trend + noise)
            
            data[metric] = values
        
        # Add symbol column
        data['symbol'] = symbol
        
        return data
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on fundamental analysis.
        
        This is a placeholder method that should be overridden
        by specific fundamental signal generators.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        # Default implementation returns no signals
        result = data.copy()
        result['signal'] = 0
        return result


class EarningsSignalGenerator(FundamentalSignalGenerator):
    """
    Generates signals based on earnings data.
    
    Identifies buy signals for earnings surprises and
    consistent earnings growth, and sell signals for earnings misses.
    """
    
    def __init__(
        self,
        eps_growth_threshold: float = 0.1,
        surprise_threshold: float = 0.05,
        quarters_required: int = 2,
        name: str = "Earnings Signal Generator",
        description: str = "Generates signals based on earnings growth and surprises"
    ):
        """
        Initialize earnings signal generator.
        
        Args:
            eps_growth_threshold: Minimum EPS growth rate for a buy signal
            surprise_threshold: Minimum earnings surprise for a buy signal
            quarters_required: Number of consecutive quarters required for a trend
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.eps_growth_threshold = eps_growth_threshold
        self.surprise_threshold = surprise_threshold
        self.quarters_required = quarters_required
    
    def generate_signals(self, data: pd.DataFrame, 
                        fundamental_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Generate signals based on earnings data.
        
        Args:
            data: Market data frame
            fundamental_data: DataFrame with fundamental data (optional)
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # If no fundamental data provided, try to retrieve it
        if fundamental_data is None and self.fundamental_data_provider is not None:
            symbols = data['symbol'].unique() if 'symbol' in data.columns else []
            if len(symbols) == 1:
                symbol = symbols[0]
                fundamental_data = self.get_fundamental_data(
                    symbol, ['eps', 'eps_estimate', 'eps_surprise_pct'],
                    data.index[0].strftime('%Y-%m-%d'),
                    data.index[-1].strftime('%Y-%m-%d')
                )
        
        # If we have fundamental data, generate signals
        if fundamental_data is not None and not fundamental_data.empty:
            # Convert to datetime index if it isn't already
            if not isinstance(fundamental_data.index, pd.DatetimeIndex):
                try:
                    fundamental_data.index = pd.to_datetime(fundamental_data.index)
                except:
                    return result
            
            # Make sure the index is sorted
            fundamental_data = fundamental_data.sort_index()
            
            # Calculate EPS growth
            if 'eps' in fundamental_data.columns:
                eps = fundamental_data['eps']
                eps_growth = eps.pct_change(periods=1)
                fundamental_data['eps_growth'] = eps_growth
                
                # Check for consistent growth
                consistent_growth = eps_growth.rolling(window=self.quarters_required).apply(
                    lambda x: all(x > self.eps_growth_threshold), raw=True)
                
                # Map earnings dates to market data
                for date, row in fundamental_data.iterrows():
                    # Find the closest date in market data after the earnings date
                    market_dates = result.index[result.index >= date]
                    if len(market_dates) > 0:
                        market_date = market_dates[0]
                        
                        # Check earnings growth signal
                        if consistent_growth.loc[date] and not pd.isna(consistent_growth.loc[date]):
                            result.loc[market_date, 'signal'] = SignalType.BUY.value
                        
                        # Check earnings surprise signal
                        if 'eps_surprise_pct' in row and not pd.isna(row['eps_surprise_pct']):
                            surprise_pct = row['eps_surprise_pct']
                            
                            if surprise_pct > self.surprise_threshold:
                                result.loc[market_date, 'signal'] = SignalType.BUY.value
                            elif surprise_pct < -self.surprise_threshold:
                                result.loc[market_date, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'eps_growth_threshold': self.eps_growth_threshold,
            'surprise_threshold': self.surprise_threshold,
            'quarters_required': self.quarters_required
        })
        return base_dict


class ValueationSignal(FundamentalSignalGenerator):
    """
    Generates signals based on valuation metrics.
    
    Identifies buy signals for undervalued stocks and
    sell signals for overvalued stocks based on P/E, P/B, etc.
    """
    
    def __init__(
        self,
        metrics: Dict[str, Tuple[float, float]] = None,
        name: str = "Valuation Signal Generator",
        description: str = "Generates signals based on valuation metrics"
    ):
        """
        Initialize valuation signal generator.
        
        Args:
            metrics: Dictionary mapping metrics to (low_threshold, high_threshold)
                    e.g. {'pe_ratio': (10, 25)} means buy when P/E < 10, sell when P/E > 25
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        # Default metrics with thresholds
        self.metrics = metrics or {
            'pe_ratio': (10, 25),
            'price_to_book': (1.0, 3.0),
            'price_to_sales': (1.0, 5.0),
            'ev_to_ebitda': (5, 15)
        }
    
    def generate_signals(self, data: pd.DataFrame,
                        fundamental_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Generate signals based on valuation metrics.
        
        Args:
            data: Market data frame
            fundamental_data: DataFrame with fundamental data (optional)
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # If no fundamental data provided, try to retrieve it
        if fundamental_data is None and self.fundamental_data_provider is not None:
            symbols = data['symbol'].unique() if 'symbol' in data.columns else []
            if len(symbols) == 1:
                symbol = symbols[0]
                metrics_list = list(self.metrics.keys())
                fundamental_data = self.get_fundamental_data(
                    symbol, metrics_list,
                    data.index[0].strftime('%Y-%m-%d'),
                    data.index[-1].strftime('%Y-%m-%d')
                )
        
        # If we have fundamental data, generate signals
        if fundamental_data is not None and not fundamental_data.empty:
            # Convert to datetime index if it isn't already
            if not isinstance(fundamental_data.index, pd.DatetimeIndex):
                try:
                    fundamental_data.index = pd.to_datetime(fundamental_data.index)
                except:
                    return result
            
            # Make sure the index is sorted
            fundamental_data = fundamental_data.sort_index()
            
            # Check each metric against thresholds
            for metric, (low_threshold, high_threshold) in self.metrics.items():
                if metric in fundamental_data.columns:
                    # Map valuation metrics to market data
                    for date, row in fundamental_data.iterrows():
                        if pd.isna(row[metric]):
                            continue
                            
                        # Find the closest date in market data after the metric date
                        market_dates = result.index[result.index >= date]
                        if len(market_dates) > 0:
                            market_date = market_dates[0]
                            
                            # Check valuation signals
                            if row[metric] < low_threshold:
                                # Undervalued - buy signal
                                result.loc[market_date, 'signal'] = SignalType.BUY.value
                            elif row[metric] > high_threshold:
                                # Overvalued - sell signal
                                result.loc[market_date, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'metrics': self.metrics
        })
        return base_dict


class GrowthSignal(FundamentalSignalGenerator):
    """
    Generates signals based on growth metrics.
    
    Identifies buy signals for companies with strong growth in
    revenue, earnings, or cash flow, and sell signals for slowing growth.
    """
    
    def __init__(
        self,
        growth_metrics: Dict[str, float] = None,
        deceleration_threshold: float = -0.2,
        periods_required: int = 2,
        name: str = "Growth Signal Generator",
        description: str = "Generates signals based on growth metrics"
    ):
        """
        Initialize growth signal generator.
        
        Args:
            growth_metrics: Dictionary mapping metrics to minimum growth rates
                          e.g. {'revenue_growth': 0.1} means buy when revenue growth > 10%
            deceleration_threshold: Maximum growth rate deceleration before sell signal
            periods_required: Number of consecutive periods required for a trend
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        # Default growth metrics with thresholds
        self.growth_metrics = growth_metrics or {
            'revenue_growth': 0.1,
            'earnings_growth': 0.15,
            'cash_flow_growth': 0.1
        }
        
        self.deceleration_threshold = deceleration_threshold
        self.periods_required = periods_required
    
    def generate_signals(self, data: pd.DataFrame,
                        fundamental_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Generate signals based on growth metrics.
        
        Args:
            data: Market data frame
            fundamental_data: DataFrame with fundamental data (optional)
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # If no fundamental data provided, try to retrieve it
        if fundamental_data is None and self.fundamental_data_provider is not None:
            symbols = data['symbol'].unique() if 'symbol' in data.columns else []
            if len(symbols) == 1:
                symbol = symbols[0]
                metrics_list = list(self.growth_metrics.keys())
                fundamental_data = self.get_fundamental_data(
                    symbol, metrics_list,
                    data.index[0].strftime('%Y-%m-%d'),
                    data.index[-1].strftime('%Y-%m-%d')
                )
        
        # If we have fundamental data, generate signals
        if fundamental_data is not None and not fundamental_data.empty:
            # Convert to datetime index if it isn't already
            if not isinstance(fundamental_data.index, pd.DatetimeIndex):
                try:
                    fundamental_data.index = pd.to_datetime(fundamental_data.index)
                except:
                    return result
            
            # Make sure the index is sorted
            fundamental_data = fundamental_data.sort_index()
            
            # Check each growth metric
            for metric, min_growth in self.growth_metrics.items():
                if metric in fundamental_data.columns:
                    growth_data = fundamental_data[metric]
                    
                    # Calculate if growth meets threshold for required periods
                    meets_growth = growth_data.rolling(window=self.periods_required).apply(
                        lambda x: all(x > min_growth), raw=True)
                    
                    # Calculate growth deceleration
                    deceleration = growth_data.diff() / growth_data.shift()
                    
                    # Map growth metrics to market data
                    for date, row in fundamental_data.iterrows():
                        # Find the closest date in market data after the metric date
                        market_dates = result.index[result.index >= date]
                        if len(market_dates) > 0:
                            market_date = market_dates[0]
                            
                            # Check strong growth signal
                            if date in meets_growth.index and meets_growth.loc[date] and not pd.isna(meets_growth.loc[date]):
                                result.loc[market_date, 'signal'] = SignalType.BUY.value
                            
                            # Check deceleration signal
                            if date in deceleration.index and not pd.isna(deceleration.loc[date]):
                                if deceleration.loc[date] < self.deceleration_threshold:
                                    result.loc[market_date, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'growth_metrics': self.growth_metrics,
            'deceleration_threshold': self.deceleration_threshold,
            'periods_required': self.periods_required
        })
        return base_dict
