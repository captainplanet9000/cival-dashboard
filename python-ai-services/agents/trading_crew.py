from crewai import Agent, Task, Crew, Process
from .crew_llm_config import get_llm # Assuming crew_llm_config.py is in the same 'agents' package

# Attempt to get the configured LLM
# If LLM initialization failed in crew_llm_config, get_llm() will raise an EnvironmentError
try:
    llm = get_llm()
except EnvironmentError as e:
    print(f"CRITICAL: Failed to get LLM for crew setup - {e}")
    # Handle LLM unavailability: either raise the error, or use a dummy/fallback if defined
    # For now, let the error propagate if no LLM is available.
    # Or, define a NoOpLLM or similar if you want the structure to run without real LLM calls.
    # llm = None # Or some dummy LLM for structural testing if an API key is not expected to be present during this dev step
    raise # Re-raise to make it clear that LLM is required for this module


# Define Agent Roles
market_analyst_agent = Agent(
    role='Market Analyst',
    goal='Analyze current market conditions and price data for a given financial symbol to identify potential trends or insights.',
    backstory=(
        "You are an experienced market analyst with a knack for interpreting charts and data "
        "to provide clear, concise summaries of market sentiment and potential price movements. "
        "Focus on the provided data and avoid making speculative long-term predictions."
    ),
    llm=llm,
    verbose=True,
    allow_delegation=False, # For this basic setup
    # memory=True # Consider adding memory later as per user's more advanced plan
)

trade_advisor_agent = Agent(
    role='Trade Advisor',
    goal='Based on market analysis, formulate a simple trading advisory (BUY, SELL, or HOLD) with a brief rationale and confidence score.',
    backstory=(
        "You are a cautious trade advisor. Given a market analysis, you will decide if a clear "
        "trading signal exists. If the signal is strong, you recommend BUY or SELL. "
        "If the signal is weak or unclear, you recommend HOLD. "
        "Your advice must include a confidence score between 0.0 and 1.0."
    ),
    llm=llm,
    verbose=True,
    allow_delegation=False,
    # memory=True
)

# Define Tasks
# Task 1: Market Analysis
# Context for tasks will be provided when the crew kicks off.
# Example: crew.kickoff(inputs={'symbol': 'BTC/USD', 'market_data_summary': 'Price is trending up...'})
market_analysis_task = Task(
    description=(
        "Analyze the provided market data summary for the financial symbol: {symbol}. "
        "Focus on identifying any immediate bullish, bearish, or neutral signals from this data. "
        "Your output should be a concise analysis summary."
    ),
    expected_output=(
        "A brief text summary (1-2 paragraphs) of the market analysis, highlighting key observations "
        "and potential direction based *only* on the provided data summary."
    ),
    agent=market_analyst_agent
)

# Task 2: Trade Advising
trade_advising_task = Task(
    description=(
        "Based on the following market analysis: {market_analysis_output}, "
        "for the symbol: {symbol}, determine a trading action (BUY, SELL, or HOLD). "
        "Provide a confidence score (0.0 to 1.0) and a brief rationale for your advice. "
        "If the analysis is inconclusive or doesn't present a strong signal, recommend HOLD."
    ),
    expected_output=(
        "A JSON string representing a PROPOSED trading signal. The JSON object should conform to the ProposedTradeSignal model, "
        "containing the following fields: "
        "'signal_id' (string, a new UUID for this proposal, e.g., '123e4567-e89b-12d3-a456-426614174000'), "
        "'symbol' (string, e.g., 'BTC/USD'), "
        "'action' (string: 'BUY', 'SELL', or 'HOLD'), "
        "'confidence' (float, 0.0 to 1.0), "
        "'timestamp' (string, ISO 8601 datetime format for when the signal was generated, e.g., '2023-10-27T10:30:00Z'), "
        "'execution_price' (float, optional, the price at which the signal is based, or current market price if applicable), "
        "'rationale' (string, 1-2 sentences explaining the advice)."
        # Optional: "'metadata' (object, optional, for any extra info)."
    ),
    agent=trade_advisor_agent,
    context=[market_analysis_task] # Depends on the output of the analysis task
)

# Define the Crew
# For now, using sequential process.
trading_crew = Crew(
    agents=[market_analyst_agent, trade_advisor_agent],
    tasks=[market_analysis_task, trade_advising_task],
    process=Process.sequential,
    verbose=2 # Can be 0, 1, or 2 for different levels of logging
    # memory=True # For crew-level memory, if desired later
    # manager_llm=llm # If a manager LLM is needed for more complex task delegation
)

from ..models.base_models import TradeSignal # Added import
from pydantic import ValidationError # Added import
import json # Added import
from datetime import datetime # Added import

# Example of how to run this crew (for testing within this file if needed)
if __name__ == '__main__':
    if not llm:
        print("LLM not available, cannot run crew example.")
    else:
        print("Kicking off Trading Crew for BTC/USD (example)...")
        # Provide necessary inputs for the tasks
        # The 'market_analysis_output' for trade_advising_task will be automatically
        # populated by CrewAI from the result of market_analysis_task.
        inputs = {
            'symbol': 'BTC/USD',
            'market_data_summary': 'The price of BTC/USD has shown a slight upward trend in the last 24 hours, with increasing volume. RSI is approaching overbought territory.'
        }
        result = trading_crew.kickoff(inputs=inputs)
        print("\nCrew Kickoff Result:")
        print(result) # The result is typically the output of the last task

        print("\nAttempting to parse Trade Advisor's output into TradeSignal model:")
        if result:
            try:
                # First, try to see if result is already a dict (if CrewAI parses JSON output)
                if isinstance(result, dict):
                    parsed_output_dict = result
                elif isinstance(result, str): # If LLM output is a string (common)
                    try:
                        parsed_output_dict = json.loads(result)
                    except json.JSONDecodeError as je:
                        print(f"Output is a string but not valid JSON: {result}")
                        raise ValidationError(f"Output is not valid JSON. Error: {je}") from je
                else: # Neither dict nor string, something unexpected
                    print(f"Unexpected output type from crew: {type(result)}. Content: {result}")
                    raise ValidationError("Output is not a dict or JSON string.")

                # Add timestamp if LLM doesn't generate it, Pydantic model needs it.
                if 'timestamp' not in parsed_output_dict:
                    parsed_output_dict['timestamp'] = datetime.now().isoformat()
                
                trade_signal = TradeSignal(**parsed_output_dict)
                print("Successfully parsed TradeSignal:")
                print(trade_signal.model_dump_json(indent=2))
            except ValidationError as e:
                print("Pydantic Validation Error for TradeSignal:")
                print(e)
            except Exception as e:
                print(f"An unexpected error occurred during parsing: {e}")
                print(f"Raw output from crew was: {result}")
        else:
            print("Crew did not return a result.")
