"""
Signal Generators Package

Provides components for generating trading signals based on technical,
fundamental, and sentiment analysis.
"""

from .signal_base import SignalGenerator, SignalType, SignalStrength
from .technical import (
    TechnicalSignalGenerator,
    MovingAverageCrossSignal,
    RSISignal,
    MACDSignal,
    BollingerBandsSignal,
    PatternRecognitionSignal
)
from .fundamental import (
    FundamentalSignalGenerator,
    EarningsSignal,
    ValueationSignal,
    GrowthSignal
)
from .sentiment import (
    SentimentSignalGenerator,
    NewsSentimentSignal,
    SocialMediaSignal,
    ElizaSentimentSignal
)

__all__ = [
    # Base components
    'SignalGenerator', 'SignalType', 'SignalStrength',
    
    # Technical signals
    'TechnicalSignalGenerator', 'MovingAverageCrossSignal', 'RSISignal',
    'MACDSignal', 'BollingerBandsSignal', 'PatternRecognitionSignal',
    
    # Fundamental signals
    'FundamentalSignalGenerator', 'EarningsSignal', 'ValueationSignal', 'GrowthSignal',
    
    # Sentiment signals
    'SentimentSignalGenerator', 'NewsSentimentSignal', 'SocialMediaSignal',
    'ElizaSentimentSignal'
]
