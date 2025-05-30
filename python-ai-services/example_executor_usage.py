import os
import asyncio # Added import
from dotenv import load_dotenv
from services.strategy_executor import StrategyExecutor
from services.market_data_service import MarketDataService 

async def run_example(): # Made async
    load_dotenv() 

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    cmc_api_key = os.environ.get("COINMARKETCAP_API_KEY") 

    print("Python AI Service Example Runner - With Market Data")
    print("----------------------------------------------------")
    
    if not supabase_url or not supabase_key:
        print("Error: Supabase URL or Service Role Key not found in environment variables.")
        print("Please ensure you have a .env file in the 'python-ai-services' directory with:")
        print("NEXT_PUBLIC_SUPABASE_URL=your_supabase_url")
        print("SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key")
        return

    if not cmc_api_key:
        print("\nINFO: COINMARKETCAP_API_KEY not found in .env. Market data will not be fetched by default.")
        # Proceeding without market_service if key is missing
    
    market_service = None
    if cmc_api_key:
        try:
            market_service = MarketDataService()
            print("MarketDataService initialized.")
        except ValueError as ve_mds: 
            print(f"MarketDataService initialization error: {ve_mds}")
    else:
        print("MarketDataService not initialized as API key is missing.")

    # --- Configuration Instructions for Testing ---
    # IMPORTANT: To test the SMA Crossover strategy with this script:
    # 1. Replace 'your_actual_agent_id_here' below with a real agent_id from your Supabase database.
    # 2. Ensure the agent in your Supabase `trading_agents` table:
    #    a. Is assigned a strategy (via its `assigned_strategy_id` FK) that has its `name`
    #       column in the `trading_strategies` table set exactly to "SMA Crossover".
    #    b. Has a `configuration_parameters` JSON object in the `trading_agents` table like this:
    #       {
    #         "symbol": "BTC/USD",       // The trading pair, e.g., BTC/USD. Base symbol (BTC) is used for CMC.
    #         "short_window": 5,        // Integer: Window for the short-term SMA.
    #         "long_window": 10,        // Integer: Window for the long-term SMA (must be > short_window).
    #         "quantity": 0.01,         // Float: Quantity to simulate trading.
    #         "time_period": "daily"    // String: Interval for OHLCV data ('daily', '1h', '7d', etc.).
    #                                     // Ensure `long_window` + `short_window` data points are available for this interval.
    #       }
    #    c. (Optional) If you want to test the placeholder logic for other strategies, 
    #       ensure the agent's assigned strategy name is NOT "SMA Crossover", and 
    #       its `configuration_parameters` can include:
    #       { "action_to_take": "buy", "symbol": "ETH/USD", "quantity": 1.0 }
    # --- End Configuration Instructions ---

    test_agent_id = "your_actual_agent_id_here" 
    if test_agent_id == "your_actual_agent_id_here":
        print("\nWARNING: Please replace 'your_actual_agent_id_here' in 'example_executor_usage.py' with a real agent_id from your database for this example to work.")
        print("          Refer to the detailed comments above this line for required database setup.")
        return
        
    try:
        print(f"\nInitializing StrategyExecutor for agent: {test_agent_id}...")
        executor = StrategyExecutor(supabase_url=supabase_url, supabase_key=supabase_key)
        
        if executor.load_agent_and_strategy(agent_id=test_agent_id):
            print(f"Successfully loaded agent '{executor.agent_id}', strategy '{executor.strategy_name}'.")
            print(f"User ID: {executor.user_id}, Config: {executor.configuration_parameters}")
            
            # Demonstrate fetching historical OHLCV data
            if market_service:
                print("\nFetching historical OHLCV data for BTC (last 7 days)...")
                try:
                    # Assuming symbol is 'BTC' and not 'BTC/USD' for OHLCV endpoint based on typical usage
                    ohlcv_data = market_service.get_historical_ohlcv(symbol="BTC", count=7) 
                    if ohlcv_data and not ohlcv_data.get("error"):
                        print("Historical OHLCV data for BTC:")
                        for i, quote_wrapper in enumerate(ohlcv_data.get("quotes", [])):
                            # The actual OHLCV data is nested under the currency key, e.g., 'USD'
                            ohlcv_point = quote_wrapper.get('quote', {}).get('USD', {})
                            print(f"  Day {i+1}: Time Open: {quote_wrapper.get('time_open')}, O: {ohlcv_point.get('open')}, H: {ohlcv_point.get('high')}, L: {ohlcv_point.get('low')}, C: {ohlcv_point.get('close')}, V: {ohlcv_point.get('volume')}")
                    else:
                        print(f"Could not fetch historical OHLCV data: {ohlcv_data.get('error', 'No data')}")
                except Exception as e_ohlcv:
                    print(f"Error fetching historical OHLCV data: {e_ohlcv}")

            print(f"\nRunning strategy cycle...")
            result = await executor.run_cycle(market_data_service=market_service)  # Added await
            print(f"Cycle Result: {result}")
        else:
            print(f"Failed to load agent {test_agent_id}. Check if it exists and has a strategy assigned.")

    except ValueError as ve:
        print(f"Configuration or Value Error: {ve}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(run_example()) # Changed to asyncio.run
