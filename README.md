# Trading Farm Platform

A comprehensive platform for managing digital asset trading operations, integrating with AI agents, managing vaults, and leveraging knowledge management.

## Overview

The Trading Farm Platform is a complete solution for institutional and individual traders who want to streamline their digital asset operations. It combines portfolio management, automated trading, vault management for secure asset custody, and AI-powered assistants to help optimize trading strategies.

## Key Features

- **Farm Management**: Create and manage multiple trading farms with isolated settings and resources
- **Agent Integration**: Leverage AI-powered agents for market analysis, trading, and portfolio management
- **Vault System**: Secure custody system for monitoring and managing assets across exchanges and blockchains
- **Brain & Knowledge Management**: Collaborative knowledge storage and retrieval for trading insights
- **Goal Management**: Set, track, and achieve financial goals with progress monitoring
- **Analytics Dashboard**: Comprehensive analytics and reporting on portfolio performance

## Project Structure

```
/
├── backend/               # FastAPI backend
│   ├── app.py             # Main application entry point
│   ├── requirements.txt   # Python dependencies
│   └── integrations/      # External API integrations
├── src/                   # Frontend React components
│   ├── components/        # UI components
│   ├── lib/               # Utility functions and API client
│   ├── pages/             # Next.js pages
│   ├── styles/            # CSS styling
│   └── types/             # TypeScript type definitions
├── supabase/              # Supabase migrations and schemas
│   └── migrations/        # Database migrations
├── windmill/              # Windmill automation workflows
│   ├── flows/             # Flow definitions (YAML)
│   └── scripts/           # Python scripts for flows
└── docs/                  # Documentation
```

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python 3.9+, asyncpg, pandas, numpy
- **Database**: PostgreSQL via Supabase
- **AI/ML**: OpenAI APIs, Vector embeddings, LangChain
- **Integration**: Blockchain nodes, Exchange APIs, Web3 libraries
- **Automation**: Windmill workflows, Python scripts

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Supabase account
- Windmill account (optional for automation)
- OpenAI API key

### Backend Setup

1. **Navigate to the backend directory**

```bash
cd backend
```

2. **Install Python dependencies**

```bash
pip install -r requirements.txt
```

3. **Configure environment variables**

Create a `.env` file in the backend directory:

```
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=db.bgvlzvswzpfoywfxehis.supabase.co
DB_PORT=5432
DB_NAME=postgres
OPENAI_API_KEY=your_openai_api_key
```

4. **Start the FastAPI server**

```bash
uvicorn app:app --reload
```

The API server will be running at http://localhost:8000 with interactive docs at http://localhost:8000/docs

### Frontend Setup

1. **Install npm dependencies**

```bash
npm install
```

2. **Configure environment variables**

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Start the development server**

```bash
npm run dev
```

The frontend will be running at http://localhost:3000

### Database Setup

1. **Install Supabase CLI**

```bash
npm install -g supabase
```

2. **Initialize Supabase project**

```bash
supabase init
```

3. **Run database migrations**

```bash
supabase migration up
```

4. **Generate TypeScript types**

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

## Development Workflow

### Creating a New Farm

1. Navigate to the dashboard
2. Click "New Farm" button
3. Fill in the farm details and click "Create"

### Adding Agents to a Farm

1. Navigate to a farm
2. Go to the "Agents" tab
3. Click "New Agent"
4. Configure the agent capabilities and settings

### Setting Up Goals

1. Navigate to a farm
2. Go to the "Goals" tab
3. Click "Create New Goal"
4. Select a template or create a custom goal
5. Define targets and timeframes

### Monitoring Performance

1. Navigate to a farm
2. View the Analytics dashboard
3. Analyze asset allocation, performance, and goal progress

## API Endpoints

### Farm Management
- `GET /farms` - List all farms
- `POST /farms` - Create a new farm
- `GET /farms/{farm_id}` - Get a specific farm
- `PUT /farms/{farm_id}` - Update a farm

