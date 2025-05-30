import type { NextApiRequest, NextApiResponse } from 'next';
import { farmService } from '@/services/farm/farm-service';

// Helper function to handle errors consistently
const handleError = (res: NextApiResponse, error: any, statusCode = 500) => {
  console.error('API error:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  res.status(statusCode).json({ success: false, error: errorMessage });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { agentId } = req.query;

  if (typeof agentId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid Agent ID.' });
  }
  
  // Assuming agent IDs are numeric based on FarmService usage, validate
  const numericAgentId = parseInt(agentId, 10);
  if (isNaN(numericAgentId)) {
    return res.status(400).json({ success: false, error: 'Agent ID must be numeric.' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get a single agent
        const agentResult = await farmService.getAgentById(numericAgentId);
        
        if (agentResult.success && agentResult.data) {
          res.status(200).json({
            success: true,
            data: agentResult.data
          });
        } else {
          res.status(404).json({
            success: false,
            error: agentResult.error || 'Agent not found'
          });
        }
        break;
        
      case 'PUT':
        // This is handled by the existing [agentId].ts file for PUT and DELETE
        // Just pass through to that handler
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed. Use /api/agents/${agentId} endpoint for updates.`);
        break;
      
      case 'DELETE':
        // This is handled by the existing [agentId].ts file for PUT and DELETE
        // Just pass through to that handler
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed. Use /api/agents/${agentId} endpoint for deletion.`);
        break;

      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
} 