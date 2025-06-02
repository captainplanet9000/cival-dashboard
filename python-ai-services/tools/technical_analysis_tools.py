from openbb import obb
import pandas as pd
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from logging import getLogger

logger = getLogger(__name__)

# --- Pydantic Models for Tool Inputs ---
class TAIndicatorRequest(BaseModel):
    data: pd.DataFrame = Field(..., description="Pandas DataFrame with 'close' prices, and optionally 'high', 'low', 'volume'.")
    # Common parameters, specific indicators might add more
    window: Optional[int] = Field(default=None, description="Lookback window period for the indicator.")
    # For multi-parameter indicators
    fast_period: Optional[int] = Field(default=None)
    slow_period: Optional[int] = Field(default=None)
    signal_period: Optional[int] = Field(default=None)

    class Config:
        arbitrary_types_allowed = True # To allow pd.DataFrame

# --- Technical Analysis Tools ---

def calculate_sma_tool(data: pd.DataFrame, window: int = 20) -> Optional[pd.Series]:
    """
    Calculates Simple Moving Average (SMA) using OpenBB.
    Args:
        data: DataFrame with a 'close' column.
        window: The window period for SMA.
    Returns:
        A Pandas Series with SMA values, or None on error.
    """
    logger.info(f"Calculating SMA with window {window}")
    if 'close' not in data.columns:
        logger.error("SMA Tool: 'close' column missing in input data.")
        return None
    if data['close'].empty:
        logger.error("SMA Tool: 'close' column is empty.")
        return None
    try:
        # obb.technical.ma requires a 'close' series directly.
        sma_df = obb.technical.ma(data['close'], length=window, ma_type='sma')
        
        if isinstance(sma_df, pd.DataFrame) and not sma_df.empty:
            # Common naming convention by OpenBB for SMA is like 'SMA_window'
            sma_col_name = f'SMA_{window}'
            if sma_col_name in sma_df.columns:
                logger.info(f"SMA calculation successful. Returning column: {sma_col_name}")
                return sma_df[sma_col_name]
            # Fallback: some providers/versions might use 'close_SMA_window' or just the first column
            elif f'close_{sma_col_name}' in sma_df.columns:
                logger.info(f"SMA calculation successful. Returning column: close_{sma_col_name}")
                return sma_df[f'close_{sma_col_name}']
            elif not sma_df.columns.empty: 
                logger.warning(f"SMA Tool: Specific column names like '{sma_col_name}' not found. Returning first column: {sma_df.columns[0]}")
                return sma_df.iloc[:, 0]
        logger.error("SMA Tool: Unexpected result format from obb.technical.ma or empty result.")
        return None
    except Exception as e:
        logger.error(f"Error calculating SMA: {e}", exc_info=True)
        return None

def calculate_ema_tool(data: pd.DataFrame, window: int = 20) -> Optional[pd.Series]:
    """
    Calculates Exponential Moving Average (EMA) using OpenBB.
    Args:
        data: DataFrame with a 'close' column.
        window: The window period for EMA.
    Returns:
        A Pandas Series with EMA values, or None on error.
    """
    logger.info(f"Calculating EMA with window {window}")
    if 'close' not in data.columns:
        logger.error("EMA Tool: 'close' column missing in input data.")
        return None
    if data['close'].empty:
        logger.error("EMA Tool: 'close' column is empty.")
        return None
    try:
        ema_df = obb.technical.ma(data['close'], length=window, ma_type='ema')
        if isinstance(ema_df, pd.DataFrame) and not ema_df.empty:
            ema_col_name = f'EMA_{window}'
            if ema_col_name in ema_df.columns:
                logger.info(f"EMA calculation successful. Returning column: {ema_col_name}")
                return ema_df[ema_col_name]
            elif f'close_{ema_col_name}' in ema_df.columns:
                logger.info(f"EMA calculation successful. Returning column: close_{ema_col_name}")
                return ema_df[f'close_{ema_col_name}']
            elif not ema_df.columns.empty:
                logger.warning(f"EMA Tool: Specific column names like '{ema_col_name}' not found. Returning first column: {ema_df.columns[0]}")
                return ema_df.iloc[:, 0]
        logger.error("EMA Tool: Unexpected result format from obb.technical.ma or empty result.")
        return None
    except Exception as e:
        logger.error(f"Error calculating EMA: {e}", exc_info=True)
        return None

