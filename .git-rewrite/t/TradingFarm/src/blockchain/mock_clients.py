"""
Mock clients for blockchain exchanges to be used for dashboard testing.
"""
import logging
import random
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MockExchangeClient:
    """Base mock client for exchanges."""
    
    def __init__(self, exchange_name: str = "mock"):
        self.exchange_name = exchange_name
        logger.info(f"Initialized {exchange_name} mock client")
    
    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get mock positions."""
        # Generate 2-4 random positions
        num_positions = random.randint(2, 4)
        symbols = ["BTC-PERP", "ETH-PERP", "SOL-PERP", "AVAX-PERP", "BNB-PERP"]
        positions = []
        
        for i in range(num_positions):
            symbol = random.choice(symbols)
            size = random.uniform(0.1, 5.0)
            entry_price = random.uniform(100, 80000)
            current_price = entry_price * random.uniform(0.9, 1.1)
            unrealized_pnl = (current_price - entry_price) * size
            
            position = {
                "id": f"pos_{i+1}_{self.exchange_name}",
                "symbol": symbol,
                "side": "LONG" if size > 0 else "SHORT",
                "size": abs(size),
                "entry_price": entry_price,
                "current_price": current_price,
                "unrealized_pnl": unrealized_pnl,
                "liquidation_price": entry_price * (0.8 if size > 0 else 1.2),
                "timestamp": (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat(),
                "exchange": self.exchange_name
            }
            positions.append(position)
        
        return positions
    
    async def get_account_balance(self) -> Dict[str, Any]:
        """Get mock account balance."""
        return {
            "total_equity": random.uniform(5000, 50000),
            "free_collateral": random.uniform(1000, 10000),
            "margin_fraction": random.uniform(0.1, 0.5),
            "maintenance_margin_requirement": random.uniform(100, 500),
            "initial_margin_requirement": random.uniform(500, 1000)
        }
    
    async def get_market_data(self, symbol: str) -> Dict[str, Any]:
        """Get mock market data for a symbol."""
        return {
            "symbol": symbol,
            "last_price": random.uniform(100, 80000),
            "mark_price": random.uniform(100, 80000),
            "index_price": random.uniform(100, 80000),
            "funding_rate": random.uniform(-0.01, 0.01),
            "next_funding_time": (datetime.now() + timedelta(hours=random.randint(1, 8))).isoformat(),
            "open_interest": random.uniform(1000, 10000),
            "volume_24h": random.uniform(10000, 100000)
        }


class MockHyperliquidClient(MockExchangeClient):
    """Mock Hyperliquid client."""
    
    def __init__(self):
        super().__init__("hyperliquid")


class MockSonicClient(MockExchangeClient):
    """Mock Sonic client."""
    
    def __init__(self):
        super().__init__("sonic")


class MockVertexClient(MockExchangeClient):
    """Mock Vertex client."""
    
    def __init__(self):
        super().__init__("vertex")
