import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from loguru import logger

try:
    from ..models.strategy_models import WilliamsAlligatorConfig
except ImportError:
    logger.warning("Could not import WilliamsAlligatorConfig from ..models.strategy_models. Using Any for config type.")
    WilliamsAlligatorConfig = Any # Placeholder for type hinting if import fails


def _calculate_smma(series: pd.Series, period: int) -> pd.Series:
    """
    Calculates the Smoothed Moving Average (SMMA).
    The first value is a simple moving average (SMA).
    Subsequent values are SMMA_today = (SMMA_yesterday * (period - 1) + current_value) / period.
    Note: This SMMA implementation is a common one; variations exist.
    """
    if period <= 0:
        raise ValueError("SMMA period must be positive.")
    if len(series) < period:
        # Not enough data to calculate SMMA, return series of NaNs
        return pd.Series(np.nan, index=series.index, name=f"SMMA_{period}")

    smma = pd.Series(np.nan, index=series.index, dtype='float64')

    # Calculate initial SMA for the first possible point
    sma_initial = series.rolling(window=period, min_periods=period).mean().iloc[period-1]
    if pd.notna(sma_initial):
        smma.iloc[period-1] = sma_initial
    else: # Should not happen if len(series) >= period and no NaNs in initial window
        logger.warning(f"Could not calculate initial SMA for SMMA period {period}. Series might have NaNs at start.")
        # Attempt to find first valid SMA if series starts with NaNs
        first_valid_sma_idx = -1
        for k in range(period -1, len(series)):
            sma_k = series.iloc[k-period+1:k+1].mean()
            if pd.notna(sma_k):
                smma.iloc[k] = sma_k
                first_valid_sma_idx = k
                break
        if first_valid_sma_idx == -1: # Still couldn't find a valid SMA
            return smma # Return series of NaNs


    # Calculate subsequent SMMA values
    # Start from index where first SMMA was calculated + 1
    start_smma_calc_idx = period
    if first_valid_sma_idx != -1 and first_valid_sma_idx >= period -1 : # If previous block found a later start
        start_smma_calc_idx = first_valid_sma_idx + 1


    for i in range(start_smma_calc_idx, len(series)):
        if pd.isna(smma.iloc[i-1]) or pd.isna(series.iloc[i]): # Propagate NaN if previous SMMA or current value is NaN
            smma.iloc[i] = np.nan
            continue
        smma.iloc[i] = (smma.iloc[i-1] * (period - 1) + series.iloc[i]) / period

    smma.name = f"SMMA_{period}"
    return smma


