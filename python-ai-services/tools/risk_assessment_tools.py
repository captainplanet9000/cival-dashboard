from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from logging import getLogger
import numpy as np # For potential future use in rounding, or if specific numpy types are involved

logger = getLogger(__name__)

# --- Pydantic Models for Tool Inputs ---

class PositionSizeRequest(BaseModel):
    account_equity: float = Field(..., gt=0, description="Total current equity of the trading account.")
    risk_per_trade_percentage: float = Field(..., gt=0, lt=100, description="Maximum percentage of account equity to risk on a single trade (e.g., 1 for 1%).")
    entry_price: float = Field(..., gt=0, description="Anticipated entry price for the trade.")
    stop_loss_price: float = Field(..., gt=0, description="Price at which the trade will be exited for a loss.")
    asset_price_decimals: int = Field(default=2, ge=0, description="Number of decimal places for the asset's price (for rounding quantity).")

    @validator('stop_loss_price')
    def validate_stop_loss(cls, value, values):
        entry_price = values.get('entry_price')
        # This validation assumes that for a buy, stop_loss < entry_price, and for a sell, stop_loss > entry_price.
        # A more generic check is that they are not equal. The tool itself will handle direction.
        if entry_price is not None and value == entry_price:
            raise ValueError("Stop-loss price cannot be the same as the entry price.")
        return value

class RiskCheckRequest(BaseModel):
    potential_loss_amount: float = Field(..., gt=0, description="The calculated potential loss for a proposed trade.")
    max_acceptable_loss_per_trade: float = Field(..., gt=0, description="The predefined maximum acceptable monetary loss for any single trade.")


# --- Risk Assessment Tools ---

def calculate_position_size_tool(
    account_equity: float,
    risk_per_trade_percentage: float,
    entry_price: float,
    stop_loss_price: float,
    asset_price_decimals: int = 2
) -> Dict[str, Any]: # Changed to Dict as it always returns a dict (with error or results)
    """
    Calculates the appropriate position size based on account equity, risk percentage,
    entry price, and stop-loss price.

    Args:
        account_equity: Total equity in the account.
        risk_per_trade_percentage: Percentage of equity to risk (e.g., 1 for 1%).
        entry_price: Expected entry price of the asset.
        stop_loss_price: Price at which to exit if the trade moves adversely.
        asset_price_decimals: Number of decimal places for formatting the asset's price in logs/notes.
                             The actual position size is rounded to 8 decimal places.

    Returns:
        A dictionary containing 'position_size', 'risk_amount_per_trade', 'risk_per_share', 'notes',
        or an 'error' key if inputs are invalid.
    """
    log_entry_price_format = f",.{asset_price_decimals}f"
    log_stop_loss_price_format = f",.{asset_price_decimals}f"
    logger.info(
        f"Calculating position size: Equity ${account_equity:,.2f}, Risk {risk_per_trade_percentage}%, "
        f"Entry ${entry_price:{log_entry_price_format}}, Stop ${stop_loss_price:{log_stop_loss_price_format}}"
    )
    try:
        # Validate inputs using Pydantic model
        validated_input = PositionSizeRequest(
            account_equity=account_equity,
            risk_per_trade_percentage=risk_per_trade_percentage,
            entry_price=entry_price,
            stop_loss_price=stop_loss_price,
            asset_price_decimals=asset_price_decimals # Pass through for logging consistency
        )
    except Exception as e: # Catches Pydantic ValidationError
        logger.error(f"Invalid input for position size calculation: {e}")
        return {"error": f"Invalid input: {str(e)}"}

    # Redundant check as Pydantic validator should catch this, but kept for defense.
    if validated_input.entry_price == validated_input.stop_loss_price:
        logger.warning("Entry price and stop-loss price are identical. Cannot calculate position size.")
        return {"error": "Entry price and stop-loss price cannot be the same."}

    risk_amount_per_trade = validated_input.account_equity * (validated_input.risk_per_trade_percentage / 100.0)
    risk_per_share = abs(validated_input.entry_price - validated_input.stop_loss_price)

    if risk_per_share == 0:
        logger.warning("Risk per share is zero. Cannot calculate position size.")
        return {"error": "Risk per share is zero (entry and stop-loss are effectively the same)."}

    position_size_raw = risk_amount_per_trade / risk_per_share

    # Round position size to a fixed number of decimal places suitable for most assets.
    # This can be adjusted if different assets require different quantity precision.
    position_size_final = round(position_size_raw, 8)

    logger.info(f"Calculated position size: {position_size_final:.8f} units. Risk per trade: ${risk_amount_per_trade:,.2f}")
    return {
        "position_size": position_size_final,
        "risk_amount_per_trade": round(risk_amount_per_trade, 2),
        # risk_per_share can use more precision, aligning with asset_price_decimals + typical quote precision
        "risk_per_share": round(risk_per_share, validated_input.asset_price_decimals + 2),
        "notes": f"Position size calculated for risking {validated_input.risk_per_trade_percentage}% of equity (${risk_amount_per_trade:,.2f})."
    }


def check_trade_risk_limit_tool(
    potential_loss_amount: float,
    max_acceptable_loss_per_trade: float
) -> Dict[str, Any]:
    """
    Checks if a potential trade's loss amount is within the maximum acceptable limit.

    Args:
        potential_loss_amount: The calculated potential loss for the trade (must be positive).
        max_acceptable_loss_per_trade: The predefined maximum acceptable monetary loss per trade (must be positive).

    Returns:
        A dictionary containing 'is_within_limit' (bool) and a 'message'.
        Includes an 'error' key if inputs are invalid.
    """
    logger.info(f"Checking risk limit: Potential Loss ${potential_loss_amount:,.2f} vs Max Acceptable Loss ${max_acceptable_loss_per_trade:,.2f}")
    try:
        _ = RiskCheckRequest(
            potential_loss_amount=potential_loss_amount,
            max_acceptable_loss_per_trade=max_acceptable_loss_per_trade
        )
    except Exception as e: # Catches Pydantic ValidationError
        logger.error(f"Invalid input for risk limit check: {e}")
        return {"is_within_limit": False, "message": f"Invalid input: {str(e)}", "error": True}

    is_within_limit = potential_loss_amount <= max_acceptable_loss_per_trade

    message = ""
    if is_within_limit:
        message = f"Trade risk (${potential_loss_amount:,.2f}) is within the acceptable limit of ${max_acceptable_loss_per_trade:,.2f}."
        logger.info(message)
    else:
        message = f"Trade risk (${potential_loss_amount:,.2f}) EXCEEDS the acceptable limit of ${max_acceptable_loss_per_trade:,.2f}."
        logger.warning(message)

    return {"is_within_limit": is_within_limit, "message": message, "error": False} # Explicitly set error: False on success
