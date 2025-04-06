import { NextApiRequest, NextApiResponse } from 'next';
import { agentCollaborationService } from '@/services/agent-collaboration-service';

/**
 * API endpoint for agent collaborations
 * 
 * GET: List all collaborations, filtered by farmId or agentId
 * POST: Create a new collaboration task
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Validate the request method
    switch (req.method) {
      case 'GET':
        return await getCollaborations(req, res);
      case 'POST':
        return await createCollaboration(req, res);
      default:
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} Not Allowed` 
        });
    }
  } catch (error: any) {
    console.error('Collaboration API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * GET: List collaborations
 * 
 * Query parameters:
 * - farmId: Filter by farm ID
 * - agentId: Filter by agent ID
 */
async function getCollaborations(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { farmId, agentId } = req.query;
    
    let collaborations;
    
    if (farmId) {
      // Get collaborations for a specific farm
      collaborations = agentCollaborationService.getCollaborationTasksByFarm(farmId as string);
    } else if (agentId) {
      // Get collaborations for a specific agent
      collaborations = agentCollaborationService.getCollaborationTasksByAgent(agentId as string);
    } else {
      // Error if no filter provided
      return res.status(400).json({ 
        success: false, 
        error: 'Either farmId or agentId must be provided' 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: collaborations
    });
  } catch (error: any) {
    console.error('Error getting collaborations:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get collaborations' 
    });
  }
}

/**
 * POST: Create a new collaboration
 * 
 * Required body parameters:
 * - farmId: The ID of the farm
 * - flowId: The ID of the collaboration flow
 * - initiatorAgentId: The ID of the agent initiating the collaboration
 * - agentAssignments: Map of agent IDs to roles
 * 
 * Optional body parameters:
 * - name: Custom name for the collaboration
 * - description: Custom description
 * - priority: Priority level (LOW, MEDIUM, HIGH)
 * - metadata: Additional metadata for the collaboration
 */
async function createCollaboration(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { 
      farmId, 
      flowId, 
      initiatorAgentId, 
      name, 
      description, 
      priority, 
      agentAssignments, 
      metadata 
    } = req.body;
    
    // Validate required fields
    if (!farmId || !flowId || !initiatorAgentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'farmId, flowId, and initiatorAgentId are required' 
      });
    }
    
    // Create the collaboration task
    const task = await agentCollaborationService.createCollaborationTask(
      farmId,
      flowId,
      initiatorAgentId,
      {
        name,
        description,
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH',
        agentAssignments,
        metadata
      }
    );
    
    return res.status(201).json({
      success: true,
      data: task
    });
  } catch (error: any) {
    console.error('Error creating collaboration:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create collaboration' 
    });
  }
} 