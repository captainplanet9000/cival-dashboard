import pandas as pd
import numpy as np # Retain for potential future use, though not strictly needed for this version
import vectorbt as vbt
from logging import getLogger
from typing import Optional, Tuple

try:
    from openbb import obb
except ImportError:
    obb = None

logger = getLogger(__name__)

# Default parameters
DEFAULT_SHORT_WINDOW = 20 # Common short-term SMA
DEFAULT_LONG_WINDOW = 50  # Common long-term SMA

def get_sma_crossover_signals(
    symbol: str,
    start_date: str,
    end_date: str,
    short_window: int = DEFAULT_SHORT_WINDOW,
    long_window: int = DEFAULT_LONG_WINDOW,
    data_provider: str = "yfinance"
) -> Optional[pd.DataFrame]:
    logger.info(
        f"Generating SMA Crossover signals for {symbol} ({short_window}/{long_window}) "
        f"from {start_date} to {end_date} using {data_provider}"
    )

    if obb is None:
        logger.error("OpenBB SDK not available. Cannot fetch data for SMA Crossover strategy.")
        return None
    
    if not (isinstance(short_window, int) and short_window > 0):
        logger.error(f"Short SMA window must be a positive integer. Got: {short_window}")
        return None
    if not (isinstance(long_window, int) and long_window > 0):
        logger.error(f"Long SMA window must be a positive integer. Got: {long_window}")
        return None
    if short_window >= long_window:
        logger.error(f"Short SMA window ({short_window}) must be less than Long SMA window ({long_window}).")
        return None

    try:
        data_obb = obb.equity.price.historical(
            symbol=symbol, start_date=start_date, end_date=end_date, provider=data_provider, interval="1d"
        )
        if not data_obb or not hasattr(data_obb, 'to_df'):
            logger.warning(f"No data or unexpected data object returned for {symbol} from {start_date} to {end_date}")
            return None
        price_data_full = data_obb.to_df()
        if price_data_full.empty:
            logger.warning(f"No data returned (empty DataFrame) for {symbol} from {start_date} to {end_date}")
            return None
        
        rename_map = {}
        for col_map_from, col_map_to in {'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'}.items():
            if col_map_from in price_data_full.columns: rename_map[col_map_from] = col_map_to
            elif col_map_to not in price_data_full.columns and col_map_from.title() in price_data_full.columns: rename_map[col_map_from.title()] = col_map_to
        price_data_full.rename(columns=rename_map, inplace=True)

        if 'Close' not in price_data_full.columns:
            logger.error(f"DataFrame for {symbol} is missing 'Close' column. Available: {price_data_full.columns.tolist()}")
            return None
            
        # Ensure we only work with necessary columns and avoid SettingWithCopyWarning
        price_data = price_data_full[['Close']].copy() 
        
    except Exception as e:
        logger.error(f"Failed to fetch data for {symbol} using OpenBB: {e}", exc_info=True)
        return None

    if len(price_data) < long_window: # Check against original data length before dropna
        logger.warning(f"Not enough historical data ({len(price_data)} bars) for the longest SMA window ({long_window} bars).")
        return None

    try:
        # Calculate Short SMA
        # obb.technical.ma takes a Series as input.
        short_sma_df = obb.technical.ma(price_data['Close'], length=short_window, ma_type='sma')
        if not isinstance(short_sma_df, pd.DataFrame) or short_sma_df.empty or short_sma_df.columns.empty:
            logger.error(f"Short SMA calculation returned empty or invalid DataFrame for window {short_window}.")
            return None
        
        short_sma_col_name_expected = f'SMA_{short_window}'
        if short_sma_col_name_expected in short_sma_df.columns:
            price_data['short_sma'] = short_sma_df[short_sma_col_name_expected]
        elif f'close_{short_sma_col_name_expected}' in short_sma_df.columns: # Alternative common naming
             price_data['short_sma'] = short_sma_df[f'close_{short_sma_col_name_expected}']
        else: # Fallback to first column if specific names not found
            logger.warning(f"Could not find standard name '{short_sma_col_name_expected}' for short SMA. Using first column: {short_sma_df.columns[0]}")
            price_data['short_sma'] = short_sma_df.iloc[:, 0]


        # Calculate Long SMA
        long_sma_df = obb.technical.ma(price_data['Close'], length=long_window, ma_type='sma')
        if not isinstance(long_sma_df, pd.DataFrame) or long_sma_df.empty or long_sma_df.columns.empty:
            logger.error(f"Long SMA calculation returned empty or invalid DataFrame for window {long_window}.")
            return None

        long_sma_col_name_expected = f'SMA_{long_window}'
        if long_sma_col_name_expected in long_sma_df.columns:
            price_data['long_sma'] = long_sma_df[long_sma_col_name_expected]
        elif f'close_{long_sma_col_name_expected}' in long_sma_df.columns:
            price_data['long_sma'] = long_sma_df[f'close_{long_sma_col_name_expected}']
        else:
            logger.warning(f"Could not find standard name '{long_sma_col_name_expected}' for long SMA. Using first column: {long_sma_df.columns[0]}")
            price_data['long_sma'] = long_sma_df.iloc[:, 0]

        price_data.dropna(inplace=True) 

        if price_data.empty:
            logger.warning("DataFrame became empty after SMA calculations and dropna. Insufficient data for all windows.")
            return None

    except Exception as e:
        logger.error(f"Error calculating SMAs for {symbol}: {e}", exc_info=True)
        return None

    price_data['signal'] = 0 
    # Golden Cross: short_sma crosses above long_sma (Buy signal)
    golden_cross = (price_data['short_sma'].shift(1) < price_data['long_sma'].shift(1)) & \
                   (price_data['short_sma'] > price_data['long_sma'])
    price_data.loc[golden_cross, 'signal'] = 1
    
    # Death Cross: short_sma crosses below long_sma (Sell signal to close long, or open short)
    death_cross = (price_data['short_sma'].shift(1) > price_data['long_sma'].shift(1)) & \
                  (price_data['short_sma'] < price_data['long_sma'])
    price_data.loc[death_cross, 'signal'] = -1
    
    price_data['entries'] = price_data['signal'] == 1
    price_data['exits'] = price_data['signal'] == -1

    price_data.loc[price_data['entries'], 'exits'] = False # Avoid entry and exit on same bar
    
    logger.info(f"Generated {price_data['entries'].sum()} entry signals and {price_data['exits'].sum()} exit signals for {symbol}.")
    # Return only necessary columns for backtesting and analysis
    return price_data[['Close', 'short_sma', 'long_sma', 'entries', 'exits']].copy()


