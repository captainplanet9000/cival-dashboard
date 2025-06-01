"""
Test script for Sonic and Vertex Protocol integrations with ElizaOS
"""
import sys
import os
import unittest
import json
import time
from unittest.mock import patch, MagicMock

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.agents.sonic_agent import SonicClient, SonicAgent
from src.agents.vertex_agent import VertexClient, VertexAgent
from src.strategies.sonic_strategies import SonicMomentumStrategy, SonicLiquidityProvisionStrategy
from src.strategies.vertex_strategies import VertexMeanReversionStrategy, VertexTrendFollowingStrategy
from src.agents.eliza_bridge import ElizaAgentBridge
from src.api.sonic_vertex_api import initialize_protocol_api


class TestSonicProtocol(unittest.TestCase):
    """Test Sonic Protocol integration"""
    
    def setUp(self):
        """Set up test environment"""
        # Mock configuration
        self.config = {
            "use_testnet": True,
            "wallet": {
                "address": "0xTestWalletAddress",
                "private_key": "0xTestPrivateKey"
            },
            "active_pairs": [
                ["SUI", "USDC"],
                ["ETH", "USDC"]
            ]
        }
        
        # Create a mock for SonicClient to avoid actual network calls
        self.client_patcher = patch('src.agents.sonic_agent.SonicClient')
        self.mock_client = self.client_patcher.start()
        self.mock_client_instance = self.mock_client.return_value
        
        # Set up mock responses
        self.mock_client_instance.get_pool_info.return_value = {
            "pair": "SUI-USDC",
            "tvl": 1000000,
            "apr": 0.05,
            "volume_24h": 500000,
            "fees_24h": 1500
        }
        
        self.mock_client_instance.get_token_price.return_value = 1.25
        
        # Create agent with mocked client
        self.agent = SonicAgent("test_sonic_agent", self.config)
        self.agent.client = self.mock_client_instance
        
    def tearDown(self):
        """Clean up after tests"""
        self.client_patcher.stop()
    
    def test_agent_initialization(self):
        """Test if SonicAgent initializes correctly"""
        self.assertEqual(self.agent.name, "test_sonic_agent")
        self.assertEqual(self.agent.use_testnet, True)
        self.assertEqual(len(self.agent.active_pairs), 2)
    
    def test_swap_tokens(self):
        """Test swap_tokens functionality"""
        # Set up mock for swap
        self.mock_client_instance.swap_tokens.return_value = {
            "success": True,
            "transaction_id": "0xTestTransactionId",
            "from_amount": 10,
            "to_amount": 12.5,
            "from_token": "SUI",
            "to_token": "USDC",
            "price": 1.25
        }
        
        # Execute swap
        result = self.agent.swap_tokens("SUI", "USDC", 10)
        
        # Verify result
        self.assertTrue(result["success"])
        self.assertEqual(result["from_token"], "SUI")
        self.assertEqual(result["to_token"], "USDC")
        self.assertEqual(result["from_amount"], 10)
        
        # Verify method was called with correct arguments
        self.mock_client_instance.swap_tokens.assert_called_with("SUI", "USDC", 10)
    
    def test_add_liquidity(self):
        """Test add_liquidity functionality"""
        # Set up mock for add_liquidity
        self.mock_client_instance.add_liquidity.return_value = {
            "success": True,
            "transaction_id": "0xTestTransactionId",
            "token_a": "SUI",
            "token_b": "USDC",
            "amount_a": 100,
            "amount_b": 125,
            "lp_tokens": 112.5
        }
        
        # Execute add_liquidity
        result = self.agent.add_liquidity("SUI", "USDC", 100, 125)
        
        # Verify result
        self.assertTrue(result["success"])
        self.assertEqual(result["token_a"], "SUI")
        self.assertEqual(result["token_b"], "USDC")
        self.assertEqual(result["amount_a"], 100)
        self.assertEqual(result["amount_b"], 125)
        
        # Verify method was called with correct arguments
        self.mock_client_instance.add_liquidity.assert_called_with("SUI", "USDC", 100, 125)
    
    def test_momentum_strategy(self):
        """Test SonicMomentumStrategy"""
        # Create strategy
        strategy = SonicMomentumStrategy(
            name="test_momentum",
            parameters={
                "short_window": 5,
                "long_window": 20,
                "threshold": 0.01,
                "position_size": 0.1
            }
        )
        
        # Mock price history data
        price_history = [
            {"timestamp": time.time() - i*3600, "price": 1.0 + i*0.01}
            for i in range(30)
        ]
        price_history.reverse()  # Most recent last
        
        # Mock the analyze_market method to use our test data
        with patch.object(strategy, '_get_price_history', return_value=price_history):
            # Execute strategy
            self.agent.strategy = strategy
            signals = self.agent.execute_strategy("SUI-USDC")
            
            # Verify signal generation
            self.assertIsNotNone(signals)
            self.assertIn("signals", signals)
            self.assertTrue(isinstance(signals["signals"], list))
    
    def test_liquidity_provision_strategy(self):
        """Test SonicLiquidityProvisionStrategy"""
        # Create strategy
        strategy = SonicLiquidityProvisionStrategy(
            name="test_liquidity_provision",
            parameters={
                "target_apr": 0.04,
                "rebalance_threshold": 0.02,
                "max_position_size": 0.2
            }
        )
        
        # Mock pool data
        pool_data = {
            "pair": "SUI-USDC",
            "tvl": 1000000,
            "apr": 0.05,
            "volume_24h": 500000,
            "fees_24h": 1500
        }
        
        # Mock the analyze_pool method to use our test data
        with patch.object(strategy, '_get_pool_data', return_value=pool_data):
            # Execute strategy
            self.agent.strategy = strategy
            signals = self.agent.execute_strategy("SUI-USDC")
            
            # Verify signal generation
            self.assertIsNotNone(signals)
            self.assertIn("signals", signals)
            self.assertTrue(isinstance(signals["signals"], list))


