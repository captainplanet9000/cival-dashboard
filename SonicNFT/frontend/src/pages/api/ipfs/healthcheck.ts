import { NextApiRequest, NextApiResponse } from 'next';
import { getActiveGateways, updateGatewayStatus } from '@/lib/database';

// Endpoint to check IPFS gateway health
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get API key from headers (for security)
    const apiKey = req.headers['x-api-key'];
    
    // Validate API key if provided in the request
    if (apiKey && apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get all active gateways from the database
    const gateways = await getActiveGateways();
    
    // Parallel health check for all gateways
    const results = await Promise.allSettled(
      gateways.map(async (gateway: any) => {
        const gatewayUrl = gateway.gateway_url;
        const testCid = 'QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx'; // Test CID (example)
        const testUrl = `${gatewayUrl}${testCid}`;
        
        // Test gateway with a simple fetch and time it
        const startTime = Date.now();
        
        try {
          const response = await fetch(testUrl, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(3000), // 3 second timeout
          });
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          // Check if response is valid
          const isOnline = response.ok;
          
          // Update gateway status in the database
          await updateGatewayStatus(
            gatewayUrl,
            isOnline ? 'online' : 'offline',
            responseTime
          );
          
          return {
            gateway: gatewayUrl,
            status: isOnline ? 'online' : 'offline',
            responseTime,
          };
        } catch (error) {
          // Gateway is offline or timeout
          await updateGatewayStatus(gatewayUrl, 'offline');
          
          return {
            gateway: gatewayUrl,
            status: 'offline',
            error: (error as Error).message,
          };
        }
      })
    );
    
    // Summarize results
    const online = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'online').length;
    const offline = results.length - online;
    
    // Get updated gateways (sorted by performance)
    const updatedGateways = await getActiveGateways();
    
    // Return health check results
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        online,
        offline,
      },
      gateways: updatedGateways,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
    });
  } catch (error: any) {
    console.error('Error checking IPFS gateway health:', error);
    return res.status(500).json({ 
      error: 'Failed to check IPFS gateway health',
      message: error.message
    });
  }
} 