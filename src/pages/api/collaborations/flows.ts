import { NextApiRequest, NextApiResponse } from 'next';
import { agentCollaborationService } from '@/services/agent-collaboration-service';

/**
 * API endpoint for available collaboration flows
 * 
 * GET: List all available collaboration flows
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Validate the request method
    if (req.method !== 'GET') {
      return res.status(405).json({ 
        success: false, 
        error: `Method ${req.method} Not Allowed` 
      });
    }
    
    return await getCollaborationFlows(req, res);
  } catch (error: any) {
    console.error('Collaboration flows API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * GET: List available collaboration flows
 * 
 * Query parameters:
 * - agentType: (Optional) Filter flows by agent type participation
 */
async function getCollaborationFlows(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { agentType } = req.query;
    
    // Get all flows
    const flows = agentCollaborationService.getCollaborationFlows();
    
    // Filter flows by agent type if specified
    const filteredFlows = agentType
      ? flows.filter(flow => 
          flow.steps.some(step => 
            step.agentType.toUpperCase() === (agentType as string).toUpperCase()
          )
        )
      : flows;
    
    return res.status(200).json({
      success: true,
      data: filteredFlows
    });
  } catch (error: any) {
    console.error('Error getting collaboration flows:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get collaboration flows' 
    });
  }
} 