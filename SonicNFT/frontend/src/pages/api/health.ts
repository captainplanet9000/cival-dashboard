import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { ethers } from 'ethers';

type HealthStatus = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency?: number;
      message?: string;
    };
    blockchain: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      network?: string;
      blockNumber?: number;
      latency?: number;
      message?: string;
    };
  };
};

// Database connection
let pool: Pool | null = null;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Connection timeout of 5 seconds
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'unhealthy',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'unhealthy', message: 'Method not allowed' },
        blockchain: { status: 'unhealthy', message: 'Method not allowed' },
      },
    });
  }
  
  const response: HealthStatus = {
    status: 'healthy',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'healthy' },
      blockchain: { status: 'healthy' },
    },
  };
  
  // Check database health
  try {
    const dbStart = Date.now();
    const client = await getPool().connect();
    
    try {
      await client.query('SELECT 1');
      
      // Calculate latency
      const dbLatency = Date.now() - dbStart;
      response.services.database.latency = dbLatency;
      
      // Set status based on latency
      if (dbLatency > 1000) {
        response.services.database.status = 'degraded';
        response.services.database.message = 'High latency';
        response.status = 'degraded';
      }
    } finally {
      client.release();
    }
  } catch (error) {
    response.services.database.status = 'unhealthy';
    response.services.database.message = error instanceof Error 
      ? error.message 
      : 'Unknown database error';
    response.status = 'unhealthy';
  }
  
  // Check Sonic blockchain connection
  try {
    const blockchainStart = Date.now();
    const sonicRpcUrl = process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.sonic.org';
    const provider = new ethers.providers.JsonRpcProvider(sonicRpcUrl);
    
    // Get network information to verify it's the Sonic network
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const blockchainLatency = Date.now() - blockchainStart;
    
    response.services.blockchain.network = network.name;
    response.services.blockchain.blockNumber = blockNumber;
    response.services.blockchain.latency = blockchainLatency;
    
    // Check if we're connected to the Sonic network
    if (network.chainId !== 2930) {
      response.services.blockchain.status = 'unhealthy';
      response.services.blockchain.message = `Connected to wrong network: ${network.name} (${network.chainId})`;
      response.status = 'unhealthy';
    }
    // Set status based on latency
    else if (blockchainLatency > 2000) {
      response.services.blockchain.status = 'degraded';
      response.services.blockchain.message = 'High latency';
      response.status = 'degraded';
    }
  } catch (error) {
    response.services.blockchain.status = 'unhealthy';
    response.services.blockchain.message = error instanceof Error 
      ? error.message 
      : 'Unknown blockchain error';
    
    // If database is also unhealthy, the overall status is unhealthy
    if (response.services.database.status === 'unhealthy') {
      response.status = 'unhealthy';
    } else {
      response.status = 'degraded';
    }
  }
  
  // Set Cache-Control header to avoid caching
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  return res.status(response.status === 'unhealthy' ? 503 : 200).json(response);
} 