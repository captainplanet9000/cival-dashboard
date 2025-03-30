"""
ElizaOS MCP Server configuration for Trading Farm with multi-chain support.
"""
import os
from typing import Dict, Any, List

# Base MCP server configuration
BASE_MCP_PORT = 3001
BASE_API_PORT = 3000

# Chain-specific MCP ports (offset from base)
CHAIN_PORTS = {
    "hyperliquid": 0,     # Base port (3001)
    "arbitrum": 1,        # 3002
    "sonic": 2,           # 3003
    "solana": 3,          # 3004
    "sui": 4              # 3005
}

# Neon database configuration
NEON_CONFIG = {
    "api_key": os.environ.get("NEON_API_KEY", ""),
    "project_id": os.environ.get("NEON_PROJECT_ID", ""),
    "branch_id": os.environ.get("NEON_BRANCH_ID", ""),
    "database_name": "trading_farm"
}

# Enhanced ElizaOS configuration with advanced multi-agent capabilities
ELIZAOS_CONFIG = {
    "api_endpoint": f"http://localhost:{BASE_API_PORT}/api",
    "agent_id_prefix": "eliza_trading_agent_",
    "simulation_mode": os.environ.get("ELIZAOS_SIMULATION_MODE", "true").lower() == "true",
    
    # Advanced memory capabilities
    "memory_enabled": True,
    "memory_retention_days": 90,
    "long_term_memory_db": "neon",
    "memory_vectorization": True,
    
    # Multi-agent coordination system
    "multi_agent_coordination": True,
    "max_agents_per_chain": 5,  # Increased from 3
    "agent_specializations": [
        "market_analysis", 
        "execution", 
        "risk_management", 
        "portfolio_optimization",
        "cross_chain_arbitrage"
    ],
    
    # Agent communication
    "agent_communication_enabled": True,
    "communication_protocol": "message_queue",
    "consensus_mechanism": "weighted_voting",
    
    # AI model configuration
    "default_model": "gpt-4",
    "specialized_models": {
        "market_analysis": "gpt-4-turbo",
        "execution": "gpt-3.5-turbo",  # Faster model for quick execution decisions
        "risk_management": "gpt-4",
        "portfolio_optimization": "gpt-4-turbo"
    },
    
    # Advanced decision making
    "decision_framework": {
        "risk_threshold": float(os.environ.get("ELIZAOS_RISK_THRESHOLD", "0.4")),  # 0-1 scale
        "max_drawdown_percent": float(os.environ.get("ELIZAOS_MAX_DRAWDOWN", "5.0")),
        "confidence_threshold": float(os.environ.get("ELIZAOS_CONFIDENCE_THRESHOLD", "0.7")),
        "consensus_required": float(os.environ.get("ELIZAOS_CONSENSUS_REQUIRED", "0.66")),  # 66% agent agreement
    },
    
    # Cross-chain trading capabilities
    "cross_chain_enabled": True,
    "cross_chain_strategies": ["arbitrage", "hedging", "liquidity_provision"],
    "cross_chain_coordination_interval_seconds": 60,
    
    # Backtesting and simulation
    "backtesting_enabled": True,
    "historical_data_days": 180,
    "simulation_acceleration_factor": 1.0,  # 1.0 = real-time
    
    # Web interface
    "web_dashboard_enabled": True,
    "dashboard_update_interval_ms": 1000,
    "websocket_enabled": True
}

