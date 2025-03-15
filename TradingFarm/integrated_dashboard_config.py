"""
Configuration for the integrated Trading Farm dashboard with multi-chain support.
"""
import os
from typing import Dict, Any, List

# Dashboard configuration
DASHBOARD_CONFIG = {
    "port": 9386,
    "host": "0.0.0.0",
    "debug": False,
    "title": "Trading Farm Master Control Panel",
    "theme": "dark",
    "logo_path": "static/logo.png"
}

# MCP server configuration - using existing MCP servers from your config
MCP_CONFIG = {
    "neon": {
        "enabled": True,
        "endpoint": "http://localhost:3003",
        "api_key": os.environ.get("NEON_API_KEY", "napi_s70cf7v9o45i1fui1ywaauxwogngmyfgh4oru2vx90e9vexy10b1grf9dg5jl98g")
    },
    "browserbase": {
        "enabled": True,
        "endpoint": "http://localhost:3004"
    },
    "hyperliquid": {
        "enabled": True,
        "endpoint": "http://localhost:3001"
    }
}

# ElizaOS configuration
ELIZAOS_CONFIG = {
    "api_endpoint": "http://localhost:3000/api",
    "agent_id_prefix": "eliza_trading_agent_",
    "command_console_enabled": True
}

# Chain configurations for multi-chain trading
CHAIN_CONFIGS = {
    "hyperliquid": {
        "enabled": True,
        "panel_url": "/hyperliquid_panel.html#",
        "assets": ["ETH", "BTC", "SOL", "ARB"],
        "mcp_tools": [
            "mcp0_hyperliquid_get_ticker",
            "mcp0_hyperliquid_get_account_balance",
            "mcp0_hyperliquid_get_positions",
            "mcp0_hyperliquid_create_order"
        ]
    },
    "arbitrum": {
        "enabled": True,
        "panel_url": "/arbitrum_panel.html#",
        "assets": ["ETH", "ARB", "LINK", "UNI"],
        "mcp_tools": [
            "mcp0_arbitrum_get_balance",
            "mcp0_arbitrum_get_positions",
            "mcp0_arbitrum_create_order"
        ]
    },
    "sonic": {
        "enabled": True,
        "panel_url": "/sonic_panel.html#",
        "assets": ["SONIC", "ETH", "BTC", "USDC"],
        "mcp_tools": [
            "mcp0_sonic_get_balance",
            "mcp0_sonic_get_positions",
            "mcp0_sonic_create_order"
        ]
    },
    "solana": {
        "enabled": True,
        "panel_url": "/solana_panel.html#",
        "assets": ["SOL", "BONK", "RAY", "USDC"],
        "mcp_tools": [
            "mcp0_solana_get_balance",
            "mcp0_solana_get_positions",
            "mcp0_solana_create_order"
        ]
    }
}

# Strategy configuration - stored in Neon database
STRATEGY_CONFIG = {
    "db_project_id": os.environ.get("NEON_PROJECT_ID", ""),
    "db_name": "trading_farm",
    "table_name": "strategies",
    "default_risk_level": "medium",
    "auto_activate": False,
    "backtest_enabled": True,
    "metrics": ["sharpe_ratio", "drawdown", "win_rate", "profit_factor"]
}

def get_chain_config(chain: str) -> Dict[str, Any]:
    """Get the configuration for a specific chain."""
    return CHAIN_CONFIGS.get(chain, {})

def get_all_supported_assets() -> List[str]:
    """Get a list of all supported assets across all chains."""
    all_assets = []
    for chain_config in CHAIN_CONFIGS.values():
        if chain_config.get("enabled", False):
            all_assets.extend(chain_config.get("assets", []))
    return sorted(list(set(all_assets)))  # Remove duplicates and sort
