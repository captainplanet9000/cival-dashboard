"""
Execution Analysis Module

Provides tools for analyzing order execution quality, costs, and slippage.
This module helps identify execution inefficiencies and opportunities for improvement.
"""

from .slippage_calculator import SlippageCalculator
from .fill_quality import FillQuality
from .cost_analysis import CostAnalysis

__all__ = ['SlippageCalculator', 'FillQuality', 'CostAnalysis']
