import pytest
import os
from unittest.mock import patch, MagicMock

from python_ai_services.core.factories import get_hyperliquid_execution_service_instance
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.services.hyperliquid_execution_service import HyperliquidExecutionService, HyperliquidExecutionServiceError

# Helper to create AgentConfigOutput for tests
def create_test_agent_config(
    agent_id: str,
    provider: str = "hyperliquid",
    wallet: Optional[str] = "0xWallet",
    priv_key_env_var: Optional[str] = "TEST_PRIV_KEY_VAR",
    network: str = "mainnet"
) -> AgentConfigOutput:
    config_dict: Dict[str, Any] = {
        "wallet_address": wallet,
        "private_key_env_var_name": priv_key_env_var,
        "network_mode": network
    }
    # Filter out None values if we want to test missing keys
    if wallet is None: del config_dict["wallet_address"]
    if priv_key_env_var is None: del config_dict["private_key_env_var_name"]

    return AgentConfigOutput(
        agent_id=agent_id,
        name=f"Agent {agent_id}",
        execution_provider=provider, #type: ignore
        hyperliquid_config=config_dict if provider == "hyperliquid" else None,
        strategy=AgentStrategyConfig(strategy_name="test", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
    )

def test_get_hles_agent_not_hyperliquid():
    agent_config = create_test_agent_config("agent1", provider="paper")
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is None

def test_get_hles_no_hyperliquid_config():
    agent_config = create_test_agent_config("agent2", provider="hyperliquid")
    agent_config.hyperliquid_config = None # Explicitly set to None
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is None

def test_get_hles_missing_wallet_address():
    agent_config = create_test_agent_config("agent3", wallet=None)
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is None

def test_get_hles_missing_priv_key_env_var():
    agent_config = create_test_agent_config("agent4", priv_key_env_var=None)
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is None

@patch.dict(os.environ, {}, clear=True) # Ensure env var is not set
def test_get_hles_priv_key_env_var_not_set():
    env_var_name = "UNSET_TEST_KEY_VAR"
    agent_config = create_test_agent_config("agent5", priv_key_env_var=env_var_name)
    # os.environ.pop(env_var_name, None) # Ensure it's not set
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is None

@patch.object(HyperliquidExecutionService, '__init__', return_value=None) # Mock HLES constructor
@patch.dict(os.environ, {"VALID_KEY_VAR": "0x123privkey"})
def test_get_hles_success(mock_hles_init: MagicMock):
    agent_config = create_test_agent_config(
        "agent_success",
        priv_key_env_var="VALID_KEY_VAR",
        wallet="0xRealWallet",
        network="testnet"
    )
    instance = get_hyperliquid_execution_service_instance(agent_config)

    assert instance is not None
    mock_hles_init.assert_called_once_with(
        wallet_address="0xRealWallet",
        private_key="0x123privkey",
        network_mode="testnet"
    )

@patch.object(HyperliquidExecutionService, '__init__', side_effect=HyperliquidExecutionServiceError("SDK Init Fail"))
@patch.dict(os.environ, {"FAIL_KEY_VAR": "0xanotherkey"})
def test_get_hles_constructor_raises_hles_error(mock_hles_init_fail: MagicMock):
    agent_config = create_test_agent_config("agent_hles_fail", priv_key_env_var="FAIL_KEY_VAR")
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is None
    mock_hles_init_fail.assert_called_once()


@patch.object(HyperliquidExecutionService, '__init__', side_effect=ValueError("Other Init Fail")) # Some other unexpected error
@patch.dict(os.environ, {"UNEXPECTED_FAIL_KEY_VAR": "0xunexpectedkey"})
def test_get_hles_constructor_raises_unexpected_error(mock_hles_init_unexpected_fail: MagicMock):
    agent_config = create_test_agent_config("agent_unexpected_fail", priv_key_env_var="UNEXPECTED_FAIL_KEY_VAR")
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is None
    mock_hles_init_unexpected_fail.assert_called_once()

@patch.object(HyperliquidExecutionService, '__init__', return_value=None)
@patch.dict(os.environ, {"DEFAULT_NET_KEY": "0xdefaultnetkey"})
def test_get_hles_invalid_network_mode_defaults_to_mainnet(mock_hles_init: MagicMock):
    agent_config = create_test_agent_config(
        "agent_invalid_network",
        priv_key_env_var="DEFAULT_NET_KEY",
        network="moonnet" # Invalid network
    )
    instance = get_hyperliquid_execution_service_instance(agent_config)
    assert instance is not None
    mock_hles_init.assert_called_once_with(
        wallet_address=agent_config.hyperliquid_config["wallet_address"], #type: ignore
        private_key="0xdefaultnetkey",
        network_mode="mainnet" # Should default to mainnet
    )


# --- Tests for get_dex_execution_service_instance ---
from ..services.dex_execution_service import DEXExecutionService, DEXExecutionServiceError # Adjusted for factory context

# Helper to create AgentConfigOutput for DEX tests
def create_dex_test_agent_config(
    agent_id: str,
    provider: str = "dex",
    dex_config_override: Optional[Dict[str, Any]] = None
) -> AgentConfigOutput:
    default_dex_config = {
        "wallet_address": "0xDexWallet",
        "private_key_env_var_name": "TEST_DEX_PK_VAR",
        "rpc_url_env_var_name": "TEST_RPC_URL_VAR",
        "dex_router_address": "0xDexRouter",
        "weth_address": "0xWETHAddress",
        "default_chain_id": 1,
        "default_gas_limit": 350000
    }
    if dex_config_override is not None:
        default_dex_config.update(dex_config_override)

    return AgentConfigOutput(
        agent_id=agent_id,
        name=f"DexAgent {agent_id}",
        execution_provider=provider, # type: ignore
        dex_config=default_dex_config if provider == "dex" else None,
        strategy=AgentStrategyConfig(strategy_name="dex_strat", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=5000, risk_per_trade_percentage=0.01)
    )

def test_get_dex_service_agent_not_dex_provider():
    agent_config = create_dex_test_agent_config("agent_paper", provider="paper")
    instance = get_dex_execution_service_instance(agent_config)
    assert instance is None

def test_get_dex_service_no_dex_config():
    agent_config = create_dex_test_agent_config("agent_no_dex_conf", provider="dex")
    agent_config.dex_config = None # Explicitly remove
    instance = get_dex_execution_service_instance(agent_config)
    assert instance is None

@patch.dict(os.environ, {}, clear=True)
def test_get_dex_service_missing_env_vars():
    # Test missing RPC URL env var
    agent_config_no_rpc_env = create_dex_test_agent_config("agent_dex_rpc_env_missing")
    with patch.dict(os.environ, {agent_config_no_rpc_env.dex_config["private_key_env_var_name"]: "0xkey"}): # type: ignore
        os.environ.pop(agent_config_no_rpc_env.dex_config["rpc_url_env_var_name"], None) # type: ignore
        instance = get_dex_execution_service_instance(agent_config_no_rpc_env)
        assert instance is None

    # Test missing Private Key env var
    agent_config_no_pk_env = create_dex_test_agent_config("agent_dex_pk_env_missing")
    with patch.dict(os.environ, {agent_config_no_pk_env.dex_config["rpc_url_env_var_name"]: "http://rpc"}): # type: ignore
        os.environ.pop(agent_config_no_pk_env.dex_config["private_key_env_var_name"], None) # type: ignore
        instance = get_dex_execution_service_instance(agent_config_no_pk_env)
        assert instance is None

def test_get_dex_service_missing_config_fields():
    # Missing wallet_address
    agent_config_mw = create_dex_test_agent_config("agent_mw", dex_config_override={"wallet_address": None})
    instance_mw = get_dex_execution_service_instance(agent_config_mw)
    assert instance_mw is None

    # Missing dex_router_address
    agent_config_mr = create_dex_test_agent_config("agent_mr", dex_config_override={"dex_router_address": None})
    instance_mr = get_dex_execution_service_instance(agent_config_mr)
    assert instance_mr is None


@patch.object(DEXExecutionService, '__init__', return_value=None) # Mock DEXExecutionService constructor
@patch.dict(os.environ, {
    "TEST_RPC_URL_VALID": "http://localhost:8545",
    "TEST_DEX_PK_VALID": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
})
def test_get_dex_service_success(mock_dex_init: MagicMock):
    agent_config = create_dex_test_agent_config(
        "agent_dex_success",
        dex_config_override={
            "rpc_url_env_var_name": "TEST_RPC_URL_VALID",
            "private_key_env_var_name": "TEST_DEX_PK_VALID",
            "default_chain_id": 5, # Goerli for PoA middleware test
            "default_gas_limit": 400000
        }
    )
    instance = get_dex_execution_service_instance(agent_config)
    assert instance is not None
    mock_dex_init.assert_called_once_with(
        wallet_address="0xDexWallet",
        private_key="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        rpc_url="http://localhost:8545",
        router_address="0xDexRouter",
        chain_id=5,
        weth_address="0xWETHAddress",
        default_gas_limit=400000
    )

@patch.object(DEXExecutionService, '__init__', side_effect=DEXExecutionServiceError("DEX Init Fail"))
@patch.dict(os.environ, {"TEST_RPC_URL_FAIL": "http://rpc", "TEST_DEX_PK_FAIL": "0xpk"})
def test_get_dex_service_constructor_raises_dex_error(mock_dex_init_fail: MagicMock):
    agent_config = create_dex_test_agent_config("agent_dex_init_fail", dex_config_override={
        "rpc_url_env_var_name": "TEST_RPC_URL_FAIL", "private_key_env_var_name": "TEST_DEX_PK_FAIL"
    })
    instance = get_dex_execution_service_instance(agent_config)
    assert instance is None


# Need to import Optional, Dict, Any for helper type hints
from typing import Optional, Dict, Any
```
