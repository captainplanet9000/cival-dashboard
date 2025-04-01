import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tradeApi from './api/trade-api';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/v1/trade', tradeApi);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Trading Farm API server running on port ${PORT}`);
}); 