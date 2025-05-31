# This file will contain the implementation of the Darvas Box trading strategy.
#
# Key components of Darvas Box theory:
# 1. Identify stocks making new 52-week highs.
# 2. Box Formation:
#    - The high of the day that made the new 52-week high sets the initial box top.
#    - The stock price must not significantly exceed this top in subsequent days.
#    - A low point is established below this top. If this low point is tested and holds for a few days
#      (typically 3) without the top being violated, it becomes the box bottom.
#    - The box top and bottom define the range.
# 3. Buy Signal: When the price breaks out above the top of the most recently confirmed box on high volume.
# 4. Stop-Loss: Typically placed just below the bottom of the box from which the breakout occurred.
#
# This implementation is a simplified version. Real-world Darvas Box application can have more nuances
# regarding box re-definitions, pyramiding, and more sophisticated volume analysis.
# Libraries like OpenBB could be used for data fetching, and VectorBT for vectorized backtesting.

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from loguru import logger

try:
    from ..models.strategy_models import DarvasBoxConfig
except ImportError:
    logger.warning("Could not import DarvasBoxConfig from ..models.strategy_models. Using Any for config type.")
    DarvasBoxConfig = Any # Placeholder for type hinting if import fails

def _find_new_high(series: pd.Series, lookback_period: int) -> pd.Series:
    """
    Identifies new highs in a series compared to a lookback period.
    Returns a boolean series, True where the current value is a new high.
    A new high means it's strictly greater than all values in the preceding 'lookback_period' days.
    """
    if lookback_period <= 0:
        return pd.Series([False] * len(series), index=series.index)

    # Calculate the rolling max of the *previous* 'lookback_period' days
    rolling_max_exclusive = series.rolling(window=lookback_period, min_periods=min(1,lookback_period)).max().shift(1)
    is_new_high = series > rolling_max_exclusive
    # The first 'lookback_period' days cannot be new highs by this definition, as there's not enough history.
    # Rolling max will have NaNs at the start, comparisons with NaN are False.
    # Ensure first lookback_period entries are False if min_periods was too small.
    # A simpler check: if current value is the max of current + lookback-1 previous days, and not equal to previous day's high (if that was also a high)
    # For simplicity, this common definition is used: higher than all of the *previous* N days.
    return is_new_high

