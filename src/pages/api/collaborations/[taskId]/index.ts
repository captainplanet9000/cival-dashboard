import { NextApiRequest, NextApiResponse } from 'next';
import { agentCollaborationService } from '@/services/agent-collaboration-service';

/**
 * API endpoint for a specific collaboration task
 * 
 * GET: Get a collaboration by ID
 * PUT: Update a collaboration
 * DELETE: Delete a collaboration
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { taskId } = req.query;
    
    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Task ID is required' 
      });
    }
    
    // Validate the request method
    switch (req.method) {
      case 'GET':
        return await getCollaboration(req, res, taskId);
      case 'PUT':
        return await updateCollaboration(req, res, taskId);
      case 'DELETE':
        return await deleteCollaboration(req, res, taskId);
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
 * GET: Get a specific collaboration by ID
 */
async function getCollaboration(
  req: NextApiRequest,
  res: NextApiResponse,
  taskId: string
) {
  try {
    const collaboration = agentCollaborationService.getCollaborationTaskById(taskId);
    
    if (!collaboration) {
      return res.status(404).json({ 
        success: false, 
        error: `Collaboration task with ID ${taskId} not found` 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: collaboration
    });
  } catch (error: any) {
    console.error(`Error getting collaboration ${taskId}:`, error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get collaboration' 
    });
  }
}

/**
 * PUT: Update a collaboration (cancel, start, etc.)
 * 
 * Body parameters depend on the action:
 * - action: The action to perform (START, CANCEL, etc.)
 * - reason: Reason for the action (for CANCEL)
 * - notes: Notes for the action
 */
async function updateCollaboration(
  req: NextApiRequest,
  res: NextApiResponse,
  taskId: string
) {
  try {
    const { action, reason, notes } = req.body;
    
    if (!action) {
      return res.status(400).json({ 
        success: false, 
        error: 'Action is required' 
      });
    }
    
    // Get the collaboration task
    const task = agentCollaborationService.getCollaborationTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: `Collaboration task with ID ${taskId} not found` 
      });
    }
    
    // Perform the requested action
    switch (action.toUpperCase()) {
      case 'START':
        const startedTask = await agentCollaborationService.startCollaborationTask(taskId);
        return res.status(200).json({
          success: true,
          data: startedTask
        });
        
      case 'CANCEL':
        const cancelled = await agentCollaborationService.cancelCollaborationTask(taskId, reason);
        return res.status(200).json({
          success: true,
          data: { cancelled }
        });
        
      case 'GENERATE_SUMMARY':
        const summary = await agentCollaborationService.generateCollaborationSummary(taskId);
        return res.status(200).json({
          success: true,
          data: { summary }
        });
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: `Unknown action: ${action}` 
        });
    }
  } catch (error: any) {
    console.error(`Error updating collaboration ${taskId}:`, error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update collaboration' 
    });
  }
}

/**
 * DELETE: Delete a collaboration
 */
async function deleteCollaboration(
  req: NextApiRequest,
  res: NextApiResponse,
  taskId: string
) {
  try {
    // In a real implementation, you might want to validate that the user has permission to delete this task
    
    const deleted = await agentCollaborationService.cancelCollaborationTask(taskId, 'Deleted by user');
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: `Collaboration task with ID ${taskId} not found or could not be deleted` 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: { deleted }
    });
  } catch (error: any) {
    console.error(`Error deleting collaboration ${taskId}:`, error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete collaboration' 
    });
  }
} 