# This file will contain the definitions for CrewAI agents, tasks, and eventually the trading_crew itself.

# Note on LLM Configuration:
# The `llm` parameter for the agents defined below will be dynamically configured
# by a service layer (e.g., TradingCrewService or CrewExecutionService).
# This service will use LLMConfig data (allowing selection of OpenAI, Gemini, Claude models
# and their specific parameters like temperature, max_tokens, etc.) to instantiate
# the appropriate LLM for each agent before the crew is kicked off.
# The LLM instances here are placeholders for structure and default behavior.

from crewai import Agent, Task, Crew, Process # Added Crew, Process
from typing import Any, Type # Added Type for Pydantic model typing in tasks

# Attempt to import a specific LLM for placeholder usage.
# In a real environment, this would be managed by the service layer.
try:
    from langchain_openai import ChatOpenAI
    # Default placeholder LLM - this would be replaced by dynamic configuration
    # Ensure OPENAI_API_KEY is set in the environment if you run this directly for testing
    default_llm = ChatOpenAI(model="gpt-4-turbo", temperature=0.7)
except ImportError:
    print("Warning: langchain_openai not found. Using a generic placeholder for LLM.")
    default_llm: Any = None

# Pydantic Model Imports for Task Outputs
# Assuming 'crews' is a sub-package of 'python_ai_services',
# and 'types' and 'models' are sibling sub-packages.
try:
    from ..types.trading_types import MarketAnalysis, TradingDecision
    from ..models.crew_models import StrategyApplicationResult
except ImportError:
    # Fallback for environments where relative imports might be tricky during subtask execution
    # This is primarily for the subtask execution context.
    # In a real setup, these imports should work if the package structure is correct.
    print("Warning: Could not perform relative imports for Pydantic models. Using placeholders if defined, or expect errors.")
    # Define very basic placeholders if needed for type hinting, actual models are more complex
    class MarketAnalysis(dict): pass
    class TradingDecision(dict): pass
    class StrategyApplicationResult(dict): pass


# --- Agent Definitions ---

market_analyst_agent = Agent(
    role="Expert Market Analyst",
    goal="Provide detailed analysis of current market conditions, trends, and key price levels for a given financial symbol, incorporating both technical and fundamental factors where applicable.",
    backstory=(
        "A seasoned financial analyst with over 15 years of experience in equity and crypto markets. "
        "Possesses deep expertise in technical analysis, chart patterns, indicator interpretation, and "
        "correlating market sentiment with price movements. Known for clear, concise, and actionable insights."
    ),
    llm=default_llm,
    tools=[], # Tools: [fetch_market_data_tool, run_technical_analysis_tool] - To be defined and added
    allow_delegation=False,
    verbose=True,
    memory=True # Enable memory for context continuity within a crew run
)

strategy_agent = Agent(
    role="Quantitative Trading Strategist",
    goal="Apply a specified trading strategy (e.g., Darvas Box, Elliott Wave, custom indicators) to the provided market analysis to determine a potential trading action (buy, sell, hold) and associated parameters like target price and stop-loss.",
    backstory=(
        "A specialist in quantitative modeling and algorithmic trading strategy development and execution. "
        "Expert in translating market analysis and predefined strategy rules into concrete, actionable trading advice. "
        "Focuses on systematic approaches to trading."
    ),
    llm=default_llm,
    tools=[], # Tools: [apply_darvas_box_tool, apply_elliott_wave_tool] - To be defined and added
    allow_delegation=False,
    verbose=True,
    memory=True
)

trade_advisor_agent = Agent(
    role="Prudent Chief Trading Advisor",
    goal="Synthesize market analysis and strategy-specific advice, incorporate comprehensive risk assessment, and generate a final, well-reasoned trading decision (TradeSignal/TradingDecision) with clear rationale, entry, stop-loss, and take-profit levels.",
    backstory=(
        "An experienced trading advisor and risk manager with a fiduciary mindset. Responsible for making final, sound, "
        "risk-managed trading recommendations. Ensures all available information and risk factors are meticulously "
        "considered before any trade is proposed."
    ),
    llm=default_llm,
    tools=[], # Tools: [risk_assessment_tool, format_trade_signal_tool] - To be defined/added
    allow_delegation=False, # Final decision maker for the crew's primary output
    verbose=True,
    memory=True
)

