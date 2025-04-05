import { NextApiRequest, NextApiResponse } from 'next';
import { ProtocolServiceFactory } from '../../../services/defi/protocol-service-factory';
import { ProtocolAction, ProtocolType } from '../../../types/defi-protocol-types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    // Get action parameters from body
    const { protocol, actionType, params, chainId } = req.body;
    
    // Validate required fields
    if (!protocol || !actionType) {
      return res.status(400).json({
        success: false,
        error: 'Protocol and actionType parameters are required'
      });
    }
    
    // Validate protocol
    if (!Object.values(ProtocolType).includes(protocol as ProtocolType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid protocol: ${protocol}. Valid options are: ${Object.values(ProtocolType).join(', ')}`
      });
    }
    
    // Create action object
    const action: ProtocolAction = {
      protocol: protocol as ProtocolType,
      actionType,
      params: params || {}
    };
    
    // Get protocol connector
    const protocolConnector = await ProtocolServiceFactory.getConnector(
      protocol as ProtocolType,
      chainId ? (isNaN(Number(chainId)) ? chainId : Number(chainId)) : undefined
    );
    
    // Connect to protocol (using the user address from params if provided)
    await protocolConnector.connect(params?.userAddress ? { address: params.userAddress } : undefined);
    
    // Execute the action
    const result = await protocolConnector.executeAction(action);
    
    return res.status(200).json({
      success: true,
      timestamp: Date.now(),
      protocol,
      actionType,
      result
    });
  } catch (error: any) {
    console.error('Error executing protocol action:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute protocol action'
    });
  }
} 