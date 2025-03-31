# Trading Farm Chain Adapters

This document provides information about the blockchain chain adapters integrated into the Trading Farm dashboard with ElizaOS support.

## Overview

The Trading Farm platform supports multiple blockchain networks through a modular adapter architecture. Each chain adapter provides a consistent interface for trading operations such as:

- Getting account balances
- Retrieving positions
- Creating orders
- Canceling orders
- Getting market data
- Retrieving transaction history

All adapters support a simulation mode for development and testing, which activates automatically when API credentials are missing or when API calls fail.

## Supported Chains

### Hyperliquid

- **Port**: 3001
- **API URL**: https://api.hyperliquid.xyz
- **Supported Assets**: ETH, BTC, SOL, ARB
- **Environment Variables**:
  - `HYPERLIQUID_PRIVATE_KEY`
  - `HYPERLIQUID_WALLET_ADDRESS`

### Arbitrum

- **Port**: 3002
- **API URL**: https://api.arbitrum.io
- **Supported Assets**: ETH, ARB, LINK, UNI
- **Environment Variables**:
  - `ARBITRUM_PRIVATE_KEY`
  - `ARBITRUM_WALLET_ADDRESS`

### Sonic

- **Port**: 3003
- **API URL**: https://api.sonic.exchange
- **Supported Assets**: SONIC, ETH, BTC, USDC
- **Environment Variables**:
  - `SONIC_PRIVATE_KEY`
  - `SONIC_WALLET_ADDRESS`

### Solana

- **Port**: 3004
- **API URL**: https://api.solana.com
- **Supported Assets**: SOL, BONK, RAY, USDC
- **Environment Variables**:
  - `SOLANA_PRIVATE_KEY`
  - `SOLANA_WALLET_ADDRESS`

### Sui

- **Port**: 3005
- **API URL**: https://api.sui.io
- **Supported Assets**: SUI, CETUS, SUISWAP, USDC
- **Environment Variables**:
  - `SUI_PRIVATE_KEY`
  - `SUI_WALLET_ADDRESS`

## Testing

Test scripts are provided for each chain adapter. These scripts demonstrate how to interact with the adapters through the MCP server:

- `test_hyperliquid_mcp.py` - Tests Hyperliquid adapter functionality
- `test_arbitrum_mcp.py` - Tests Arbitrum adapter functionality (to be implemented)
- `test_sonic_mcp.py` - Tests Sonic adapter functionality (to be implemented)
- `test_solana_mcp.py` - Tests Solana adapter functionality
- `test_sui_mcp.py` - Tests Sui adapter functionality

To run a test script, execute:

```bash
python test_[chain]_mcp.py
```

For example, to test the Sui adapter:

```bash
python test_sui_mcp.py
```

## Simulation Mode

All chain adapters support a simulation mode for development and testing. This mode activates automatically when:

1. The relevant environment variables (private key and wallet address) are not set
2. API calls fail due to connectivity issues or incorrect credentials

Simulation mode provides realistic mock data for all operations, allowing development and testing without needing actual API credentials.

## Integration with ElizaOS

The chain adapters are integrated with ElizaOS through the MCP server. ElizaOS can make trading decisions and execute trades on any of the supported chains, providing an autonomous AI-powered trading system.

The ElizaOS Command Center in the Trading Farm dashboard provides a console interface for interacting with ElizaOS and viewing the results of trades executed by the AI.

## Adding New Chain Adapters

To add a new chain adapter:

1. Create a new adapter file in `elizaos_mcp_server/chains/`
2. Update `.env` with appropriate environment variables
3. Update `config.py` to include the new chain
4. Update `server.py` to import and register the new adapter
5. Update the dashboard UI to include the new chain
6. Create test scripts for the new adapter

## Error Handling

All chain adapters include comprehensive error handling. When an error occurs:

1. The error is logged
2. If in simulation mode, simulated data is returned with an error message
3. If not in simulation mode, an error response is returned

This ensures that the Trading Farm dashboard remains functional even when API calls fail.