class TestVertexProtocol(unittest.TestCase):
    """Test Vertex Protocol integration"""
    
    def setUp(self):
        """Set up test environment"""
        # Mock configuration
        self.config = {
            "use_testnet": True,
            "wallet": {
                "address": "0xTestWalletAddress",
                "private_key": "0xTestPrivateKey"
            },
            "active_markets": [
                "ETH-PERP",
                "BTC-PERP"
            ]
        }
        
        # Create a mock for VertexClient to avoid actual network calls
        self.client_patcher = patch('src.agents.vertex_agent.VertexClient')
        self.mock_client = self.client_patcher.start()
        self.mock_client_instance = self.mock_client.return_value
        
        # Set up mock responses
        self.mock_client_instance.get_market_data.return_value = {
            "symbol": "ETH-PERP",
            "price": 3000.0,
            "change_24h": 0.05,
            "volume_24h": 25000000,
            "open_interest": 15000000
        }
        
        self.mock_client_instance.get_mark_price.return_value = 3000.0
        
        # Create agent with mocked client
        self.agent = VertexAgent("test_vertex_agent", self.config)
        self.agent.client = self.mock_client_instance
        
    def tearDown(self):
        """Clean up after tests"""
        self.client_patcher.stop()
    
    def test_agent_initialization(self):
        """Test if VertexAgent initializes correctly"""
        self.assertEqual(self.agent.name, "test_vertex_agent")
        self.assertEqual(self.agent.use_testnet, True)
        self.assertEqual(len(self.agent.active_markets), 2)
    
    def test_place_order(self):
        """Test place_order functionality"""
        # Set up mock for place_order
        self.mock_client_instance.place_order.return_value = {
            "success": True,
            "order_id": "order123",
            "market": "ETH-PERP",
            "side": "BUY",
            "type": "LIMIT",
            "size": 1.0,
            "price": 3000.0,
            "status": "OPEN"
        }
        
        # Execute order
        result = self.agent.place_order("ETH-PERP", "BUY", "LIMIT", 1.0, 3000.0)
        
        # Verify result
        self.assertTrue(result["success"])
        self.assertEqual(result["market"], "ETH-PERP")
        self.assertEqual(result["side"], "BUY")
        self.assertEqual(result["size"], 1.0)
        
        # Verify method was called with correct arguments
        self.mock_client_instance.place_order.assert_called_with(
            "ETH-PERP", "BUY", "LIMIT", 1.0, 3000.0
        )
    
    def test_get_positions(self):
        """Test get_positions functionality"""
        # Set up mock for get_positions
        self.mock_client_instance.get_positions.return_value = [
            {
                "position_id": "pos123",
                "market": "ETH-PERP",
                "side": "LONG",
                "size": 1.0,
                "entry_price": 2900.0,
                "mark_price": 3000.0,
                "unrealized_pnl": 100.0,
                "unrealized_pnl_pct": 0.0345
            }
        ]
        
        # Get positions
        positions = self.agent.get_positions()
        
        # Verify result
        self.assertEqual(len(positions), 1)
        self.assertEqual(positions[0]["market"], "ETH-PERP")
        self.assertEqual(positions[0]["side"], "LONG")
        self.assertEqual(positions[0]["size"], 1.0)
        
        # Verify method was called
        self.mock_client_instance.get_positions.assert_called_once()
    
    def test_mean_reversion_strategy(self):
        """Test VertexMeanReversionStrategy"""
        # Create strategy
        strategy = VertexMeanReversionStrategy(
            name="test_mean_reversion",
            parameters={
                "lookback_period": 20,
                "entry_threshold": 2.0,
                "position_size": 0.1,
                "take_profit": 0.05,
                "stop_loss": 0.03
            }
        )
        
        # Mock price history data
        price_history = [
            {"timestamp": time.time() - i*3600, "price": 3000.0 + (10-i)*50}  # Create a mean-reverting pattern
            for i in range(30)
        ]
        price_history.reverse()  # Most recent last
        
        # Mock the analyze_market method to use our test data
        with patch.object(strategy, '_get_price_history', return_value=price_history):
            # Execute strategy
            self.agent.strategy = strategy
            signals = self.agent.execute_strategy("ETH-PERP")
            
            # Verify signal generation
            self.assertIsNotNone(signals)
            self.assertIn("signals", signals)
            self.assertTrue(isinstance(signals["signals"], list))
    
    def test_trend_following_strategy(self):
        """Test VertexTrendFollowingStrategy"""
        # Create strategy
        strategy = VertexTrendFollowingStrategy(
            name="test_trend_following",
            parameters={
                "short_ma_period": 5,
                "long_ma_period": 20,
                "position_size": 0.1,
                "trailing_stop": 0.05
            }
        )
        
        # Mock price history data with a trend
        price_history = [
            {"timestamp": time.time() - i*3600, "price": 3000.0 - i*10}  # Downtrend
            for i in range(30)
        ]
        price_history.reverse()  # Most recent last
        
        # Mock the analyze_market method to use our test data
        with patch.object(strategy, '_get_price_history', return_value=price_history):
            # Execute strategy
            self.agent.strategy = strategy
            signals = self.agent.execute_strategy("ETH-PERP")
            
            # Verify signal generation
            self.assertIsNotNone(signals)
            self.assertIn("signals", signals)
            self.assertTrue(isinstance(signals["signals"], list))


