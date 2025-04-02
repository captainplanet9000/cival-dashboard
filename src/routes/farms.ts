import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth/passport';

const router = express.Router();
const prisma = new PrismaClient();

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
  };
}

// Get all farms for the authenticated user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const farms = await prisma.farm.findMany({
      where: {
        userId
      },
      include: {
        strategies: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            tradingExecutions: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return res.status(200).json(farms);
  } catch (error) {
    console.error('Error fetching farms:', error);
    return res.status(500).json({ message: 'Error fetching farms' });
  }
});

// Get a specific farm by ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const farm = await prisma.farm.findUnique({
      where: { id },
      include: {
        strategies: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            exchangeName: true
          }
        },
        tradingExecutions: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
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
          }
        }
      }
    });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    // Check if user has access to this farm
    if (farm.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json(farm);
  } catch (error) {
    console.error('Error fetching farm:', error);
    return res.status(500).json({ message: 'Error fetching farm' });
  }
});

// Create a new farm
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;
    const { name, description, exchange, assetPairs } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate required fields
    if (!name || !exchange) {
      return res.status(400).json({ message: 'Name and exchange are required' });
    }

    // Create farm
    const farm = await prisma.farm.create({
      data: {
        name,
        description,
        exchange,
        assetPairs: assetPairs || [],
        userId
      }
    });

    return res.status(201).json(farm);
  } catch (error) {
    console.error('Error creating farm:', error);
    return res.status(500).json({ message: 'Error creating farm' });
  }
});

// Update a farm
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, exchange, assetPairs, status } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if farm exists and belongs to user
    const existingFarm = await prisma.farm.findUnique({
      where: { id }
    });

    if (!existingFarm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    if (existingFarm.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update farm
    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        name,
        description,
        exchange,
        assetPairs,
        status
      }
    });

    return res.status(200).json(updatedFarm);
  } catch (error) {
    console.error('Error updating farm:', error);
    return res.status(500).json({ message: 'Error updating farm' });
  }
});

// Delete a farm
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if farm exists and belongs to user
    const existingFarm = await prisma.farm.findUnique({
      where: { id }
    });

    if (!existingFarm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    if (existingFarm.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete farm (and related records via cascading)
    await prisma.farm.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'Farm deleted successfully' });
  } catch (error) {
    console.error('Error deleting farm:', error);
    return res.status(500).json({ message: 'Error deleting farm' });
  }
});

// Add a strategy to a farm
router.post('/:id/strategies', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { strategyId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!strategyId) {
      return res.status(400).json({ message: 'Strategy ID is required' });
    }

    // Check if farm exists and belongs to user
    const farm = await prisma.farm.findUnique({
      where: { id },
      include: {
        strategies: true
      }
    });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    if (farm.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if strategy exists
    const strategy = await prisma.strategy.findUnique({
      where: { id: strategyId }
    });

    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    // Check if strategy already added to farm
    if (farm.strategies.some(s => s.id === strategyId)) {
      return res.status(409).json({ message: 'Strategy already added to farm' });
    }

    // Add strategy to farm
    const updatedFarm = await prisma.farm.update({
      where: { id },
      data: {
        strategies: {
          connect: { id: strategyId }
        }
      },
      include: {
        strategies: true
      }
    });

    return res.status(200).json(updatedFarm);
  } catch (error) {
    console.error('Error adding strategy to farm:', error);
    return res.status(500).json({ message: 'Error adding strategy to farm' });
  }
});

// Remove a strategy from a farm
router.delete('/:id/strategies/:strategyId', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id, strategyId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if farm exists and belongs to user
    const farm = await prisma.farm.findUnique({
      where: { id }
    });

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    if (farm.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Remove strategy from farm
    await prisma.farm.update({
      where: { id },
      data: {
        strategies: {
          disconnect: { id: strategyId }
        }
      }
    });

    return res.status(200).json({ message: 'Strategy removed from farm successfully' });
  } catch (error) {
    console.error('Error removing strategy from farm:', error);
    return res.status(500).json({ message: 'Error removing strategy from farm' });
  }
});

export default router; 