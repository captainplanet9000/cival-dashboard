from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from loguru import logger

class MarketDataService:
    async def get_historical_klines(self, symbol: str, interval: str = "1d", limit: int = 100) -> List[Dict[str, Any]]:
        logger.info(f"MockMarketDataService: Fetching {limit} klines for {symbol} (interval: {interval})")
        # Generate some deterministic mock data for testing Darvas logic
        klines = []
        # Ensure current time is timezone-aware for proper timedelta arithmetic
        now_aware = datetime.now(timezone.utc)
        start_time = now_aware - timedelta(days=limit)
        
        # Base values for generating somewhat predictable data
        base_low = 90.0
        # Define a clear box top for the consolidation phase
        box_consolidation_top = 105.0
        box_consolidation_bottom = 100.0

        for i in range(limit):
            ts = start_time + timedelta(days=i)

            if i < limit - 15: # Initial phase, data varies more widely below the box
                mock_open = base_low + ((i*3) % 10) # Some variation to keep it below box_consolidation_bottom mostly
                mock_close = base_low + 2 + ((i*2) % 8)
                mock_high = max(mock_open, mock_close) + ((i*1) % 4)
                mock_low = min(mock_open, mock_close) - ((i*1) % 3)
                # Ensure initial data stays below potential box bottom for clarity
                mock_high = min(mock_high, box_consolidation_bottom -1)
                mock_close = min(mock_close, box_consolidation_bottom -1)
                mock_open = min(mock_open, box_consolidation_bottom -1)
                mock_low = min(mock_low, box_consolidation_bottom-2)


            elif i < limit -1: # Consolidation phase to form a box
                # Prices oscillate within the box_consolidation_bottom and box_consolidation_top
                # Make highs consistently hit box_consolidation_top
                # Make lows consistently hit box_consolidation_bottom
                mock_high = box_consolidation_top
                mock_low = box_consolidation_bottom
                if i % 2 == 0:
                    mock_open = box_consolidation_bottom + 1
                    mock_close = box_consolidation_top -1
                else:
                    mock_open = box_consolidation_top - 1
                    mock_close = box_consolidation_bottom + 1
            else: # Last candle - potential breakout
                mock_open = box_consolidation_top -1 # Opens just below/at the box top
                mock_low = box_consolidation_top - 2 # Low also below/near box top
                mock_high = box_consolidation_top + 5 # Clear breakout high
                mock_close = box_consolidation_top + 4 # Clear breakout close above box top

            klines.append({
                "timestamp": int(ts.timestamp() * 1000), # Milliseconds
                "open": round(mock_open, 2),
                "high": round(mock_high, 2),
                "low": round(mock_low, 2),
                "close": round(mock_close, 2),
                "volume": 1000 + (i * 10),
            })

        logger.debug(f"Generated {len(klines)} mock klines for {symbol}. Last kline: {klines[-1] if klines else 'N/A'}")
        return klines
```
