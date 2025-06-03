from ..models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentUpdateRequest, AgentStatus # Added AgentStatus
# PortfolioOptimizerParams and PortfolioOptimizerRule are nested in AgentStrategyConfig
from ..models.event_bus_models import Event, MarketConditionEventPayload
from ..services.agent_management_service import AgentManagementService
from ..services.event_bus_service import EventBusService
# from ..services.performance_calculation_service import PerformanceCalculationService # For later
from typing import List, Dict, Any, Optional
from loguru import logger
from datetime import datetime, timezone

class PortfolioOptimizerService:
    def __init__(
        self,
        agent_config: AgentConfigOutput,
        agent_management_service: AgentManagementService,
        event_bus: EventBusService
        # performance_service: Optional[PerformanceCalculationService] = None # For future enhancements
    ):
        self.agent_config = agent_config
        self.agent_management_service = agent_management_service
        self.event_bus = event_bus
        # self.performance_service = performance_service

        if not self.agent_config.strategy.portfolio_optimizer_params:
            logger.warning(f"PortfolioOptimizerAgent {self.agent_config.agent_id} has no 'portfolio_optimizer_params' in its strategy. It will be passive.")
            self.params = AgentStrategyConfig.PortfolioOptimizerParams(rules=[]) # Empty rules
        else:
            self.params = self.agent_config.strategy.portfolio_optimizer_params

    async def setup_subscriptions(self):
        """
        Subscribes this optimizer agent to relevant events on the event bus.
        This should be called when the optimizer agent is activated.
        """
        if self.event_bus: # Ensure event_bus is provided
            await self.event_bus.subscribe("MarketConditionEvent", self.on_market_condition_event)
            logger.info(f"PortfolioOptimizerService ({self.agent_config.agent_id}): Subscribed to MarketConditionEvent.")
        else:
            logger.error(f"PortfolioOptimizerService ({self.agent_config.agent_id}): EventBusService not provided. Cannot setup subscriptions.")


    async def on_market_condition_event(self, event: Event):
        if not isinstance(event.payload, dict):
            logger.error(f"PortfolioOptimizer ({self.agent_config.agent_id}): Received MarketConditionEvent with non-dict payload: {event.payload}")
            return
        try:
            # It's safer to create the Pydantic model from the event payload
            market_condition = MarketConditionEventPayload(**event.payload)
        except Exception as e:
            logger.error(f"PortfolioOptimizer ({self.agent_config.agent_id}): Failed to parse MarketConditionEventPayload: {e}. Payload: {event.payload}", exc_info=True)
            return

        logger.info(f"PortfolioOptimizer ({self.agent_config.agent_id}): Processing MarketConditionEvent for symbol {market_condition.symbol}, regime: {market_condition.regime}.")

        for rule in self.params.rules:
            # Check if market regime condition matches
            if rule.if_market_regime and rule.if_market_regime == market_condition.regime:
                logger.info(f"PortfolioOptimizer ({self.agent_config.agent_id}): Rule '{rule.rule_name or 'Unnamed Rule'}' matched for regime '{market_condition.regime}' (symbol: {market_condition.symbol}).")
                await self._apply_rule_to_targets(rule, market_condition)
            # Placeholder for other condition types (e.g., performance-based)
            # elif rule.if_performance_metric and self.performance_service:
            #    pass

    async def _apply_rule_to_targets(self, rule: AgentStrategyConfig.PortfolioOptimizerRule, market_condition: MarketConditionEventPayload):
        target_agents_to_update_configs: List[AgentConfigOutput] = []
        if rule.target_agent_id:
            agent = await self.agent_management_service.get_agent(rule.target_agent_id)
            if agent:
                target_agents_to_update_configs.append(agent)
            else:
                logger.warning(f"PortfolioOptimizer ({self.agent_config.agent_id}): Rule '{rule.rule_name}' target_agent_id {rule.target_agent_id} not found.")
        elif rule.target_agent_type:
            all_agents = await self.agent_management_service.get_agents()
            for agent_in_list in all_agents:
                if agent_in_list.agent_id == self.agent_config.agent_id: # Don't let optimizer target itself
                    continue
                if agent_in_list.agent_type == rule.target_agent_type:
                    # Optional: Further filter if the agent_in_list should care about market_condition.symbol
                    # e.g. if agent_in_list.strategy.watched_symbols contains market_condition.symbol
                    target_agents_to_update_configs.append(agent_in_list)

        if not target_agents_to_update_configs:
            logger.info(f"PortfolioOptimizer ({self.agent_config.agent_id}): No target agents found for rule '{rule.rule_name}'.")
            return

        for agent_to_update in target_agents_to_update_configs:
            update_request_fields: Dict[str, Any] = {}
            log_changes: List[str] = []

            if rule.set_operational_parameters is not None:
                # Perform a merge for operational_parameters
                # Existing op_params are taken from the loaded agent_to_update config
                new_op_params = agent_to_update.operational_parameters.copy() # Start with existing
                new_op_params.update(rule.set_operational_parameters) # Merge rule changes

                if new_op_params != agent_to_update.operational_parameters: # Check if actually changed
                    update_request_fields["operational_parameters"] = new_op_params
                    log_changes.append(f"operational_parameters to {new_op_params}")

            if rule.set_is_active is not None:
                if agent_to_update.is_active != rule.set_is_active:
                    update_request_fields["is_active"] = rule.set_is_active
                    log_changes.append(f"is_active to {rule.set_is_active}")

            if update_request_fields:
                update_payload = AgentUpdateRequest(**update_request_fields)
                logger.info(f"PortfolioOptimizer ({self.agent_config.agent_id}): Applying update to agent {agent_to_update.agent_id} ('{agent_to_update.name}') due to rule '{rule.rule_name}'. Changes: {', '.join(log_changes)}")
                try:
                    await self.agent_management_service.update_agent(
                        agent_id=agent_to_update.agent_id,
                        update_data=update_payload
                    )
                except Exception as e_update:
                    logger.error(f"PortfolioOptimizer ({self.agent_config.agent_id}): Failed to update agent {agent_to_update.agent_id}: {e_update}", exc_info=True)
            else:
                logger.info(f"PortfolioOptimizer ({self.agent_config.agent_id}): No actual changes to apply to agent {agent_to_update.agent_id} ('{agent_to_update.name}') for rule '{rule.rule_name}'.")

```
