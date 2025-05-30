import type { NextApiRequest, NextApiResponse } from 'next';
import { farmService } from '@/services/farm/farm-service'; // Adjust path as needed

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
      case 'PUT':
        // Update an agent (e.g., status, configuration)
        const { status, configuration, name, type } = req.body;
        
        // Construct update parameters, only include fields that are present
        const updateParams: Record<string, any> = {};
        if (status !== undefined) updateParams.status = status;
        if (configuration !== undefined) updateParams.configuration = configuration;
        if (name !== undefined) updateParams.name = name;
        if (type !== undefined) updateParams.type = type;
        
        if (Object.keys(updateParams).length === 0) {
             return res.status(400).json({ success: false, error: 'No update fields provided.' });
        }

        const updateResult = await farmService.updateAgent(numericAgentId, updateParams);
        if (updateResult.success && updateResult.data) {
          res.status(200).json(updateResult);
        } else {
          handleError(res, updateResult.error || 'Failed to update agent');
        }
        break;

      case 'DELETE':
        // Delete an agent
        const deleteResult = await farmService.deleteAgent(numericAgentId);
         // Supabase remove might return success even if row doesn't exist, check affected rows if needed
         // For simplicity, assume success means either deleted or didn't exist
        if (deleteResult.success) {
          res.status(204).end(); // 204 No Content on successful deletion
        } else {
          handleError(res, deleteResult.error || 'Failed to delete agent');
        }
        break;

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
} 