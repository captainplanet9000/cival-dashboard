"""
Sentiment Signal Generators

Implements signal generators based on sentiment analysis.
Includes news sentiment, social media sentiment, and ElizaOS-powered AI sentiment analysis.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union, Any, Callable

from .signal_base import SignalGenerator, SignalType, SignalStrength


class SentimentSignalGenerator(SignalGenerator):
    """
    Base class for sentiment analysis signal generators.
    
    Provides common methods for sentiment data analysis
    and signal generation.
    """
    
    def __init__(self, name: str = "Sentiment Signal Generator", 
                description: str = "Generates signals based on sentiment analysis"):
        """
        Initialize a sentiment signal generator.
        
        Args:
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        self.sentiment_data_provider = None
        
    def set_sentiment_data_provider(self, provider):
        """
        Set the sentiment data provider for retrieving data.
        
        Args:
            provider: Sentiment data provider object
        """
        self.sentiment_data_provider = provider
    
    def get_sentiment_data(self, symbol: str, sources: List[str] = None,
                         start_date: Optional[str] = None, 
                         end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Get sentiment data for a symbol.
        
        Args:
            symbol: Symbol to get data for
            sources: List of sentiment sources to include
            start_date: Start date (optional)
            end_date: End date (optional)
            
        Returns:
            DataFrame with sentiment data
        """
        if self.sentiment_data_provider is not None:
            return self.sentiment_data_provider.get_data(
                symbol, sources, start_date, end_date
            )
        else:
            # If no provider, generate mock data for testing
            return self._generate_mock_sentiment_data(symbol, sources, start_date, end_date)
    
    def _generate_mock_sentiment_data(self, symbol: str, sources: List[str] = None,
                                    start_date: Optional[str] = None,
                                    end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Generate mock sentiment data for testing.
        
        Args:
            symbol: Symbol to generate data for
            sources: List of sentiment sources
            start_date: Start date (optional)
            end_date: End date (optional)
            
        Returns:
            DataFrame with mock sentiment data
        """
        # Default sources if none provided
        sources = sources or ['news', 'twitter', 'reddit', 'stocktwits']
        
        # Create a date range (daily by default)
        if start_date and end_date:
            date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        else:
            # Default to last 30 days
            end_date = pd.Timestamp.now()
            start_date = end_date - pd.Timedelta(days=30)
            date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        
        # Generate random data for each source
        np.random.seed(42)  # For reproducibility
        data = pd.DataFrame(index=date_range)
        data['symbol'] = symbol
        
        # Base sentiment with some trend
        days = np.arange(len(date_range))
        base_trend = 0.1 * np.sin(days / 10)
        
        for source in sources:
            # Different volatility for different sources
            if source == 'news':
                volatility = 0.15
            elif source == 'twitter':
                volatility = 0.25
            elif source == 'reddit':
                volatility = 0.3
            elif source == 'stocktwits':
                volatility = 0.2
            else:
                volatility = 0.2
            
            # Generate sentiment scores between -1 and 1
            noise = np.random.normal(0, volatility, len(date_range))
            sentiment = np.clip(base_trend + noise, -1, 1)
            
            # Add to dataframe
            data[f'{source}_sentiment'] = sentiment
            
            # Generate volume data (relative activity)
            volume_base = 100
            volume_volatility = 50
            volume = np.abs(np.random.normal(volume_base, volume_volatility, len(date_range)))
            data[f'{source}_volume'] = volume
        
        # Add composite sentiment (weighted average)
        weights = {
            'news_sentiment': 0.4,
            'twitter_sentiment': 0.2,
            'reddit_sentiment': 0.2,
            'stocktwits_sentiment': 0.2
        }
        
        composite = 0
        weight_sum = 0
        
        for source in sources:
            if f'{source}_sentiment' in data.columns:
                source_key = f'{source}_sentiment'
                if source_key in weights:
                    composite += data[source_key] * weights[source_key]
                    weight_sum += weights[source_key]
        
        if weight_sum > 0:
            data['composite_sentiment'] = composite / weight_sum
        
        return data
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on sentiment analysis.
        
        This is a placeholder method that should be overridden
        by specific sentiment signal generators.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with signals
        """
        # Default implementation returns no signals
        result = data.copy()
        result['signal'] = 0
        return result


class NewsSentimentSignal(SentimentSignalGenerator):
    """
    Generates signals based on news sentiment analysis.
    
    Identifies buy and sell signals based on news sentiment
    and significant sentiment changes.
    """
    
    def __init__(
        self,
        positive_threshold: float = 0.5,
        negative_threshold: float = -0.5,
        change_threshold: float = 0.2,
        lookback_period: int = 3,
        name: str = "News Sentiment Signal",
        description: str = "Generates signals based on news sentiment"
    ):
        """
        Initialize news sentiment signal generator.
        
        Args:
            positive_threshold: Minimum sentiment score for a buy signal
            negative_threshold: Maximum sentiment score for a sell signal
            change_threshold: Minimum sentiment change for a signal
            lookback_period: Period to look back for sentiment changes
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.positive_threshold = positive_threshold
        self.negative_threshold = negative_threshold
        self.change_threshold = change_threshold
        self.lookback_period = lookback_period
    
    def generate_signals(self, data: pd.DataFrame,
                        sentiment_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Generate signals based on news sentiment.
        
        Args:
            data: Market data frame
            sentiment_data: DataFrame with sentiment data (optional)
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # If no sentiment data provided, try to retrieve it
        if sentiment_data is None and self.sentiment_data_provider is not None:
            symbols = data['symbol'].unique() if 'symbol' in data.columns else []
            if len(symbols) == 1:
                symbol = symbols[0]
                sentiment_data = self.get_sentiment_data(
                    symbol, ['news'],
                    data.index[0].strftime('%Y-%m-%d'),
                    data.index[-1].strftime('%Y-%m-%d')
                )
        
        # If we have sentiment data, generate signals
        if sentiment_data is not None and not sentiment_data.empty:
            # Convert to datetime index if it isn't already
            if not isinstance(sentiment_data.index, pd.DatetimeIndex):
                try:
                    sentiment_data.index = pd.to_datetime(sentiment_data.index)
                except:
                    return result
            
            # Make sure the index is sorted
            sentiment_data = sentiment_data.sort_index()
            
            if 'news_sentiment' in sentiment_data.columns:
                sentiment = sentiment_data['news_sentiment']
                
                # Calculate sentiment change
                sentiment_change = sentiment.diff(periods=self.lookback_period)
                
                # Map sentiment to market data
                for date, row in sentiment_data.iterrows():
                    # Find the closest date in market data after the sentiment date
                    market_dates = result.index[result.index >= date]
                    if len(market_dates) > 0:
                        market_date = market_dates[0]
                        
                        # Check absolute sentiment levels
                        if row['news_sentiment'] > self.positive_threshold:
                            result.loc[market_date, 'signal'] = SignalType.BUY.value
                        elif row['news_sentiment'] < self.negative_threshold:
                            result.loc[market_date, 'signal'] = SignalType.SELL.value
                        
                        # Check sentiment changes
                        if date in sentiment_change.index and not pd.isna(sentiment_change.loc[date]):
                            if sentiment_change.loc[date] > self.change_threshold:
                                # Significant positive change
                                result.loc[market_date, 'signal'] = SignalType.BUY.value
                            elif sentiment_change.loc[date] < -self.change_threshold:
                                # Significant negative change
                                result.loc[market_date, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'positive_threshold': self.positive_threshold,
            'negative_threshold': self.negative_threshold,
            'change_threshold': self.change_threshold,
            'lookback_period': self.lookback_period
        })
        return base_dict


class SocialMediaSignal(SentimentSignalGenerator):
    """
    Generates signals based on social media sentiment analysis.
    
    Combines sentiment from Twitter, Reddit, StockTwits, etc.
    to generate trading signals.
    """
    
    def __init__(
        self,
        sources: List[str] = None,
        sentiment_threshold: float = 0.4,
        volume_threshold_factor: float = 1.5,
        lookback_period: int = 5,
        name: str = "Social Media Sentiment Signal",
        description: str = "Generates signals based on social media sentiment"
    ):
        """
        Initialize social media sentiment signal generator.
        
        Args:
            sources: List of social media sources to include
            sentiment_threshold: Minimum absolute sentiment score for a signal
            volume_threshold_factor: Factor above average volume for a signal
            lookback_period: Period to look back for volume comparison
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.sources = sources or ['twitter', 'reddit', 'stocktwits']
        self.sentiment_threshold = sentiment_threshold
        self.volume_threshold_factor = volume_threshold_factor
        self.lookback_period = lookback_period
    
    def generate_signals(self, data: pd.DataFrame,
                        sentiment_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Generate signals based on social media sentiment.
        
        Args:
            data: Market data frame
            sentiment_data: DataFrame with sentiment data (optional)
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # If no sentiment data provided, try to retrieve it
        if sentiment_data is None and self.sentiment_data_provider is not None:
            symbols = data['symbol'].unique() if 'symbol' in data.columns else []
            if len(symbols) == 1:
                symbol = symbols[0]
                sentiment_data = self.get_sentiment_data(
                    symbol, self.sources,
                    data.index[0].strftime('%Y-%m-%d'),
                    data.index[-1].strftime('%Y-%m-%d')
                )
        
        # If we have sentiment data, generate signals
        if sentiment_data is not None and not sentiment_data.empty:
            # Convert to datetime index if it isn't already
            if not isinstance(sentiment_data.index, pd.DatetimeIndex):
                try:
                    sentiment_data.index = pd.to_datetime(sentiment_data.index)
                except:
                    return result
            
            # Make sure the index is sorted
            sentiment_data = sentiment_data.sort_index()
            
            # Calculate composite sentiment if it doesn't exist
            if 'composite_sentiment' not in sentiment_data.columns:
                sentiment_cols = [f'{source}_sentiment' for source in self.sources 
                                if f'{source}_sentiment' in sentiment_data.columns]
                
                if sentiment_cols:
                    sentiment_data['composite_sentiment'] = sentiment_data[sentiment_cols].mean(axis=1)
            
            if 'composite_sentiment' in sentiment_data.columns:
                # Calculate volume metrics
                volume_cols = [f'{source}_volume' for source in self.sources 
                            if f'{source}_volume' in sentiment_data.columns]
                
                if volume_cols:
                    sentiment_data['total_volume'] = sentiment_data[volume_cols].sum(axis=1)
                    
                    # Calculate average volume over lookback period
                    sentiment_data['avg_volume'] = sentiment_data['total_volume'].rolling(
                        window=self.lookback_period).mean().shift(1)
                    
                    # Calculate volume ratio
                    sentiment_data['volume_ratio'] = sentiment_data['total_volume'] / sentiment_data['avg_volume']
                
                # Map sentiment to market data
                for date, row in sentiment_data.iterrows():
                    # Find the closest date in market data after the sentiment date
                    market_dates = result.index[result.index >= date]
                    if len(market_dates) > 0:
                        market_date = market_dates[0]
                        
                        # Skip if NaN sentiment
                        if pd.isna(row['composite_sentiment']):
                            continue
                        
                        # Check for significant sentiment and volume
                        has_high_volume = (
                            'volume_ratio' in row and
                            not pd.isna(row['volume_ratio']) and
                            row['volume_ratio'] > self.volume_threshold_factor
                        )
                        
                        # Generate signals based on sentiment and volume
                        if has_high_volume:
                            if row['composite_sentiment'] > self.sentiment_threshold:
                                result.loc[market_date, 'signal'] = SignalType.BUY.value
                            elif row['composite_sentiment'] < -self.sentiment_threshold:
                                result.loc[market_date, 'signal'] = SignalType.SELL.value
                        else:
                            # Lower signal threshold for normal volume
                            if row['composite_sentiment'] > self.sentiment_threshold * 1.5:
                                result.loc[market_date, 'signal'] = SignalType.BUY.value
                            elif row['composite_sentiment'] < -self.sentiment_threshold * 1.5:
                                result.loc[market_date, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'sources': self.sources,
            'sentiment_threshold': self.sentiment_threshold,
            'volume_threshold_factor': self.volume_threshold_factor,
            'lookback_period': self.lookback_period
        })
        return base_dict


class ElizaSentimentSignal(SentimentSignalGenerator):
    """
    Generates signals using ElizaOS AI sentiment analysis.
    
    Leverages ElizaOS's natural language processing and
    sentiment analysis capabilities to analyze news, social media,
    and other text data for trading signals.
    """
    
    def __init__(
        self,
        sentiment_threshold: float = 0.3,
        confidence_threshold: float = 0.7,
        include_sources: List[str] = None,
        name: str = "ElizaOS Sentiment Signal",
        description: str = "Generates signals using ElizaOS AI sentiment analysis"
    ):
        """
        Initialize ElizaOS sentiment signal generator.
        
        Args:
            sentiment_threshold: Minimum absolute sentiment score for a signal
            confidence_threshold: Minimum confidence level for a signal
            include_sources: List of text sources to analyze
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        
        self.sentiment_threshold = sentiment_threshold
        self.confidence_threshold = confidence_threshold
        self.include_sources = include_sources or ['news', 'social_media', 'sec_filings']
        self.eliza_integration_manager = None
    
    def set_eliza_integration_manager(self, manager):
        """
        Set the ElizaOS integration manager.
        
        Args:
            manager: ElizaOS integration manager
        """
        self.eliza_integration_manager = manager
    
    async def get_eliza_sentiment(self, symbol: str, 
                               start_date: datetime,
                               end_date: datetime) -> pd.DataFrame:
        """
        Get sentiment analysis from ElizaOS.
        
        Args:
            symbol: Symbol to analyze
            start_date: Start date
            end_date: End date
            
        Returns:
            DataFrame with ElizaOS sentiment analysis
        """
        if self.eliza_integration_manager is None:
            # If no ElizaOS integration, generate mock data
            return self._generate_mock_eliza_sentiment(symbol, start_date, end_date)
        
        try:
            # Request sentiment analysis from ElizaOS
            request = {
                'action': 'analyze_sentiment',
                'symbol': symbol,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'sources': self.include_sources
            }
            
            # Execute the command through the ElizaOS integration manager
            response = await self.eliza_integration_manager.execute_command(request)
            
            # Convert response to DataFrame
            if response and 'sentiment_data' in response:
                sentiment_data = response['sentiment_data']
                
                # Create DataFrame from response data
                if isinstance(sentiment_data, list) and sentiment_data:
                    df = pd.DataFrame(sentiment_data)
                    
                    # Convert date column to datetime
                    if 'date' in df.columns:
                        df['date'] = pd.to_datetime(df['date'])
                        df.set_index('date', inplace=True)
                    
                    return df
            
            # Return empty DataFrame if no valid response
            return pd.DataFrame()
            
        except Exception as e:
            # Log error and return empty DataFrame
            print(f"Error getting ElizaOS sentiment: {str(e)}")
            return pd.DataFrame()
    
    def _generate_mock_eliza_sentiment(self, symbol: str,
                                     start_date: datetime,
                                     end_date: datetime) -> pd.DataFrame:
        """
        Generate mock ElizaOS sentiment data for testing.
        
        Args:
            symbol: Symbol to generate data for
            start_date: Start date
            end_date: End date
            
        Returns:
            DataFrame with mock ElizaOS sentiment data
        """
        # Create a date range (daily)
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')
        
        # Generate random data
        np.random.seed(42)  # For reproducibility
        data = pd.DataFrame(index=date_range)
        data['symbol'] = symbol
        
        # Generate sentiment with some trend and cycles
        days = np.arange(len(date_range))
        
        # Base sentiment with market cycle simulation
        market_cycle = 0.2 * np.sin(days / 30)  # Monthly cycle
        company_cycle = 0.15 * np.sin(days / 7)  # Weekly cycle
        noise = np.random.normal(0, 0.1, len(date_range))
        
        data['sentiment_score'] = np.clip(market_cycle + company_cycle + noise, -1, 1)
        
        # Generate confidence scores
        data['confidence'] = np.random.uniform(0.6, 0.95, len(date_range))
        
        # Generate source breakdowns
        if 'news' in self.include_sources:
            data['news_sentiment'] = np.clip(data['sentiment_score'] + np.random.normal(0, 0.1, len(date_range)), -1, 1)
            data['news_volume'] = np.random.randint(5, 50, len(date_range))
        
        if 'social_media' in self.include_sources:
            data['social_media_sentiment'] = np.clip(data['sentiment_score'] + np.random.normal(0, 0.2, len(date_range)), -1, 1)
            data['social_media_volume'] = np.random.randint(50, 500, len(date_range))
        
        if 'sec_filings' in self.include_sources:
            # SEC filings are less frequent, so add some NaNs
            mask = np.random.random(len(date_range)) > 0.8
            data['sec_filings_sentiment'] = np.nan
            data.loc[mask, 'sec_filings_sentiment'] = np.clip(
                data.loc[mask, 'sentiment_score'] + np.random.normal(0, 0.05, mask.sum()), -1, 1)
        
        # Add key topics detected (for demonstration)
        topics = [
            "earnings", "growth", "revenue", "management", "competition",
            "regulation", "innovation", "dividend", "acquisition", "partnership"
        ]
        
        data['key_topics'] = [
            np.random.choice(topics, size=np.random.randint(1, 4), replace=False).tolist()
            for _ in range(len(date_range))
        ]
        
        return data
    
    async def generate_signals_async(self, data: pd.DataFrame,
                                  sentiment_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Generate signals based on ElizaOS sentiment analysis.
        
        This is an async version that can fetch ElizaOS sentiment data.
        
        Args:
            data: Market data frame
            sentiment_data: DataFrame with sentiment data (optional)
            
        Returns:
            DataFrame with signals
        """
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # If no sentiment data provided, try to retrieve it
        if sentiment_data is None:
            symbols = data['symbol'].unique() if 'symbol' in data.columns else []
            if len(symbols) == 1:
                symbol = symbols[0]
                sentiment_data = await self.get_eliza_sentiment(
                    symbol,
                    data.index[0].to_pydatetime(),
                    data.index[-1].to_pydatetime()
                )
        
        # If we have sentiment data, generate signals
        if sentiment_data is not None and not sentiment_data.empty:
            # Make sure the index is sorted
            sentiment_data = sentiment_data.sort_index()
            
            if 'sentiment_score' in sentiment_data.columns and 'confidence' in sentiment_data.columns:
                # Map sentiment to market data
                for date, row in sentiment_data.iterrows():
                    # Find the closest date in market data after the sentiment date
                    market_dates = result.index[result.index >= date]
                    if len(market_dates) > 0:
                        market_date = market_dates[0]
                        
                        # Skip if NaN sentiment or confidence
                        if pd.isna(row['sentiment_score']) or pd.isna(row['confidence']):
                            continue
                        
                        # Only generate signals when confidence meets threshold
                        if row['confidence'] >= self.confidence_threshold:
                            if row['sentiment_score'] > self.sentiment_threshold:
                                # Calculate signal strength based on confidence and sentiment
                                strength = min(2, 1 + (row['confidence'] - 0.7) * 3 + 
                                            (row['sentiment_score'] - 0.3) * 2)
                                
                                if strength > 1.5:
                                    result.loc[market_date, 'signal'] = SignalType.STRONG_BUY.value
                                else:
                                    result.loc[market_date, 'signal'] = SignalType.BUY.value
                                    
                            elif row['sentiment_score'] < -self.sentiment_threshold:
                                # Calculate signal strength based on confidence and sentiment
                                strength = min(2, 1 + (row['confidence'] - 0.7) * 3 + 
                                            (abs(row['sentiment_score']) - 0.3) * 2)
                                
                                if strength > 1.5:
                                    result.loc[market_date, 'signal'] = SignalType.STRONG_SELL.value
                                else:
                                    result.loc[market_date, 'signal'] = SignalType.SELL.value
        
        return result
    
    def generate_signals(self, data: pd.DataFrame,
                        sentiment_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """
        Generate signals based on ElizaOS sentiment analysis.
        
        This is a synchronous wrapper around the async method.
        For real usage, the async method should be used directly.
        
        Args:
            data: Market data frame
            sentiment_data: DataFrame with sentiment data
            
        Returns:
            DataFrame with signals
        """
        # For testing purposes, generate mock data if no sentiment data provided
        if sentiment_data is None:
            symbols = data['symbol'].unique() if 'symbol' in data.columns else []
            if len(symbols) == 1:
                symbol = symbols[0]
                sentiment_data = self._generate_mock_eliza_sentiment(
                    symbol,
                    data.index[0].to_pydatetime(),
                    data.index[-1].to_pydatetime()
                )
        
        result = data.copy()
        
        # Initialize signal column
        result['signal'] = 0
        
        # If we have sentiment data, generate signals
        if sentiment_data is not None and not sentiment_data.empty:
            # Make sure the index is sorted
            sentiment_data = sentiment_data.sort_index()
            
            if 'sentiment_score' in sentiment_data.columns and 'confidence' in sentiment_data.columns:
                # Map sentiment to market data
                for date, row in sentiment_data.iterrows():
                    # Find the closest date in market data after the sentiment date
                    market_dates = result.index[result.index >= date]
                    if len(market_dates) > 0:
                        market_date = market_dates[0]
                        
                        # Skip if NaN sentiment or confidence
                        if pd.isna(row['sentiment_score']) or pd.isna(row['confidence']):
                            continue
                        
                        # Only generate signals when confidence meets threshold
                        if row['confidence'] >= self.confidence_threshold:
                            if row['sentiment_score'] > self.sentiment_threshold:
                                # Calculate signal strength based on confidence and sentiment
                                strength = min(2, 1 + (row['confidence'] - 0.7) * 3 + 
                                            (row['sentiment_score'] - 0.3) * 2)
                                
                                if strength > 1.5:
                                    result.loc[market_date, 'signal'] = SignalType.STRONG_BUY.value
                                else:
                                    result.loc[market_date, 'signal'] = SignalType.BUY.value
                                    
                            elif row['sentiment_score'] < -self.sentiment_threshold:
                                # Calculate signal strength based on confidence and sentiment
                                strength = min(2, 1 + (row['confidence'] - 0.7) * 3 + 
                                            (abs(row['sentiment_score']) - 0.3) * 2)
                                
                                if strength > 1.5:
                                    result.loc[market_date, 'signal'] = SignalType.STRONG_SELL.value
                                else:
                                    result.loc[market_date, 'signal'] = SignalType.SELL.value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict.update({
            'sentiment_threshold': self.sentiment_threshold,
            'confidence_threshold': self.confidence_threshold,
            'include_sources': self.include_sources
        })
        return base_dict
