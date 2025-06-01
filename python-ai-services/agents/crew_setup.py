from crewai import Agent
from .crew_llm_config import get_llm, ERROR_MSG as LLM_ERROR_MSG # Import get_llm and any error message
from loguru import logger # Or standard logging

# Attempt to get the configured LLM
# If get_llm() raises an error (e.g., API key missing), agents can't be created with it.
try:
    llm_instance = get_llm()
    logger.info("Successfully fetched LLM instance for crew_setup.")
except EnvironmentError as e:
    logger.error(f"Failed to get LLM for agent creation in crew_setup: {e}")
    logger.warning("Agents in crew_setup.py will not be functional without a configured LLM.")
    llm_instance = None # Explicitly set to None so agent creation might proceed if allow_delegation=False and no tools requiring LLM
    # Or, re-raise the error if agents absolutely cannot be defined without an LLM:
    # raise EnvironmentError(f"Cannot define agents in crew_setup.py: LLM not available. Error: {e}") from e


# Define MarketAnalystAgent
market_analyst_agent = Agent(
    role="Market Analyst",
    goal="Analyze market conditions, identify trends, and pinpoint trading opportunities based on comprehensive technical and fundamental analysis.",
    backstory=(
        "As a seasoned Market Analyst with years of experience in financial markets, you possess a deep understanding of market dynamics, "
        "economic indicators, and chart patterns. You excel at synthesizing vast amounts of data into actionable insights, "
        "providing a clear outlook on potential market movements and opportunities for various assets."
    ),
    verbose=True,
    allow_delegation=False, # Depends on whether this agent should delegate tasks
    llm=llm_instance, # Use the centrally configured LLM
    # tools=[] # Add specific tools for this agent later if needed
)

# Define RiskManagerAgent
risk_manager_agent = Agent(
    role="Risk Manager",
    goal="Assess and mitigate trading risks by evaluating proposed trades, portfolio exposure, and market volatility.",
    backstory=(
        "With a sharp eye for detail and a quantitative mindset, you are a Risk Manager dedicated to safeguarding trading capital. "
        "You meticulously evaluate the risk parameters of every proposed trade, monitor overall portfolio exposure, "
        "and advise on appropriate position sizing and stop-loss levels to ensure adherence to risk tolerance."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm_instance,
    # tools=[] # Add specific tools for this agent later
)

# Define TradeExecutorAgent
trade_executor_agent = Agent(
    role="Trade Executor",
    goal="Execute approved trades efficiently, minimizing slippage and achieving the best possible execution prices.",
    backstory=(
        "You are a precise and disciplined Trade Executor, skilled in navigating exchange order books and various order types. "
        "Your primary objective is to carry out trading decisions with speed and accuracy, ensuring that trades are filled "
        "at or near the desired levels while minimizing market impact and transaction costs."
    ),
    verbose=True,
    allow_delegation=False,
    llm=llm_instance,
    # tools=[] # Add specific tools for this agent later (e.g., trade execution tool)
)

if llm_instance is None:
    logger.warning("LLM instance is None. Agents in crew_setup.py have been defined without a functional LLM. "
                   "They will have limited capabilities, especially if they rely on LLM for task execution or tool use.")

# Example of how to potentially export or use them (optional, could be done by importing the file)
# available_agents = {
# "market_analyst": market_analyst_agent,
# "risk_manager": risk_manager_agent,
# "trade_executor": trade_executor_agent,
# }

logger.info("CrewAI agents (MarketAnalyst, RiskManager, TradeExecutor) defined in crew_setup.py.")
