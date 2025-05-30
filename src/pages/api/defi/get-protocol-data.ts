import { NextApiRequest, NextApiResponse } from 'next';
import { ProtocolServiceFactory } from '../../../services/defi/protocol-service-factory';
import { ProtocolType } from '../../../types/defi-protocol-types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    // Get protocol from query parameters
    const { protocol, chainId } = req.query;
    
    if (!protocol) {
      return res.status(400).json({
        success: false,
        error: 'Protocol parameter is required'
      });
    }
    
    // Validate protocol
    if (!Object.values(ProtocolType).includes(protocol as ProtocolType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid protocol: ${protocol}. Valid options are: ${Object.values(ProtocolType).join(', ')}`
      });
    }
    
    // Get protocol data
    const protocolConnector = await ProtocolServiceFactory.getConnector(
      protocol as ProtocolType,
      chainId ? (isNaN(Number(chainId)) ? chainId : Number(chainId)) : undefined
    );
    
    await protocolConnector.connect();
    
    const protocolData = await protocolConnector.getProtocolData();
    
    return res.status(200).json({
      success: true,
      timestamp: Date.now(),
      protocol,
      chainId: chainId || 'default',
      data: protocolData
    });
  } catch (error: any) {
    console.error('Error getting protocol data:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get protocol data'
    });
  }
} 