def calculate_rsi_tool(data: pd.DataFrame, window: int = 14) -> Optional[pd.Series]:
    """
    Calculates Relative Strength Index (RSI) using OpenBB.
    Args:
        data: DataFrame with a 'close' column.
        window: The window period for RSI.
    Returns:
        A Pandas Series with RSI values, or None on error.
    """
    logger.info(f"Calculating RSI with window {window}")
    if 'close' not in data.columns:
        logger.error("RSI Tool: 'close' column missing in input data.")
        return None
    if data['close'].empty:
        logger.error("RSI Tool: 'close' column is empty.")
        return None
    try:
        rsi_df = obb.technical.rsi(data=data['close'], window=window)
        if isinstance(rsi_df, pd.DataFrame) and not rsi_df.empty:
            # Common naming for RSI is 'RSI_window' or just 'RSI' if window is implied by context
            rsi_col_name = f'RSI_{window}' 
            if rsi_col_name in rsi_df.columns:
                 logger.info(f"RSI calculation successful. Returning column: {rsi_col_name}")
                 return rsi_df[rsi_col_name]
            elif 'RSI' in rsi_df.columns: # Some might just name it RSI
                 logger.info(f"RSI calculation successful. Returning column: RSI")
                 return rsi_df['RSI']
            elif not rsi_df.columns.empty: 
                 logger.warning(f"RSI Tool: Column '{rsi_col_name}' or 'RSI' not found. Returning first column: {rsi_df.columns[0]}")
                 return rsi_df.iloc[:,0]
        logger.error("RSI Tool: Unexpected result format from obb.technical.rsi or empty result.")
        return None
    except Exception as e:
        logger.error(f"Error calculating RSI: {e}", exc_info=True)
        return None

def calculate_macd_tool(
    data: pd.DataFrame, 
    fast_period: int = 12, 
    slow_period: int = 26, 
    signal_period: int = 9
) -> Optional[pd.DataFrame]:
    """
    Calculates Moving Average Convergence Divergence (MACD) using OpenBB.
    Args:
        data: DataFrame with a 'close' column.
        fast_period: Fast EMA period.
        slow_period: Slow EMA period.
        signal_period: Signal line EMA period.
    Returns:
        A Pandas DataFrame with MACD, MACD Signal, and MACD Histogram, or None on error.
    """
    logger.info(f"Calculating MACD with fast={fast_period}, slow={slow_period}, signal={signal_period}")
    if 'close' not in data.columns:
        logger.error("MACD Tool: 'close' column missing in input data.")
        return None
    if data['close'].empty:
        logger.error("MACD Tool: 'close' column is empty.")
        return None
    try:
        macd_df = obb.technical.macd(
            data=data['close'], 
            fast=fast_period, 
            slow=slow_period, 
            signal=signal_period
        )
        if isinstance(macd_df, pd.DataFrame) and not macd_df.empty:
            # Expected columns: e.g., 'MACD_12_26_9', 'MACDH_12_26_9' (Histogram), 'MACDS_12_26_9' (Signal)
            # Ensure the returned DataFrame has the expected structure (at least 3 columns for MACD, signal, histogram)
            expected_cols_pattern = [f"MACD_{fast_period}_{slow_period}_{signal_period}", 
                                     f"MACDH_{fast_period}_{slow_period}_{signal_period}", 
                                     f"MACDS_{fast_period}_{slow_period}_{signal_period}"]
            
            # Check if all standard named columns are present
            if all(col in macd_df.columns for col in expected_cols_pattern):
                logger.info("MACD calculation successful with standard column names.")
                return macd_df[expected_cols_pattern]
            # Fallback: if names are different but we have at least 3 columns, return them.
            # This is a bit fragile as order is not guaranteed unless OpenBB docs specify it.
            elif macd_df.shape[1] >= 3:
                 logger.warning(f"MACD Tool: Standard column names ({expected_cols_pattern}) not found. "
                                f"Returning first 3 columns found: {list(macd_df.columns[:3])}. "
                                "Order might not be MACD, Histogram, Signal.")
                 return macd_df.iloc[:, :3] 
            else:
                 logger.error(f"MACD Tool: Did not find enough columns (expected 3) in MACD result. Columns found: {list(macd_df.columns)}")
                 return None

        logger.error("MACD Tool: Unexpected result format from obb.technical.macd or empty result.")
        return None
    except Exception as e:
        logger.error(f"Error calculating MACD: {e}", exc_info=True)
        return None
