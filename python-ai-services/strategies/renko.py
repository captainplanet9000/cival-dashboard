import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from loguru import logger

try:
    from ..models.strategy_models import RenkoConfig, RenkoBrickSizeMethod
except ImportError:
    logger.warning("Could not import RenkoConfig/RenkoBrickSizeMethod from ..models.strategy_models. Using Any for config type.")
    RenkoConfig = Any
    RenkoBrickSizeMethod = Any


def _calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculates the Average True Range (ATR).
    Uses Wilder's smoothing method (similar to SMMA for ATR).
    """
    if not (isinstance(high, pd.Series) and isinstance(low, pd.Series) and isinstance(close, pd.Series)):
        raise TypeError("Inputs 'high', 'low', 'close' must be pandas Series.")
    if period <= 0:
        raise ValueError("ATR period must be positive.")
    if len(high) < period:
        logger.warning(f"Data length ({len(high)}) is less than ATR period ({period}). ATR will be all NaN.")
        return pd.Series(np.nan, index=high.index, name=f"ATR_{period}")

    # Calculate True Range (TR)
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    true_range = pd.DataFrame({'tr1': tr1, 'tr2': tr2, 'tr3': tr3}).max(axis=1)

    # Calculate ATR using Wilder's smoothing (an EMA variant)
    # First ATR is the SMA of TR over the period
    # Subsequent ATR = ( (Previous ATR * (period - 1)) + Current TR ) / period
    atr = pd.Series(np.nan, index=high.index, dtype='float64')

    # Initial ATR value (SMA of TR)
    if len(true_range) >= period:
        initial_atr = true_range.iloc[1:period].mean() # TR needs prev_close, so first TR is at index 1
                                                    # Average first 'period' TRs (excluding first TR which is NaN)
        if pd.notna(initial_atr) and period -1 < len(atr): # Ensure index is valid
             atr.iloc[period-1] = initial_atr # Some conventions place first ATR at period, some at period-1
                                             # Using period-1 as it's the end of the first full period for TR.
                                             # Let's adjust to align with common TA libraries: first ATR at index `period`.
                                             # This means we need `period` TR values to calculate the first ATR.
                                             # TR[0] is NaN. TR[1] is first real TR. So TR[1]...TR[period] form first `period` values.
                                             # Average of these is ATR at index `period`.

             # Recalculate initial ATR more robustly
             tr_for_first_atr = true_range.iloc[1:period+1] # Get 'period' number of TR values
             if len(tr_for_first_atr) == period and not tr_for_first_atr.isnull().any():
                 atr.iloc[period] = tr_for_first_atr.mean()

                 # Calculate subsequent ATR values
                 for i in range(period + 1, len(series)):
                     if pd.isna(atr.iloc[i-1]) or pd.isna(true_range.iloc[i]):
                         atr.iloc[i] = np.nan # Propagate NaN
                         continue
                     atr.iloc[i] = (atr.iloc[i-1] * (period - 1) + true_range.iloc[i]) / period
             else:
                 logger.warning(f"Could not calculate initial ATR for period {period} due to NaNs in True Range.")

    atr.name = f"ATR_{period}"
    return atr


def _calculate_renko_bricks(price_series: pd.Series, brick_size: float) -> pd.DataFrame:
    """
    Constructs Renko bricks from a price series and a fixed brick size.

    Args:
        price_series: Pandas Series of prices (e.g., close prices).
        brick_size: The fixed size of each Renko brick.

    Returns:
        A Pandas DataFrame with columns: 'timestamp' (end time of brick formation),
        'brick_type' ('up' or 'down'), 'open', 'close'.
        Open and Close represent the boundaries of the brick.
    """
    if brick_size <= 0:
        raise ValueError("Brick size must be positive.")
    if price_series.empty:
        return pd.DataFrame(columns=['timestamp', 'brick_type', 'open', 'close'])

    bricks: List[Dict[str, Any]] = []

    # Initialize first brick based on first price point
    first_price = price_series.iloc[0]
    if pd.isna(first_price): # Cannot start if first price is NaN
        logger.warning("First price in series is NaN, cannot initialize Renko bricks.")
        return pd.DataFrame(columns=['timestamp', 'brick_type', 'open', 'close'])

    # Initial brick direction is not determined until the second brick forms.
    # For simplicity, we can start with a reference price and build from there.
    # A common way is to set the first "close" and then determine direction.
    # Let's set the initial reference price for the first brick's "close".
    # The "open" of the first brick can be considered this price minus brick_size (for up) or plus brick_size (for down)
    # once direction is known. Or, more simply, the first brick's open/close is just the first price level.

    # Alternative: Start with a base, and the first brick is formed when price moves brick_size away.
    renko_prices = [round(first_price / brick_size) * brick_size] # Initial reference level for bricks

    # Simplified Renko logic:
    # 1. Start with current price.
    # 2. If price moves up by brick_size, add new up-brick.
    # 3. If price moves down by brick_size, add new down-brick.
    # 4. Ignore movements smaller than brick_size.
    # This simple version doesn't explicitly handle wicks or 2*brick_size reversals,
    # but focuses on traditional Renko where bricks are only drawn for full brick_size moves.

    # More traditional approach:
    # Determine initial brick direction from first few price points or assume first move.
    # For this implementation, we'll use a common method:
    # Start with the first price. A new brick is drawn only when the price moves
    # at least one brick_size away from the open/close of the last drawn brick.
    # The direction of the new brick is determined by this move.
    # Bricks only change direction if the price moves at least two brick_sizes
    # from the last brick's boundary in the opposite direction.

    if len(price_series) < 2:
        return pd.DataFrame(columns=['timestamp', 'brick_type', 'open', 'close'])

    # Initialize with the first price as the close of the first "base" level.
    # No brick is drawn yet.
    last_brick_close = price_series.iloc[0]
    last_brick_type = None # 'up' or 'down'

    for i in range(1, len(price_series)):
        current_price = price_series.iloc[i]
        current_timestamp = price_series.index[i]

        if pd.isna(current_price):
            continue

        price_diff = current_price - last_brick_close

        if last_brick_type == 'up':
            if price_diff >= brick_size: # Continue upward trend
                num_bricks = int(abs(price_diff) / brick_size)
                for _ in range(num_bricks):
                    brick_open = last_brick_close
                    brick_close = brick_open + brick_size
                    bricks.append({'timestamp': current_timestamp, 'brick_type': 'up', 'open': brick_open, 'close': brick_close})
                    last_brick_close = brick_close
                last_brick_type = 'up' # Redundant but clear
            elif price_diff <= -2 * brick_size: # Reversal to down trend
                # First, complete the partial up movement to the last brick's boundary if needed (not typical in pure Renko)
                # Then draw down bricks.
                num_bricks = int(abs(price_diff) / brick_size) # Total movement in brick units
                # The first down brick starts from last_brick_close (top of last up-brick)
                brick_open = last_brick_close
                brick_close = brick_open - brick_size
                bricks.append({'timestamp': current_timestamp, 'brick_type': 'down', 'open': brick_open, 'close': brick_close})
                last_brick_close = brick_close
                last_brick_type = 'down'
                # Add more down bricks if movement was large enough
                for _ in range(1, int(abs(current_price - last_brick_close) / brick_size) ): # Check remaining movement
                    brick_open = last_brick_close
                    brick_close = brick_open - brick_size
                    bricks.append({'timestamp': current_timestamp, 'brick_type': 'down', 'open': brick_open, 'close': brick_close})
                    last_brick_close = brick_close


        elif last_brick_type == 'down':
            if price_diff <= -brick_size: # Continue downward trend
                num_bricks = int(abs(price_diff) / brick_size)
                for _ in range(num_bricks):
                    brick_open = last_brick_close
                    brick_close = brick_open - brick_size
                    bricks.append({'timestamp': current_timestamp, 'brick_type': 'down', 'open': brick_open, 'close': brick_close})
                    last_brick_close = brick_close
                last_brick_type = 'down'
            elif price_diff >= 2 * brick_size: # Reversal to up trend
                num_bricks = int(abs(price_diff) / brick_size)
                brick_open = last_brick_close
                brick_close = brick_open + brick_size
                bricks.append({'timestamp': current_timestamp, 'brick_type': 'up', 'open': brick_open, 'close': brick_close})
                last_brick_close = brick_close
                last_brick_type = 'up'
                for _ in range(1, int(abs(current_price - last_brick_close) / brick_size) ):
                    brick_open = last_brick_close
                    brick_close = brick_open + brick_size
                    bricks.append({'timestamp': current_timestamp, 'brick_type': 'up', 'open': brick_open, 'close': brick_close})
                    last_brick_close = brick_close

        else: # last_brick_type is None (Initial phase)
            if abs(price_diff) >= brick_size:
                if price_diff > 0: # First brick is up
                    brick_open = last_brick_close # Or first_price if we want to show the base
                    brick_close = brick_open + int(price_diff / brick_size) * brick_size # More accurate for multi-brick first move
                    for b_open in np.arange(brick_open, brick_close, brick_size):
                         bricks.append({'timestamp': current_timestamp, 'brick_type': 'up', 'open': b_open, 'close': b_open + brick_size})
                    last_brick_type = 'up'
                else: # First brick is down
                    brick_open = last_brick_close
                    brick_close = brick_open - int(abs(price_diff) / brick_size) * brick_size
                    for b_open in np.arange(brick_open, brick_close, -brick_size): # Iterate downwards
                         bricks.append({'timestamp': current_timestamp, 'brick_type': 'down', 'open': b_open, 'close': b_open - brick_size})
                    last_brick_type = 'down'
                last_brick_close = bricks[-1]['close'] if bricks else first_price


    return pd.DataFrame(bricks)


def run_renko(ohlcv_df: pd.DataFrame, config: RenkoConfig) -> Dict[str, Any]:
    """
    Generates Renko bricks and basic trading signals.
    """
    signals: List[Dict[str, Any]] = []

    if ohlcv_df.empty:
        logger.warning("OHLCV DataFrame is empty. Cannot run Renko strategy.")
        return {"signals": [], "renko_bricks": pd.DataFrame(), "brick_size_used": np.nan}

    df = ohlcv_df.copy()
    df.columns = [col.lower() for col in df.columns]
    required_cols = ['open', 'high', 'low', 'close'] # Volume not directly used for Renko itself
    if not all(col in df.columns for col in required_cols):
        logger.error(f"OHLCV DataFrame must contain columns: {required_cols}. Found: {list(df.columns)}")
        return {"signals": [], "renko_bricks": pd.DataFrame(), "brick_size_used": np.nan}

    if not isinstance(df.index, pd.DatetimeIndex):
        logger.error("OHLCV DataFrame must have a DatetimeIndex.")
        return {"signals": [], "renko_bricks": pd.DataFrame(), "brick_size_used": np.nan}

    # Select price source
    price_source_col = config.price_source_column.lower()
    if price_source_col == 'hlc3':
        if all(c in df.columns for c in ['high', 'low', 'close']):
            price_series = (df['high'] + df['low'] + df['close']) / 3
        else:
            logger.warning("hlc3 specified but H,L,C columns not all available. Defaulting to 'close'.")
            price_series = df['close']
    elif price_source_col in df.columns:
        price_series = df[price_source_col]
    else:
        logger.warning(f"Price source column '{config.price_source_column}' not found. Defaulting to 'close'.")
        price_series = df['close']

    price_series = pd.to_numeric(price_series, errors='coerce').dropna()
    if price_series.empty:
        logger.error("Price source series is empty or all NaNs after conversion.")
        return {"signals": [], "renko_bricks": pd.DataFrame(), "brick_size_used": np.nan}

    # Calculate Brick Size
    brick_size_used: float
    if config.brick_size_method == RenkoBrickSizeMethod.FIXED:
        if config.brick_size_value is None or config.brick_size_value <=0: # Should be caught by Pydantic model_validator
            logger.error("Fixed brick size method chosen but brick_size_value is invalid or not set.")
            return {"signals": [], "renko_bricks": pd.DataFrame(), "brick_size_used": np.nan}
        brick_size_used = config.brick_size_value
    elif config.brick_size_method == RenkoBrickSizeMethod.ATR:
        if len(df) < config.atr_period + 1: # Need enough data for ATR
            logger.error(f"Not enough data ({len(df)} points) for ATR period {config.atr_period}.")
            return {"signals": [], "renko_bricks": pd.DataFrame(), "brick_size_used": np.nan}
        atr_series = _calculate_atr(df['high'], df['low'], df['close'], config.atr_period)
        last_atr = atr_series.dropna().iloc[-1] if not atr_series.dropna().empty else None
        if last_atr is None or last_atr <= 1e-6: # Handle zero or very small ATR
            logger.warning(f"Calculated ATR is zero or very small ({last_atr}). Using 1% of last price as fallback brick size.")
            brick_size_used = price_series.iloc[-1] * 0.01
            if brick_size_used <= 1e-6 : brick_size_used = 1.0 # Absolute fallback
        else:
            brick_size_used = last_atr
    else: # Should not happen if config is validated
        logger.error(f"Unknown brick size method: {config.brick_size_method}")
        return {"signals": [], "renko_bricks": pd.DataFrame(), "brick_size_used": np.nan}

    logger.info(f"Running Renko strategy for {price_series.name if price_series.name else 'price'} with brick size: {brick_size_used:.4f} (Method: {config.brick_size_method.value})")

    # Calculate Renko Bricks
    renko_bricks_df = _calculate_renko_bricks(price_series, brick_size_used)
    if renko_bricks_df.empty:
        logger.info("No Renko bricks were generated.")
        return {"signals": signals, "renko_bricks": renko_bricks_df, "brick_size_used": brick_size_used}

    # Signal Generation Logic (Simplified)
    current_position = "NONE" # "NONE", "LONG", "SHORT"
    for i in range(1, len(renko_bricks_df)): # Need at least two bricks to compare
        prev_brick = renko_bricks_df.iloc[i-1]
        curr_brick = renko_bricks_df.iloc[i]

        signal_type = "HOLD"
        reason = "No change in Renko trend or consolidating."

        # Buy Signal: Two consecutive 'up' bricks after 'down' or 'none'
        if current_position != "LONG" and curr_brick['brick_type'] == 'up' and prev_brick['brick_type'] == 'up':
            # Check if previous state was not already long from earlier up bricks
            # This simple version enters on any two consecutive up bricks if not already long
            signal_type = "BUY"
            reason = f"Renko reversal: Two consecutive 'up' bricks. Brick close: {curr_brick['close']:.2f}"
            current_position = "LONG"

        # Sell Signal: Two consecutive 'down' bricks after 'up' or 'none'
        elif current_position != "SHORT" and curr_brick['brick_type'] == 'down' and prev_brick['brick_type'] == 'down':
            signal_type = "SELL"
            reason = f"Renko reversal: Two consecutive 'down' bricks. Brick close: {curr_brick['close']:.2f}"
            current_position = "SHORT"

        # Exit Long: First 'down' brick after being 'LONG'
        elif current_position == "LONG" and curr_brick['brick_type'] == 'down':
            signal_type = "SELL"
            reason = f"Exit Long: Renko brick turned 'down'. Brick close: {curr_brick['close']:.2f}"
            current_position = "NONE"

        # Exit Short: First 'up' brick after being 'SHORT'
        elif current_position == "SHORT" and curr_brick['brick_type'] == 'up':
            signal_type = "BUY"
            reason = f"Exit Short: Renko brick turned 'up'. Brick close: {curr_brick['close']:.2f}"
            current_position = "NONE"

        elif current_position != "NONE": # If in a position and no exit signal
             reason = f"Continue {current_position} based on Renko trend."


        if signal_type != "HOLD" or (signals and signals[-1]["type"] != "HOLD") or not signals:
             if not (signal_type == "HOLD" and current_position == "NONE" and (not signals or signals[-1]["type"] == "HOLD")):
                signals.append({
                    "date": curr_brick['timestamp'],
                    "type": signal_type,
                    "price": curr_brick['close'], # Signal price at the close of the confirming brick
                    "reason": reason,
                    "brick_type": curr_brick['brick_type']
                })

    logger.info(f"Renko strategy run complete. Found {len(signals)} signals.")
    return {"signals": signals, "renko_bricks": renko_bricks_df, "brick_size_used": brick_size_used}


if __name__ == '__main__':
    logger.remove()
    logger.add(lambda msg: print(msg, end=''), colorize=True, format="<green>{time:HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="DEBUG")

    dates = pd.to_datetime([
        "2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04", "2023-01-05",
        "2023-01-06", "2023-01-07", "2023-01-08", "2023-01-09", "2023-01-10",
        "2023-01-11", "2023-01-12", "2023-01-13", "2023-01-14", "2023-01-15",
        "2023-01-16", "2023-01-17", "2023-01-18", "2023-01-19", "2023-01-20",
        "2023-01-21", "2023-01-22", "2023-01-23", "2023-01-24", "2023-01-25"
    ])
    # Sample data that should produce some Renko bricks
    price_data = [
        100, 101, 102, 103, 104, 102, 101, 100, # Down trend
        102, 104, 106, 108, 110, 108, 106,     # Up trend
        107, 108, 109, 107, 105, 103, 101, 100, 98 # Down trend again
    ]
    closes = price_data[:len(dates)]
    if len(closes) < len(dates): # Pad if needed
        closes.extend([closes[-1]] * (len(dates) - len(closes)))

    sample_df = pd.DataFrame({
        'Open': np.array(closes) - 0.5, 'High': np.array(closes) + 1.0,
        'Low': np.array(closes) - 1.0, 'Close': np.array(closes),
        'Volume': np.random.randint(100, 1000, size=len(dates))
    }, index=dates)

    logger.info("\n--- Renko with Fixed Brick Size (2.0) ---")
    if RenkoConfig != Any:
        fixed_config = RenkoConfig(brick_size_method=RenkoBrickSizeMethod.FIXED, brick_size_value=2.0)
        results_fixed = run_renko(sample_df.copy(), fixed_config)
        logger.info(f"Brick Size Used: {results_fixed['brick_size_used']}")
        logger.info(f"Signals ({len(results_fixed['signals'])}):")
        for s in results_fixed['signals']: logger.info(s)
        logger.info(f"\nRenko Bricks (first 10):")
        print(results_fixed['renko_bricks'].head(10))

        logger.info("\n--- Renko with ATR Brick Size (period 5) ---")
        atr_config = RenkoConfig(brick_size_method=RenkoBrickSizeMethod.ATR, atr_period=5) # Short ATR for example
        # Ensure enough data for ATR calculation (period + 1 for first TR)
        results_atr = run_renko(sample_df.copy().iloc[atr_config.atr_period:], atr_config) # Slice df for ATR
        logger.info(f"Brick Size Used (ATR based): {results_atr['brick_size_used']}")
        logger.info(f"Signals ({len(results_atr['signals'])}):")
        for s in results_atr['signals']: logger.info(s)
        logger.info(f"\nRenko Bricks (first 10):")
        print(results_atr['renko_bricks'].head(10))
    else:
        logger.warning("Skipping Renko examples as RenkoConfig import failed.")

```