def run_darvas_box(ohlcv_df: pd.DataFrame, config: DarvasBoxConfig) -> Dict[str, List[Dict]]:
    """
    Identifies Darvas Boxes and generates buy signals based on breakouts.

    Args:
        ohlcv_df: Pandas DataFrame with DateTimeIndex and columns 'Open', 'High', 'Low', 'Close', 'Volume'.
        config: An instance of DarvasBoxConfig containing strategy parameters.

    Returns:
        A dictionary with two keys:
        "signals": List of buy signals. Each signal is a dict with:
                   {"date": pd.Timestamp, "type": "BUY", "price": float,
                    "box_top": float, "box_bottom": float,
                    "stop_loss": float}
        "boxes": List of identified Darvas boxes. Each box is a dict with:
                 {"start_date": pd.Timestamp, "end_date": pd.Timestamp,
                  "top": float, "bottom": float, "breakout_date": Optional[pd.Timestamp]}
    """
    signals: List[Dict[str, Any]] = []
    boxes: List[Dict[str, Any]] = []

    if ohlcv_df.empty:
        logger.warning("OHLCV DataFrame is empty. Cannot run Darvas Box strategy.")
        return {"signals": signals, "boxes": boxes}

    # Standardize column names
    df = ohlcv_df.copy()
    df.columns = [col.lower() for col in df.columns]
    required_cols = ['open', 'high', 'low', 'close', 'volume']
    if not all(col in df.columns for col in required_cols):
        logger.error(f"OHLCV DataFrame must contain columns: {required_cols}")
        return {"signals": signals, "boxes": boxes}

    if not isinstance(df.index, pd.DatetimeIndex):
        logger.error("OHLCV DataFrame must have a DatetimeIndex.")
        return {"signals": signals, "boxes": boxes}

    # State variables for box detection
    in_box_formation = False # True if a new high was made and we are trying to define a box
    box_top_price: Optional[float] = None
    box_bottom_price: Optional[float] = None
    box_top_idx: int = -1 # Index where the box top was established
    days_bottom_tested: int = 0 # Counter for days the current bottom has held

    logger.info(f"Running Darvas Box strategy with config: {config.dict() if hasattr(config, 'dict') else config}")

    # Calculate new highs based on closing prices
    # Darvas originally looked at daily high prices for new highs.
    is_new_high_series = _find_new_high(df['high'], config.lookback_period_highs)

    # Iterate through the price data, starting after the initial lookback period for highs
    # Need at least lookback_period_highs + box_definition_period for robust calculations.
    # Start index ensures enough data for lookback_period_highs.
    start_iter_idx = config.lookback_period_highs
    if start_iter_idx >= len(df):
        logger.warning("Not enough data points to run Darvas Box strategy based on lookback_period_highs.")
        return {"signals": signals, "boxes": boxes}

    for i in range(start_iter_idx, len(df)):
        current_date = df.index[i]
        current_high = df['high'].iloc[i]
        current_low = df['low'].iloc[i]
        current_close = df['close'].iloc[i]
        current_volume = df['volume'].iloc[i]

        if not in_box_formation:
            if is_new_high_series.iloc[i]:
                box_top_price = current_high  # New high sets the box top
                box_top_idx = i
                box_bottom_price = current_low # Initial potential bottom
                days_bottom_tested = 1
                in_box_formation = True
                logger.debug(f"{current_date}: New high {current_high:.2f} observed. Initiating box formation. Top: {box_top_price:.2f}, Tentative Bottom: {box_bottom_price:.2f}")
        else: # We are in box formation (box_top_price is set)
            # Check if box formation period exceeded without confirmation
            if (i - box_top_idx) > config.box_definition_period and days_bottom_tested < config.min_box_duration:
                logger.debug(f"{current_date}: Box formation timed out for top {box_top_price:.2f} established at {df.index[box_top_idx]}. Resetting.")
                in_box_formation = False
                continue

            # 1. Check for box top violation
            # If current high significantly breaks above established box_top_price, this box is invalidated.
            # Darvas allowed minor penetrations that didn't hold. Here, a high above tolerance breaks the current attempt.
            if current_high > box_top_price * (1 + config.box_range_tolerance_percent / 100):
                logger.debug(f"{current_date}: Price {current_high:.2f} violated current box top {box_top_price:.2f} (with tolerance). Resetting box formation.")
                # Option 1: Reset and re-evaluate from this new high if it's also a new N-day high
                if is_new_high_series.iloc[i] and current_high > box_top_price : # if it's a true higher high
                     box_top_price = current_high
                     box_top_idx = i
                     box_bottom_price = current_low
                     days_bottom_tested = 1
                     logger.debug(f"{current_date}: New higher high {current_high:.2f} forms new potential box top.")
                else: # Not a new N-day high or just a spike, invalidate current attempt
                    in_box_formation = False
                continue

            # 2. Update box bottom if a new low is made (must still be below box_top_price)
            if current_low < box_bottom_price:
                box_bottom_price = current_low
                days_bottom_tested = 1 # Reset counter as bottom has been lowered
                logger.debug(f"{current_date}: Box bottom lowered to {box_bottom_price:.2f}. Resetting bottom test days.")
            else: # Current low holds at or above current_box_bottom_price
                days_bottom_tested += 1
                logger.trace(f"{current_date}: Bottom {box_bottom_price:.2f} held. Days tested: {days_bottom_tested}.")

            # 3. If bottom has been tested for min_box_duration days, the box is considered defined
            if days_bottom_tested >= config.min_box_duration:
                # Now the box (top, bottom) is defined. Look for breakout.
                logger.debug(f"{current_date}: Box confirmed for {df['close'].iloc[box_top_idx]:.2f} -> Top: {box_top_price:.2f}, Bottom: {box_bottom_price:.2f} (tested {days_bottom_tested} days).")

                # Breakout Condition
                if current_close > box_top_price:
                    # Volume Confirmation (average volume during the box formation period)
                    # Use data from the day after the box top was set, up to the day before breakout
                    start_vol_calc_idx = box_top_idx + 1
                    end_vol_calc_idx = i
                    if start_vol_calc_idx < end_vol_calc_idx : # Need at least one day in between for avg
                        avg_volume_in_box = df['volume'].iloc[start_vol_calc_idx:end_vol_calc_idx].mean()
                        if np.isnan(avg_volume_in_box) or avg_volume_in_box == 0: # Handle cases with no volume or single day box
                             avg_volume_in_box = df['volume'].iloc[max(0, box_top_idx-20):box_top_idx+1].mean() # Fallback to 20 day before top
                             if np.isnan(avg_volume_in_box) or avg_volume_in_box == 0: avg_volume_in_box = current_volume / config.volume_increase_factor # last resort

                    else: # Box formed and broke out very quickly, use prior average volume
                        avg_volume_in_box = df['volume'].iloc[max(0, i-20):i].mean()
                        if np.isnan(avg_volume_in_box) or avg_volume_in_box == 0: avg_volume_in_box = current_volume / config.volume_increase_factor


                    if current_volume >= avg_volume_in_box * config.volume_increase_factor:
                        logger.info(f"BREAKOUT: {current_date} - {df.iloc[box_top_idx].name.date()} Box ({box_top_price:.2f} - {box_bottom_price:.2f}). Close: {current_close:.2f}. Volume: {current_volume} vs Avg: {avg_volume_in_box:.0f}")
                        stop_loss_price = round(box_bottom_price * (1 - config.stop_loss_percent_from_bottom / 100), 2)
                        signals.append({
                            "date": current_date,
                            "type": "BUY",
                            "price": current_close,
                            "box_top": box_top_price,
                            "box_bottom": box_bottom_price,
                            "stop_loss": stop_loss_price,
                            "volume_on_breakout": current_volume,
                            "avg_volume_in_box": round(avg_volume_in_box)
                        })
                        boxes.append({
                            "start_date": df.index[box_top_idx], # Date the high (box top) was set
                            "end_date": df.index[i-1], # Day before breakout
                            "top": box_top_price,
                            "bottom": box_bottom_price,
                            "breakout_date": current_date,
                            "duration_days": i - box_top_idx
                        })
                        in_box_formation = False # Reset to look for a new box
                    else:
                        logger.debug(f"{current_date}: Breakout above {box_top_price:.2f} to {current_close:.2f} occurred, but volume {current_volume} did not meet criteria (vs avg {avg_volume_in_box:.0f} * {config.volume_increase_factor}).")

                # Downward box violation (after box is confirmed) - not a buy signal, just invalidates box
                elif current_low < box_bottom_price * (1 - config.box_range_tolerance_percent / 100):
                     logger.debug(f"{current_date}: Price {current_low:.2f} violated confirmed box bottom {box_bottom_price:.2f}. Resetting.")
                     in_box_formation = False


    logger.info(f"Darvas Box strategy run complete. Found {len(signals)} signals and {len(boxes)} boxes.")
    return {"signals": signals, "boxes": boxes}


