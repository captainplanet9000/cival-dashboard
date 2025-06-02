import pytest
from typing import Dict, Any
from pydantic import ValidationError # For testing Pydantic validation if inputs are directly passed to models

# Module to be tested
from python_ai_services.tools.risk_assessment_tools import (
    calculate_position_size_tool,
    check_trade_risk_limit_tool,
    PositionSizeRequest, # For direct validation tests
    RiskCheckRequest     # For direct validation tests
)

# --- Tests for calculate_position_size_tool ---

def test_calculate_position_size_tool_valid_inputs_buy():
    # Arrange
    account_equity = 100000.0
    risk_per_trade_percentage = 1.0  # 1%
    entry_price = 100.0
    stop_loss_price = 98.0  # Risk $2 per share
    asset_price_decimals = 2
    
    expected_risk_amount = 1000.0  # 1% of 100,000
    expected_risk_per_share = 2.0
    expected_position_size = 500.0 # 1000 / 2
    
    # Act
    result = calculate_position_size_tool(
        account_equity, risk_per_trade_percentage, entry_price, stop_loss_price, asset_price_decimals
    )
    
    # Assert
    assert result is not None
    assert "error" not in result, f"Expected no error, got: {result.get('error')}"
    assert result["position_size"] == expected_position_size
    assert result["risk_amount_per_trade"] == expected_risk_amount
    assert result["risk_per_share"] == expected_risk_per_share
    assert "notes" in result

def test_calculate_position_size_tool_valid_inputs_sell():
    # Arrange for a short sell scenario
    account_equity = 50000.0
    risk_per_trade_percentage = 2.0  # 2%
    entry_price = 200.0 # Selling short
    stop_loss_price = 205.0 # Stop loss is above entry for short
    asset_price_decimals = 2
    
    expected_risk_amount = 1000.0 # 2% of 50,000
    expected_risk_per_share = 5.0 # abs(200 - 205)
    expected_position_size = 200.0 # 1000 / 5
    
    # Act
    result = calculate_position_size_tool(
        account_equity, risk_per_trade_percentage, entry_price, stop_loss_price, asset_price_decimals
    )
    
    # Assert
    assert result is not None
    assert "error" not in result, f"Expected no error, got: {result.get('error')}"
    assert result["position_size"] == expected_position_size
    assert result["risk_amount_per_trade"] == expected_risk_amount
    assert result["risk_per_share"] == expected_risk_per_share

def test_calculate_position_size_tool_zero_risk_per_share():
    # Entry and stop-loss are the same - Pydantic model should raise ValueError
    result = calculate_position_size_tool(10000, 1, 100, 100, 2)
    assert result is not None
    assert "error" in result
    # The Pydantic @validator in PositionSizeRequest raises "Stop-loss price cannot be the same as the entry price."
    assert "Stop-loss price cannot be the same as the entry price." in result["error"]

def test_calculate_position_size_tool_invalid_equity():
    # Pydantic model PositionSizeRequest should catch this
    with pytest.raises(ValidationError, match="Input should be greater than 0"):
        PositionSizeRequest(account_equity=0, risk_per_trade_percentage=1, entry_price=100, stop_loss_price=98, asset_price_decimals=2)
    
    # Test tool's handling if Pydantic error is caught internally
    result = calculate_position_size_tool(0, 1, 100, 98, 2)
    assert result is not None
    assert "error" in result
    assert "Input should be greater than 0" in result["error"] # Based on Pydantic gt=0 for account_equity

def test_calculate_position_size_tool_invalid_risk_percentage():
    with pytest.raises(ValidationError, match="Input should be greater than 0"):
        PositionSizeRequest(account_equity=10000, risk_per_trade_percentage=0, entry_price=100, stop_loss_price=98)
    with pytest.raises(ValidationError, match="Input should be less than 100"):
        PositionSizeRequest(account_equity=10000, risk_per_trade_percentage=100, entry_price=100, stop_loss_price=98) # lt=100 means 100 is invalid
    with pytest.raises(ValidationError, match="Input should be less than 100"):
        PositionSizeRequest(account_equity=10000, risk_per_trade_percentage=101, entry_price=100, stop_loss_price=98)
    
    result_zero = calculate_position_size_tool(10000, 0, 100, 98, 2)
    assert result_zero is not None
    assert "error" in result_zero
    assert "Input should be greater than 0" in result_zero["error"] # For risk_per_trade_percentage gt=0

    result_equal_100 = calculate_position_size_tool(10000, 100, 100, 98, 2)
    assert result_equal_100 is not None
    assert "error" in result_equal_100
    assert "Input should be less than 100" in result_equal_100["error"] # For risk_per_trade_percentage lt=100

    result_high = calculate_position_size_tool(10000, 101, 100, 98, 2)
    assert result_high is not None
    assert "error" in result_high
    assert "Input should be less than 100" in result_high["error"] 

# --- Tests for check_trade_risk_limit_tool ---

def test_check_trade_risk_limit_tool_within_limit():
    # Arrange
    potential_loss = 100.0
    max_acceptable_loss = 200.0
    
    # Act
    result = check_trade_risk_limit_tool(potential_loss, max_acceptable_loss)
    
    # Assert
    assert result is not None
    assert result["is_within_limit"] is True
    assert "is within the acceptable limit" in result["message"]
    assert result.get("error") is False


def test_check_trade_risk_limit_tool_exceeds_limit():
    # Arrange
    potential_loss = 250.0
    max_acceptable_loss = 200.0
    
    # Act
    result = check_trade_risk_limit_tool(potential_loss, max_acceptable_loss)
    
    # Assert
    assert result is not None
    assert result["is_within_limit"] is False
    assert "EXCEEDS the acceptable limit" in result["message"]
    assert result.get("error") is False


def test_check_trade_risk_limit_tool_at_limit():
    # Arrange
    potential_loss = 200.0
    max_acceptable_loss = 200.0
    
    # Act
    result = check_trade_risk_limit_tool(potential_loss, max_acceptable_loss)
    
    # Assert
    assert result is not None
    assert result["is_within_limit"] is True # Equal is considered within limit
    assert "is within the acceptable limit" in result["message"]
    assert result.get("error") is False


def test_check_trade_risk_limit_tool_invalid_inputs():
    # Test Pydantic validation via direct model instantiation
    with pytest.raises(ValidationError, match="Input should be greater than 0"): 
        RiskCheckRequest(potential_loss_amount=0, max_acceptable_loss_per_trade=100)
    with pytest.raises(ValidationError, match="Input should be greater than 0"): 
        RiskCheckRequest(potential_loss_amount=50, max_acceptable_loss_per_trade=0)

    # Test tool's error response when Pydantic validation (inside the tool) fails
    result_invalid_loss = check_trade_risk_limit_tool(0, 100)
    assert result_invalid_loss is not None
    assert result_invalid_loss["is_within_limit"] is False # Default or error state
    assert "error" in result_invalid_loss and result_invalid_loss["error"] is True
    assert "Input should be greater than 0" in result_invalid_loss["message"] # Pydantic error message

    result_invalid_max_loss = check_trade_risk_limit_tool(50, 0)
    assert result_invalid_max_loss is not None
    assert result_invalid_max_loss["is_within_limit"] is False
    assert "error" in result_invalid_max_loss and result_invalid_max_loss["error"] is True
    assert "Input should be greater than 0" in result_invalid_max_loss["message"]
