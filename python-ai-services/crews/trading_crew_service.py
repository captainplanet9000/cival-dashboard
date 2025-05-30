import os
import json
from copy import deepcopy
from typing import Any, Dict, Optional
from loguru import logger
from pydantic import BaseModel, Field as PydanticField, ValidationError as PydanticValidationError

from crewai import Crew, Process

# Attempt to import definitions from the same package/sub-packages
try:
    from .trading_crew_definitions import (
        market_analyst_agent,
        strategy_agent,
        trade_advisor_agent,
        market_analysis_task,
        strategy_application_task,
        trade_decision_task
    )
    from ..types.trading_types import TradingDecision  # Expected final output
    from ..main import LLMConfig # Importing LLMConfig from main.py where it's defined
                                 # Ideally, LLMConfig would be in a shared models file.
except ImportError as e:
    logger.error(f"Error importing crew definitions or types: {e}. Ensure PYTHONPATH is set correctly or run as part of a package.")
    # Define fallback placeholders if imports fail, to allow basic structure testing
    class TradingDecision(BaseModel): pass
    class LLMConfig(BaseModel): model_name: str; api_key_env_var: Optional[str]; parameters: Dict = {}
    # Agent/Task placeholders would be complex; better to ensure imports work in real env.
    # For now, if these fail, the service won't initialize correctly.

# LLM Client Imports (attempted)
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    logger.warning("langchain_openai not found. OpenAI models will not be available.")
    ChatOpenAI = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    logger.warning("langchain_google_genai not found. Google Gemini models will not be available.")
    ChatGoogleGenerativeAI = None

# Request model for the service
class TradingCrewRequest(BaseModel):
    symbol: str = PydanticField(..., example="BTC/USD")
    timeframe: str = PydanticField(default="1h", example="1h")
    strategy_name: str = PydanticField(..., example="DefaultTrendStrategy")
    llm_config_id: str = PydanticField(..., example="openai_gpt4_turbo") # ID to fetch/select LLMConfig
    # additional_context: Optional[Dict[str, Any]] = None # If crew needs more dynamic inputs