if __name__ == '__main__':
    logger.remove()
    logger.add(lambda msg: print(msg, end=''), colorize=True, format="<green>{time:HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="DEBUG")

    # Create sample data
    dates = pd.to_datetime([
        "2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04", "2023-01-05",
        "2023-01-06", "2023-01-07", "2023-01-08", "2023-01-09", "2023-01-10",
        "2023-01-11", "2023-01-12", "2023-01-13", "2023-01-14", "2023-01-15",
        "2023-01-16", "2023-01-17", "2023-01-18", "2023-01-19", "2023-01-20",
        "2023-01-21", "2023-01-22", "2023-01-23", "2023-01-24", "2023-01-25"
    ])
    data = {
        'Open':  [100, 102, 105, 103, 106, 108, 110, 108, 107, 109, 108, 107, 108, 109, 112, 110, 109, 111, 110, 113, 115, 114, 112, 116, 118],
        'High':  [103, 105, 106, 106, 108, 110, 112, # New High (112) day 6 (idx 6) -> Box Top = 112
                  109, 108, 110, # Prices stay below 112
                  109, 108, 109, 110, 113, # Potential bottom at 107 (idx 8,9,11), confirmed over 3 days
                                       # Day 14 (idx 14) High 113 > 112, Breakout!
                  111, 110, 112, 111, 114,
                  116, 115, 113, 118, 120], # New High 120 (idx 24)
        'Low':   [99,  101, 103, 102, 105, 107, 108, # Day 6: Low 108
                  107, 107, 107, # Lows hold at 107 (idx 8,9,10) -> Box Bottom = 107
                  106, 106, 107, 108, 110,
                  109, 108, 110, 109, 112,
                  113, 112, 111, 115, 117],
        'Close': [102, 104, 104, 105, 107, 109, 111,
                  108, 107, 108,
                  107, 107, 108, 109, 112.5, # Breakout Close day 14 (idx 14)
                  110, 109, 111, 110, 113,
                  115, 113, 112, 117, 119],
        'Volume':[1000,1200,1100,1300,1400,1500,1700,
                  1200,1100,1300,
                  1000,900,1100,1200, 2500, # High volume on breakout
                  1300,1200,1400,1350,1600,
                  1700,1500,1400,1800,1900]
    }
    sample_ohlcv_df = pd.DataFrame(data, index=dates)

    # Use a config that makes the sample data less likely to hit new 52-week highs too soon
    # For _find_new_high, lookback_period_highs should be less than the length of data before the first expected high.
    # First high is at index 6. So lookback < 6.
    # For this small sample, we dramatically reduce lookback_period_highs to get any signal.
    # A real scenario would have much more data.

    # To make _find_new_high work for small dataset, let lookback_period_highs be small
    # For the high at index 6 (value 112), we need lookback_period_highs <= 6 for it to be a new high.
    # Let's set it to 5.
    sample_config = DarvasBoxConfig(
        lookback_period_highs=5, # Reduced for small sample
        box_definition_period=10, # Max days to form box after high
        volume_increase_factor=1.2, # Lowered for sample
        min_box_duration=3, # Min days bottom must hold
        stop_loss_percent_from_bottom=1.0
    )

    if DarvasBoxConfig == Any: # If import failed, create a dict for config
        logger.warning("Using dict for config due to failed DarvasBoxConfig import in test.")
        sample_config_dict = {
            "lookback_period_highs": 5, "box_definition_period": 10,
            "volume_increase_factor": 1.2, "box_range_tolerance_percent": 1.0,
            "min_box_duration": 3, "stop_loss_percent_from_bottom": 1.0
        }
        # Simulate Pydantic-like access for the function
        class DictConfig:
            def __init__(self, data): self._data = data
            def __getattr__(self, name): return self._data.get(name)
            def dict(self): return self._data

        results = run_darvas_box(sample_ohlcv_df, DictConfig(sample_config_dict))
    else:
        results = run_darvas_box(sample_ohlcv_df, sample_config)

    logger.info(f"Darvas Box Results:\nSignals: {results['signals']}\nBoxes: {results['boxes']}")

    # Test with insufficient data
    short_df = sample_ohlcv_df.head(3)
    results_short = run_darvas_box(short_df, sample_config)
    logger.info(f"Darvas Box Results (short data):\nSignals: {results_short['signals']}\nBoxes: {results_short['boxes']}")

    # Test with no new highs in range
    no_high_df = sample_ohlcv_df.copy()
    no_high_df['high'] = 100 # Flatten highs
    results_no_high = run_darvas_box(no_high_df, sample_config)
    logger.info(f"Darvas Box Results (no highs):\nSignals: {results_no_high['signals']}\nBoxes: {results_no_high['boxes']}")

```
