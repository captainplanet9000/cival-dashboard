import type { NextApiRequest, NextApiResponse } from 'next';
import { farmService } from '@/services/farm/farm-service'; // Adjust path as needed
import { CreateAgentParams } from '@/services/farm/farm-service'; // Import param type

// Basic error handler
function handleError(res: NextApiResponse, error: any, statusCode = 500) {
  console.error("API Error:", error);
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  res.status(statusCode).json({ success: false, error: message });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { farmId } = req.query;

  if (typeof farmId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid Farm ID.' });
  }

  const numericFarmId = parseInt(farmId, 10);
  if (isNaN(numericFarmId)) {
     return res.status(400).json({ success: false, error: 'Farm ID must be numeric.' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get agents for a specific farm
        const agentsResult = await farmService.getAgents(numericFarmId);
        if (agentsResult.success) {
          res.status(200).json(agentsResult);
        } else {
          handleError(res, agentsResult.error || 'Failed to fetch agents', 404);
        }
        break;

      case 'POST':
        // Create a new agent for the farm
        const { name, type, configuration } = req.body;

        if (!name || !type) {
          return res.status(400).json({ success: false, error: 'Missing required fields: name, type' });
        }

        const createParams: CreateAgentParams = {
          name,
          type,
          farm_id: numericFarmId,
          configuration: configuration || {}, // Ensure configuration is at least an empty object
          // status defaults to 'inactive' in service
        };

        const createResult = await farmService.createAgent(createParams);
        if (createResult.success && createResult.data) {
          res.status(201).json(createResult); // 201 Created
        } else {
          handleError(res, createResult.error || 'Failed to create agent');
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
} 