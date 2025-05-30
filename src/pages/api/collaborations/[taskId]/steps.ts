import { NextApiRequest, NextApiResponse } from 'next';
import { agentCollaborationService } from '@/services/agent-collaboration-service';

/**
 * API endpoint for collaboration task steps
 * 
 * POST: Execute a step or approve a step in a collaboration task
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
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false, 
        error: `Method ${req.method} Not Allowed` 
      });
    }
    
    return await handleStepAction(req, res, taskId);
  } catch (error: any) {
    console.error('Collaboration step API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    });
  }
}

/**
 * POST: Execute or approve a step in a collaboration task
 * 
 * Body parameters:
 * - action: The action to perform (EXECUTE or APPROVE)
 * - agentId: The ID of the agent performing the action
 * - stepNumber: (For APPROVE) The step number to approve
 * - input: (For EXECUTE) The input for the step execution
 * - notes: (For APPROVE) Notes for the approval
 */
async function handleStepAction(
  req: NextApiRequest,
  res: NextApiResponse,
  taskId: string
) {
  try {
    const { action, agentId, stepNumber, input, notes } = req.body;
    
    if (!action || !agentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Action and agentId are required' 
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
      case 'EXECUTE':
        if (input === undefined) {
          return res.status(400).json({ 
            success: false, 
            error: 'Input is required for EXECUTE action' 
          });
        }
        
        const executionResult = await agentCollaborationService.executeCollaborationStep(
          taskId,
          agentId,
          input
        );
        
        return res.status(200).json({
          success: executionResult.success,
          data: executionResult,
          error: executionResult.error
        });
        
      case 'APPROVE':
        if (stepNumber === undefined) {
          return res.status(400).json({ 
            success: false, 
            error: 'Step number is required for APPROVE action' 
          });
        }
        
        const approved = await agentCollaborationService.approveCollaborationStep(
          taskId,
          parseInt(stepNumber as string, 10),
          agentId,
          notes
        );
        
        return res.status(200).json({
          success: true,
          data: { approved }
        });
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: `Unknown action: ${action}` 
        });
    }
  } catch (error: any) {
    console.error(`Error executing collaboration step for task ${taskId}:`, error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to execute collaboration step' 
    });
  }
} 