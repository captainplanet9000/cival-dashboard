# Windmill Resources Configuration

This document provides instructions for setting up the required resources in Windmill for the Trading Farm platform.

## Required Resources

### 1. `supabase_connection`

This resource provides connection details for the Supabase/Neon PostgreSQL database.

**Resource Type:** Object  
**Configuration:**
```json
{
  "project_url": "https://bgvlzvswzpfoywfxehis.supabase.co",
  "service_role_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjgzMTU1OSwiZXhwIjoyMDUyNDA3NTU5fQ.TZLKwHuMxv9xtSc0wJ7DG5ivjw0K-7NztPeLRsGqMAA",
  "anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndmx6dnN3enBmb3l3ZnhlaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzE1NTksImV4cCI6MjA1MjQwNzU1OX0.ccYwDhIJXjmfp4tpc6bDlHKsLDqs7ivQpmugaa0uHXU",
  "db_connection_string": "postgresql://postgres:YOUR_PASSWORD@db.bgvlzvswzpfoywfxehis.supabase.co:5432/postgres"
}
```

Replace `YOUR_PASSWORD` with the actual database password.

### 2. `openai_api_key`

This resource provides the OpenAI API key for generating embeddings and synthesizing responses.

**Resource Type:** String  
**Configuration:** `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`

### 3. `vault_encryption_key`

This resource provides the master key for encrypting and decrypting credentials for linked accounts.

**Resource Type:** Secret String  
**Generate Command:**
```bash
# Generate a secure random key
openssl rand -hex 32
```

Use the generated key as the value for this resource. Example: `7B53C760E630CF2C32F2B02163EBB44E7B53C760E630CF2C32F2B02163EBB44E`

### 4. `blockchain_node_urls`

This resource provides URLs for accessing various blockchain networks.

**Resource Type:** Object  
**Configuration:**
```json
{
  "ethereum": "https://eth-mainnet.g.alchemy.com/v2/j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r",
  "arbitrum": "https://arb-mainnet.g.alchemy.com/v2/j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r",
  "optimism": "https://sonic-mainnet.g.alchemy.com/v2/j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r",
  "solana": "https://solana-mainnet.g.alchemy.com/v2/j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r",
  "base": "https://base-mainnet.g.alchemy.com/v2/j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r",
  "polygon": "https://polygon-mainnet.g.alchemy.com/v2/j7uIJ1umWnGLtB3ZRmAdC2-91gwr6g3r"
}
```

### 5. Exchange API Keys

Create individual resources for each supported exchange:

#### 5.1 `binance_api_keys`

**Resource Type:** Secret Object  
**Configuration:**
```json
{
  "apiKey": "YOUR_BINANCE_API_KEY",
  "secret": "YOUR_BINANCE_SECRET"
}
```

#### 5.2 `bybit_api_keys`

**Resource Type:** Secret Object  
**Configuration:**
```json
{
  "apiKey": "8vdYK0kPUnm8OScFYk",
  "secret": "qdRJOR04oorQWi3PveyOvfcXGR24Cxx39OP5"
}
```

#### 5.3 `coinbase_api_keys`

**Resource Type:** Secret Object  
**Configuration:**
```json
{
  "apiKey": "YOUR_COINBASE_API_KEY",
  "secret": "YOUR_COINBASE_SECRET",
  "passphrase": "YOUR_COINBASE_PASSPHRASE"
}
```

#### 5.4 `okx_api_keys`

**Resource Type:** Secret Object  
**Configuration:**
```json
{
  "apiKey": "19e6ece6-9687-44a4-bb25-761a038873b7",
  "secret": "7B53C760E630CF2C32F2B02163EBB44E",
  "password": "YOUR_OKX_PASSWORD"
}
```

## Setting Up Resources in Windmill

1. Navigate to the Windmill dashboard
2. Go to the "Resources" section
3. Click "Add Resource"
4. Select the appropriate resource type
5. Enter the resource name (e.g., `supabase_connection`)
6. Paste the configuration values
7. Set appropriate access permissions for scripts and flows
8. Click "Create"

## Security Considerations

- Ensure that secret resources have restricted access permissions
- Use environment-specific resources for development vs. production
- Regularly rotate API keys and secrets
- Audit resource access regularly 