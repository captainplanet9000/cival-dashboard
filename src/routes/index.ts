import express from 'express';
import authRoutes from './auth';
import strategyRoutes from './strategies';
import farmRoutes from './farms';
import executionRoutes from './executions';

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/strategies', strategyRoutes);
router.use('/farms', farmRoutes);
router.use('/executions', executionRoutes);

export default router; 