# Chain-specific configurations
CHAIN_CONFIGS = {
    "hyperliquid": {
        "api_url": "https://api.hyperliquid.xyz",
        "testnet": False,
        "private_key_env": "HYPERLIQUID_PRIVATE_KEY",
        "wallet_address_env": "HYPERLIQUID_WALLET_ADDRESS",
        "assets": ["ETH", "BTC", "SOL", "ARB"],
        "max_leverage": 10.0,
        "default_slippage_tolerance": 0.005,  # 0.5%
        "min_order_size": {
            "ETH": 0.01,
            "BTC": 0.001,
            "SOL": 0.1,
            "ARB": 1.0
        },
        "trading_fee_percent": 0.1
    },
    "arbitrum": {
        "api_url": "https://api.arbitrum.io",
        "testnet": False,
        "private_key_env": "ARBITRUM_PRIVATE_KEY",
        "wallet_address_env": "ARBITRUM_WALLET_ADDRESS",
        "assets": ["ETH", "ARB", "LINK", "UNI"],
        "max_leverage": 5.0,
        "default_slippage_tolerance": 0.01,  # 1%
        "min_order_size": {
            "ETH": 0.01,
            "ARB": 5.0,
            "LINK": 1.0,
            "UNI": 1.0
        },
        "trading_fee_percent": 0.2
    },
    "sonic": {
        "api_url": "https://api.sonic.exchange",
        "testnet": False,
        "private_key_env": "SONIC_PRIVATE_KEY",
        "wallet_address_env": "SONIC_WALLET_ADDRESS",
        "assets": ["SONIC", "ETH", "BTC", "USDC"],
        "max_leverage": 3.0,
        "default_slippage_tolerance": 0.008,  # 0.8%
        "min_order_size": {
            "SONIC": 10.0,
            "ETH": 0.01,
            "BTC": 0.001,
            "USDC": 10.0
        },
        "trading_fee_percent": 0.15
    },
    "solana": {
        "api_url": "https://api.solana.com",
        "testnet": False,
        "private_key_env": "SOLANA_PRIVATE_KEY",
        "wallet_address_env": "SOLANA_WALLET_ADDRESS",
        "assets": ["SOL", "BONK", "RAY", "USDC"],
        "max_leverage": 5.0,
        "default_slippage_tolerance": 0.01,  # 1%
        "min_order_size": {
            "SOL": 0.1,
            "BONK": 1000.0,
            "RAY": 1.0,
            "USDC": 10.0
        },
        "trading_fee_percent": 0.2
    },
    "sui": {
        "api_url": "https://api.sui.io",
        "testnet": False,
        "private_key_env": "SUI_PRIVATE_KEY",
        "wallet_address_env": "SUI_WALLET_ADDRESS",
        "assets": ["SUI", "CETUS", "SUISWAP", "USDC"],
        "max_leverage": 3.0,
        "default_slippage_tolerance": 0.015,  # 1.5%
        "min_order_size": {
            "SUI": 1.0,
            "CETUS": 5.0,
            "SUISWAP": 1.0,
            "USDC": 10.0
        },
        "trading_fee_percent": 0.25
    }
}

# Global risk management configuration
RISK_CONFIG = {
    "enabled": True,
    "max_portfolio_risk": float(os.environ.get("MAX_PORTFOLIO_RISK", "0.05")),  # 5% max risk
    "max_drawdown_percent": float(os.environ.get("MAX_DRAWDOWN_PERCENT", "10.0")),  # 10% max drawdown
    "max_position_size_percent": float(os.environ.get("MAX_POSITION_SIZE_PERCENT", "20.0")),  # 20% of portfolio per position
    "max_leverage": float(os.environ.get("MAX_LEVERAGE", "5.0")),  # 5x max leverage
    "stop_loss_percent": float(os.environ.get("STOP_LOSS_PERCENT", "2.0")),  # 2% stop loss default
    "take_profit_percent": float(os.environ.get("TAKE_PROFIT_PERCENT", "5.0")),  # 5% take profit default
    "auto_hedging": os.environ.get("AUTO_HEDGING", "false").lower() == "true",
    "max_correlation_threshold": 0.7,  # Max correlation between positions
    "auto_adjust_position_sizing": True,
    "risk_models": ["var", "cvar", "monte_carlo", "sharpe_ratio"],
    "default_risk_model": "var",
    "portfolio_rebalance_threshold_percent": 5.0,  # Trigger rebalance at 5% drift
    "liquidation_buffer_percent": 20.0,  # Keep 20% buffer from liquidation
}

# Strategy configuration
STRATEGY_CONFIG = {
    "db_table": "strategies",
    "default_risk_level": "medium",
    "auto_activate": False,
    "backtest_enabled": True,
    "metrics": ["sharpe_ratio", "drawdown", "win_rate", "profit_factor", "calmar_ratio", "sortino_ratio"],
    "cross_chain_strategies_enabled": True,
    "strategy_types": ["trend_following", "mean_reversion", "breakout", "arbitrage", "grid", "options_strategies"],
    "parameter_optimization": {
        "enabled": True,
        "optimization_method": "genetic",  # Options: grid, random, bayesian, genetic
        "max_iterations": 100,
        "population_size": 50,
        "parallel_backtests": 4
    }
}

def get_mcp_port(chain: str) -> int:
    """Get the MCP port for a specific chain."""
    offset = CHAIN_PORTS.get(chain, 0)
    return BASE_MCP_PORT + offset

def get_chain_config(chain: str) -> Dict[str, Any]:
    """Get the configuration for a specific chain."""
    return CHAIN_CONFIGS.get(chain, {})

def get_all_supported_assets() -> List[str]:
    """Get a list of all supported assets across all chains."""
    all_assets = []
    for chain_config in CHAIN_CONFIGS.values():
        all_assets.extend(chain_config.get("assets", []))
    return sorted(list(set(all_assets)))  # Remove duplicates and sort

def get_risk_profile(profile_name: str = "default") -> Dict[str, Any]:
    """Get a risk profile configuration."""
    # Future enhancement: support multiple named risk profiles
    return RISK_CONFIG