# --- Task Definitions ---
# Note: Placeholders like {symbol}, {timeframe}, and {strategy_name} in task descriptions
# will be dynamically filled by the TradingCrewService or CrewExecutionService when
# the crew is initiated, using inputs provided to that service.

market_analysis_task = Task(
    description=(
        "Analyze the market conditions for '{symbol}' over the '{timeframe}'. "
        "Focus on current trend, volatility, key support and resistance levels, and relevant technical indicators "
        "(like RSI, MACD, Bollinger Bands, EMAs). Also consider recent news sentiment if available through tools. "
        "The symbol and timeframe are critical inputs that must be used."
    ),
    expected_output=(
        "A structured Pydantic model of type `MarketAnalysis` containing detailed market insights: "
        "current market condition (e.g., bullish, bearish, ranging), trend direction and strength, "
        "volatility assessment, identified support and resistance levels, key technical indicator values, "
        "summary of news sentiment impact, and a concise short-term forecast or outlook."
    ),
    agent=market_analyst_agent,
    output_pydantic=MarketAnalysis,
    async_execution=False
)

strategy_application_task = Task(
    description=(
        "Based on the provided market analysis for '{symbol}', apply the trading strategy named '{strategy_name}'. "
        "Determine a potential trading action (buy, sell, hold), a confidence score for this action, and if applicable, "
        "suggest a target price, stop-loss level, and take-profit level. "
        "Clearly explain the rationale for your advice based *strictly* on the rules and signals of the '{strategy_name}' strategy."
    ),
    expected_output=(
        "A structured Pydantic model of type `StrategyApplicationResult` detailing the strategy's advice: "
        "the recommended trading action (BUY, SELL, or HOLD), a confidence score (0.0 to 1.0), "
        "target price, stop-loss price, take-profit price (all optional), and a clear rationale justifying the advice "
        "based on the specific strategy's application to the market analysis."
    ),
    agent=strategy_agent,
    context=[market_analysis_task], # Depends on the output of the market analysis task
    output_pydantic=StrategyApplicationResult,
    async_execution=False
)

trade_decision_task = Task(
    description=(
        "Synthesize the comprehensive market analysis and the specific strategy application result for '{symbol}'. "
        "Conduct a final conceptual risk assessment based on the proposed action and market conditions. "
        "Formulate a final, actionable trading decision, which will be structured as a `TradingDecision` Pydantic model. "
        "This decision must include the symbol, the determined action (buy, sell, hold), a confidence score, "
        "the current price (or entry price if applicable), stop-loss, and take-profit levels. "
        "Provide a concise yet comprehensive reasoning that justifies the final decision, integrating insights from "
        "both the market analysis and the strategy output. If the strategy advised 'HOLD' or confidence is low, "
        "the final decision should reflect this, typically as a 'HOLD'."
    ),
    expected_output=(
        "A final `TradingDecision` Pydantic model ready for execution or review. This model must include: "
        "symbol, action (BUY, SELL, HOLD), confidence_score, current_price (or intended entry price), "
        "stop_loss, take_profit, a detailed rationale for the decision, and relevant metadata like "
        "the timestamp of the decision. The risk level should be implicitly managed or explicitly stated if available."
    ),
    agent=trade_advisor_agent,
    context=[market_analysis_task, strategy_application_task], # Depends on both preceding tasks
    output_pydantic=TradingDecision,
    async_execution=False
)

# --- Crew Definition ---
# This defines the blueprint of the trading analysis crew.
# The actual instantiation, including dynamic LLM configuration for agents,
# will be handled by a service layer (e.g., TradingCrewService or CrewExecutionService).

trading_analysis_crew = Crew(
    agents=[market_analyst_agent, strategy_agent, trade_advisor_agent],
    tasks=[market_analysis_task, strategy_application_task, trade_decision_task],
    process=Process.sequential,  # Tasks will be executed one after another
    verbose=2,  # 0 for no output, 1 for basic, 2 for detailed output
    memory=False, # Crew-level memory; individual agents have their own memory enabled.
                  # Set to True if a shared short-term scratchpad for the whole crew run is needed.
    manager_llm=None, # No manager LLM for sequential processes.
                      # Would be configured if using Process.hierarchical.
    output_log_file=True # Creates a log file for the crew run, e.g., "trading_analysis_crew_YYYY-MM-DD_HH-MM-SS.log"
                         # Can also be a specific file path string.
)

# --- Placeholder for Tools (to be defined in ../tools/) ---
# (Comments about tools from previous step remain relevant)
pass