def run_williams_alligator(ohlcv_df: pd.DataFrame, config: WilliamsAlligatorConfig) -> Dict[str, Any]:
    """
    Calculates Williams Alligator indicator lines and generates simplified trading signals.

    Args:
        ohlcv_df: Pandas DataFrame with DateTimeIndex and columns 'Open', 'High', 'Low', 'Close', 'Volume'.
        config: An instance of WilliamsAlligatorConfig.

    Returns:
        A dictionary with two keys:
        "signals": List of signals. Each signal is a dict with:
                   {"date": pd.Timestamp, "type": "BUY" | "SELL" | "HOLD",
                    "price": float, "reason": str}
        "indicator_data": The input DataFrame augmented with 'jaw', 'teeth', and 'lips' columns.
                         Returns the original DataFrame if calculations can't be performed.
    """
    signals: List[Dict[str, Any]] = []

    if ohlcv_df.empty:
        logger.warning("OHLCV DataFrame is empty. Cannot run Williams Alligator strategy.")
        return {"signals": signals, "indicator_data": ohlcv_df}

    df = ohlcv_df.copy()
    df.columns = [col.lower() for col in df.columns]
    required_cols = ['open', 'high', 'low', 'close'] # Volume not directly used by Alligator calculation itself
    if not all(col in df.columns for col in required_cols):
        logger.error(f"OHLCV DataFrame must contain columns: {required_cols}. Found: {list(df.columns)}")
        return {"signals": signals, "indicator_data": ohlcv_df}

    if not isinstance(df.index, pd.DatetimeIndex):
        logger.error("OHLCV DataFrame must have a DatetimeIndex.")
        return {"signals": signals, "indicator_data": ohlcv_df}

    # Select price source
    price_source_col = config.price_source_column.lower()
    if price_source_col == 'hlc3':
        if all(c in df.columns for c in ['high', 'low', 'close']):
            price_source_series = (df['high'] + df['low'] + df['close']) / 3
        else:
            logger.warning("hlc3 specified but H,L,C columns not all available. Defaulting to 'close'.")
            price_source_series = df['close']
    elif price_source_col in df.columns:
        price_source_series = df[price_source_col]
    else:
        logger.warning(f"Price source column '{config.price_source_column}' not found. Defaulting to 'close'.")
        price_source_series = df['close']

    price_source_series = pd.to_numeric(price_source_series, errors='coerce')
    if price_source_series.isnull().all():
        logger.error("Price source series contains all NaNs after conversion. Cannot calculate Alligator lines.")
        return {"signals": signals, "indicator_data": ohlcv_df}

    logger.info(f"Running Williams Alligator with config: {config.dict() if hasattr(config, 'dict') else config} on price source: {price_source_col}")

    # Calculate Alligator Lines
    # In a real scenario, one might prefer using a library like `pandas_ta` or `openbb_terminal.sdk`
    # e.g., df.ta.alligator(jaw_length=config.jaw_period, jaw_offset=config.jaw_shift, ...)
    # For this implementation, we use the manual SMMA.
    try:
        df['jaw'] = _calculate_smma(price_source_series, config.jaw_period).shift(config.jaw_shift)
        df['teeth'] = _calculate_smma(price_source_series, config.teeth_period).shift(config.teeth_shift)
        df['lips'] = _calculate_smma(price_source_series, config.lips_period).shift(config.lips_shift)
    except ValueError as ve: # From _calculate_smma if period is invalid (already checked by Pydantic though)
        logger.error(f"Error calculating SMMA for Alligator lines: {ve}")
        return {"signals": signals, "indicator_data": ohlcv_df}
    except Exception as e:
        logger.exception(f"Unexpected error calculating Alligator lines: {e}")
        return {"signals": signals, "indicator_data": ohlcv_df}


    # Drop initial rows where SMAs and shifts would result in NaNs for all lines
    first_valid_index_all_lines = max(
        config.jaw_period -1 + config.jaw_shift,
        config.teeth_period -1 + config.teeth_shift,
        config.lips_period -1 + config.lips_shift
    )
    # Add 1 more because SMMA's first value is at period-1, then it's shifted.
    # And we need shift(1) for comparisons. So, effectively start after first_valid_index + 1.

    df_analyzable = df.iloc[first_valid_index_all_lines:].copy() # Ensure we have data to compare previous day
    if len(df_analyzable) < 2: # Need at least 2 rows to compare current with previous
        logger.warning("Not enough data points after calculating and shifting Alligator lines to generate signals.")
        return {"signals": signals, "indicator_data": df} # Return original df with lines if analyzable part is too short

    current_position = "NONE" # "NONE", "LONG", "SHORT"

    for i in range(1, len(df_analyzable)): # Start from 1 to use .iloc[i-1] for previous state
        current_date = df_analyzable.index[i]
        current_price = df_analyzable['close'].iloc[i] # Use close for signal trigger price

        lips_curr = df_analyzable['lips'].iloc[i]
        teeth_curr = df_analyzable['teeth'].iloc[i]
        jaw_curr = df_analyzable['jaw'].iloc[i]

        lips_prev = df_analyzable['lips'].iloc[i-1]
        teeth_prev = df_analyzable['teeth'].iloc[i-1]
        jaw_prev = df_analyzable['jaw'].iloc[i-1]

        if pd.isna(lips_curr) or pd.isna(teeth_curr) or pd.isna(jaw_curr) or \
           pd.isna(lips_prev) or pd.isna(teeth_prev) or pd.isna(jaw_prev):
            # signals.append({"date": current_date, "type": "HOLD", "price": current_price, "reason": "Insufficient indicator data."})
            continue # Skip if any indicator value is NaN for current or previous period

        # Bullish Crossover (Lips > Teeth > Jaw, after being tangled or bearish)
        # "Alligator Waking Up / Eating - Bullish"
        is_bullish_alignment = lips_curr > teeth_curr and teeth_curr > jaw_curr
        was_tangled_or_bearish = not (lips_prev > teeth_prev and teeth_prev > jaw_prev) # Simplified: if not already bullishly aligned

        # Bearish Crossover (Lips < Teeth < Jaw, after being tangled or bullish)
        # "Alligator Waking Up / Eating - Bearish"
        is_bearish_alignment = lips_curr < teeth_curr and teeth_curr < jaw_curr
        was_tangled_or_bullish = not (lips_prev < teeth_prev and teeth_prev < jaw_prev) # Simplified: if not already bearishly aligned

        signal_type = "HOLD" # Default
        reason = "Alligator lines intertwined or no clear signal."

        if current_position == "NONE":
            if is_bullish_alignment and was_tangled_or_bearish:
                signal_type = "BUY"
                reason = "Alligator bullish crossover: Lips > Teeth > Jaw."
                current_position = "LONG"
            elif is_bearish_alignment and was_tangled_or_bullish:
                signal_type = "SELL" # For shorting
                reason = "Alligator bearish crossover: Lips < Teeth < Jaw."
                current_position = "SHORT"

        elif current_position == "LONG":
            # Exit Long if Lips crosses below Teeth (common exit) or full bearish alignment
            if (lips_curr < teeth_curr and lips_prev >= teeth_prev) or (is_bearish_alignment and was_tangled_or_bullish):
                signal_type = "SELL"
                reason = "Exit Long: Alligator shows bearish signal (Lips crossed Teeth or full bearish alignment)."
                current_position = "NONE"
            else: # Continue holding long
                signal_type = "HOLD"
                reason = "Continue Long: Alligator alignment still supports bullish/neutral stance."

        elif current_position == "SHORT":
            # Exit Short if Lips crosses above Teeth (common exit) or full bullish alignment
            if (lips_curr > teeth_curr and lips_prev <= teeth_prev) or (is_bullish_alignment and was_tangled_or_bearish):
                signal_type = "BUY"
                reason = "Exit Short: Alligator shows bullish signal (Lips crossed Teeth or full bullish alignment)."
                current_position = "NONE"
            else: # Continue holding short
                signal_type = "HOLD"
                reason = "Continue Short: Alligator alignment still supports bearish/neutral stance."

        # Only add signal if it's not HOLD by default, or if it's a change in position
        if signal_type != "HOLD" or (signals and signals[-1]["type"] != "HOLD") or not signals :
             # Avoid consecutive HOLD signals unless state changes.
             # The logic above ensures signal_type is BUY/SELL on change, or HOLD if no change from active pos.
             # So, we can just append if signal_type is not the default initial HOLD or it changes.
            if not (signal_type == "HOLD" and current_position == "NONE" and (not signals or signals[-1]["type"] == "HOLD")):
                 signals.append({
                    "date": current_date,
                    "type": signal_type,
                    "price": current_price,
                    "reason": reason,
                    "lips": round(lips_curr,4), "teeth": round(teeth_curr,4), "jaw": round(jaw_curr,4) # Add indicator values
                })

    logger.info(f"Williams Alligator strategy run complete. Found {len(signals)} signals.")
    return {"signals": signals, "indicator_data": df} # Return original df with added columns

