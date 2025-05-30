import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../auth/passport';

const router = express.Router();
const prisma = new PrismaClient();

// Get all strategies for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: string };

    const strategies = await prisma.strategy.findMany({
      where: {
        OR: [
          { userId: user.id },  // User's own strategies
          { isPublic: true }    // Public strategies
        ]
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            backtests: true,
            tradingExecutions: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return res.status(200).json(strategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return res.status(500).json({ message: 'Error fetching strategies' });
  }
});

// Get a specific strategy by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as { id: string };

    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        backtests: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    // Check if user has access to this strategy
    if (strategy.userId !== user.id && !strategy.isPublic) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json(strategy);
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return res.status(500).json({ message: 'Error fetching strategy' });
  }
});

// Create a new strategy
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: string };
    const { name, description, code, language, isPublic, tags } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    // Create strategy transaction
    const strategy = await prisma.$transaction(async (tx) => {
      // Create the strategy
      const newStrategy = await tx.strategy.create({
        data: {
          name,
          description,
          code,
          language: language || 'pine',
          isPublic: isPublic || false,
          userId: user.id,
        },
      });

      // If tags are provided, handle them
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          // Find or create tag
          let tag = await tx.tag.findUnique({
            where: { name: tagName },
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: { name: tagName },
            });
          }

          // Connect strategy to tag
          await tx.tagsOnStrategies.create({
            data: {
              strategyId: newStrategy.id,
              tagId: tag.id,
            },
          });
        }
      }

      return newStrategy;
    });

    // Return created strategy with tags
    const fullStrategy = await prisma.strategy.findUnique({
      where: { id: strategy.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return res.status(201).json(fullStrategy);
  } catch (error) {
    console.error('Error creating strategy:', error);
    return res.status(500).json({ message: 'Error creating strategy' });
  }
});

// Update a strategy
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as { id: string };
    const { name, description, code, language, isPublic, tags } = req.body;

    // Check if strategy exists and belongs to user
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!existingStrategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    if (existingStrategy.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update strategy transaction
    const updatedStrategy = await prisma.$transaction(async (tx) => {
      // Update the strategy
      const strategy = await tx.strategy.update({
        where: { id },
        data: {
          name,
          description,
          code,
          language,
          isPublic,
        },
      });

      // If tags are provided, update them
      if (tags && tags.length > 0) {
        // Remove existing tags
        await tx.tagsOnStrategies.deleteMany({
          where: { strategyId: id },
        });

        // Add new tags
        for (const tagName of tags) {
          // Find or create tag
          let tag = await tx.tag.findUnique({
            where: { name: tagName },
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: { name: tagName },
            });
          }

          // Connect strategy to tag
          await tx.tagsOnStrategies.create({
            data: {
              strategyId: strategy.id,
              tagId: tag.id,
            },
          });
        }
      }

      return strategy;
    });

    // Return updated strategy with tags
    const fullStrategy = await prisma.strategy.findUnique({
      where: { id: updatedStrategy.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return res.status(200).json(fullStrategy);
  } catch (error) {
    console.error('Error updating strategy:', error);
    return res.status(500).json({ message: 'Error updating strategy' });
  }
});

// Delete a strategy
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user as { id: string };

    // Check if strategy exists and belongs to user
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id },
    });

    if (!existingStrategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    if (existingStrategy.userId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete strategy transaction
    await prisma.$transaction(async (tx) => {
      // Delete related tags
      await tx.tagsOnStrategies.deleteMany({
        where: { strategyId: id },
      });

      // Delete strategy
      await tx.strategy.delete({
        where: { id },
      });
    });

    return res.status(200).json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return res.status(500).json({ message: 'Error deleting strategy' });
  }
});

export default router; 