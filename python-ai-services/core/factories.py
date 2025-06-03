import os
from typing import Optional, Dict
# Correcting import path based on typical project structure if services are peers to core
# If agent_models is in a top-level 'models' dir and 'core' is a peer to 'services' and 'models'
# then it would be from ..models.agent_models import AgentConfigOutput
# Assuming 'python_ai_services' is the root package available in PYTHONPATH:
from python_ai_services.models.agent_models import AgentConfigOutput
from python_ai_services.services.hyperliquid_execution_service import HyperliquidExecutionService, HyperliquidExecutionServiceError
from loguru import logger

def get_hyperliquid_execution_service_instance(
    agent_config: AgentConfigOutput,
    # Optional: pass network_mode if it can vary per agent or globally.
    # The current implementation expects network_mode to be part of hyperliquid_config.
) -> Optional[HyperliquidExecutionService]:
    """
    Creates an instance of HyperliquidExecutionService based on agent configuration.
    Credentials (private key) are fetched from an environment variable specified in the config.
    """
    if agent_config.execution_provider != "hyperliquid" or not agent_config.hyperliquid_config:
        logger.debug(f"Agent {agent_config.agent_id} is not configured for Hyperliquid or lacks hyperliquid_config.")
        return None

    wallet_address = agent_config.hyperliquid_config.get("wallet_address")
    private_key_env_var = agent_config.hyperliquid_config.get("private_key_env_var_name")
    # Default to 'mainnet' if not specified in config
    network_mode_str = agent_config.hyperliquid_config.get("network_mode", "mainnet")


    if not wallet_address:
        logger.error(f"Agent {agent_config.agent_id}: Missing 'wallet_address' in hyperliquid_config.")
        return None
    if not private_key_env_var:
        logger.error(f"Agent {agent_config.agent_id}: Missing 'private_key_env_var_name' in hyperliquid_config.")
        return None

    private_key = os.getenv(private_key_env_var)
    if not private_key:
        logger.error(f"Agent {agent_config.agent_id}: Environment variable '{private_key_env_var}' for private key is not set or is empty.")
        return None

    if network_mode_str not in ["mainnet", "testnet"]:
        logger.warning(f"Invalid network_mode '{network_mode_str}' in hyperliquid_config for agent {agent_config.agent_id}. Defaulting to 'mainnet'.")
        network_mode_str = "mainnet"

    try:
        service_instance = HyperliquidExecutionService(
            wallet_address=wallet_address,
            private_key=private_key,
            network_mode=network_mode_str # type: ignore # Literal is compatible with str here
        )
        logger.info(f"Successfully created HyperliquidExecutionService instance for agent {agent_config.agent_id} on {network_mode_str}.")
        return service_instance
    except HyperliquidExecutionServiceError as e:
        logger.error(f"Agent {agent_config.agent_id}: Failed to initialize HyperliquidExecutionService: {e}", exc_info=True)
        return None
    except Exception as e: # Catch any other unexpected errors during init
        logger.error(f"Agent {agent_config.agent_id}: Unexpected error creating HyperliquidExecutionService: {e}", exc_info=True)
        return None
```
