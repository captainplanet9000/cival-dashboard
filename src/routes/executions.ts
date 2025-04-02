import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth/passport';
import strategyExecutionService from '../services/strategy/strategyExecutionService';

const router = express.Router();
const prisma = new PrismaClient();

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
  };
}

// Start a strategy execution
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;
    const { farmId, strategyId, apiKeyId, settings } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate required fields
    if (!farmId || !strategyId || !apiKeyId) {
      return res.status(400).json({ message: 'Farm ID, strategy ID, and API key ID are required' });
    }

    // Verify user has access to the farm
    const farm = await prisma.farm.findUnique({
      where: { id: farmId }
    });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    if (farm.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Start execution
    const execution = await strategyExecutionService.startExecution({
      farmId,
      strategyId,
      userId,
      apiKeyId,
      settings
    });

    return res.status(201).json(execution);
  } catch (error: any) {
    console.error('Error starting execution:', error);
    return res.status(500).json({ message: error.message || 'Error starting execution' });
  }
});

// Stop a strategy execution
router.post('/:id/stop', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify execution exists and user has access
    const execution = await prisma.tradingExecution.findUnique({
      where: { id },
      include: {
        farm: true
      }
    });

    if (!execution) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    if (execution.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Stop execution
    await strategyExecutionService.stopExecution(id);

    return res.status(200).json({ message: 'Execution stopped successfully' });
  } catch (error: any) {
    console.error('Error stopping execution:', error);
    return res.status(500).json({ message: error.message || 'Error stopping execution' });
  }
});

// Pause a strategy execution
router.post('/:id/pause', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify execution exists and user has access
    const execution = await prisma.tradingExecution.findUnique({
      where: { id },
      include: {
        farm: true
      }
    });

    if (!execution) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    if (execution.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Pause execution
    await strategyExecutionService.pauseExecution(id);

    return res.status(200).json({ message: 'Execution paused successfully' });
  } catch (error: any) {
    console.error('Error pausing execution:', error);
    return res.status(500).json({ message: error.message || 'Error pausing execution' });
  }
});

// Resume a strategy execution
router.post('/:id/resume', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify execution exists and user has access
    const execution = await prisma.tradingExecution.findUnique({
      where: { id },
      include: {
        farm: true
      }
    });

    if (!execution) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    if (execution.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Resume execution
    await strategyExecutionService.resumeExecution(id);

    return res.status(200).json({ message: 'Execution resumed successfully' });
  } catch (error: any) {
    console.error('Error resuming execution:', error);
    return res.status(500).json({ message: error.message || 'Error resuming execution' });
  }
});

// Get all executions for a farm
router.get('/farm/:farmId', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { farmId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify farm exists and user has access
    const farm = await prisma.farm.findUnique({
      where: { id: farmId }
    });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    if (farm.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get executions for farm
    const executions = await prisma.tradingExecution.findMany({
      where: {
        farmId
      },
      include: {
        strategy: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            trades: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json(executions);
  } catch (error: any) {
    console.error('Error fetching executions:', error);
    return res.status(500).json({ message: error.message || 'Error fetching executions' });
  }
});

// Get execution details
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get execution with details
    const execution = await prisma.tradingExecution.findUnique({
      where: { id },
      include: {
        strategy: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        farm: {
          select: {
            id: true,
            name: true,
            exchange: true
          }
        },
        trades: {
          orderBy: {
            entryTime: 'desc'
          },
          take: 50
        }
      }
    });

    if (!execution) {
      return res.status(404).json({ message: 'Execution not found' });
    }

    if (execution.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json(execution);
  } catch (error: any) {
    console.error('Error fetching execution details:', error);
    return res.status(500).json({ message: error.message || 'Error fetching execution details' });
  }
});

export default router; 