import type { NextApiRequest, NextApiResponse } from 'next';
import { agentWorkflowService, WorkflowStep } from '@/services/agent-workflow';
import { farmService } from '@/services/farm/farm-service';

// Helper function for error handling
const handleError = (res: NextApiResponse, error: any, statusCode = 500) => {
  console.error('Workflow API error:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  res.status(statusCode).json({ success: false, error: errorMessage });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { agentId } = req.query;
  
  if (typeof agentId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid Agent ID' });
  }
  
  // Parse agent ID to number if needed
  const numericAgentId = parseInt(agentId, 10);
  if (isNaN(numericAgentId)) {
    return res.status(400).json({ success: false, error: 'Agent ID must be numeric' });
  }

  try {
    switch (req.method) {
      case 'POST':
        // Execute a workflow for an agent
        const { workflowId, workflowType, input } = req.body;
        
        if (!workflowId || !workflowType || !input) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: workflowId, workflowType, input' 
          });
        }
        
        // First, get the agent details
        const agentResponse = await farmService.getAgentById(numericAgentId);
        
        if (!agentResponse.success || !agentResponse.data) {
          return res.status(404).json({ success: false, error: 'Agent not found' });
        }
        
        const agent = agentResponse.data;
        
        // Execute the workflow
        const result = await agentWorkflowService.executeWorkflow(
          agent,
          workflowId,
          workflowType,
          input
        );
        
        return res.status(200).json({
          success: result.success,
          data: {
            steps: result.steps,
            finalResult: result.finalResult
          },
          error: result.error
        });
        
      case 'GET':
        // Get available workflows for an agent
        const agentResult = await farmService.getAgentById(numericAgentId);
        
        if (!agentResult.success || !agentResult.data) {
          return res.status(404).json({ success: false, error: 'Agent not found' });
        }
        
        const agentData = agentResult.data;
        const agentType = agentData.type?.toUpperCase();
        
        // Define available workflows by agent type
        const workflowsByType: Record<string, Array<{id: string; name: string; type: string}>> = {
          'ANALYST': [
            { id: 'analyst_market_analysis', name: 'Market Analysis', type: 'MARKET_ANALYSIS' },
            { id: 'analyst_risk_assessment', name: 'Risk Assessment', type: 'RISK_ASSESSMENT' }
          ],
          'TRADER': [
            { id: 'trader_trade_execution', name: 'Execute Trade', type: 'TRADE_EXECUTION' },
            { id: 'trader_portfolio_rebalance', name: 'Portfolio Rebalance', type: 'PORTFOLIO_REBALANCE' }
          ],
          'MONITOR': [
            { id: 'monitor_risk_assessment', name: 'Risk Assessment', type: 'RISK_ASSESSMENT' }
          ]
        };
        
        const availableWorkflows = workflowsByType[agentType] || [];
        
        return res.status(200).json({
          success: true,
          data: {
            workflows: availableWorkflows
          }
        });
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
} 