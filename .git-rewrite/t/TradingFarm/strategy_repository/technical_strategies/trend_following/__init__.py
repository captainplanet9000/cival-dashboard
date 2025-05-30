"""
Trend Following Strategies
========================
Collection of trend following trading strategies that aim to capture directional price moves.
"""

from .moving_average_crossover import MovingAverageCrossoverStrategy
from .macd import MACDStrategy
from .ichimoku_cloud import IchimokuCloudStrategy

__all__ = [
    'MovingAverageCrossoverStrategy',
    'MACDStrategy',
    'IchimokuCloudStrategy'
]
