# Trading Farm Platform - Windmill Integration

This directory contains the Windmill integration for the Trading Farm platform, which helps automate backend workflows, monitoring, and data processing.

## Overview

The Trading Farm platform uses Windmill for:

1. **Automation**: Scheduled jobs, event-triggered workflows, and data processing pipelines
2. **Internal Tooling**: Scripts for testing, debugging, and administrative tasks
3. **Integration Bridge**: Connecting external services with the core platform

## Project Structure

```
windmill/
├── flows/                # Windmill flow definitions (YAML)
│   ├── DocumentIngestionFlow.yaml       # Brain document processing flow
│   └── DepositMonitorFlow.yaml          # External account monitoring flow
├── scripts/              # Python/JavaScript scripts used by flows
│   ├── document_ingestion.py            # Brain document processing scripts
│   ├── deposit_monitor.py               # Deposit monitoring scripts
│   └── query_brain.py                   # Brain query functionality
└── README.md             # This file
```

## Implemented Flows

### Document Ingestion Flow

This flow processes uploaded documents for the Brain & Knowledge Management system:

1. Receives a webhook trigger when files are uploaded to Supabase Storage
2. Parses and extracts text from documents based on their file type
3. Chunks the text into smaller sections for vector embedding
4. Generates embeddings using OpenAI's API
5. Stores the chunks and embeddings in the database for semantic search

**Trigger**: Webhook at `/farm/document/upload`

### Deposit Monitoring Flow

This flow monitors external accounts (exchange APIs, blockchain wallets) for new deposits:

1. Fetches linked accounts that require monitoring
2. Decrypts credentials securely
3. Checks for new deposits since the last check
4. Updates vault balances and logs transactions
5. Updates the monitoring timestamp

**Trigger**: Scheduled every minute

## Resources Used

This implementation uses the following Windmill resources:

- **supabase_connection**: Connection to Neon PostgreSQL with TimescaleDB & pgvector
- **openai_api_key**: OpenAI API key for generating embeddings
- **vault_encryption_key**: Master key for encrypting/decrypting credentials
- **blockchain_node_urls**: API keys for accessing blockchain nodes (Alchemy, etc.)
- **cex_api_keys**: API keys for cryptocurrency exchanges (added per exchange)

## Integration with External Systems

### Supabase

- **Storage**: Document uploads are stored in Supabase Storage
- **Database**: Uses Supabase API to access the Neon PostgreSQL database
- **Edge Functions**: Handles webhook triggers for document uploads

### Blockchain Networks

- Connects to Ethereum, Arbitrum, Base, and other EVM-compatible chains
- Monitors wallet addresses for incoming transactions
- Supports both native currency (ETH) and token transfers

### Cryptocurrency Exchanges

- Integrates with Binance, Coinbase, Bybit, OKX, and more
- Uses CCXT library for standardized exchange API interactions
- Monitors deposit history for new incoming deposits

## Development Guide

### Adding a New Script

1. Create a new Python script in the `scripts/` directory
2. Implement the main function and any helper functions needed
3. Add proper typing, docstrings, and error handling
4. Test the script locally using Windmill's local development environment

### Creating a New Flow

1. Design the flow structure with modules, inputs, and outputs
2. Create a YAML configuration in the `flows/` directory
3. Reference existing scripts or create new ones as needed
4. Test the flow with sample data before activating it

### Adding a New Exchange

1. Update the `EXCHANGE_CLASS_MAP` in `deposit_monitor.py`
2. Add exchange-specific credential handling
3. Implement any custom logic required for the exchange's API
4. Test with a sample account to ensure proper monitoring

## Security Considerations

- Credentials are encrypted using Fernet symmetric encryption
- Each account uses a unique salt derived from its ID
- The master encryption key is stored securely in Windmill resources
- Database interactions use parameterized queries to prevent SQL injection
- All API keys and secrets are stored securely in Windmill resources