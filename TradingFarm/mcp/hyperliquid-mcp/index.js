const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Environment variables
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('Missing required environment variables: PRIVATE_KEY or WALLET_ADDRESS');
  process.exit(1);
}

// Initialize Ethereum provider and wallet
const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log(`Hyperliquid MCP initialized with wallet address: ${WALLET_ADDRESS}`);

// MCP API endpoint
app.post('/api/mcp', async (req, res) => {
  const { action, params } = req.body;
  
  try {
    switch (action) {
      case 'getBalance':
        const balance = await provider.getBalance(WALLET_ADDRESS);
        return res.json({ success: true, balance: ethers.utils.formatEther(balance) });
      
      case 'getStatus':
        return res.json({ 
          success: true, 
          status: 'connected', 
          wallet: WALLET_ADDRESS, 
          chain: 'arbitrum' 
        });
      
      case 'executeQuery': {
        const { queryEndpoint, queryData } = params;
        if (!queryEndpoint) return res.status(400).json({ success: false, error: 'Missing queryEndpoint' });
        
        // Safety check - only allow approved endpoints
        if (!queryEndpoint.startsWith('https://api.hyperliquid.xyz/')) {
          return res.status(403).json({ success: false, error: 'Unauthorized endpoint' });
        }
        
        const response = await fetch(queryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryData)
        });
        
        const data = await response.json();
        return res.json({ success: true, data });
      }
      
      default:
        return res.status(400).json({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error(`Error processing ${action}:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Tool functions for Cascade
app.post('/tools', async (req, res) => {
  const { name, parameters } = req.body;
  
  try {
    switch (name) {
      case 'hyperliquid_status':
        return res.json({ 
          success: true, 
          wallet: WALLET_ADDRESS,
          chain: 'arbitrum',
          connected: true
        });
      
      case 'hyperliquid_balance':
        const balance = await provider.getBalance(WALLET_ADDRESS);
        return res.json({ 
          success: true, 
          balance: ethers.utils.formatEther(balance),
          token: 'ETH'
        });
      
      case 'hyperliquid_market_data':
        const { market } = parameters;
        if (!market) return res.status(400).json({ success: false, error: 'Missing market parameter' });
        
        const marketData = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'metaAndAssetCtxs' })
        });
        
        const data = await marketData.json();
        const assetInfo = data.assetCtxs.find(asset => asset.name.toLowerCase() === market.toLowerCase());
        
        if (!assetInfo) {
          return res.json({ success: false, error: 'Market not found' });
        }
        
        return res.json({ success: true, data: assetInfo });
      
      default:
        return res.status(400).json({ success: false, error: 'Unknown tool function' });
    }
  } catch (error) {
    console.error(`Error processing tool ${name}:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3033;
app.listen(PORT, () => {
  console.log(`Hyperliquid MCP Server running on port ${PORT}`);
});

// Report to Cascade that we're ready
console.log('MCPREADY');
