# Trading Farm Developer Guide

## Overview

This document provides technical information for developers working with the Trading Farm platform. It covers the architecture, key components, development workflow, and best practices.

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Key Technologies](#key-technologies)
4. [Development Environment Setup](#development-environment-setup)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Component Library](#component-library)
8. [State Management](#state-management)
9. [Testing Guidelines](#testing-guidelines)
10. [Deployment Process](#deployment-process)
11. [Contributing Guidelines](#contributing-guidelines)

## Architecture

The Trading Farm platform is built as a modern web application with the following architecture:

### Frontend
- Next.js framework (App Router) for server-side rendering and client-side functionality
- React for UI components
- TailwindCSS and shadcn/ui for styling
- TypeScript for type safety

### Backend
- Next.js API routes for server-side logic
- Supabase for database and authentication
- WebSockets for real-time data

### Infrastructure
- Vercel for hosting and deployment
- Supabase for database
- GitHub Actions for CI/CD

### High-Level Architecture Diagram

```
┌────────────────────────────────────┐
│ Client Browser                     │
└───────────────┬────────────────────┘
                │
┌───────────────▼────────────────────┐
│ Vercel Edge Network                │
└───────────────┬────────────────────┘
                │
┌───────────────▼────────────────────┐
│ Next.js Application                │
│  ┌──────────────┐  ┌──────────────┐│
│  │ React UI     │  │ API Routes   ││
│  └──────────────┘  └──────┬───────┘│
└──────────────────────────┬─────────┘
                           │
┌──────────────────────────▼─────────┐
│ Supabase                           │
│  ┌──────────────┐  ┌──────────────┐│
│  │ PostgreSQL   │  │ Auth Service ││
│  └──────────────┘  └──────────────┘│
└────────────────────────────────────┘
```

## Project Structure

```
trading-farm/
├── .github/             # GitHub workflows and templates
├── docs/                # Documentation
├── public/              # Static assets
├── scripts/             # Build and deployment scripts
├── src/
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   │   ├── monitoring/  # Monitoring components
│   │   ├── trading/     # Trading components
│   │   └── ui/          # UI components (shadcn)
│   ├── lib/             # Shared libraries
│   │   ├── exchange/    # Exchange connectors
│   │   └── utils/       # Utility functions
│   ├── services/        # Business logic services
│   ├── styles/          # Global styles
│   ├── tests/           # Test files
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
│       └── supabase/    # Supabase client utilities
├── supabase/            # Supabase configurations
│   └── migrations/      # Database migrations
├── tests/               # E2E tests (Playwright)
├── .env.example         # Example environment variables
├── .eslintrc.js         # ESLint configuration
├── next.config.js       # Next.js configuration
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Key Technologies

- **Next.js 14+**: React framework for server-side rendering and API routes
- **React 18+**: UI component library
- **TypeScript 5+**: Type-safe JavaScript
- **Supabase**: Backend as a Service (BaaS) for database, authentication, and storage
- **TailwindCSS**: Utility-first CSS framework
- **shadcn/ui**: Component library built with Radix UI
- **Zod**: Schema validation
- **React Hook Form**: Form management
- **Tanstack Query**: Data fetching library
- **Playwright**: E2E testing
- **Vitest**: Unit and integration testing

## Development Environment Setup

### Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- Supabase CLI
- Git

### Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourorg/trading-farm.git
   cd trading-farm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your Supabase credentials and other required environment variables.

4. Start the Supabase local development environment:
   ```bash
   npx supabase start
   ```

5. Apply database migrations:
   ```bash
   npm run db:migrate
   ```

6. Generate TypeScript types for the database:
   ```bash
   npm run db:typegen
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The Trading Farm platform uses a PostgreSQL database managed through Supabase. The schema is organized into the following key tables:

| Table Name | Description |
|------------|-------------|
| `users` | User profile information |
| `exchange_credentials` | Exchange API keys and credentials |
| `trading_farms` | Trading farm configurations |
| `trading_agents` | Trading agent definitions |
| `agent_strategies` | Strategy configurations for agents |
| `orders` | Order history |
| `positions` | Open and closed positions |
| `connection_health` | Exchange connection health metrics |
| `trading_audit_logs` | Audit logs for trading activities |
| `security_access_logs` | Security-related access logs |
| `agent_performance` | Agent performance metrics |

For the complete database schema, refer to `src/types/database.types.ts`.

### Database Migration

We use Supabase migrations to manage database schema changes. To create a new migration:

```bash
npx supabase migration new your_migration_name
```

The migration file will be created in `supabase/migrations/`. After adding your SQL commands, apply the migration:

```bash
npm run db:migrate
```

Then regenerate the TypeScript types:

```bash
npm run db:typegen
```

## API Reference

### Authentication

- `POST /api/auth/login`: Log in a user
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/logout`: Log out a user
- `GET /api/auth/session`: Get the current user session

### Exchanges

- `GET /api/exchange/list`: List available exchanges
- `POST /api/exchange/credentials`: Add or update exchange credentials
- `DELETE /api/exchange/credentials/{id}`: Delete exchange credentials
- `GET /api/exchange/markets`: Get available markets for an exchange
- `GET /api/exchange/balance`: Get account balance for an exchange

### Trading

- `GET /api/trading/orders`: Get order history
- `POST /api/trading/orders`: Place a new order
- `DELETE /api/trading/orders/{id}`: Cancel an order
- `GET /api/trading/positions`: Get positions
- `POST /api/trading/positions/{id}/close`: Close a position

### Monitoring

- `GET /api/monitoring/health`: Get exchange connection health
- `GET /api/monitoring/audit-logs`: Get trading audit logs
- `GET /api/monitoring/security-logs`: Get security access logs

### Agents

- `GET /api/agents`: List trading agents
- `POST /api/agents`: Create a trading agent
- `PUT /api/agents/{id}`: Update a trading agent
- `DELETE /api/agents/{id}`: Delete a trading agent
- `POST /api/agents/{id}/start`: Start a trading agent
- `POST /api/agents/{id}/stop`: Stop a trading agent

## Component Library

Trading Farm uses a combination of custom components and shadcn/ui components.

### Core UI Components

Components from shadcn/ui are used as the foundation for our UI:

- `Button`
- `Dialog`
- `Dropdown`
- `Input`
- `Select`
- `Tabs`
- `Card`
- `Table`
- ... and more

### Custom Components

Custom components specific to Trading Farm:

- `TradingTerminal`: Main trading interface
- `OrderForm`: Order entry form
- `MarketSelector`: Market selection dropdown
- `PositionCard`: Card displaying position details
- `ConnectionHealthDashboard`: Exchange connection monitoring
- `AuditLogViewer`: Trading audit log viewer
- `AgentController`: Agent control panel

### Using Components

Import components from their respective paths:

```tsx
// UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Custom components
import { TradingTerminal } from '@/components/trading/TradingTerminal';
import { ConnectionHealthDashboard } from '@/components/monitoring/ConnectionHealthDashboard';
```

## State Management

Trading Farm uses a combination of React's built-in state management and specialized libraries:

### Local Component State

For component-specific state, use React's `useState` and `useReducer` hooks:

```tsx
const [isLoading, setIsLoading] = useState(false);
```

### Form State

For form state management, use React Hook Form:

```tsx
const { register, handleSubmit, errors } = useForm({
  resolver: zodResolver(formSchema)
});
```

### Server State

For server state management, use Tanstack Query:

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['orders', exchangeId],
  queryFn: () => fetchOrders(exchangeId)
});
```

### Global Application State

For global application state, use React Context:

```tsx
// In the provider component
const [state, dispatch] = useReducer(reducer, initialState);

// In a consumer component
const { state, dispatch } = useAppContext();
```

## Testing Guidelines

Trading Farm implements a comprehensive testing strategy:

### Unit Testing

Unit tests focus on testing individual components and functions in isolation. Use Vitest for unit tests:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

Run unit tests with:

```bash
npm run test:unit
```

### Integration Testing

Integration tests verify that different parts of the application work together. They test interactions between components and with external services.

```tsx
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/tests/test-utils';
import { TradingTerminal } from '@/components/trading/TradingTerminal';

describe('TradingTerminal', () => {
  it('submits an order form correctly', async () => {
    // Test implementation
  });
});
```

Run integration tests with:

```bash
npm run test
```

### End-to-End Testing

E2E tests verify the entire application workflow from the user's perspective. Use Playwright for E2E tests:

```tsx
import { test, expect } from '@playwright/test';

test('user can log in and view dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  expect(await page.isVisible('text=Trading Dashboard')).toBeTruthy();
});
```

Run E2E tests with:

```bash
npm run test:e2e
```

## Deployment Process

The Trading Farm platform uses a CI/CD pipeline for automated testing and deployment.

### Development Workflow

1. Create a feature branch from `main`
2. Develop and test locally
3. Create a Pull Request to `main`
4. CI pipeline runs tests and builds the application
5. Merge PR after approval
6. CI deploys to staging environment
7. Manually trigger deployment to production

### Environment Variables

Required environment variables for deployment:

```
NEXT_PUBLIC_SUPABASE_URL=<Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase Anon Key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase Service Role Key>
CREDENTIAL_ENCRYPTION_KEY=<Encryption Key for Credentials>
```

### Deployment Commands

Deploy to staging:

```bash
npm run deploy:staging
```

Deploy to production:

```bash
npm run deploy:production
```

## Contributing Guidelines

### Code Style

- Follow the ESLint and Prettier configurations
- Use TypeScript for all new code
- Maintain high type-safety (no `any` types)
- Follow the component structure conventions

### Commit Messages

Follow the conventional commits format:

```
feat: add new trading form
fix: resolve issue with order placement
docs: update README with setup instructions
```

### Pull Request Process

1. Create a branch with a descriptive name (e.g., `feature/add-trading-form`)
2. Make your changes and ensure all tests pass
3. Update documentation as needed
4. Create a PR with a clear description of changes
5. Request review from at least one team member
6. Address any feedback and ensure CI passes
7. Merge after approval
