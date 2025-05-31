from typing import Optional, Dict, Any, List
from pydantic import ValidationError as PydanticValidationError # For direct validation if needed, though args_schema handles it
from loguru import logger
import json
from datetime import datetime # For TradeRiskAssessmentOutput timestamp

# Attempt to import the 'tool' decorator from crewai_tools
try:
    from crewai_tools import tool
except ImportError:
    logger.warning("crewai_tools.tool not found. Using a placeholder decorator '@tool_stub'.")
    def tool_stub(name: str, args_schema: Optional[Any] = None, description: Optional[str] = None):
        def decorator(func):
            func.tool_name = name
            func.args_schema = args_schema
            func.description = description
            logger.debug(f"Tool stub '{name}' registered with args_schema: {args_schema}, desc: {description}")
            return func
        return decorator
    tool = tool_stub

# Relative imports for models and enums
try:
    from ..models.crew_models import AssessTradeRiskArgs, TradeRiskAssessmentOutput
    from ..types.trading_types import RiskLevel, TradeAction
except ImportError as e:
    logger.critical(f"Failed to import necessary models/types for risk_assessment_tools: {e}. Tool may not function correctly.")
    # Define placeholders if imports fail for subtask execution context
    from pydantic import BaseModel, Field # Ensure BaseModel and Field are available for placeholders
    class RiskLevel: LOW="LOW"; MEDIUM="MEDIUM"; HIGH="HIGH"
    class TradeAction: BUY="BUY"; SELL="SELL"; HOLD="HOLD"; INFO="INFO"
    class AssessTradeRiskArgs(BaseModel):
        symbol: str = Field("default_symbol")
        proposed_action: str = Field(TradeAction.HOLD)
        confidence_score: Optional[float] = None
        entry_price: Optional[float] = None
        stop_loss_price: Optional[float] = None
        take_profit_price: Optional[float] = None
        quantity_or_value: Optional[float] = None # Added
        current_portfolio_value: Optional[float] = None # Added
        existing_position_size: Optional[float] = None # Added
        portfolio_context: Optional[Dict[str, Any]] = None
        market_conditions_summary: Optional[str] = None
    class TradeRiskAssessmentOutput(BaseModel):
        risk_level: str = Field(RiskLevel.MEDIUM)
        warnings: List[str] = Field(default_factory=list)
        max_potential_loss_estimate_percent: Optional[float] = None
        max_potential_loss_value: Optional[float] = None # Added
        suggested_position_size_adjustment_factor: Optional[float] = None # Added
        sanity_checks_passed: bool = True
        assessment_summary: str = Field("Default stub summary")
        timestamp: datetime = Field(default_factory=datetime.utcnow)


