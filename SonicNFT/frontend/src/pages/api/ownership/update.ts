import { NextApiRequest, NextApiResponse } from 'next';
import { recordNFTOwnership } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get API key from headers
    const apiKey = req.headers['x-api-key'];
    
    // Validate API key (in a real app, use a secure method)
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get ownership data from request body
    const { tokenId, ownerAddress, transactionHash } = req.body;
    
    // Validate required fields
    if (!tokenId || !ownerAddress || !transactionHash) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'tokenId, ownerAddress, and transactionHash are required' 
      });
    }
    
    // Validate token ID is a number
    const id = parseInt(tokenId);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Token ID must be a number' });
    }
    
    // Validate owner address format (Ethereum address)
    if (!/^0x[a-fA-F0-9]{40}$/.test(ownerAddress)) {
      return res.status(400).json({ error: 'Invalid owner address format' });
    }
    
    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }
    
    // Record NFT ownership
    await recordNFTOwnership(id, ownerAddress, transactionHash);
    
    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'NFT ownership recorded successfully',
      data: {
        tokenId: id,
        ownerAddress,
        transactionHash
      }
    });
  } catch (error: any) {
    console.error('Error recording NFT ownership:', error);
    return res.status(500).json({ 
      error: 'Failed to record NFT ownership',
      message: error.message
    });
  }
} 