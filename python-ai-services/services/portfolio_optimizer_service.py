from ..models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentUpdateRequest, AgentStatus # Added AgentStatus
# PortfolioOptimizerParams and PortfolioOptimizerRule are nested in AgentStrategyConfig
from ..models.event_bus_models import Event, MarketConditionEventPayload, NewsArticleEventPayload
from ..services.agent_management_service import AgentManagementService
from ..services.event_bus_service import EventBusService
from .learning_data_logger_service import LearningDataLoggerService # Added
from ..models.learning_models import LearningLogEntry # Added
# from ..services.performance_calculation_service import PerformanceCalculationService # For later
from typing import List, Dict, Any, Optional, Literal # Added Literal for _apply_rule_to_targets
from loguru import logger
from datetime import datetime, timezone

class PortfolioOptimizerService:
    def __init__(
        self,
        agent_config: AgentConfigOutput,
        agent_management_service: AgentManagementService,
        event_bus: EventBusService,
        learning_logger_service: Optional[LearningDataLoggerService] = None # Added
        # performance_service: Optional[PerformanceCalculationService] = None # For future enhancements
    ):
        self.agent_config = agent_config
        self.agent_management_service = agent_management_service
        self.event_bus = event_bus
        self.learning_logger_service = learning_logger_service # Store it
        # self.performance_service = performance_service

        if not self.agent_config.strategy.portfolio_optimizer_params:
            logger.warning(f"PO ({self.agent_config.agent_id}): Has no 'portfolio_optimizer_params'. Will be passive.")
            self.params = AgentStrategyConfig.PortfolioOptimizerParams(rules=[]) # Empty rules
        else:
            self.params = self.agent_config.strategy.portfolio_optimizer_params

        if self.learning_logger_service:
            logger.info(f"PO ({self.agent_config.agent_id}): LearningDataLoggerService: Available")
        else:
            logger.warning(f"PO ({self.agent_config.agent_id}): LearningDataLoggerService: Not Available. Learning logs will be skipped.")

    async def _log_learning_event(
        self,
        event_type: str,
        data_snapshot: Dict,
        outcome: Optional[Dict] = None,
        triggering_event_id: Optional[str] = None,
        notes: Optional[str] = None,
        tags: Optional[List[str]] = None
    ):
        if self.learning_logger_service:
            entry = LearningLogEntry(
                primary_agent_id=self.agent_config.agent_id, # PO's own ID
                source_service=self.__class__.__name__, # PortfolioOptimizerService
                event_type=event_type,
                triggering_event_id=triggering_event_id,
                data_snapshot=data_snapshot,
                outcome_or_result=outcome,
                notes=notes,
                tags=tags if tags else []
            )
            await self.learning_logger_service.log_entry(entry)

    async def setup_subscriptions(self):
        """
        Subscribes this optimizer agent to relevant events on the event bus.
        This should be called when the optimizer agent is activated.
        """
        if self.event_bus: # Ensure event_bus is provided
            await self.event_bus.subscribe("MarketConditionEvent", self.on_market_condition_event)
            await self.event_bus.subscribe("NewsArticleEvent", self.on_news_article_event) # Added
            logger.info(f"PortfolioOptimizerService ({self.agent_config.agent_id}): Subscribed to MarketConditionEvent and NewsArticleEvent.")
        else:
            logger.error(f"PortfolioOptimizerService ({self.agent_config.agent_id}): EventBusService not provided. Cannot setup subscriptions.")

    async def on_market_condition_event(self, event: Event):
        if not isinstance(event.payload, dict):
            logger.error(f"PO ({self.agent_config.agent_id}): Received MarketConditionEvent with non-dict payload: {event.payload}")
            return
        try:
            market_condition = MarketConditionEventPayload(**event.payload)
        except Exception as e:
            logger.error(f"PO ({self.agent_config.agent_id}): Failed to parse MarketConditionEventPayload: {e}. Payload: {event.payload}", exc_info=True)
            return

        logger.info(f"PO ({self.agent_config.agent_id}): Processing MarketConditionEvent for symbol {market_condition.symbol}, regime: {market_condition.regime}.")

        for rule in self.params.rules:
            if rule.if_market_regime and rule.if_market_regime == market_condition.regime:
                logger.info(f"PO ({self.agent_config.agent_id}): Rule '{rule.rule_name or 'Unnamed Rule'}' matched for regime '{market_condition.regime}' (symbol: {market_condition.symbol}).")
                await self._log_learning_event(
                    event_type="OptimizerRuleMatched",
                    data_snapshot={"rule": rule.model_dump(), "triggering_event_payload": event.payload},
                    triggering_event_id=event.event_id,
                    notes=f"Market condition rule matched for symbol {market_condition.symbol}."
                )
                await self._apply_rule_to_targets(rule, event_context=market_condition, event_type="market_condition", trigger_event_id=event.event_id)

    async def on_news_article_event(self, event: Event):
        if not isinstance(event.payload, dict):
            logger.error(f"PO ({self.agent_config.agent_id}): Received NewsArticleEvent with non-dict payload: {event.payload}")
            return
        try:
            news_payload = NewsArticleEventPayload(**event.payload)
        except Exception as e:
            logger.error(f"PO ({self.agent_config.agent_id}): Failed to parse NewsArticleEventPayload: {e}. Payload: {event.payload}", exc_info=True)
            return

        logger.info(f"PO ({self.agent_config.agent_id}): Processing NewsArticleEvent for symbols {news_payload.mentioned_symbols}, sentiment: {news_payload.sentiment_label}.")

        for rule in self.params.rules:
            if rule.if_news_sentiment_is and rule.if_news_sentiment_is == news_payload.sentiment_label:
                logger.info(f"PO ({self.agent_config.agent_id}): Rule '{rule.rule_name or 'Unnamed Rule'}' matched for news sentiment {news_payload.sentiment_label}.")
                await self._log_learning_event(
                    event_type="OptimizerRuleMatched",
                    data_snapshot={"rule": rule.model_dump(), "triggering_event_payload": event.payload},
                    triggering_event_id=event.event_id,
                    notes=f"News sentiment rule matched for symbols {news_payload.mentioned_symbols}."
                )
                await self._apply_rule_to_targets(rule, event_context=news_payload, event_type="news", trigger_event_id=event.event_id)

    async def _apply_rule_to_targets(self, rule: AgentStrategyConfig.PortfolioOptimizerRule, event_context: Any, event_type: Literal["market_condition", "news"], trigger_event_id: Optional[str] = None):
        target_agents_configs: List[AgentConfigOutput] = []
        # Log initial state for this rule application attempt
        initial_target_info = {"target_agent_id": rule.target_agent_id, "target_agent_type": rule.target_agent_type}

        if rule.target_agent_id:
            agent_conf = await self.agent_management_service.get_agent(rule.target_agent_id)
            if agent_conf:
                if agent_conf.agent_id == self.agent_config.agent_id: # Don't let optimizer target itself
                    logger.debug(f"PO ({self.agent_config.agent_id}): Rule '{rule.rule_name}' targeted self. Skipping.")
                else:
                    target_agents_configs.append(agent_conf)
            else:
                logger.warning(f"PO ({self.agent_config.agent_id}): Rule '{rule.rule_name}' target_agent_id {rule.target_agent_id} not found.")
        elif rule.target_agent_type:
            all_agents = await self.agent_management_service.get_agents()
            target_agents_configs = [
                agent for agent in all_agents
                if agent.agent_type == rule.target_agent_type and agent.agent_id != self.agent_config.agent_id
            ]

        final_target_agents: List[AgentConfigOutput] = []
        if event_type == "news" and isinstance(event_context, NewsArticleEventPayload):
            news_payload: NewsArticleEventPayload = event_context
            if not news_payload.mentioned_symbols: # If news mentions no specific symbols, rule applies to all targets
                logger.debug(f"PO ({self.agent_config.agent_id}): Rule '{rule.rule_name}' for news event has no specific symbols in event; applying to all initially targeted agents.")
                final_target_agents = target_agents_configs
            else:
                for agent_cfg in target_agents_configs:
                    # Agent must have watched_symbols and there must be an intersection
                    if agent_cfg.strategy.watched_symbols and \
                       any(sym in news_payload.mentioned_symbols for sym in agent_cfg.strategy.watched_symbols):
                        final_target_agents.append(agent_cfg)
                if target_agents_configs and not final_target_agents: # Log if initial targets existed but none matched symbols
                    logger.debug(f"PO ({self.agent_config.agent_id}): Rule '{rule.rule_name}' for news event targeted agents, but none watch the mentioned symbols: {news_payload.mentioned_symbols}")

        elif event_type == "market_condition" and isinstance(event_context, MarketConditionEventPayload):
            # Previous logic: applies to all targets of type/ID.
            # Could be enhanced to check if agent watches event_context.symbol (e.g. market_condition.symbol)
            # For now, keeping original behavior for market_condition events.
            final_target_agents = target_agents_configs
        else: # Should not happen if called correctly
            logger.warning(f"PO ({self.agent_config.agent_id}): _apply_rule_to_targets called with unknown event_type '{event_type}' or mismatched context. Applying to all initial targets.")
            final_target_agents = target_agents_configs

        if not final_target_agents:
            logger.info(f"PO ({self.agent_config.agent_id}): No final target agents to apply rule '{rule.rule_name}' for {event_type} event.")
            return

        for agent_to_update in final_target_agents: # Iterate over final_target_agents
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
                update_snapshot = {"target_agent_id": agent_to_update.agent_id, "update_payload": update_payload.model_dump(exclude_none=True), "triggering_rule_id": rule.rule_id}
                await self._log_learning_event(
                    event_type="OptimizerAgentConfigUpdateAttempt",
                    data_snapshot=update_snapshot,
                    triggering_event_id=trigger_event_id, # Pass original event ID
                    notes=f"Attempting to apply rule '{rule.rule_name}' to agent {agent_to_update.agent_id}."
                )
                logger.info(f"PO ({self.agent_config.agent_id}): Applying update to agent {agent_to_update.agent_id} ('{agent_to_update.name}') due to rule '{rule.rule_name}'. Changes: {', '.join(log_changes)}")
                try:
                    await self.agent_management_service.update_agent(
                        agent_id=agent_to_update.agent_id,
                        update_data=update_payload
                    )
                    await self._log_learning_event(
                        event_type="OptimizerAgentConfigUpdateResult",
                        data_snapshot=update_snapshot,
                        outcome={"success": True, "updated_agent_id": agent_to_update.agent_id},
                        triggering_event_id=trigger_event_id,
                        notes=f"Successfully applied rule '{rule.rule_name}' to agent {agent_to_update.agent_id}."
                    )
                except Exception as e_update:
                    logger.error(f"PO ({self.agent_config.agent_id}): Failed to update agent {agent_to_update.agent_id}: {e_update}", exc_info=True)
                    await self._log_learning_event(
                        event_type="OptimizerAgentConfigUpdateResult",
                        data_snapshot=update_snapshot,
                        outcome={"success": False, "error": str(e_update), "target_agent_id": agent_to_update.agent_id},
                        triggering_event_id=trigger_event_id,
                        notes=f"Failed to apply rule '{rule.rule_name}' to agent {agent_to_update.agent_id}."
                    )
            else:
                logger.info(f"PO ({self.agent_config.agent_id}): No actual changes to apply to agent {agent_to_update.agent_id} ('{agent_to_update.name}') for rule '{rule.rule_name}'.")
                # Optionally log that no update was needed
                await self._log_learning_event(
                    event_type="OptimizerAgentConfigUpdateSkipped",
                    data_snapshot={"target_agent_id": agent_to_update.agent_id, "triggering_rule_id": rule.rule_id, "reason": "No effective changes specified by rule."},
                    triggering_event_id=trigger_event_id,
                    notes=f"No effective changes to apply for rule '{rule.rule_name}' to agent {agent_to_update.agent_id}."
                )

```