@tool(
    "Assess Trade Risk Tool",
    args_schema=AssessTradeRiskArgs,
    description="Assesses the risk of a proposed trading action based on its parameters, and optional market and portfolio context. Returns a structured risk assessment."
)
def assess_trade_risk_tool(
    symbol: str,
    proposed_action: str, # String input, validated by AssessTradeRiskArgs Pydantic model
    confidence_score: Optional[float] = None,
    entry_price: Optional[float] = None,
    stop_loss_price: Optional[float] = None,
    take_profit_price: Optional[float] = None,
    quantity_or_value: Optional[float] = None, # New arg
    current_portfolio_value: Optional[float] = None, # New arg
    existing_position_size: Optional[float] = None, # New arg
    portfolio_context: Optional[Dict[str, Any]] = None,
    market_conditions_summary: Optional[str] = None
) -> str:
    """
    Assesses the risk of a proposed trading action using enhanced parameters.

    Args:
        symbol: The trading symbol.
        proposed_action: The proposed trading action (string: "BUY", "SELL", "HOLD").
        confidence_score: Confidence of the proposed action (0.0 to 1.0).
        entry_price: Proposed entry price.
        stop_loss_price: Proposed stop-loss price.
        take_profit_price: Proposed take-profit price.
        quantity_or_value: Proposed quantity or monetary value of the trade.
        current_portfolio_value: Total current value of the portfolio.
        existing_position_size: Size of any existing position in the same symbol.
        portfolio_context: Additional portfolio context dictionary.
        market_conditions_summary: Text summary of current market conditions.

    Returns:
        A JSON string representing a `TradeRiskAssessmentOutput` Pydantic model.
    """
    logger.info(f"TOOL: Assessing risk for symbol '{symbol}', action '{proposed_action}', confidence {confidence_score}.")
    logger.debug(f"quantity_or_value: {quantity_or_value}, current_portfolio_value: {current_portfolio_value}, existing_position_size: {existing_position_size}")
    if portfolio_context: logger.debug(f"Portfolio context: {str(portfolio_context)[:200]}")
    if market_conditions_summary: logger.debug(f"Market conditions summary: {market_conditions_summary}")

    try:
        # Use the Pydantic model for initial validation of string action to enum
        validated_args = AssessTradeRiskArgs(
            symbol=symbol, proposed_action=proposed_action, confidence_score=confidence_score,
            entry_price=entry_price, stop_loss_price=stop_loss_price, take_profit_price=take_profit_price,
            quantity_or_value=quantity_or_value, current_portfolio_value=current_portfolio_value,
            existing_position_size=existing_position_size, portfolio_context=portfolio_context,
            market_conditions_summary=market_conditions_summary
        )
        action_enum = validated_args.proposed_action
    except PydanticValidationError as e:
        logger.error(f"TOOL: Input validation error for AssessTradeRiskArgs: {e}")
        # Return a valid TradeRiskAssessmentOutput JSON string indicating error
        err_output = TradeRiskAssessmentOutput(
            risk_level=RiskLevel.HIGH, # Default to high risk on bad input
            warnings=[f"Input validation error: {err_detail['msg']}" for err_detail in e.errors()],
            assessment_summary=f"Failed to assess risk due to input validation errors: {e.errors()[0]['msg'] if e.errors() else 'Unknown validation error'}.",
            sanity_checks_passed=False
        )
        return err_output.model_dump_json(indent=2)

    warnings: List[str] = []
    risk_level = RiskLevel.LOW
    max_loss_pct: Optional[float] = None
    max_loss_val: Optional[float] = None
    suggested_adj_factor: Optional[float] = 1.0 # Default to 1.0 (no change)
    sanity_ok = True

    trade_value: Optional[float] = None
    if quantity_or_value is not None and entry_price is not None:
        # Assuming quantity_or_value is quantity if > 0.000001 (typical minimum for crypto/stocks)
        # This is a heuristic; a dedicated 'trade_value_type' field would be better.
        if quantity_or_value > 0.000001 : # Heuristic for quantity
             trade_value = quantity_or_value * entry_price
        else: # Assume it's a monetary value directly if very small (unlikely for quantity) or if it's the only interpretation
             trade_value = quantity_or_value


    if action_enum == TradeAction.BUY:
        if entry_price is not None and stop_loss_price is not None:
            if stop_loss_price >= entry_price:
                warnings.append("Critical: Stop-loss for BUY order is at or above the entry price.")
                sanity_ok = False
            else:
                if entry_price > 0: # Avoid division by zero
                    max_loss_pct = round(((entry_price - stop_loss_price) / entry_price) * 100, 2)
                if quantity_or_value is not None: # quantity_or_value is assumed to be quantity here
                    max_loss_val = round((entry_price - stop_loss_price) * quantity_or_value, 2)
    elif action_enum == TradeAction.SELL:
        if entry_price is not None and stop_loss_price is not None:
            if stop_loss_price <= entry_price:
                warnings.append("Critical: Stop-loss for SELL order is at or below the entry price.")
                sanity_ok = False
            else:
                if entry_price > 0:
                    max_loss_pct = round(((stop_loss_price - entry_price) / entry_price) * 100, 2)
                if quantity_or_value is not None: # quantity_or_value is assumed to be quantity here
                    max_loss_val = round((stop_loss_price - entry_price) * quantity_or_value, 2)

    if max_loss_pct is not None:
        if max_loss_pct > 5.0:
            warnings.append(f"Potential loss ({max_loss_pct}%) exceeds typical threshold (5%).")
            if risk_level == RiskLevel.LOW: risk_level = RiskLevel.MEDIUM
        if max_loss_pct > 10.0: # Stricter threshold for high risk
            risk_level = RiskLevel.HIGH
            suggested_adj_factor = 0.5 # Suggest halving size

    if action_enum != TradeAction.HOLD:
        if confidence_score is not None:
            if confidence_score < 0.5:
                warnings.append("Proposed action has a very low confidence score.")
                risk_level = RiskLevel.HIGH
                suggested_adj_factor = 0.0 # Suggest avoiding trade
            elif confidence_score < 0.7:
                warnings.append("Proposed action has a moderate confidence score.")
                if risk_level == RiskLevel.LOW: risk_level = RiskLevel.MEDIUM
                if suggested_adj_factor > 0.5: suggested_adj_factor = 0.75 # Suggest slight reduction
        else:
            warnings.append("Confidence score not provided for a trade action; risk assessment less certain.")
            if risk_level == RiskLevel.LOW: risk_level = RiskLevel.MEDIUM

    if market_conditions_summary and "volatile" in market_conditions_summary.lower():
        warnings.append("Market conditions are reported as volatile, increasing uncertainty.")
        if risk_level == RiskLevel.LOW: risk_level = RiskLevel.MEDIUM
        elif risk_level == RiskLevel.MEDIUM: risk_level = RiskLevel.HIGH
        if suggested_adj_factor > 0.5: suggested_adj_factor = 0.5

    if current_portfolio_value is not None and current_portfolio_value > 0 and max_loss_val is not None:
        portfolio_risk_pct = round((max_loss_val / current_portfolio_value) * 100, 2)
        if portfolio_risk_pct > 2.0: # Max 2% of portfolio value at risk for one trade
            warnings.append(f"Potential loss ({max_loss_val}, {portfolio_risk_pct}% of portfolio) exceeds 2% portfolio risk threshold.")
            risk_level = RiskLevel.HIGH
            suggested_adj_factor = min(suggested_adj_factor if suggested_adj_factor is not None else 1.0, 0.5) # Enforce at least halving
        elif portfolio_risk_pct > 1.0:
            warnings.append(f"Potential loss ({max_loss_val}, {portfolio_risk_pct}% of portfolio) exceeds 1% portfolio risk threshold.")
            if risk_level == RiskLevel.LOW: risk_level = RiskLevel.MEDIUM
            if suggested_adj_factor > 0.75: suggested_adj_factor = 0.75

    if existing_position_size is not None and existing_position_size > 0:
        warnings.append(f"Note: An existing position of size {existing_position_size} in {symbol} will be increased.")
        # This might influence risk level or suggested size depending on diversification rules, not fully stubbed here.

    if not sanity_ok:
        risk_level = RiskLevel.HIGH
        assessment_summary = f"Trade proposal for {symbol} failed basic sanity checks (e.g., stop-loss placement). High risk."
        suggested_adj_factor = 0.0 # Avoid trade if sanity checks fail
    elif warnings:
        assessment_summary = f"Trade for {symbol} assessed with {risk_level.value} risk. Key warnings: {'; '.join(warnings[:3])}"
    else:
        assessment_summary = f"Trade for {symbol} assessed with {risk_level.value} risk. No major warnings from automated checks."

    if action_enum == TradeAction.HOLD:
        risk_level = RiskLevel.LOW
        max_loss_pct = None
        max_loss_val = None
        suggested_adj_factor = None # N/A for HOLD
        assessment_summary = f"Holding {symbol} is considered low risk. Market conditions: {market_conditions_summary or 'not specified'}."
        warnings.clear()

    output = TradeRiskAssessmentOutput(
        risk_level=risk_level,
        warnings=warnings,
        max_potential_loss_estimate_percent=max_loss_pct,
        max_potential_loss_value=max_loss_val,
        suggested_position_size_adjustment_factor=suggested_adj_factor,
        sanity_checks_passed=sanity_ok,
        assessment_summary=assessment_summary,
        timestamp=datetime.utcnow()
    )

    try:
        return output.model_dump_json(indent=2)
    except Exception as e:
        logger.error(f"TOOL: Error serializing TradeRiskAssessmentOutput to JSON for {symbol}: {e}")
        # Fallback to a simpler error JSON if model serialization fails
        return json.dumps({"error": "Failed to serialize risk assessment output.", "details": str(e)})


