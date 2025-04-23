# HyperLiquid Exchange Integration Guide

This document provides guidance on integrating with the HyperLiquid exchange, including API key requirements, permissions, and implementation details.

## Overview

HyperLiquid is a decentralized perpetual futures exchange that uses a different authentication approach compared to traditional centralized exchanges. Instead of traditional API keys and secrets, HyperLiquid uses wallet-based authentication with Ethereum signatures for API requests.

## Authentication Requirements

### Wallet-Based Authentication

Unlike most centralized exchanges, HyperLiquid uses a wallet-based authentication system:

1. **Private Key**: The system requires a private key associated with an Ethereum wallet to sign transactions.
   - This private key is stored in the `passphrase` field of the credentials in the Trading Farm platform.
   - Never share or expose your private key in client-side code.

2. **Wallet Address**: The wallet address is derived from the private key and used to identify your account.
   - The wallet must have an account on HyperLiquid with the necessary permissions.

### Security Considerations

- **Critical Security**: The private key gives full access to your HyperLiquid account and potentially your Ethereum wallet.
- **Secure Storage**: Trading Farm securely encrypts this key with AES-256-GCM before storing in the database.
- **Permissions Separation**: Consider using a dedicated wallet for trading with limited funds rather than your main wallet.

## Required Permissions

When connecting to HyperLiquid, your wallet needs to have:

1. **Trading Permissions**: The ability to place and cancel orders.
2. **Balance View**: The ability to view account balances and positions.
3. **Funds**: Sufficient funds in the wallet to cover margin requirements.

## Connection Setup Guide

### 1. Create a Wallet for HyperLiquid

If you don't already have one:

1. Generate a new Ethereum wallet using a secure wallet provider.
2. Ensure you have the private key (typically a 64-character hexadecimal string).
3. Fund your HyperLiquid account from this wallet.

### 2. Configure in Trading Farm

In the Trading Farm platform:

1. Navigate to the "Connect Exchange" option.
2. Select "HyperLiquid" from the exchange dropdown.
3. Enter any name for the connection (e.g., "My HyperLiquid Account").
4. Leave the API Key field blank or enter your wallet address for reference.
5. Leave the API Secret field blank.
6. In the Passphrase field, enter your wallet's private key.
7. Check "Use testnet" if you want to connect to HyperLiquid's testnet.

### 3. Verification

After connecting:

1. The platform will test the connection by fetching your account data.
2. Your balances should appear in the Wallet section.
3. You should be able to view and place orders.

## Network Options

### Mainnet

- Base URL: `https://api.hyperliquid.xyz`
- WebSocket URL: `wss://api.hyperliquid.xyz/ws`

### Testnet

- Base URL: `https://api.testnet.hyperliquid.xyz`
- WebSocket URL: `wss://api.testnet.hyperliquid.xyz/ws`

## API Limitations and Rate Limits

HyperLiquid enforces rate limits to prevent abuse:

- **REST API**: 10 requests per second, 600 requests per minute, 10,000 requests per hour
- **WebSocket**: No specific message rate limits, but excessive connections may be throttled

## Supported Features

HyperLiquid supports the following features through the Trading Farm integration:

- Real-time market data through WebSockets
- Order placement (market, limit, stop-loss, stop-limit)
- Order management (view, cancel)
- Position management
- Account balance information

## Unsupported Features

The following features are currently not supported:

- Spot trading (HyperLiquid only offers perpetual futures)
- Direct fiat deposits/withdrawals (these are managed through the blockchain)

## Troubleshooting

Common issues with HyperLiquid connection:

1. **Invalid Private Key**: Ensure your private key is correct and properly formatted.
2. **Insufficient Funds**: Ensure your wallet has sufficient funds for trading.
3. **Network Issues**: If connecting to testnet, make sure you've selected the testnet option.
4. **Connection Timeout**: HyperLiquid API might be experiencing high load or maintenance.

## Implementation Notes

The HyperLiquid integration in Trading Farm uses:

1. **Direct API Integration**: Instead of using a third-party library like CCXT.
2. **Ethers.js**: For wallet operations and signing.
3. **WebSocket Connection**: For real-time data using our custom WebSocket implementation.

## Updates and Maintenance

The HyperLiquid API is actively developed and may change. Stay updated with:

- [HyperLiquid Documentation](https://hyperliquid.xyz/docs)
- [HyperLiquid API Reference](https://hyperliquid.xyz/docs/api/overview)
- [HyperLiquid Discord](https://discord.gg/hyperliquid)

## Support

For issues specific to the Trading Farm integration with HyperLiquid, please contact the Trading Farm support team.
