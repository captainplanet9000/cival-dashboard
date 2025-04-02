# Trading Farm Platform Setup Guide

This guide will help you set up and run the Trading Farm platform on your system.

## Prerequisites

- Node.js 18+ 
- npm 8+ or yarn
- PostgreSQL 14+ with pgvector extension
- Redis (optional, for job queue and caching)

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/trading-farm.git
   cd trading-farm
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   Copy the example environment file and modify it with your settings:
   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your database connection, API keys, and other settings.

4. Set up the database
   ```bash
   # Run database migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

## Key Environment Variables

The following environment variables should be configured in your `.env` file:

### Server Configuration
- `PORT` - Port for the API server (default: 4000)
- `NODE_ENV` - Environment (development, production, test)
- `FRONTEND_URL` - URL of the frontend application

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_MAX_CONNECTIONS` - Maximum database connections
- `DATABASE_IDLE_TIMEOUT` - Connection idle timeout in milliseconds

### Authentication
- `JWT_SECRET` - Secret key for JWT token generation
- `JWT_EXPIRES_IN` - JWT token expiration time (e.g., "7d" for 7 days)

### External APIs
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)

### Exchange APIs
- `BYBIT_API_KEY` - Bybit API key
- `BYBIT_API_SECRET` - Bybit API secret
- `BYBIT_TESTNET` - Use Bybit testnet (true/false)
- `COINBASE_API_KEY` - Coinbase API key
- `COINBASE_API_SECRET` - Coinbase API secret
- `COINBASE_SANDBOX` - Use Coinbase sandbox (true/false)

### Redis (Optional)
- `REDIS_URL` - Redis connection URL for job queue and caching

## Running the Platform

### Development Mode

```bash
# Start the development server
npm run dev
```

This will start both the Next.js frontend and Express API server with hot reloading.

### Production Mode

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage report

## Project Structure

```
trading-farm/
├── prisma/           # Database schema and migrations
├── public/           # Static assets
├── src/
│   ├── api/          # API routes and controllers
│   ├── app/          # Next.js pages and routes
│   ├── components/   # React components
│   ├── config/       # Configuration files
│   ├── contexts/     # React contexts
│   ├── hooks/        # React hooks
│   ├── lib/          # Shared libraries
│   ├── models/       # Data models
│   ├── pages/        # Next.js pages (legacy)
│   ├── routes/       # Express routes
│   ├── services/     # Business logic services
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   ├── server.ts     # Express server entry point
│   └── index.ts      # Main entry point
├── .env.example      # Example environment variables
├── .eslintrc.js      # ESLint configuration
├── jest.config.js    # Jest configuration
├── next.config.js    # Next.js configuration
├── package.json      # NPM dependencies and scripts
├── tailwind.config.js # Tailwind CSS configuration
└── tsconfig.json     # TypeScript configuration
```

## API Documentation

The API documentation is available at `/api/docs` when running the server. It provides detailed information about all available endpoints, request formats, and response structures.

## Testing Exchange Connectivity

To test exchange connectivity, you can use the following script:

```bash
# Test Bybit connectivity
node scripts/test-exchange.js --exchange=bybit

# Test Coinbase connectivity
node scripts/test-exchange.js --exchange=coinbase
```

## Troubleshooting

### Database Connection Issues

1. Ensure your PostgreSQL server is running
2. Check that the `DATABASE_URL` in `.env` is correct
3. Make sure the pgvector extension is installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Authentication Issues

1. Check that `JWT_SECRET` is set in `.env`
2. Ensure your login credentials are correct
3. Check that the token in local storage is valid

### Exchange API Issues

1. Verify API keys are correct in `.env`
2. Ensure API keys have the required permissions
3. Check that the exchange servers are operational

## Additional Resources

- [Trading Farm Documentation](https://docs.tradingfarm.com)
- [API Reference](https://api.tradingfarm.com/docs)
- [Community Forum](https://community.tradingfarm.com)

## Support

For issues or questions, please:
- Open an issue on GitHub
- Contact support at support@tradingfarm.com 