import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from typing import Optional, Dict, Any, List

# Module to be tested (adjust import path as necessary based on execution context)
# Assuming PYTHONPATH is set up for python-ai-services to be a top-level package,
# or tests are run from a root that allows this import.
from python_ai_services.tools.market_data_tools import (
    get_historical_price_data_tool,
    get_current_quote_tool,
    search_symbols_tool,
    HistoricalPriceRequest,
    QuoteRequest,
    SymbolSearchRequest
)
# If OpenBBObject is a real class and needed for mocking, it would be imported.
# For now, MagicMock can simulate its behavior (e.g., .to_df() method).

# --- Tests for get_historical_price_data_tool ---

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.historical')
def test_get_historical_price_data_tool_success(mock_obb_historical):
    # Arrange
    mock_df = pd.DataFrame({'close': [100, 101, 102]})
    mock_obb_result = MagicMock()
    mock_obb_result.to_df.return_value = mock_df
    mock_obb_historical.return_value = mock_obb_result
    
    symbol = "AAPL"
    start_date = "2023-01-01"
    end_date = "2023-01-03"
    
    # Act
    result_df = get_historical_price_data_tool(symbol, start_date, end_date)
    
    # Assert
    mock_obb_historical.assert_called_once_with(
        symbol=symbol, start_date=start_date, end_date=end_date, interval="1d", provider="yfinance"
    )
    pd.testing.assert_frame_equal(result_df, mock_df)

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.historical')
def test_get_historical_price_data_tool_no_data_df_empty(mock_obb_historical):
    # Arrange
    # Simulate OpenBB returning an OBBject that results in an empty DataFrame
    mock_empty_df = pd.DataFrame()
    mock_obb_result = MagicMock()
    mock_obb_result.to_df.return_value = mock_empty_df
    mock_obb_historical.return_value = mock_obb_result
    
    # Act
    result_df = get_historical_price_data_tool("MSFT", "2023-01-01", "2023-01-03")
    
    # Assert
    assert result_df is None # Tool should return None if DataFrame is empty
    mock_obb_historical.assert_called_once()

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.historical')
def test_get_historical_price_data_tool_no_obb_object_returned(mock_obb_historical):
    # Arrange
    mock_obb_historical.return_value = None # Simulate OpenBB returning None directly
    
    # Act
    result_df = get_historical_price_data_tool("MSFT", "2023-01-01", "2023-01-03")
    
    # Assert
    assert result_df is None
    mock_obb_historical.assert_called_once()


@patch('python_ai_services.tools.market_data_tools.obb.equity.price.historical')
def test_get_historical_price_data_tool_openbb_exception(mock_obb_historical):
    # Arrange
    mock_obb_historical.side_effect = Exception("OpenBB API error")
    
    # Act
    result_df = get_historical_price_data_tool("GOOG", "2023-01-01", "2023-01-03")
    
    # Assert
    assert result_df is None
    mock_obb_historical.assert_called_once()

def test_get_historical_price_data_tool_invalid_input_pydantic():
    # Test Pydantic validation within the tool (e.g., invalid date format)
    # This relies on the tool internally instantiating HistoricalPriceRequest
    # No mocking of obb needed here as it should fail before calling obb
    with patch('python_ai_services.tools.market_data_tools.obb.equity.price.historical') as mock_obb_historical_pydantic_test:
        result = get_historical_price_data_tool("TSLA", "invalid-date", "2023-01-03")
        # The tool's internal Pydantic validation should cause it to log an error and return None
        # or whatever error handling is in place. Current tool returns None on Pydantic error.
        # For this test, we expect it to return None because the HistoricalPriceRequest validation fails.
        # The actual Pydantic ValidationError is caught inside the tool and logged.
        assert result is None 
        mock_obb_historical_pydantic_test.assert_not_called() # obb should not be called

