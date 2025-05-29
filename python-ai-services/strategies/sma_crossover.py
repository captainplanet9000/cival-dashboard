import numpy as np

class SMACrossoverStrategy:
    def __init__(self, symbol: str, short_window: int, long_window: int, 
                 config_params: dict = None): 
        if not symbol or not short_window or not long_window:
            raise ValueError("Symbol, short_window, and long_window must be provided.")
        if short_window <= 0 or long_window <= 0:
            raise ValueError("SMA windows must be positive integers.")
        if short_window >= long_window:
            raise ValueError("Short SMA window must be less than Long SMA window.")

        self.symbol = symbol
        self.short_window = short_window
        self.long_window = long_window
        self.config_params = config_params if config_params else {}

    def _calculate_sma(self, prices: list[float], window: int) -> list[float | None]:
        if len(prices) < window:
            return [None] * len(prices) 
        
        sma_values = [None] * (window - 1) 
        sma_values.extend(np.convolve(prices, np.ones(window), 'valid') / window)
        return sma_values

    def execute(self, historical_klines: list[dict]) -> dict:
        # historical_klines: A list of OHLCV data points, oldest to newest.
        # Each kline: {"time_open": ..., "quote": {"USD": {"close": 60000, ...}}}
        if not historical_klines or len(historical_klines) < self.long_window:
            return {"signal": "HOLD", "reason": "Not enough historical data.", "latest_close": None, "short_sma": None, "long_sma": None}

        try:
            closing_prices = []
            for kline in historical_klines:
                if kline and kline.get('quote') and kline['quote'].get('USD') and kline['quote']['USD'].get('close') is not None:
                    closing_prices.append(float(kline['quote']['USD']['close']))
                # else:
                    # Optionally handle malformed klines or log a warning
                    # For SMA, it's often better to just skip them if they don't have the close price
        except (TypeError, KeyError, ValueError) as e: # Added ValueError for float conversion
            return {"signal": "HOLD", "reason": f"Error processing kline data: {e}", "latest_close": None, "short_sma": None, "long_sma": None}

        if len(closing_prices) < self.long_window:
            return {"signal": "HOLD", "reason": "Not enough valid closing prices.", "latest_close": None, "short_sma": None, "long_sma": None}

        short_sma_values = self._calculate_sma(closing_prices, self.short_window)
        long_sma_values = self._calculate_sma(closing_prices, self.long_window)

        latest_short_sma = short_sma_values[-1] if short_sma_values and short_sma_values[-1] is not None else None
        prev_short_sma = short_sma_values[-2] if len(short_sma_values) >= 2 and short_sma_values[-2] is not None else None
        
        latest_long_sma = long_sma_values[-1] if long_sma_values and long_sma_values[-1] is not None else None
        prev_long_sma = long_sma_values[-2] if len(long_sma_values) >= 2 and long_sma_values[-2] is not None else None

        latest_close = closing_prices[-1] if closing_prices else None
        signal = "HOLD" 
        
        if None not in [latest_short_sma, latest_long_sma, prev_short_sma, prev_long_sma]:
            if prev_short_sma <= prev_long_sma and latest_short_sma > latest_long_sma:
                signal = "BUY"
            elif prev_short_sma >= prev_long_sma and latest_short_sma < latest_long_sma:
                signal = "SELL"
        
        return {
            "signal": signal, 
            "short_sma": latest_short_sma, 
            "long_sma": latest_long_sma,
            "latest_close": latest_close,
            "symbol": self.symbol
        }

if __name__ == '__main__':
    print("Testing SMACrossoverStrategy...")
    dummy_klines_rising_cross = [{'quote': {'USD': {'close': float(10 + i*0.5)}}} for i in range(20)] # Gradual rise
    dummy_klines_falling_cross = [{'quote': {'USD': {'close': float(20 - i*0.5)}}} for i in range(20)] # Gradual fall

    strategy_buy_test = SMACrossoverStrategy(symbol="BTC/USD", short_window=5, long_window=10)
    # Ensure enough data for two full SMA calculations plus one for crossover
    test_data_buy = dummy_klines_rising_cross[:11] # 10 for long SMA, 11th for crossover
    result_buy = strategy_buy_test.execute(historical_klines=test_data_buy)
    print(f"Buy Test (Data len {len(test_data_buy)}): {result_buy}")

    strategy_sell_test = SMACrossoverStrategy(symbol="BTC/USD", short_window=5, long_window=10)
    test_data_sell = dummy_klines_falling_cross[:11]
    result_sell = strategy_sell_test.execute(historical_klines=test_data_sell)
    print(f"Sell Test (Data len {len(test_data_sell)}): {result_sell}")
    
    strategy_insufficient_data = SMACrossoverStrategy(symbol="BTC/USD", short_window=5, long_window=10)
    result_insufficient = strategy_insufficient_data.execute(historical_klines=dummy_klines_rising_cross[:5])
    print(f"Insufficient Data Test: {result_insufficient}")