### Agent Management
- `GET /farms/{farm_id}/agents` - List all agents for a farm
- `POST /agents` - Create a new agent
- `GET /agents/{agent_id}` - Get a specific agent
- `POST /agents/{agent_id}/start` - Start an agent
- `POST /agents/{agent_id}/stop` - Stop an agent

### Goal Management
- `GET /farms/{farm_id}/goals` - List all goals for a farm
- `POST /farms/{farm_id}/goals` - Create a new goal
- `GET /goals/{goal_id}` - Get a specific goal
- `PUT /goals/{goal_id}` - Update a goal
- `POST /goals/{goal_id}/progress` - Update goal progress

### Analytics
- `GET /farms/{farm_id}/analytics` - Get comprehensive analytics
- `GET /farms/{farm_id}/analytics/assets` - Get asset performance data
- `GET /farms/{farm_id}/analytics/balances` - Get historical balance data
- `GET /farms/{farm_id}/analytics/profit-loss` - Get profit/loss data

## Implementation Plan

The project has been implemented in phases:

1. **Phase 1**: Farm & Agent Integration ✓
2. **Phase 2**: Vault System ✓
3. **Phase 3**: Brain & Knowledge Management ✓
4. **Phase 4**: Goal Management & Analytics ✓

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Project Link: [https://github.com/yourusername/trading-farm-platform](https://github.com/yourusername/trading-farm-platform)

# Trading Farm Dashboard Improvements

This repository contains a series of enhancements to improve the Trading Farm Dashboard's API integration, security, and performance.

## Implemented Improvements

### Security Enhancements

- **Request Signing**: Added comprehensive API request signing for exchange interactions in `src/services/security/request-signing.ts`
- **Content Security Policies**: Implemented secure headers and policies for external connections
- **Rate Limiting**: Added client-side rate limiting to prevent accidental API abuse

### API Integration

- **Validation**: Added Zod schema validation for all API responses in `src/services/validation/api-schemas.ts`
- **Mock Services**: Created realistic API mock services for offline development using MSW in `src/mocks/`
- **Circuit Breaker**: Implemented the circuit breaker pattern for API resilience in `src/services/resilience/circuit-breaker.ts`
- **API Inspector**: Created a debugging tool for inspecting API calls in `src/utils/api-inspector.ts`

### Advanced Frontend Patterns

- **Optimistic UI**: Implemented optimistic updates with automatic rollbacks in `src/hooks/use-optimistic-mutation.ts`
- **Smart Caching**: Created advanced cache with TTL and invalidation strategies in `src/services/cache/api-cache.ts`
- **Query Orchestration**: Added query hooks with dependency management in `src/hooks/use-query.ts`
- **Retry Strategies**: Implemented exponential backoff and smart retry logic

### Testing and Documentation

- **Integration Tests**: Added integration tests in `src/tests/integration/api-integration.test.ts`
- **JSDoc Comments**: Added comprehensive JSDoc comments to all interfaces and methods
- **Component Examples**: Created example components showcasing different API states in `src/components/examples/ApiExampleCard.tsx`

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start development server:
   ```
   npm run dev
   ```

3. Run tests:
   ```
   npm test
   ```

## Working Offline

The project now includes a comprehensive mock API that simulates all backend services, allowing for:

- Development without a connection to the actual API
- Testing different API responses and error scenarios
- Faster development iterations

To use the mock API, no additional configuration is needed in development mode.

## API Inspector

The API Inspector is a debugging tool that helps you monitor all API interactions. You can:

- See all requests and responses in real-time
- Download logs for debugging purposes
- Toggle the inspector in the example component

## Example Component

Check out the `ApiExampleCard` component to see many of these features in action:

- Optimistic UI updates
- Smart caching
- API request inspection
- Error handling

## Contributing

When contributing to this project, please follow the established patterns for:

- API integration
- Error handling
- Validation
- Testing