if __name__ == '__main__':
    logger.remove()
    logger.add(lambda msg: print(msg, end=''), colorize=True, format="<level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="INFO")

    # Example 1: BUY signal, looks reasonable
    args1_dict = {
        "symbol":"AAPL", "proposed_action":"BUY", "confidence_score":0.8, "entry_price":170.0,
        "stop_loss_price":165.0, "quantity_or_value":10, "current_portfolio_value": 50000,
        "market_conditions_summary":"Market is stable."
    }
    logger.info(f"\n--- Example 1: Reasonable BUY ({args1_dict['symbol']}) ---")
    result1_json = assess_trade_risk_tool(**args1_dict)
    logger.info(f"Risk Assessment Tool Output 1:\n{json.dumps(json.loads(result1_json), indent=2)}")

    # Example 2: SELL signal, low confidence, volatile market, large portfolio risk
    args2_dict = {
        "symbol":"TSLA", "proposed_action":"SELL", "confidence_score":0.45, "entry_price":200.0,
        "stop_loss_price":220.0, # 20 loss per share (10%)
        "quantity_or_value": 50, # Trade value 10000, potential loss 1000
        "current_portfolio_value": 20000, # Loss is 5% of portfolio
        "market_conditions_summary":"Market is extremely volatile."
    }
    logger.info(f"\n--- Example 2: Risky SELL ({args2_dict['symbol']}) ---")
    result2_json = assess_trade_risk_tool(**args2_dict)
    logger.info(f"Risk Assessment Tool Output 2:\n{json.dumps(json.loads(result2_json), indent=2)}")

    # Example 3: HOLD signal
    args3_dict = {"symbol":"MSFT", "proposed_action":"HOLD", "confidence_score":0.9}
    logger.info(f"\n--- Example 3: HOLD Action ({args3_dict['symbol']}) ---")
    result3_json = assess_trade_risk_tool(**args3_dict)
    logger.info(f"Risk Assessment Tool Output 3:\n{json.dumps(json.loads(result3_json), indent=2)}")

    # Example 4: Sanity check fail (BUY stop loss above entry)
    args4_dict = {"symbol":"GOOG", "proposed_action":"BUY", "confidence_score":0.9, "entry_price":150.0, "stop_loss_price":155.0, "quantity_or_value":10}
    logger.info(f"\n--- Example 4: Sanity Check Fail ({args4_dict['symbol']}) ---")
    result4_json = assess_trade_risk_tool(**args4_dict)
    logger.info(f"Risk Assessment Tool Output 4:\n{json.dumps(json.loads(result4_json), indent=2)}")

    # Example 5: Existing position warning
    args5_dict = {
        "symbol":"NVDA", "proposed_action":"BUY", "confidence_score":0.75, "entry_price":900.0,
        "stop_loss_price":880.0, "quantity_or_value":5, "current_portfolio_value":100000,
        "existing_position_size": 10 # Already holding 10 shares
    }
    logger.info(f"\n--- Example 5: Existing Position ({args5_dict['symbol']}) ---")
    result5_json = assess_trade_risk_tool(**args5_dict)
    logger.info(f"Risk Assessment Tool Output 5:\n{json.dumps(json.loads(result5_json), indent=2)}")
```
