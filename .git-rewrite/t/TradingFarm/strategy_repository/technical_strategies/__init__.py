"""
Technical Strategies Package
=========================
Collection of technical analysis based trading strategies including trend following,
mean reversion, and volatility-based approaches.
"""

# Import strategy categories
from . import trend_following
from . import mean_reversion
from . import volatility_based

__all__ = [
    'trend_following',
    'mean_reversion',
    'volatility_based'
]
