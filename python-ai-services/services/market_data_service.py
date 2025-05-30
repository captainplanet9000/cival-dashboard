import os
import requests
from dotenv import load_dotenv

load_dotenv()

COINMARKETCAP_API_KEY = os.environ.get("COINMARKETCAP_API_KEY")
CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest' 

class MarketDataService:
    def __init__(self):
        if not COINMARKETCAP_API_KEY:
            raise ValueError("CoinMarketCap API Key not found in environment variables.")
        self.headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
        }

    def get_price_quotes(self, symbols: list[str], convert_to: str = 'USD') -> dict:
        if not symbols:
            return {}
        parameters = {'symbol': ','.join(symbols).upper(), 'convert': convert_to.upper()}
        try:
            response = requests.get(CMC_API_URL, headers=self.headers, params=parameters)
            response.raise_for_status() 
            data = response.json()
            quotes = {}
            if data.get('status', {}).get('error_code') == 0:
                for symbol_provided in symbols: # Iterate over originally requested symbols for consistent keying
                    s_upper = symbol_provided.upper()
                    # CMC data is keyed by the base symbol, e.g., 'BTC' for 'BTC/USD'
                    base_symbol_data = data.get('data', {}).get(s_upper.split('/')[0], None) 
                    if base_symbol_data: # Check if data exists for this base symbol
                        quote_data = base_symbol_data.get('quote', {}).get(convert_to.upper())
                        if quote_data:
                            quotes[s_upper] = {
                                "price": quote_data.get('price'),
                                "volume_24h": quote_data.get('volume_24h'),
                                "percent_change_24h": quote_data.get('percent_change_24h'),
                                "last_updated": quote_data.get('last_updated')
                            }
                        else:
                            print(f"Warning: Quote data for convert_to '{convert_to.upper()}' not found for symbol {s_upper} in CMC response.")
                            quotes[s_upper] = None
                    else:
                        print(f"Warning: Symbol {s_upper} not found in CMC response data field.")
                        quotes[s_upper] = None 
            else:
                error_message = data.get('status', {}).get('error_message', 'Unknown API error')
                print(f"CoinMarketCap API Error: {error_message}")
                return {"error": error_message}
            return quotes
        except requests.exceptions.RequestException as e:
            print(f"Error fetching market data from CoinMarketCap: {e}")
            return {"error": str(e)}

    def get_historical_ohlcv(self, symbol: str, time_period: str = 'daily', count: int = 30, convert_to: str = 'USD') -> dict:
        """
        Fetches historical OHLCV data for a given symbol.
        `time_period` maps to `interval` for CMC API: e.g., 'daily', 'weekly', '1h', '3h'.
        """
        if not symbol:
            return {"error": "Symbol must be provided"}

        # Map time_period to CMC's interval parameter
        # Common intervals: 'hourly', 'daily', 'weekly', 'monthly', 
        # '1h', '2h', '3h', '4h', '6h', '12h', 
        # '1d', '2d', '3d', '7d', '14d', '15d', '30d', '60d', '90d', '365d'
        # For simplicity, we'll assume time_period maps directly if it's one of the common ones like 'daily', '1h' etc.
        # More robust mapping might be needed for broader compatibility.
        interval_map = {
            'daily': 'daily',
            'hourly': 'hourly', # This might fetch 1h data by default; check CMC docs if specific hours like '1h' are needed.
            '1h': '1h', # Example if CMC uses '1h' directly
            '4h': '4h',
            'weekly': 'weekly',
            'monthly': 'monthly'
        }
        api_interval = interval_map.get(time_period.lower(), time_period) # Default to using time_period if not in map

        parameters = {
            'symbol': symbol.upper(),
            'count': count,
            'interval': api_interval,
            'convert': convert_to.upper()
        }
        
        ohlcv_api_url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/ohlcv/historical'

        try:
            response = requests.get(ohlcv_api_url, headers=self.headers, params=parameters)
            response.raise_for_status()
            data = response.json()

            if data.get('status', {}).get('error_code') == 0:
                symbol_data = data.get('data', {}).get(symbol.upper())
                if symbol_data and 'quotes' in symbol_data:
                    return {
                        "symbol": symbol.upper(),
                        "quotes": symbol_data['quotes'], # This directly contains the list of OHLCV objects
                        "error": None
                    }
                else:
                    msg = f"OHLCV data for symbol {symbol.upper()} not found in response."
                    print(f"Warning: {msg}")
                    return {"symbol": symbol.upper(), "quotes": [], "error": msg}
            else:
                error_message = data.get('status', {}).get('error_message', 'Unknown API error')
                print(f"CoinMarketCap API Error (OHLCV): {error_message}")
                return {"symbol": symbol.upper(), "quotes": [], "error": error_message}
        except requests.exceptions.RequestException as e:
            print(f"Error fetching historical OHLCV data from CoinMarketCap: {e}")
            return {"symbol": symbol.upper(), "quotes": [], "error": str(e)}
        except Exception as e: # Catch any other unexpected errors
            print(f"Unexpected error in get_historical_ohlcv: {e}")
            return {"symbol": symbol.upper(), "quotes": [], "error": str(e)}