import pytest
import json
from typing import Dict, Any, Optional, List

from python_ai_services.tools.risk_assessment_tools import assess_trade_risk_tool
# Assuming AssessTradeRiskArgs and TradeRiskAssessmentOutput are in crew_models
from python_ai_services.models.crew_models import AssessTradeRiskArgs, TradeRiskAssessmentOutput
from python_ai_services.types.trading_types import RiskLevel, TradeAction

# --- Tests for assess_trade_risk_tool ---

def test_assess_trade_risk_tool_low_risk_buy():
    """Test with parameters indicative of a low-risk buy."""
    args_dict = {
        "symbol":"GOODCO",
        "proposed_action": TradeAction.BUY.value, # Pass string as LLM would
        "confidence_score":0.85,
        "entry_price":100.0,
        "stop_loss_price":98.0, # 2% stop loss
        "take_profit_price":110.0,
        "quantity_or_value":10, # e.g., 10 shares
        "current_portfolio_value": 50000.0,
        "existing_position_size": 0.0,
        "portfolio_context":{"max_portfolio_risk_percent": 2.0}, # Max 2% of portfolio per trade
        "market_conditions_summary":"Market is stable and trending upwards."
    }

    result_json = assess_trade_risk_tool(**args_dict)

    assert isinstance(result_json, str)
    data = json.loads(result_json)
    parsed_result = TradeRiskAssessmentOutput(**data)

    assert parsed_result.risk_level == RiskLevel.LOW
    assert not parsed_result.warnings
    assert parsed_result.sanity_checks_passed is True
    assert "low risk" in parsed_result.assessment_summary.lower()
    assert parsed_result.max_potential_loss_estimate_percent == 2.00 # (100-98)/100 * 100
    assert parsed_result.max_potential_loss_value == (100.0 - 98.0) * 10 # 2.0 * 10 = 20.0
    assert parsed_result.suggested_position_size_adjustment_factor == 1.0 # No adjustment needed

def test_assess_trade_risk_tool_high_risk_conditions():
    """Test with parameters that trigger high-risk conditions in the stub logic."""
    args_dict = {
        "symbol":"VOLCOIN",
        "proposed_action":"BUY",
        "confidence_score":0.4,
        "entry_price":50.0,
        "stop_loss_price":40.0, # 20% stop loss
        "quantity_or_value": 100, # Trade value 5000
        "current_portfolio_value": 10000, # Max loss 1000 (10% of portfolio)
        "market_conditions_summary":"Market is extremely volatile with negative news."
    }

    result_json = assess_trade_risk_tool(**args_dict)
    data = json.loads(result_json)
    parsed_result = TradeRiskAssessmentOutput(**data)

    assert parsed_result.risk_level == RiskLevel.HIGH
    assert len(parsed_result.warnings) >= 3 # Low confidence, high SL %, high portfolio risk %, volatile market
    assert any("low confidence" in w.lower() for w in parsed_result.warnings)
    assert any("volatile" in w.lower() for w in parsed_result.warnings)
    assert any("exceeds typical threshold (5%)" in w.lower() for w in parsed_result.warnings)
    assert any("exceeds 2% portfolio risk threshold" in w.lower() for w in parsed_result.warnings)
    assert parsed_result.max_potential_loss_estimate_percent == 20.0
    assert parsed_result.max_potential_loss_value == (50.0 - 40.0) * 100 # 1000
    assert parsed_result.suggested_position_size_adjustment_factor == 0.0 # Due to low confidence

def test_assess_trade_risk_tool_sanity_check_fail_buy():
    args_dict = {
        "symbol":"BADSL", "proposed_action":"BUY", "confidence_score":0.9,
        "entry_price":100.0, "stop_loss_price":105.0, "quantity_or_value":10
    }
    result_json = assess_trade_risk_tool(**args_dict)
    data = json.loads(result_json)
    parsed_result = TradeRiskAssessmentOutput(**data)

    assert parsed_result.risk_level == RiskLevel.HIGH
    assert parsed_result.sanity_checks_passed is False
    assert any("stop-loss for buy order is at or above the entry price" in w.lower() for w in parsed_result.warnings)
    assert parsed_result.suggested_position_size_adjustment_factor == 0.0

