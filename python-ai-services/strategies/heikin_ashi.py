import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from loguru import logger

try:
    from ..models.strategy_models import HeikinAshiConfig
    from ..types.trading_types import TradeAction # For signal types
except ImportError:
    logger.warning("Could not import HeikinAshiConfig or TradeAction. Using Any for config/action types.")
    HeikinAshiConfig = Any
    class TradeAction: BUY="BUY"; SELL="SELL"; HOLD="HOLD" # Basic placeholder


def _calculate_heikin_ashi_candles(ohlcv_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates Heikin Ashi candle values from a standard OHLCV DataFrame.
    Assumes ohlcv_df has lowercase columns: 'open', 'high', 'low', 'close'.
    """
    if not all(col in ohlcv_df.columns for col in ['open', 'high', 'low', 'close']):
        raise ValueError("Input DataFrame for Heikin Ashi must contain 'open', 'high', 'low', 'close' columns.")

    ha_df = pd.DataFrame(index=ohlcv_df.index)

    # Heikin Ashi Close
    ha_df['ha_close'] = (ohlcv_df['open'] + ohlcv_df['high'] + ohlcv_df['low'] + ohlcv_df['close']) / 4

    # Heikin Ashi Open
    ha_df['ha_open'] = np.nan # Initialize column
    if not ohlcv_df.empty:
        ha_df.iloc[0, ha_df.columns.get_loc('ha_open')] = (ohlcv_df['open'].iloc[0] + ohlcv_df['close'].iloc[0]) / 2
        for i in range(1, len(ohlcv_df)):
            ha_df.iloc[i, ha_df.columns.get_loc('ha_open')] = \
                (ha_df.iloc[i-1, ha_df.columns.get_loc('ha_open')] + ha_df.iloc[i-1, ha_df.columns.get_loc('ha_close')]) / 2

    # Heikin Ashi High & Low
    # Ensure ha_open and ha_close are calculated before using them here
    ha_df['ha_high'] = pd.concat([ohlcv_df['high'], ha_df['ha_open'], ha_df['ha_close']], axis=1).max(axis=1)
    ha_df['ha_low'] = pd.concat([ohlcv_df['low'], ha_df['ha_open'], ha_df['ha_close']], axis=1).min(axis=1)

    # Ensure correct column order for clarity, though not strictly necessary
    return ha_df[['ha_open', 'ha_high', 'ha_low', 'ha_close']]


def run_heikin_ashi(ohlcv_df: pd.DataFrame, config: HeikinAshiConfig) -> Dict[str, Any]:
    """
    Generates trading signals based on Heikin Ashi candles.

    Args:
        ohlcv_df: Pandas DataFrame with DateTimeIndex and columns 'Open', 'High', 'Low', 'Close', 'Volume'.
        config: An instance of HeikinAshiConfig.

    Returns:
        A dictionary with two keys:
        "signals": List of signals. Each signal is a dict with:
                   {"date": pd.Timestamp, "type": "BUY" | "SELL" | "HOLD",
                    "price": float, "reason": str}
        "heikin_ashi_data": The DataFrame augmented with Heikin Ashi OHLC columns,
                            and smoothed HA columns if configured.
    """
    signals: List[Dict[str, Any]] = []

    if ohlcv_df.empty:
        logger.warning("OHLCV DataFrame is empty. Cannot run Heikin Ashi strategy.")
        return {"signals": signals, "heikin_ashi_data": ohlcv_df}

    df = ohlcv_df.copy()
    df.columns = [col.lower() for col in df.columns]
    required_cols = ['open', 'high', 'low', 'close']
    if not all(col in df.columns for col in required_cols):
        logger.error(f"OHLCV DataFrame must contain columns: {required_cols}. Found: {list(df.columns)}")
        return {"signals": signals, "heikin_ashi_data": df} # Return original df

    if not isinstance(df.index, pd.DatetimeIndex):
        logger.error("OHLCV DataFrame must have a DatetimeIndex.")
        return {"signals": signals, "heikin_ashi_data": df}

    logger.info(f"Running Heikin Ashi strategy with config: {config.dict() if hasattr(config, 'dict') else config}")

    try:
        ha_df = _calculate_heikin_ashi_candles(df)
    except Exception as e:
        logger.exception(f"Error calculating Heikin Ashi candles: {e}")
        return {"signals": signals, "heikin_ashi_data": df} # Return original df on error

    # Optionally smooth Heikin Ashi candles
    if config.price_smoothing_period is not None and config.price_smoothing_period > 0:
        logger.debug(f"Applying SMA({config.price_smoothing_period}) smoothing to Heikin Ashi candles.")
        for col in ['ha_open', 'ha_high', 'ha_low', 'ha_close']:
            if col in ha_df.columns: # Ensure column exists
                # Use rolling mean for SMA. min_periods=1 to get values even if period is not met at start.
                ha_df[f'smoothed_{col}'] = ha_df[col].rolling(window=config.price_smoothing_period, min_periods=1).mean()
        # Use smoothed columns for signal generation if available
        signal_ha_open_col = 'smoothed_ha_open' if 'smoothed_ha_open' in ha_df.columns else 'ha_open'
        signal_ha_close_col = 'smoothed_ha_close' if 'smoothed_ha_close' in ha_df.columns else 'ha_close'
        signal_ha_high_col = 'smoothed_ha_high' if 'smoothed_ha_high' in ha_df.columns else 'ha_high'
        signal_ha_low_col = 'smoothed_ha_low' if 'smoothed_ha_low' in ha_df.columns else 'ha_low'
    else:
        signal_ha_open_col, signal_ha_close_col, signal_ha_high_col, signal_ha_low_col = \
            'ha_open', 'ha_close', 'ha_high', 'ha_low'

    # Combine original OHLCV with Heikin Ashi data for the output DataFrame
    df_with_ha = df.join(ha_df)

    # Signal Generation Logic (Simplified)
    current_position = "NONE" # "NONE", "LONG", "SHORT"

    # Start iteration from where we have enough data for min_trend_candles lookback
    # and ensure all HA signal columns are not NaN
    first_valid_idx = df_with_ha[[signal_ha_open_col, signal_ha_close_col, signal_ha_high_col, signal_ha_low_col]].dropna().index.min()
    if pd.isna(first_valid_idx):
        logger.warning("No valid Heikin Ashi data points available after calculation/smoothing to generate signals.")
        return {"signals": signals, "heikin_ashi_data": df_with_ha}

    start_signal_generation_idx = df_with_ha.index.get_loc(first_valid_idx) + config.min_trend_candles -1
    if start_signal_generation_idx >= len(df_with_ha):
        logger.warning(f"Not enough data points ({len(df_with_ha)}) for Heikin Ashi signal generation with min_trend_candles={config.min_trend_candles}.")
        return {"signals": signals, "heikin_ashi_data": df_with_ha}


    for i in range(start_signal_generation_idx, len(df_with_ha)):
        current_date = df_with_ha.index[i]
        # Use original close price for signal execution price
        signal_price = df_with_ha['close'].iloc[i]

        # Current candle properties
        ha_open_curr = df_with_ha[signal_ha_open_col].iloc[i]
        ha_close_curr = df_with_ha[signal_ha_close_col].iloc[i]
        ha_high_curr = df_with_ha[signal_ha_high_col].iloc[i]
        ha_low_curr = df_with_ha[signal_ha_low_col].iloc[i]

        if pd.isna(ha_open_curr) or pd.isna(ha_close_curr) or pd.isna(ha_high_curr) or pd.isna(ha_low_curr):
            continue # Skip if essential HA data is NaN

        is_green_curr = ha_close_curr > ha_open_curr
        is_red_curr = ha_close_curr < ha_open_curr
        body_size_curr = abs(ha_close_curr - ha_open_curr)

        # Avoid division by zero if body_size is extremely small or zero
        upper_wick_curr = ha_high_curr - max(ha_open_curr, ha_close_curr)
        lower_wick_curr = min(ha_open_curr, ha_close_curr) - ha_low_curr

        is_small_upper_wick_curr = upper_wick_curr < (body_size_curr * config.small_wick_threshold_percent / 100) if body_size_curr > 1e-6 else True
        is_small_lower_wick_curr = lower_wick_curr < (body_size_curr * config.small_wick_threshold_percent / 100) if body_size_curr > 1e-6 else True


        # Trend Check: Look back for min_trend_candles
        trend_is_green = True
        trend_is_red = True
        for j in range(config.min_trend_candles):
            idx = i - j
            ha_o, ha_c = df_with_ha[signal_ha_open_col].iloc[idx], df_with_ha[signal_ha_close_col].iloc[idx]
            ha_h, ha_l = df_with_ha[signal_ha_high_col].iloc[idx], df_with_ha[signal_ha_low_col].iloc[idx]

            if pd.isna(ha_o) or pd.isna(ha_c) or pd.isna(ha_h) or pd.isna(ha_l): # Should not happen if start_signal_generation_idx is correct
                trend_is_green = trend_is_red = False; break

            body_j = abs(ha_c - ha_o)
            lw_j = min(ha_o, ha_c) - ha_l
            uw_j = ha_h - max(ha_o, ha_c)

            if not (ha_c > ha_o and (lw_j < (body_j * config.small_wick_threshold_percent / 100) if body_j > 1e-6 else True) ):
                trend_is_green = False
            if not (ha_c < ha_o and (uw_j < (body_j * config.small_wick_threshold_percent / 100) if body_j > 1e-6 else True) ):
                trend_is_red = False

        signal_type = "HOLD"
        reason = "Heikin Ashi indicates consolidation or unclear trend."

        if current_position == "NONE":
            if trend_is_green:
                signal_type = "BUY"
                reason = f"{config.min_trend_candles} consecutive green HA candles with small lower wicks."
                current_position = "LONG"
            elif trend_is_red:
                signal_type = "SELL"
                reason = f"{config.min_trend_candles} consecutive red HA candles with small upper wicks."
                current_position = "SHORT"
        elif current_position == "LONG":
            if is_red_curr or (is_green_curr and not is_small_lower_wick_curr): # Red candle or green with large lower wick
                signal_type = "SELL"
                reason = "Exit Long: Heikin Ashi turned red or showed weakening bullish trend."
                current_position = "NONE"
            else: # Continue long
                signal_type = "HOLD"
                reason = "Continue Long: Heikin Ashi trend remains bullish."
        elif current_position == "SHORT":
            if is_green_curr or (is_red_curr and not is_small_upper_wick_curr): # Green candle or red with large upper wick
                signal_type = "BUY"
                reason = "Exit Short: Heikin Ashi turned green or showed weakening bearish trend."
                current_position = "NONE"
            else: # Continue short
                signal_type = "HOLD"
                reason = "Continue Short: Heikin Ashi trend remains bearish."

        if not (signal_type == "HOLD" and current_position == "NONE" and (not signals or signals[-1]["type"] == "HOLD")):
            signals.append({
                "date": current_date, "type": signal_type, "price": signal_price, "reason": reason
            })

    logger.info(f"Heikin Ashi strategy run complete. Found {len(signals)} signals.")
    return {"signals": signals, "heikin_ashi_data": df_with_ha}


if __name__ == '__main__':
    logger.remove()
    logger.add(lambda msg: print(msg, end=''), colorize=True, format="<green>{time:HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="DEBUG")

    dates = pd.date_range(start="2023-01-01", periods=50, freq="D")
    data_len = len(dates)

    # Simulate a trend: flat -> uptrend -> flat -> downtrend -> flat
    prices = []
    p = 100
    for i in range(data_len):
        if i < 10: prices.append(p) # Flat
        elif i < 20: p += 0.5; prices.append(p) # Uptrend
        elif i < 25: prices.append(p) # Flat
        elif i < 35: p -= 0.6; prices.append(p) # Downtrend
        elif i < 40: prices.append(p) # Flat
        else: p += 0.2; prices.append(p) # Slight recovery

    sample_df = pd.DataFrame({
        'Open': np.array(prices) - np.random.rand(data_len) * 0.1,
        'High': np.array(prices) + np.random.rand(data_len) * 0.2,
        'Low': np.array(prices) - np.random.rand(data_len) * 0.2,
        'Close': np.array(prices),
        'Volume': np.random.randint(100, 1000, size=data_len)
    }, index=dates)

    logger.info("\n--- Heikin Ashi with Default Config ---")
    if HeikinAshiConfig != Any:
        default_ha_config = HeikinAshiConfig()
        results_default = run_heikin_ashi(sample_df.copy(), default_ha_config)
        logger.info(f"Signals ({len(results_default['signals'])}):")
        for s in results_default['signals']: logger.info(s)
        logger.info(f"\nHeikin Ashi Data (last 10 rows with HA candles):")
        print(results_default['heikin_ashi_data'][['close', 'ha_open', 'ha_close', 'ha_high', 'ha_low']].tail(10))

        logger.info("\n--- Heikin Ashi with Smoothing (period 3) ---")
        smoothed_ha_config = HeikinAshiConfig(price_smoothing_period=3, min_trend_candles=2)
        results_smoothed = run_heikin_ashi(sample_df.copy(), smoothed_ha_config)
        logger.info(f"Signals ({len(results_smoothed['signals'])}):")
        for s in results_smoothed['signals']: logger.info(s)
        logger.info(f"\nHeikin Ashi Data (last 10 rows with smoothed HA candles):")
        print(results_smoothed['heikin_ashi_data'][['close', 'smoothed_ha_open', 'smoothed_ha_close']].tail(10))
    else:
        logger.warning("Skipping Heikin Ashi examples as HeikinAshiConfig import failed.")

```
