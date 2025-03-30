"""
Integrated Trading Farm dashboard with Hyperliquid, ElizaOS, and multi-chain support.
"""
import os
import sys
import json
import logging
import requests
import argparse
from typing import Dict, Any, List, Optional
from datetime import datetime
import threading
import time

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import dashboard configuration
from integrated_dashboard_config import (
    DASHBOARD_CONFIG, MCP_CONFIG, ELIZAOS_CONFIG, 
    CHAIN_CONFIGS, STRATEGY_CONFIG
)

# Import existing Trading Farm modules
from src.monitoring.dashboard import TradingDashboard
from hyperliquid_integration import setup_hyperliquid_dashboard

# Import dashboard routes
from dashboard.routes import blueprints

# Import vault banking blueprint
from vault_banking.routes import vault_banking_blueprint

# Register vault banking blueprint
blueprints.register_blueprint(vault_banking_blueprint)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("integrated_dashboard.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("integrated_dashboard")

class IntegratedTradingDashboard:
    """
    Integrated dashboard for Trading Farm with multi-chain support and ElizaOS integration.
    """
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the integrated dashboard."""
        self.config = config or DASHBOARD_CONFIG
        self.mcp_config = MCP_CONFIG
        self.elizaos_config = ELIZAOS_CONFIG
        self.chain_configs = CHAIN_CONFIGS
        self.strategy_config = STRATEGY_CONFIG
        
        # Initialize base dashboard
        self.dashboard = None
        
        # Status trackers
        self.mcp_status = {name: {"status": "initializing", "last_check": None} 
                         for name in self.mcp_config.keys()}
        self.chain_status = {name: {"status": "initializing", "last_check": None} 
                           for name in self.chain_configs.keys() if self.chain_configs[name].get("enabled", False)}
        
        logger.info("Integrated dashboard initialized")

    def setup_dashboard(self):
        """Set up the integrated dashboard."""
        # Create base dashboard
        from src.monitoring.dashboard import create_dashboard
        self.dashboard = create_dashboard()
        
        # Set up Hyperliquid integration
        self._setup_hyperliquid()
        
        # Set up database connection through Neon MCP
        self._setup_neon_database()
        
        # Set up ElizaOS integration
        self._setup_elizaos()
        
        # Set up multi-chain trading panels
        self._setup_multichain_panels()
        
        # Set up autonomous trading agents
        self._setup_autonomous_agents()
        
        # Start health check thread
        self._start_health_check_thread()
        
        logger.info("Integrated dashboard setup complete")
        return self.dashboard

    def _setup_hyperliquid(self):
        """Set up Hyperliquid integration."""
        logger.info("Setting up Hyperliquid integration")
        from hyperliquid_integration import setup_hyperliquid_dashboard
        setup_hyperliquid_dashboard(self.dashboard.app)
        logger.info("Hyperliquid integration complete")

    def _setup_neon_database(self):
        """Set up Neon database connection."""
        logger.info("Setting up Neon database connection")
        
        # Check if Neon MCP is enabled and configured
        if not self.mcp_config.get("neon", {}).get("enabled", False):
            logger.warning("Neon MCP not enabled, skipping database setup")
            return
        
        try:
            # Test connection to Neon MCP
            endpoint = self.mcp_config["neon"]["endpoint"]
            response = requests.get(f"{endpoint}/health")
            
            if response.status_code == 200:
                logger.info("Successfully connected to Neon MCP")
                self.mcp_status["neon"] = {"status": "connected", "last_check": datetime.now()}
                
                # Create database schema if needed
                self._create_strategy_schema()
            else:
                logger.error(f"Failed to connect to Neon MCP: {response.status_code}")
                self.mcp_status["neon"] = {"status": "error", "last_check": datetime.now()}
        
        except Exception as e:
            logger.error(f"Error connecting to Neon MCP: {e}")
            self.mcp_status["neon"] = {"status": "error", "last_check": datetime.now()}
    
    def _create_strategy_schema(self):
        """Create strategy schema in Neon database."""
        logger.info("Creating strategy schema in Neon database")
        
        try:
            # Use Neon MCP to run SQL for creating tables
            endpoint = self.mcp_config["neon"]["endpoint"]
            
            # Strategy table
            create_strategy_table = """
            CREATE TABLE IF NOT EXISTS strategies (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                chain TEXT NOT NULL,
                asset TEXT NOT NULL,
                config JSONB NOT NULL,
                creator TEXT NOT NULL,
                is_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            """
            
            response = requests.post(
                f"{endpoint}/execute",
                json={
                    "name": "mcp4_run_sql",
                    "parameters": {
                        "projectId": self.strategy_config.get("db_project_id", ""),
                        "databaseName": self.strategy_config.get("db_name", "trading_farm"),
                        "sql": create_strategy_table
                    }
                }
            )
            
            if response.status_code == 200:
                logger.info("Strategy table created successfully")
            else:
                logger.error(f"Failed to create strategy table: {response.text}")
                
            # Strategy performance table
            create_performance_table = """
            CREATE TABLE IF NOT EXISTS strategy_performance (
                id UUID PRIMARY KEY,
                strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
                period TEXT NOT NULL,
                start_date TIMESTAMP WITH TIME ZONE NOT NULL,
                end_date TIMESTAMP WITH TIME ZONE NOT NULL,
                metrics JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            """
            
            response = requests.post(
                f"{endpoint}/execute",
                json={
                    "name": "mcp4_run_sql",
                    "parameters": {
                        "projectId": self.strategy_config.get("db_project_id", ""),
                        "databaseName": self.strategy_config.get("db_name", "trading_farm"),
                        "sql": create_performance_table
                    }
                }
            )
            
            if response.status_code == 200:
                logger.info("Strategy performance table created successfully")
            else:
                logger.error(f"Failed to create strategy performance table: {response.text}")
        
        except Exception as e:
            logger.error(f"Error creating strategy schema: {e}")

    def _setup_elizaos(self):
        """Set up ElizaOS integration."""
        logger.info("Setting up ElizaOS integration")
        
        # Add ElizaOS command routes to dashboard
        @self.dashboard.app.callback(
            output=None,
            inputs=[
                {"id": "elizaos-command-input", "property": "value"},
                {"id": "send-command-button", "property": "n_clicks"}
            ],
            prevent_initial_call=True
        )
        def send_elizaos_command(command, n_clicks):
            if not command or not n_clicks:
                return
            
            try:
                # Send command to ElizaOS API
                response = requests.post(
                    f"{self.elizaos_config['api_endpoint']}/agents/{self.elizaos_config['agent_id_prefix']}1/command",
                    json={"command": command, "parameters": {}}
                )
                
                if response.status_code == 200:
                    logger.info(f"ElizaOS command executed successfully: {command}")
                    # Results will be handled by websocket connection
                else:
                    logger.error(f"Failed to execute ElizaOS command: {response.text}")
                    
            except Exception as e:
                logger.error(f"Error sending ElizaOS command: {e}")
        
        logger.info("ElizaOS integration complete")

    def _setup_multichain_panels(self):
        """Set up multi-chain trading panels."""
        logger.info("Setting up multi-chain trading panels")
        
        # Set up panels for each enabled chain
        for chain_name, chain_config in self.chain_configs.items():
            if chain_config.get("enabled", False):
                logger.info(f"Setting up {chain_name} panel")
                
                # For now, we'll just set up routes to the panel HTML
                @self.dashboard.app.server.route(f"/{chain_name}_panel.html")
                def serve_chain_panel():
                    return self.dashboard.app.server.send_static_file(f"{chain_name}_panel.html")
                
                # TODO: Add dynamic panel generation similar to Hyperliquid

    def _setup_autonomous_agents(self):
        """Set up autonomous trading agents."""
        logger.info("Setting up autonomous trading agents")
        
        # This function will coordinate the autonomous agents across chains
        # It will use ElizaOS for AI decision making and the chain-specific
        # MCP servers for executing trades
        
        # For now, we'll just set up the agent status tracker
        self.agent_status = {}
        
        for chain_name, chain_config in self.chain_configs.items():
            if chain_config.get("enabled", False):
                self.agent_status[chain_name] = {
                    "status": "initialized",
                    "active": False,
                    "last_trade": None,
                    "strategy_id": None
                }
        
        logger.info("Autonomous trading agents initialized")

    def _start_health_check_thread(self):
        """Start a thread to periodically check the health of all components."""
        def health_check_worker():
            """Worker function for health check thread."""
            while True:
                try:
                    # Check MCP servers
                    for name, config in self.mcp_config.items():
                        if config.get("enabled", False):
                            try:
                                endpoint = config["endpoint"]
                                response = requests.get(f"{endpoint}/health", timeout=5)
                                
                                if response.status_code == 200:
                                    self.mcp_status[name] = {"status": "healthy", "last_check": datetime.now()}
                                else:
                                    self.mcp_status[name] = {"status": "error", "last_check": datetime.now()}
                            except Exception as e:
                                logger.error(f"Error checking {name} MCP health: {e}")
                                self.mcp_status[name] = {"status": "error", "last_check": datetime.now()}
                    
                    # Check chain status
                    for chain_name, chain_config in self.chain_configs.items():
                        if chain_config.get("enabled", False):
                            # TODO: Implement chain-specific health checks
                            pass
                    
                    # Sleep for 60 seconds
                    time.sleep(60)
                    
                except Exception as e:
                    logger.error(f"Error in health check thread: {e}")
                    time.sleep(60)  # Still sleep if there's an error
        
        # Start thread
        health_thread = threading.Thread(target=health_check_worker, daemon=True)
        health_thread.start()
        logger.info("Health check thread started")

    def run_dashboard(self, host=None, port=None, debug=None):
        """Run the integrated dashboard."""
        host = host or self.config.get("host", "0.0.0.0")
        port = port or self.config.get("port", 9386)
        debug = debug if debug is not None else self.config.get("debug", False)
        
        logger.info(f"Running integrated dashboard on {host}:{port}")
        self.dashboard.app.run_server(host=host, port=port, debug=debug)

def create_integrated_dashboard(config: Dict[str, Any] = None) -> IntegratedTradingDashboard:
    """Create and set up the integrated dashboard."""
    dashboard = IntegratedTradingDashboard(config)
    dashboard.setup_dashboard()
    return dashboard

def main():
    """Main entry point for the integrated dashboard."""
    parser = argparse.ArgumentParser(description="Integrated Trading Farm Dashboard")
    parser.add_argument("--host", type=str, default=None, help="Host to run the server on")
    parser.add_argument("--port", type=int, default=None, help="Port to run the server on")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    
    args = parser.parse_args()
    
    # Create and run integrated dashboard
    dashboard = create_integrated_dashboard()
    dashboard.run_dashboard(host=args.host, port=args.port, debug=args.debug)

if __name__ == "__main__":
    main()
