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

# MCP server configuration - using real endpoints for production
MCP_CONFIG = {
    "neon": {
        "enabled": True,
        "endpoint": os.environ.get("NEON_MCP_ENDPOINT", "https://neon-mcp.tradingfarm.io"),
        "api_key": os.environ.get("NEON_API_KEY", "napi_s70cf7v9o45i1fui1ywaauxwogngmyfgh4oru2vx90e9vexy10b1grf9dg5jl98g")
    },
    "browserbase": {
        "enabled": True,
        "endpoint": os.environ.get("BROWSERBASE_MCP_ENDPOINT", "https://browserbase-mcp.tradingfarm.io")
    },
    "hyperliquid": {
        "enabled": True,
        "endpoint": os.environ.get("HYPERLIQUID_MCP_ENDPOINT", "https://hyperliquid-mcp.tradingfarm.io")
    }
}

# ElizaOS configuration
ELIZAOS_CONFIG = {
    "api_endpoint": os.environ.get("ELIZAOS_API_ENDPOINT", "https://elizaos-api.tradingfarm.io/api"),
    "agent_id_prefix": os.environ.get("ELIZAOS_AGENT_PREFIX", "eliza_trading_agent_"),
    "command_console_enabled": True
}

# Chain configurations for multi-chain trading
CHAIN_CONFIGS = {
    "hyperliquid": {
        "enabled": True,
        "panel_url": "/hyperliquid_panel.html#",
        "assets": ["ETH", "BTC", "SOL", "ARB"],
        "graphql_endpoint": os.environ.get("HYPERLIQUID_GRAPHQL_ENDPOINT", "https://api.hyperliquid.xyz/graphql"),
        "rest_endpoint": os.environ.get("HYPERLIQUID_REST_ENDPOINT", "https://api.hyperliquid.xyz/info"),
        "ws_endpoint": os.environ.get("HYPERLIQUID_WS_ENDPOINT", "wss://api.hyperliquid.xyz/ws"),
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
        "graphql_endpoint": os.environ.get("ARBITRUM_GRAPHQL_ENDPOINT", "https://api.arbitrum.io/graphql"),
        "rest_endpoint": os.environ.get("ARBITRUM_REST_ENDPOINT", "https://api.arbitrum.io/v1"),
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
        "graphql_endpoint": os.environ.get("SONIC_GRAPHQL_ENDPOINT", "https://api.sonic.trade/graphql"),
        "rest_endpoint": os.environ.get("SONIC_REST_ENDPOINT", "https://api.sonic.trade/v1"),
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
        "rest_endpoint": os.environ.get("SOLANA_REST_ENDPOINT", "https://api.mainnet-beta.solana.com"),
        "ws_endpoint": os.environ.get("SOLANA_WS_ENDPOINT", "wss://api.mainnet-beta.solana.com"),
        "mcp_tools": [
            "mcp0_solana_get_balance",
            "mcp0_solana_get_positions",
            "mcp0_solana_create_order"
        ]
    }
}

# Strategy configuration - stored in Neon database
STRATEGY_CONFIG = {
    "db_project_id": os.environ.get("NEON_PROJECT_ID", "bgvlzvswzpfoywfxehis"),
    "db_name": "trading_farm",
    "table_name": "strategies",
    "default_risk_level": "medium",
    "auto_activate": False,
    "backtest_enabled": True,
    "metrics": ["sharpe_ratio", "drawdown", "win_rate", "profit_factor"]
}

# GraphQL configuration for main API
GRAPHQL_CONFIG = {
    "endpoint": os.environ.get("GRAPHQL_API_ENDPOINT", "https://graphql.tradingfarm.io/v1/graphql"),
    "ws_endpoint": os.environ.get("GRAPHQL_WS_ENDPOINT", "wss://graphql.tradingfarm.io/v1/graphql"),
    "admin_secret": os.environ.get("GRAPHQL_ADMIN_SECRET", ""),
    "schema_path": "./schema.graphql"
}

# Supabase configuration
SUPABASE_CONFIG = {
    "url": os.environ.get("SUPABASE_URL", "https://bgvlzvswzpfoywfxehis.supabase.co"),
    "anon_key": os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU"),
    "service_role_key": os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
}

# Memory systems configuration
MEMORY_CONFIG = {
    "cognee": {
        "enabled": True,
        "api_key": os.environ.get("COGNEE_API_KEY", "")
    },
    "graphiti": {
        "enabled": True,
        "api_key": os.environ.get("GRAPHITI_API_KEY", "")
    }
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