if __name__ == '__main__':
    logger.remove()
    logger.add(lambda msg: print(msg, end=''), colorize=True, format="<green>{time:HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="DEBUG")

    # Create sample data
    dates = pd.date_range(start="2023-01-01", periods=100, freq="D")
    data_len = len(dates)
    price = 100 + np.cumsum(np.random.randn(data_len) * 0.5) # Random walk
    # Simulate some crossovers
    price[30:40] = price[30:40] + np.arange(10) * 0.5 # Upward trend
    price[60:70] = price[60:70] - np.arange(10) * 0.5 # Downward trend

    sample_df = pd.DataFrame({
        'Open': price - np.random.rand(data_len) * 0.2,
        'High': price + np.random.rand(data_len) * 0.5,
        'Low': price - np.random.rand(data_len) * 0.5,
        'Close': price,
        'Volume': np.random.randint(100, 1000, size=data_len)
    }, index=dates)

    default_config_dict = {
        "jaw_period": 13, "jaw_shift": 8,
        "teeth_period": 8, "teeth_shift": 5,
        "lips_period": 5, "lips_shift": 3,
        "price_source_column": "close"
    }

    if WilliamsAlligatorConfig == Any: # If import failed
        logger.warning("Using dict for WilliamsAlligatorConfig due to import failure.")
        config_instance = type('DictConfig', (), default_config_dict)() # Simple namespace
        config_instance.dict = lambda: default_config_dict
    else:
        config_instance = WilliamsAlligatorConfig(**default_config_dict)

    results = run_williams_alligator(sample_df, config_instance)
    logger.info(f"Williams Alligator Results:\nSignals ({len(results['signals'])}):")
    for s in results['signals'][-10:]: # Print last 10 signals
        logger.info(s)

    logger.info(f"\nIndicator Data (last 10 rows with Alligator lines):")
    # Ensure indicator_data is a DataFrame before calling tail
    indicator_df = results.get('indicator_data')
    if isinstance(indicator_df, pd.DataFrame):
        print(indicator_df[['close', 'lips', 'teeth', 'jaw']].tail(10))
    else:
        logger.warning(f"indicator_data is not a DataFrame: {type(indicator_df)}")

```