# --- Tests for get_current_quote_tool ---

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.quote')
def test_get_current_quote_tool_success_single_obbject(mock_obb_quote):
    # Arrange
    mock_quote_df = pd.DataFrame([{'last_price': 150.25, 'volume': 1000}])
    mock_obb_result = MagicMock()
    mock_obb_result.to_df.return_value = mock_quote_df
    mock_obb_quote.return_value = mock_obb_result # Simulate returning a single OBBject

    symbol = "AAPL"
    
    # Act
    result_dict = get_current_quote_tool(symbol)
    
    # Assert
    mock_obb_quote.assert_called_once_with(symbol=symbol, provider="yfinance")
    assert result_dict == {'last_price': 150.25, 'volume': 1000}

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.quote')
def test_get_current_quote_tool_success_list_of_obbjects(mock_obb_quote):
    # Arrange
    mock_quote_df = pd.DataFrame([{'last_price': 200.50, 'bid': 200.40, 'ask': 200.60}])
    mock_obb_item = MagicMock()
    mock_obb_item.to_df.return_value = mock_quote_df
    mock_obb_quote.return_value = [mock_obb_item] # Simulate returning a list containing one OBBject

    symbol = "MSFT"
    
    # Act
    result_dict = get_current_quote_tool(symbol)
    
    # Assert
    mock_obb_quote.assert_called_once_with(symbol=symbol, provider="yfinance")
    assert result_dict == {'last_price': 200.50, 'bid': 200.40, 'ask': 200.60}

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.quote')
def test_get_current_quote_tool_empty_df_from_obbject(mock_obb_quote):
    # Arrange
    mock_empty_df = pd.DataFrame()
    mock_obb_item = MagicMock()
    mock_obb_item.to_df.return_value = mock_empty_df
    # Test with single OBBject path first
    mock_obb_quote.return_value = mock_obb_item
    
    # Act
    result_dict_single = get_current_quote_tool("AMZN")
    
    # Assert
    assert result_dict_single is None

    # Test with list of OBBjects path
    mock_obb_quote.return_value = [mock_obb_item]
    result_dict_list = get_current_quote_tool("AMZN_LIST")
    assert result_dict_list is None


@patch('python_ai_services.tools.market_data_tools.obb.equity.price.quote')
def test_get_current_quote_tool_no_data_returned(mock_obb_quote):
    # Arrange
    mock_obb_quote.return_value = None # Simulate OpenBB returning None
    
    # Act
    result_dict = get_current_quote_tool("TSLA")
    
    # Assert
    assert result_dict is None
    mock_obb_quote.assert_called_once()

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.quote')
def test_get_current_quote_tool_empty_list_returned(mock_obb_quote):
    # Arrange
    mock_obb_quote.return_value = [] # Simulate OpenBB returning an empty list
    
    # Act
    result_dict = get_current_quote_tool("NVDA")
    
    # Assert
    assert result_dict is None
    mock_obb_quote.assert_called_once()

@patch('python_ai_services.tools.market_data_tools.obb.equity.price.quote')
def test_get_current_quote_tool_openbb_exception(mock_obb_quote):
    # Arrange
    mock_obb_quote.side_effect = Exception("OpenBB API error for quote")
    
    # Act
    result_dict = get_current_quote_tool("GOOG")
    
    # Assert
    assert result_dict is None
    mock_obb_quote.assert_called_once()

def test_get_current_quote_tool_invalid_input_pydantic():
    # This test implicitly checks if the tool's internal Pydantic validation of QuoteRequest
    # (if it were more complex or if input types were wrong from caller) would be caught by the general exception handler.
    # Since QuoteRequest is simple (symbol: str, provider: str), and tool signature matches,
    # a direct Pydantic validation error is less likely from valid Python calls.
    # If an error occurs during QuoteRequest instantiation, the tool's general try-except would catch it.
    # For this test, we'll assume that if Pydantic validation for QuoteRequest were to fail
    # (e.g., if provider was an invalid Literal), the tool would return None.
    # We can ensure obb is not called in such a case.
    with patch('python_ai_services.tools.market_data_tools.obb.equity.price.quote') as mock_obb_quote_pydantic:
        # To actually make Pydantic fail here, we'd need to make the tool pass invalid data to QuoteRequest.
        # Example: if the tool itself constructed the provider string incorrectly.
        # For now, this test is more of a structural placeholder unless we simulate Pydantic error directly.
        # The tool returns None if QuoteRequest(...) raises an exception.
        # If we call `get_current_quote_tool(symbol=123)`, TypeError happens before Pydantic.
        # If the tool was: `QuoteRequest(symbol=symbol, provider="invalid_provider_literal_if_defined_so")`
        # then Pydantic would fail.
        # Let's assume the current Pydantic model for QuoteRequest is too simple to easily fail from the tool's call.
        pass 