class TestElizaOSIntegration(unittest.TestCase):
    """Test ElizaOS integration with Sonic and Vertex Agents"""
    
    def setUp(self):
        """Set up test environment"""
        # Mock ElizaAgentBridge to avoid actual ElizaOS calls
        self.bridge_patcher = patch('src.agents.eliza_bridge.ElizaAgentBridge')
        self.mock_bridge = self.bridge_patcher.start()
        self.mock_bridge_instance = self.mock_bridge.return_value
        
        # Set up mock responses
        self.mock_bridge_instance.register_agent.return_value = {
            "success": True,
            "agent_id": "eliza_agent_123",
            "message": "Agent registered successfully"
        }
        
        self.mock_bridge_instance.send_status_update.return_value = {
            "success": True,
            "message": "Status update received"
        }
        
        # Create sonic and vertex agents
        self.sonic_config = {
            "use_testnet": True,
            "wallet": {"address": "0xTest", "private_key": "0xKey"},
            "active_pairs": [["SUI", "USDC"]]
        }
        
        self.vertex_config = {
            "use_testnet": True,
            "wallet": {"address": "0xTest", "private_key": "0xKey"},
            "active_markets": ["ETH-PERP"]
        }
        
        # Mock agent classes
        self.sonic_agent_patcher = patch('src.agents.sonic_agent.SonicAgent')
        self.mock_sonic_agent = self.sonic_agent_patcher.start()
        self.mock_sonic_instance = self.mock_sonic_agent.return_value
        
        self.vertex_agent_patcher = patch('src.agents.vertex_agent.VertexAgent')
        self.mock_vertex_agent = self.vertex_agent_patcher.start()
        self.mock_vertex_instance = self.mock_vertex_agent.return_value
        
    def tearDown(self):
        """Clean up after tests"""
        self.bridge_patcher.stop()
        self.sonic_agent_patcher.stop()
        self.vertex_agent_patcher.stop()
    
    def test_register_sonic_agent(self):
        """Test registering a Sonic agent with ElizaOS"""
        # Get bridge instance
        bridge = ElizaAgentBridge()
        
        # Register agent
        result = bridge.register_agent(
            agent_type="sonic",
            agent_name="test_sonic_agent",
            agent_config=self.sonic_config
        )
        
        # Verify result
        self.assertTrue(result["success"])
        self.assertEqual(result["agent_id"], "eliza_agent_123")
        
        # Verify method was called with correct arguments
        self.mock_bridge_instance.register_agent.assert_called_with(
            agent_type="sonic",
            agent_name="test_sonic_agent",
            agent_config=self.sonic_config
        )
    
    def test_register_vertex_agent(self):
        """Test registering a Vertex agent with ElizaOS"""
        # Get bridge instance
        bridge = ElizaAgentBridge()
        
        # Register agent
        result = bridge.register_agent(
            agent_type="vertex",
            agent_name="test_vertex_agent",
            agent_config=self.vertex_config
        )
        
        # Verify result
        self.assertTrue(result["success"])
        self.assertEqual(result["agent_id"], "eliza_agent_123")
        
        # Verify method was called with correct arguments
        self.mock_bridge_instance.register_agent.assert_called_with(
            agent_type="vertex",
            agent_name="test_vertex_agent",
            agent_config=self.vertex_config
        )
    
    def test_send_status_update(self):
        """Test sending status updates to ElizaOS"""
        # Get bridge instance
        bridge = ElizaAgentBridge()
        
        # Create status update
        status = {
            "agent_id": "eliza_agent_123",
            "status": "running",
            "last_action": "Executed trade",
            "performance": {
                "24h": 0.05,
                "7d": 0.12
            },
            "positions": [
                {"market": "ETH-PERP", "side": "LONG", "size": 1.0, "pnl": 0.05}
            ]
        }
        
        # Send status update
        result = bridge.send_status_update(status)
        
        # Verify result
        self.assertTrue(result["success"])
        
        # Verify method was called with correct arguments
        self.mock_bridge_instance.send_status_update.assert_called_with(status)
    
    @patch('src.api.sonic_vertex_api.SonicAgent')
    @patch('src.api.sonic_vertex_api.VertexAgent')
    def test_api_initialization(self, mock_vertex, mock_sonic):
        """Test API initialization"""
        from fastapi import FastAPI
        
        # Create FastAPI app
        app = FastAPI()
        
        # Initialize API
        router = initialize_protocol_api()
        
        # Check if router is returned
        self.assertIsNotNone(router)
        
        # Add router to app (should not raise exceptions)
        app.include_router(router, prefix="/api/v1/protocols")


if __name__ == "__main__":
    unittest.main()
