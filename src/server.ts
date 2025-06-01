import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import passport from 'passport';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import apiRoutes from './routes';
import './auth/passport'; // Initialize passport configuration

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(passport.initialize()); // Initialize Passport

// Mount API routes
app.use('/api', apiRoutes);

// Basic routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Trading Farm API is running' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join a specific strategy room to receive updates
  socket.on('join-strategy', (strategyId) => {
    socket.join(`strategy-${strategyId}`);
    console.log(`Socket ${socket.id} joined strategy room: ${strategyId}`);
  });
  
  // Join a farm room to receive updates
  socket.on('join-farm', (farmId) => {
    socket.join(`farm-${farmId}`);
    console.log(`Socket ${socket.id} joined farm room: ${farmId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Trading Farm API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

export { app, server, io, prisma }; 