# --- Tests for search_symbols_tool ---

@patch('python_ai_services.tools.market_data_tools.obb.equity.search')
def test_search_symbols_tool_success(mock_obb_search):
    # Arrange
    # Simulate OBBjects having a model_dump() method (Pydantic v2) or to_dict()
    mock_item1_data = {'symbol': 'T1', 'name': 'TestCo One'}
    mock_item2_data = {'symbol': 'T2', 'name': 'TestCo Two'}
    
    mock_obb_item1 = MagicMock()
    # Check for model_dump first, then to_dict as fallback, common for OpenBB models
    if hasattr(mock_obb_item1, 'model_dump'):
        mock_obb_item1.model_dump.return_value = mock_item1_data
    else:
        mock_obb_item1.to_dict.return_value = mock_item1_data
    
    mock_obb_item2 = MagicMock()
    if hasattr(mock_obb_item2, 'model_dump'):
        mock_obb_item2.model_dump.return_value = mock_item2_data
    else:
        mock_obb_item2.to_dict.return_value = mock_item2_data

    mock_search_results_object = MagicMock() # This is the OBBject returned by obb.equity.search
    mock_search_results_object.results = [mock_obb_item1, mock_obb_item2] # .results is the list
    mock_obb_search.return_value = mock_search_results_object
    
    query = "TestCo"
    
    # Act
    result_list = search_symbols_tool(query)
    
    # Assert
    mock_obb_search.assert_called_once_with(query=query, provider="yfinance", is_etf=None)
    assert len(result_list) == 2
    assert result_list[0] == mock_item1_data
    assert result_list[1] == mock_item2_data

@patch('python_ai_services.tools.market_data_tools.obb.equity.search')
def test_search_symbols_tool_no_results(mock_obb_search):
    # Arrange
    mock_search_results_object = MagicMock()
    mock_search_results_object.results = [] # Empty list of results
    mock_obb_search.return_value = mock_search_results_object
    
    # Act
    result_list = search_symbols_tool("NonExistentQuery")
    
    # Assert
    assert result_list == [] # Expect empty list for no results
    mock_obb_search.assert_called_once()

@patch('python_ai_services.tools.market_data_tools.obb.equity.search')
def test_search_symbols_tool_obb_returns_none(mock_obb_search):
    # Arrange
    mock_obb_search.return_value = None # Simulate OpenBB returning None directly
    
    # Act
    result_list = search_symbols_tool("AnotherQuery")
    
    # Assert
    # The tool's logic `if data and hasattr(data, 'results') and data.results:`
    # means if `data` is None, it will evaluate to false, and the tool returns [].
    assert result_list == [] 
    mock_obb_search.assert_called_once()


@patch('python_ai_services.tools.market_data_tools.obb.equity.search')
def test_search_symbols_tool_openbb_exception(mock_obb_search):
    # Arrange
    mock_obb_search.side_effect = Exception("OpenBB API error for search")
    
    # Act
    result_list = search_symbols_tool("SearchFail")
    
    # Assert
    assert result_list is None # Expect None when an exception occurs
    mock_obb_search.assert_called_once()

def test_search_symbols_tool_invalid_input_pydantic():
    # Similar to other Pydantic input tests.
    # If SymbolSearchRequest validation fails inside the tool, it should return None
    # and not call the obb function.
    with patch('python_ai_services.tools.market_data_tools.obb.equity.search') as mock_obb_search_pydantic:
        # Example: If 'query' was constrained by Pydantic model (e.g. min_length) and tool passed invalid.
        # Currently, query is `str = Field(...)`, so it must be a string.
        # If the tool somehow constructed an invalid input for SymbolSearchRequest.
        # For now, this is a structural placeholder.
        # A more direct test would be to mock SymbolSearchRequest to raise ValidationError.
        # result = search_symbols_tool(query="") # Assuming query cannot be empty by model constraint (not currently the case)
        # For now, the Pydantic check ensures that if an error *did* occur during
        # `_ = SymbolSearchRequest(...)` in the tool, the `except Exception` would catch it.
        pass