def run_sma_crossover_backtest(
    price_data_with_signals: pd.DataFrame,
    init_cash: float = 100000,
    size: float = 0.10, 
    commission_pct: float = 0.001,
    freq: str = 'D'
) -> Optional[vbt.Portfolio.StatsEntry]:
    if price_data_with_signals is None or not all(col in price_data_with_signals for col in ['Close', 'entries', 'exits']):
        logger.error("Price data with signals is missing required 'Close', 'entries', or 'exits' columns for SMA Crossover backtest.")
        return None
    if price_data_with_signals['entries'].sum() == 0:
        logger.warning("No entry signals found for SMA Crossover. Backtest will show no trades.")

    try:
        portfolio = vbt.Portfolio.from_signals(
            close=price_data_with_signals['Close'],
            entries=price_data_with_signals['entries'],
            exits=price_data_with_signals['exits'], 
            init_cash=init_cash,
            size=size,
            size_type='percentequity',
            fees=commission_pct,
            freq=freq 
        )
        logger.info("SMA Crossover backtest portfolio created successfully.")
        return portfolio.stats()
    except Exception as e:
        logger.error(f"Error running SMA Crossover vectorbt backtest: {e}", exc_info=True)
        return None

# Example Usage (commented out):
# if __name__ == '__main__':
#     symbol_to_test = "TSLA"
#     start_date_test = "2022-01-01"
#     end_date_test = "2023-12-31"
#     logger.info(f"--- Running SMA Crossover Refactored Example for {symbol_to_test} ---")
#     signals_df = get_sma_crossover_signals(symbol_to_test, start_date_test, end_date_test, short_window=20, long_window=50)
#     if signals_df is not None and not signals_df.empty:
#         print("\nSignals DataFrame head:")
#         print(signals_df.head(10))
#         print(f"\nTotal Entry Signals: {signals_df['entries'].sum()}")
#         print(f"Total Exit Signals: {signals_df['exits'].sum()}")
#         active_signals = signals_df[(signals_df['entries']) | (signals_df['exits'])]
#         if not active_signals.empty:
#             print("Active signal dates:")
#             print(active_signals.index)
#         
#         stats = run_sma_crossover_backtest(signals_df, freq='D') # Ensure freq matches data
#         if stats is not None:
#             print("\nBacktest Stats:")
#             print(stats)
#         
#         # Plotting example (requires plotly and graphical environment)
#         # try:
#         #     fig = signals_df[['Close', 'short_sma', 'long_sma']].vbt.plot(title=f"{symbol_to_test} SMA Crossover")
#         #     # Add entry signals
#         #     entry_points = signals_df[signals_df['entries']]
#         #     fig.add_scatter(x=entry_points.index, y=entry_points['short_sma'], mode='markers', 
#         #                     marker=dict(symbol='triangle-up', color='green', size=10), name='Entry')
#         #     # Add exit signals
#         #     exit_points = signals_df[signals_df['exits']]
#         #     fig.add_scatter(x=exit_points.index, y=exit_points['short_sma'], mode='markers', 
#         #                     marker=dict(symbol='triangle-down', color='red', size=10), name='Exit')
#         #     fig.show()
#         # except Exception as plot_e:
#         #     print(f"Plotting failed (might require graphical environment or Plotly setup): {plot_e}")
#             
#     else:
#         logger.warning("Could not generate SMA Crossover signals.")
#     logger.info(f"--- End of SMA Crossover Refactored Example for {symbol_to_test} ---")
