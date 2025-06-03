from ..models.agent_models import AgentConfigOutput, AgentRiskConfig # Used for type hint
from ..models.event_bus_models import TradeSignalEventPayload, RiskAssessmentResponseData
from ..services.agent_management_service import AgentManagementService
# from ..services.trading_data_service import TradingDataService # If portfolio context is needed for more advanced checks
from typing import Optional
from loguru import logger

class RiskManagerService:
    def __init__(self, agent_service: AgentManagementService): # Add data_service if needed
        self.agent_service = agent_service
        # self.data_service = data_service # If more complex checks like portfolio exposure are needed
        logger.info("RiskManagerService initialized.")

    async def assess_trade_risk(
        self,
        agent_id_of_proposer: str, # The agent whose config/limits apply
        trade_signal: TradeSignalEventPayload
    ) -> RiskAssessmentResponseData:
        logger.info(f"Assessing trade risk for agent {agent_id_of_proposer}, signal: {trade_signal.symbol} {trade_signal.action} Qty:{trade_signal.quantity} @ Prc:{trade_signal.price_target}")

        agent_config = await self.agent_service.get_agent(agent_id_of_proposer)
        if not agent_config:
            logger.warning(f"Risk assessment failed: Agent config for {agent_id_of_proposer} not found.")
            return RiskAssessmentResponseData(signal_approved=False, rejection_reason=f"Agent config for {agent_id_of_proposer} not found.")

        risk_params: AgentRiskConfig = agent_config.risk_config
        op_params: dict = agent_config.operational_parameters # This is a Dict

        # Ensure required signal fields are present for risk assessment
        if trade_signal.quantity is None or trade_signal.price_target is None:
            reason = "Trade signal is missing quantity or price_target, cannot assess value-based risk."
            logger.warning(f"RiskManager: {reason} for agent {agent_id_of_proposer}")
            return RiskAssessmentResponseData(signal_approved=False, rejection_reason=reason)

        # Example Check 1: Max Trade Value (using max_capital_allocation_usd as a proxy for max trade value)
        # A more specific field like 'max_trade_value_usd' or 'max_position_size_usd' would be better in AgentRiskConfig.
        # Current 'max_capital_allocation_usd' might mean total capital for the agent, not per trade.
        # For this subtask, we interpret it as max value for a single trade as per prompt.
        if risk_params.max_capital_allocation_usd > 0: # Check if this limit is even set
            trade_value_usd = trade_signal.quantity * trade_signal.price_target
            if trade_value_usd > risk_params.max_capital_allocation_usd:
                reason = f"Trade value {trade_value_usd:.2f} USD exceeds agent's max capital allocation per trade {risk_params.max_capital_allocation_usd:.2f} USD."
                logger.warning(f"RiskManager: {reason} for agent {agent_id_of_proposer}")
                return RiskAssessmentResponseData(signal_approved=False, rejection_reason=reason)

        # Example Check 2: Symbol Whitelist (from operational_parameters)
        # Example: op_params = {"allowed_symbols": ["BTC/USD", "ETH/USD"], "max_daily_trades": 10}
        allowed_symbols = op_params.get("allowed_symbols")
        if allowed_symbols and isinstance(allowed_symbols, list):
            # Assuming trade_signal.symbol is in a format like "BTC/USD" or "ETH-PERP"
            # Normalization might be needed here if formats differ (e.g. "BTC-USD" vs "BTC/USD")
            normalized_signal_symbol = trade_signal.symbol.replace("-", "/") # Basic normalization
            normalized_allowed_symbols = [s.replace("-","/") for s in allowed_symbols]

            if normalized_signal_symbol not in normalized_allowed_symbols:
                reason = f"Symbol {trade_signal.symbol} (normalized: {normalized_signal_symbol}) not in allowed list {normalized_allowed_symbols} for agent {agent_id_of_proposer}."
                logger.warning(f"RiskManager: {reason}")
                return RiskAssessmentResponseData(signal_approved=False, rejection_reason=reason)

        # Example Check 3: Risk per trade percentage (if stop_loss is provided in signal)
        # This check is more about the potential loss of *this specific trade* vs total account value.
        # This requires account value, which means TradingDataService.get_portfolio_summary().
        # For this simplified version, if not passed in, we might skip or use a placeholder.
        # The prompt did not include passing portfolio context, so this check cannot be fully implemented here
        # without fetching portfolio summary (which means adding TradingDataService as a dependency).
        # Let's assume for now this check is skipped if portfolio data isn't available.

        # if risk_params.risk_per_trade_percentage > 0 and trade_signal.stop_loss is not None:
        #    portfolio_summary = await self.data_service.get_portfolio_summary(agent_id_of_proposer)
        #    if portfolio_summary:
        #        potential_loss_per_unit = abs(trade_signal.price_target - trade_signal.stop_loss)
        #        total_potential_loss = potential_loss_per_unit * trade_signal.quantity
        #        max_allowed_loss_usd = portfolio_summary.account_value_usd * risk_params.risk_per_trade_percentage
        #        if total_potential_loss > max_allowed_loss_usd:
        #            reason = f"Potential loss {total_potential_loss:.2f} USD exceeds max allowed risk per trade ({risk_params.risk_per_trade_percentage*100}%) of account value."
        #            logger.warning(f"RiskManager: {reason} for agent {agent_id_of_proposer}")
        #            return RiskAssessmentResponseData(signal_approved=False, rejection_reason=reason)
        #    else:
        #        logger.warning(f"RiskManager: Could not perform risk_per_trade_percentage check for agent {agent_id_of_proposer} as portfolio summary was unavailable.")


        # All checks passed (or skipped)
        logger.info(f"RiskManager: Trade signal for {trade_signal.symbol} from agent {agent_id_of_proposer} approved.")
        return RiskAssessmentResponseData(signal_approved=True)

```