def test_assess_trade_risk_tool_sanity_check_fail_sell():
    args_dict = {
        "symbol":"BADSLSELL", "proposed_action":"SELL", "confidence_score":0.9,
        "entry_price":100.0, "stop_loss_price":95.0, "quantity_or_value":10
    }
    result_json = assess_trade_risk_tool(**args_dict)
    data = json.loads(result_json)
    parsed_result = TradeRiskAssessmentOutput(**data)

    assert parsed_result.risk_level == RiskLevel.HIGH
    assert parsed_result.sanity_checks_passed is False
    assert any("stop-loss for sell order is at or below the entry price" in w.lower() for w in parsed_result.warnings)
    assert parsed_result.suggested_position_size_adjustment_factor == 0.0

def test_assess_trade_risk_tool_hold_action():
    args_dict = {
        "symbol":"STABLECO", "proposed_action":"HOLD", "confidence_score":0.95,
        "market_conditions_summary":"Market is choppy, recommending hold."
    }
    result_json = assess_trade_risk_tool(**args_dict)
    data = json.loads(result_json)
    parsed_result = TradeRiskAssessmentOutput(**data)

    assert parsed_result.risk_level == RiskLevel.LOW
    assert not parsed_result.warnings
    assert "holding stableco is considered low risk" in parsed_result.assessment_summary.lower()
    assert parsed_result.max_potential_loss_estimate_percent is None
    assert parsed_result.max_potential_loss_value is None
    assert parsed_result.suggested_position_size_adjustment_factor is None


def test_assess_trade_risk_tool_high_portfolio_risk_triggers_adjustment():
    args_dict = {
        "symbol":"PORTFOLIORISK", "proposed_action":"BUY", "confidence_score":0.75, # Medium confidence
        "entry_price":100.0, "stop_loss_price":95.0, # 5% SL on price
        "quantity_or_value":30, # Trade value = 30 * 100 = 3000
        "current_portfolio_value":10000.0 # Potential loss = (100-95)*30 = 150. 150/10000 = 1.5% of portfolio
    }
    result_json = assess_trade_risk_tool(**args_dict)
    data = json.loads(result_json)
    parsed_result = TradeRiskAssessmentOutput(**data)
    assert parsed_result.risk_level == RiskLevel.MEDIUM # Due to 1.5% portfolio risk
    assert any("exceeds 1% portfolio risk threshold" in w.lower() for w in parsed_result.warnings)
    assert parsed_result.suggested_position_size_adjustment_factor == 0.75

    args_dict["quantity_or_value"] = 50 # Trade value = 5000, Potential loss = 250 (2.5% of portfolio)
    result_json_2 = assess_trade_risk_tool(**args_dict)
    data2 = json.loads(result_json_2)
    parsed_result_2 = TradeRiskAssessmentOutput(**data2)
    assert parsed_result_2.risk_level == RiskLevel.HIGH # Due to 2.5% portfolio risk
    assert any("exceeds 2% portfolio risk threshold" in w.lower() for w in parsed_result_2.warnings)
    assert parsed_result_2.suggested_position_size_adjustment_factor == 0.5


def test_assess_trade_risk_tool_with_existing_position():
    args_dict = {
        "symbol":"EXISTING", "proposed_action":"BUY", "confidence_score":0.8,
        "entry_price":200.0, "stop_loss_price":190.0, "quantity_or_value":5,
        "current_portfolio_value":20000.0, "existing_position_size": 10.0
    }
    result_json = assess_trade_risk_tool(**args_dict)
    data = json.loads(result_json)
    parsed_result = TradeRiskAssessmentOutput(**data)
    assert any("existing position" in w.lower() for w in parsed_result.warnings)


def test_assess_trade_risk_tool_args_schema():
    if hasattr(assess_trade_risk_tool, 'args_schema'):
        assert assess_trade_risk_tool.args_schema == AssessTradeRiskArgs
    elif hasattr(assess_trade_risk_tool, '_crew_tool_input_schema'):
         assert assess_trade_risk_tool._crew_tool_input_schema == AssessTradeRiskArgs
    else:
        pytest.skip("Tool schema attribute not found.")

def test_assess_trade_risk_tool_invalid_input_via_pydantic_schema():
    """Test that invalid input caught by Pydantic schema within the tool returns error JSON."""
    # Example: proposed_action is an invalid string not in TradeAction enum
    args_dict_invalid_action = {
        "symbol":"INVALIDACTION", "proposed_action":"MAYBEBUY", "confidence_score":0.7
    }
    result_json = assess_trade_risk_tool(**args_dict_invalid_action)
    data = json.loads(result_json)
    assert "error" in data
    assert "Invalid input arguments" in data["error"]
    assert any("Input tag 'MAYBEBUY' found using 'str_to_instance'" in detail['msg'] for detail in data["details"])


```
