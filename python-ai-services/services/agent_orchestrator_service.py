from ..services.agent_management_service import AgentManagementService
from ..services.trading_coordinator import TradingCoordinator
from ..services.hyperliquid_execution_service import HyperliquidExecutionService
from ..services.simulated_trade_executor import SimulatedTradeExecutor
from ..models.agent_models import AgentConfigOutput
from ..models.api_models import TradingAnalysisCrewRequest
from ..utils.google_sdk_bridge import GoogleSDKBridge
from ..utils.a2a_protocol import A2AProtocol
from typing import Callable, Optional, Any, Dict, List
from loguru import logger
import asyncio
from unittest.mock import MagicMock # For default mock dependencies

class AgentOrchestratorService:
    def __init__(
        self,
        agent_service: AgentManagementService,
        google_bridge: Optional[GoogleSDKBridge] = None,
        a2a_protocol: Optional[A2AProtocol] = None,
        simulated_trade_executor: Optional[SimulatedTradeExecutor] = None,
        hles_factory: Optional[Callable[[str], Optional[HyperliquidExecutionService]]] = None
    ):
        self.agent_service = agent_service
        self.google_bridge = google_bridge if google_bridge else MagicMock(spec=GoogleSDKBridge)
        self.a2a_protocol = a2a_protocol if a2a_protocol else MagicMock(spec=A2AProtocol)
        self.simulated_trade_executor = simulated_trade_executor if simulated_trade_executor else MagicMock(spec=SimulatedTradeExecutor)

        if hles_factory:
            self.hles_factory = hles_factory
        else:
            # Default factory returns None, ensuring no live HLES if not properly configured
            def default_factory(cred_id: str) -> Optional[HyperliquidExecutionService]:
                logger.warning(f"Default HLES factory called for cred_id {cred_id}: HLES not configured. Returning None.")
                return None
            self.hles_factory = default_factory

        logger.info("AgentOrchestratorService initialized.")

    async def _get_trading_coordinator_for_agent(self, agent_config: AgentConfigOutput) -> Optional[TradingCoordinator]:
        logger.debug(f"Getting TradingCoordinator for agent: {agent_config.agent_id} ({agent_config.name})")
        hles_instance: Optional[HyperliquidExecutionService] = None

        if agent_config.execution_provider == "hyperliquid":
            if self.hles_factory and agent_config.hyperliquid_credentials_id:
                try:
                    # The factory is responsible for creating HLES with actual credentials
                    hles_instance = self.hles_factory(agent_config.hyperliquid_credentials_id)
                    if not hles_instance:
                        logger.error(f"HLES factory returned None for agent {agent_config.agent_id} with cred_id {agent_config.hyperliquid_credentials_id}.")
                        return None
                    logger.info(f"Successfully obtained HyperliquidExecutionService instance for agent {agent_config.agent_id}.")
                except Exception as e:
                    logger.error(f"Error creating HyperliquidExecutionService via factory for agent {agent_config.agent_id}: {e}", exc_info=True)
                    return None
            else:
                logger.error(f"Agent {agent_config.agent_id} configured for Hyperliquid but HLES factory or credentials_id is missing.")
                return None

        # Ensure simulated_trade_executor is available if paper trading or if HLES fails and paper is fallback (not current logic)
        # For "paper" mode, simulated_trade_executor must be provided at Orchestrator init.
        if agent_config.execution_provider == "paper" and not self.simulated_trade_executor:
             logger.error(f"Agent {agent_config.agent_id} configured for paper trading, but SimulatedTradeExecutor not available in Orchestrator.")
             return None


        try:
            # Pass the potentially None hles_instance to TradingCoordinator
            # TradingCoordinator's init should handle hles_instance being None if mode is paper
            coordinator = TradingCoordinator(
                google_bridge=self.google_bridge,
                a2a_protocol=self.a2a_protocol,
                simulated_trade_executor=self.simulated_trade_executor, # Must be present for paper, can be present for HL
                hyperliquid_execution_service=hles_instance # This will be None for paper mode
            )
            # Set trade execution mode on the coordinator instance
            await coordinator.set_trade_execution_mode(agent_config.execution_provider)
            logger.debug(f"TradingCoordinator instantiated for agent {agent_config.agent_id} in '{agent_config.execution_provider}' mode.")
            return coordinator
        except Exception as e:
            logger.error(f"Failed to instantiate TradingCoordinator for agent {agent_config.agent_id}: {e}", exc_info=True)
            return None

    async def run_single_agent_cycle(self, agent_id: str):
        logger.info(f"Starting single agent cycle for agent_id: {agent_id}")
        agent_config = await self.agent_service.get_agent(agent_id)

        if not agent_config:
            logger.warning(f"Agent {agent_id} not found. Skipping cycle.")
            return
        if not agent_config.is_active:
            logger.info(f"Agent {agent_id} ({agent_config.name}) is not active. Skipping cycle.")
            return

        logger.info(f"Running cycle for active agent: {agent_config.name} (ID: {agent_id})")
        trading_coordinator = await self._get_trading_coordinator_for_agent(agent_config)
        if not trading_coordinator:
            logger.error(f"Failed to get TradingCoordinator for agent {agent_id}. Skipping analysis cycle.")
            # Update heartbeat even if TC fails, to show orchestrator tried
            await self.agent_service.update_agent_heartbeat(agent_id)
            return

        symbols_to_watch = agent_config.strategy.watched_symbols
        if not symbols_to_watch:
            # Fallback to a default symbol or skip if none defined
            # For now, let's assume if watched_symbols is empty, we might use a placeholder or log.
            # Or, as per prompt, "a default if empty" - let's define a placeholder if none.
            # This behavior might need refinement based on product decision.
            # For this implementation, if empty, we log and do nothing.
            logger.info(f"Agent {agent_id} ({agent_config.name}) has no watched_symbols defined. No analysis will be run.")
        else:
            for symbol in symbols_to_watch:
                event_description = agent_config.strategy.default_market_event_description.format(symbol=symbol)
                additional_context = agent_config.strategy.default_additional_context

                crew_request = TradingAnalysisCrewRequest(
                    symbol=symbol,
                    market_event_description=event_description,
                    additional_context=additional_context,
                    user_id=agent_id # Pass agent_id as user_id for crew context
                )

                logger.info(f"Initiating trading analysis for agent {agent_id} on symbol {symbol}. Request: {crew_request.model_dump_json(indent=2)}")
                try:
                    # analyze_trading_opportunity handles its own result parsing and trade execution calls
                    analysis_result = await trading_coordinator.analyze_trading_opportunity(crew_request)
                    logger.info(f"Trading analysis completed for agent {agent_id}, symbol {symbol}. Result snippet: {str(analysis_result)[:200]}")
                except Exception as e:
                    logger.error(f"Error during trading analysis for agent {agent_id}, symbol {symbol}: {e}", exc_info=True)

        # Update heartbeat after cycle completion (or attempt)
        heartbeat_updated = await self.agent_service.update_agent_heartbeat(agent_id)
        logger.info(f"Heartbeat update for agent {agent_id}: {'Success' if heartbeat_updated else 'Failed'}")
        logger.info(f"Agent cycle finished for agent_id: {agent_id}")


    async def run_all_active_agents_once(self):
        logger.info("Starting run_all_active_agents_once cycle.")
        all_agents = await self.agent_service.get_agents()
        active_agents = [agent for agent in all_agents if agent.is_active]

        if not active_agents:
            logger.info("No active agents found to run.")
            return

        logger.info(f"Found {len(active_agents)} active agents to run.")

        tasks = [self.run_single_agent_cycle(agent.agent_id) for agent in active_agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for agent, result in zip(active_agents, results):
            if isinstance(result, Exception):
                logger.error(f"Exception during agent cycle for {agent.agent_id} ({agent.name}): {result}", exc_info=result)
            else:
                logger.info(f"Successfully completed agent cycle for {agent.agent_id} ({agent.name}).")
        logger.info("Finished run_all_active_agents_once cycle.")

```
