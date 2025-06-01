import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from typing import Optional, Dict, Any, List

# Module to be tested
from python_ai_services.tools.technical_analysis_tools import (
    calculate_sma_tool,
    calculate_ema_tool,
    calculate_rsi_tool,
    calculate_macd_tool,
    TAIndicatorRequest # If used for validation within tools, or if testing models separately
)

# Sample DataFrame to be used as input for TA tools
@pytest.fixture
def sample_price_data() -> pd.DataFrame:
    return pd.DataFrame({
        'open': [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        'high': [10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5, 17.5, 18.5, 19.5, 20.5],
        'low': [9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5, 17.5, 18.5, 19.5],
        'close': [10.2, 11.2, 12.2, 13.2, 14.2, 15.2, 16.2, 17.2, 18.2, 19.2, 20.2],
        'volume': [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000]
    }, index=pd.to_datetime([f'2023-01-{i:02d}' for i in range(1, 12)]))

# --- Tests for calculate_sma_tool ---

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.ma')
def test_calculate_sma_tool_success(mock_obb_ma, sample_price_data):
    # Arrange
    window = 5
    mock_sma_series = pd.Series([10.0, 11.0, 12.0, 13.0, 14.0], name=f'SMA_{window}')
    mock_obb_ma.return_value = pd.DataFrame({f'SMA_{window}': mock_sma_series})

    # Act
    result_series = calculate_sma_tool(sample_price_data, window=window)

    # Assert
    mock_obb_ma.assert_called_once()
    call_args = mock_obb_ma.call_args
    pd.testing.assert_series_equal(call_args.kwargs['data'], sample_price_data['close'], check_names=False)
    assert call_args.kwargs['length'] == window
    assert call_args.kwargs['ma_type'] == 'sma'
    pd.testing.assert_series_equal(result_series, mock_sma_series)

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.ma')
def test_calculate_sma_tool_fallback_column_name(mock_obb_ma, sample_price_data):
    # Arrange: Test if it falls back to the first column if specific name not found
    window = 5
    mock_sma_series = pd.Series([10.0, 11.0, 12.0, 13.0, 14.0], name='some_other_name') # Non-standard name
    mock_obb_ma.return_value = pd.DataFrame({'some_other_name': mock_sma_series})

    # Act
    result_series = calculate_sma_tool(sample_price_data, window=window)

    # Assert
    pd.testing.assert_series_equal(result_series, mock_sma_series)


@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.ma')
def test_calculate_sma_tool_obb_returns_empty_df(mock_obb_ma, sample_price_data):
    mock_obb_ma.return_value = pd.DataFrame()
    result = calculate_sma_tool(sample_price_data, window=5)
    assert result is None

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.ma')
def test_calculate_sma_tool_obb_exception(mock_obb_ma, sample_price_data):
    mock_obb_ma.side_effect = Exception("SMA API Error")
    result = calculate_sma_tool(sample_price_data, window=5)
    assert result is None

def test_calculate_sma_tool_missing_close_column(sample_price_data):
    data_no_close = sample_price_data.drop(columns=['close'])
    result = calculate_sma_tool(data_no_close, window=5)
    assert result is None

def test_calculate_sma_tool_empty_close_column():
    empty_df = pd.DataFrame({'close': pd.Series([], dtype=float)})
    result = calculate_sma_tool(empty_df, window=5)
    assert result is None


# --- Tests for calculate_ema_tool ---

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.ma')
def test_calculate_ema_tool_success(mock_obb_ma, sample_price_data):
    window = 5
    mock_ema_series = pd.Series([10.1, 11.1, 12.1, 13.1, 14.1], name=f'EMA_{window}')
    mock_obb_ma.return_value = pd.DataFrame({f'EMA_{window}': mock_ema_series})

    result_series = calculate_ema_tool(sample_price_data, window=window)

    mock_obb_ma.assert_called_once()
    call_args = mock_obb_ma.call_args
    pd.testing.assert_series_equal(call_args.kwargs['data'], sample_price_data['close'], check_names=False)
    assert call_args.kwargs['length'] == window
    assert call_args.kwargs['ma_type'] == 'ema'
    pd.testing.assert_series_equal(result_series, mock_ema_series)

# --- Tests for calculate_rsi_tool ---

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.rsi')
def test_calculate_rsi_tool_success(mock_obb_rsi, sample_price_data):
    # Arrange
    window = 14
    mock_rsi_series = pd.Series([30, 40, 50, 60, 70], name=f'RSI_{window}')
    mock_obb_rsi.return_value = pd.DataFrame({f'RSI_{window}': mock_rsi_series})

    # Act
    result_series = calculate_rsi_tool(sample_price_data, window=window)

    # Assert
    mock_obb_rsi.assert_called_once()
    call_args = mock_obb_rsi.call_args
    pd.testing.assert_series_equal(call_args.kwargs['data'], sample_price_data['close'], check_names=False)
    assert call_args.kwargs['window'] == window
    pd.testing.assert_series_equal(result_series, mock_rsi_series)

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.rsi')
def test_calculate_rsi_tool_fallback_name_RSI(mock_obb_rsi, sample_price_data):
    window = 14
    mock_rsi_series = pd.Series([30, 40, 50, 60, 70], name='RSI') # Generic 'RSI' name
    mock_obb_rsi.return_value = pd.DataFrame({'RSI': mock_rsi_series})

    result_series = calculate_rsi_tool(sample_price_data, window=window)
    pd.testing.assert_series_equal(result_series, mock_rsi_series)


# --- Tests for calculate_macd_tool ---

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.macd')
def test_calculate_macd_tool_success(mock_obb_macd, sample_price_data):
    # Arrange
    fast_period, slow_period, signal_period = 12, 26, 9
    # Standard column names based on OpenBB's typical output for MACD
    macd_col = f'MACD_{fast_period}_{slow_period}_{signal_period}'
    hist_col = f'MACDH_{fast_period}_{slow_period}_{signal_period}' # Histogram
    signal_col = f'MACDS_{fast_period}_{slow_period}_{signal_period}' # Signal line

    mock_macd_df = pd.DataFrame({
        macd_col: [1, 1.2, 1.1],
        hist_col: [0.1, 0.15, 0.05],
        signal_col: [0.9, 1.05, 1.05]
    })
    mock_obb_macd.return_value = mock_macd_df

    # Act
    result_df = calculate_macd_tool(sample_price_data, fast_period, slow_period, signal_period)

    # Assert
    mock_obb_macd.assert_called_once()
    call_args = mock_obb_macd.call_args
    pd.testing.assert_series_equal(call_args.kwargs['data'], sample_price_data['close'], check_names=False)
    assert call_args.kwargs['fast'] == fast_period
    assert call_args.kwargs['slow'] == slow_period
    assert call_args.kwargs['signal'] == signal_period
    pd.testing.assert_frame_equal(result_df, mock_macd_df[[macd_col, hist_col, signal_col]])


@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.macd')
def test_calculate_macd_tool_obb_returns_unexpected_cols(mock_obb_macd, sample_price_data):
    # Test fallback if standard column names are not present but 3 columns are returned
    fast_period, slow_period, signal_period = 12, 26, 9
    mock_data = {
        'col1_macd': [1, 1.2, 1.1],      # Assume this is MACD line
        'col2_hist': [0.1, 0.15, 0.05],  # Assume this is Histogram
        'col3_signal': [0.9, 1.05, 1.05] # Assume this is Signal line
    }
    mock_unexpected_macd_df = pd.DataFrame(mock_data)
    mock_obb_macd.return_value = mock_unexpected_macd_df

    result_df = calculate_macd_tool(sample_price_data, fast_period, slow_period, signal_period)

    # The tool should return the first 3 columns as per its fallback logic
    pd.testing.assert_frame_equal(result_df, mock_unexpected_macd_df.iloc[:, :3])

@patch('python_ai_services.tools.technical_analysis_tools.obb.technical.macd')
def test_calculate_macd_tool_obb_returns_too_few_cols(mock_obb_macd, sample_price_data):
    # Test if fewer than 3 columns are returned (and not standard names)
    mock_unexpected_macd_df = pd.DataFrame({'MACD_custom_name_only': [1, 1.2, 1.1]})
    mock_obb_macd.return_value = mock_unexpected_macd_df

    result_df = calculate_macd_tool(sample_price_data, 12, 26, 9)
    assert result_df is None
