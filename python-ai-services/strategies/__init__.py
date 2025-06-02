# This file makes the 'strategies' directory a Python package.

from .darvas_box import get_darvas_signals, run_darvas_backtest
from .williams_alligator import get_williams_alligator_signals, run_williams_alligator_backtest
from .elliott_wave import get_elliott_wave_signals, run_elliott_wave_backtest
from .heikin_ashi import get_heikin_ashi_signals, run_heikin_ashi_backtest, calculate_heikin_ashi_candles
from .renko import get_renko_signals, run_renko_backtest, calculate_renko_bricks
from .sma_crossover import get_sma_crossover_signals, run_sma_crossover_backtest


__all__ = [
    "get_darvas_signals",
    "run_darvas_backtest",
    "get_williams_alligator_signals",
    "run_williams_alligator_backtest",
    "get_elliott_wave_signals",
    "run_elliott_wave_backtest",
    "get_heikin_ashi_signals",
    "run_heikin_ashi_backtest",
    "calculate_heikin_ashi_candles", 
    "get_renko_signals",
    "run_renko_backtest",
    "calculate_renko_bricks",
    "get_sma_crossover_signals",
    "run_sma_crossover_backtest",
]