class TradingCrewService:
    def __init__(self):
        # In a real app, you might load available LLMConfig objects from a DB or config file here
        # For this example, _get_llm_instance will use a mock/hardcoded config based on id
        self.available_llm_configs: Dict[str, LLMConfig] = {
            "openai_gpt4_turbo": LLMConfig(
                id="llm_cfg_openai", model_name="gpt-4-turbo", api_key_env_var="OPENAI_API_KEY",
                parameters={"temperature": 0.7, "max_tokens": 1500}
            ),
            "gemini_1_5_pro": LLMConfig(
                id="llm_cfg_gemini", model_name="gemini-1.5-pro", api_key_env_var="GEMINI_API_KEY",
                parameters={"temperature": 0.8, "top_k": 40}
            ),
            "default_llm": LLMConfig( # A fallback if specific ID not found
                id="llm_cfg_default", model_name="gpt-4-turbo", api_key_env_var="OPENAI_API_KEY",
                parameters={"temperature": 0.5}
            )
        }
        logger.info("TradingCrewService initialized.")

    def _get_llm_instance(self, llm_config: LLMConfig) -> Any:
        logger.info(f"Attempting to instantiate LLM for model: {llm_config.model_name}")
        api_key = None
        if llm_config.api_key_env_var:
            api_key = os.getenv(llm_config.api_key_env_var)
            if not api_key:
                logger.error(f"API key environment variable '{llm_config.api_key_env_var}' not found.")
                raise ValueError(f"API key for {llm_config.model_name} not configured.")

        model_name_lower = llm_config.model_name.lower()
        params = llm_config.parameters if llm_config.parameters else {}

        if "gpt" in model_name_lower:
            if ChatOpenAI:
                logger.info(f"Instantiating ChatOpenAI with model: {llm_config.model_name} and params: {params}")
                # Ensure 'model_name' is passed as 'model' if that's what ChatOpenAI expects
                return ChatOpenAI(model=llm_config.model_name, api_key=api_key, **params)
            else:
                logger.error("ChatOpenAI (langchain_openai) is not available, but an OpenAI model was requested.")
                raise NotImplementedError("OpenAI LLM client (langchain_openai) not installed/available.")

        elif "gemini" in model_name_lower:
            if ChatGoogleGenerativeAI:
                logger.info(f"Instantiating ChatGoogleGenerativeAI with model: {llm_config.model_name} and params: {params}")
                # ChatGoogleGenerativeAI uses 'model_name' and 'google_api_key'
                return ChatGoogleGenerativeAI(model_name=llm_config.model_name, google_api_key=api_key, **params)
            else:
                logger.error("ChatGoogleGenerativeAI (langchain_google_genai) is not available, but a Gemini model was requested.")
                raise NotImplementedError("Google Gemini LLM client (langchain_google_genai) not installed/available.")

        # Add more LLMs here (e.g., Claude from Anthropic)
        # elif "claude" in model_name_lower:
        #     # ... instantiate Claude ...

        else:
            logger.warning(f"LLM for model name '{llm_config.model_name}' is not implemented. Returning None.")
            raise NotImplementedError(f"LLM support for '{llm_config.model_name}' is not implemented.")

    async def run_analysis(self, request: TradingCrewRequest) -> Optional[TradingDecision]:
        logger.info(f"Received request to run trading analysis for: {request.symbol}")

        # 1. Load LLMConfig (using the mock dictionary for this example)
        llm_config_data = self.available_llm_configs.get(request.llm_config_id)
        if not llm_config_data:
            logger.warning(f"LLMConfig ID '{request.llm_config_id}' not found. Using default LLM.")
            llm_config_data = self.available_llm_configs.get("default_llm")
            if not llm_config_data: # Should not happen if default_llm is defined
                 logger.error("Default LLM configuration is missing.")
                 return None # Or raise an exception

        # 2. Instantiate LLM
        try:
            llm_instance = self._get_llm_instance(llm_config_data)
        except (ValueError, NotImplementedError) as e:
            logger.error(f"LLM instantiation failed: {e}")
            # In a FastAPI context, you might raise HTTPException here
            return None # Or re-raise a service-specific exception

        if not llm_instance: # Should be caught by exceptions in _get_llm_instance
            logger.error("Failed to get an LLM instance. Aborting crew run.")
            return None

        # 3. Deep Copy Crew Components and Assign LLM
        # This is crucial if the global agent/task definitions are to remain pristine
        # and if you want to set a specific LLM per run.
        try:
            cloned_market_analyst = deepcopy(market_analyst_agent)
            cloned_strategy_agent = deepcopy(strategy_agent)
            cloned_trade_advisor = deepcopy(trade_advisor_agent)

            cloned_market_analyst.llm = llm_instance
            cloned_strategy_agent.llm = llm_instance
            cloned_trade_advisor.llm = llm_instance

            # Tasks use the agent instances, so if agents are cloned and LLM updated, tasks will use them.
            # No need to clone tasks if their definitions don't change, but ensure they use the cloned agents.
            # Re-creating tasks with cloned agents for clarity and safety:
            current_market_analysis_task = deepcopy(market_analysis_task)
            current_market_analysis_task.agent = cloned_market_analyst

            current_strategy_application_task = deepcopy(strategy_application_task)
            current_strategy_application_task.agent = cloned_strategy_agent
            current_strategy_application_task.context = [current_market_analysis_task] # Ensure context links to cloned tasks

            current_trade_decision_task = deepcopy(trade_decision_task)
            current_trade_decision_task.agent = cloned_trade_advisor
            current_trade_decision_task.context = [current_market_analysis_task, current_strategy_application_task]

        except Exception as e:
            logger.exception(f"Error during agent/task cloning: {e}")
            return None

        # 4. Instantiate Crew with dynamically configured agents
        current_crew = Crew(
            agents=[cloned_market_analyst, cloned_strategy_agent, cloned_trade_advisor],
            tasks=[current_market_analysis_task, current_strategy_application_task, current_trade_decision_task],
            process=Process.sequential,
            verbose=2, # Or configure as needed
            output_log_file=True # Logs crew execution details
        )
        logger.info(f"Trading analysis crew instantiated for {request.symbol} using LLM: {llm_config_data.model_name}")

        # 5. Prepare Inputs for Crew
        inputs = {
            "symbol": request.symbol,
            "timeframe": request.timeframe,
            "strategy_name": request.strategy_name,
            # Add any other inputs the tasks/agents expect from the initial kickoff
            # e.g., if request.additional_context: inputs.update(request.additional_context)
        }

        # 6. Kickoff Crew
        logger.info(f"Kicking off trading analysis crew with inputs: {inputs}")
        raw_result: Any = None
        try:
            # CrewAI's kickoff can be blocking. For async FastAPI, run in executor.
            # However, CrewAI v0.28.8+ has kickoff_async.
            if hasattr(current_crew, 'kickoff_async'):
                 raw_result = await current_crew.kickoff_async(inputs=inputs)
            else:
                 # Fallback for older CrewAI versions or if async issues arise
                 import asyncio
                 loop = asyncio.get_event_loop()
                 raw_result = await loop.run_in_executor(None, current_crew.kickoff, inputs)
            logger.info(f"Crew execution finished. Raw result: {raw_result}")
        except Exception as e:
            logger.exception(f"Exception during crew kickoff for {request.symbol}: {e}")
            # In FastAPI, convert to HTTPException or appropriate error response
            return None

        # 7. Process Result
        if raw_result is None:
            logger.error(f"Crew for {request.symbol} returned no result.")
            return None

        try:
            if isinstance(raw_result, TradingDecision):
                logger.info("Crew returned a TradingDecision object.")
                return raw_result
            elif isinstance(raw_result, dict):
                logger.info("Crew returned a dict, attempting to parse as TradingDecision.")
                return TradingDecision(**raw_result)
            elif isinstance(raw_result, str):
                logger.info("Crew returned a JSON string, attempting to parse as TradingDecision.")
                return TradingDecision(**json.loads(raw_result))
            else:
                logger.warning(f"Crew for {request.symbol} returned an unexpected result type: {type(raw_result)}. Result: {raw_result}")
                # Attempt to force into a TradingDecision with a 'reasoning' field if it's just a string
                if isinstance(raw_result, str): # Simple string output from last agent
                    return TradingDecision(symbol=request.symbol, action="INFO", confidence_score=0.0, reasoning=raw_result)
                return None
        except PydanticValidationError as e:
            logger.error(f"Validation error parsing crew result for {request.symbol} into TradingDecision: {e}. Raw result: {raw_result}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error parsing crew result for {request.symbol}: {e}. Raw result: {raw_result}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error processing crew result for {request.symbol}: {e}")
            return None

# Example Usage (conceptual, would be called from an API endpoint)
# async def main_example():
#     service = TradingCrewService()
#     req = TradingCrewRequest(
#         symbol="AAPL",
#         timeframe="2h",
#         strategy_name="TrendFollowing",
#         llm_config_id="openai_gpt4_turbo" # or "gemini_1_5_pro"
#     )
#     # Ensure OPENAI_API_KEY or GEMINI_API_KEY is set in your environment for this example
#     if "OPENAI_API_KEY" not in os.environ and "GEMINI_API_KEY" not in os.environ:
#         print("Please set OPENAI_API_KEY or GEMINI_API_KEY in your environment to run example.")
#         return

#     decision = await service.run_analysis(req)
#     if decision:
#         logger.info(f"Final Trading Decision: {decision.json(indent=2)}")
#     else:
#         logger.error("Failed to get trading decision.")

# if __name__ == "__main__":
#     # Configure logger for example
#     logger.remove()
#     logger.add(lambda msg: print(msg, end=''), colorize=True, format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="INFO")
#     asyncio.run(main_example())
pass
