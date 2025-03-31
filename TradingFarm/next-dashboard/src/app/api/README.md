# Trading Farm Dashboard API

This directory contains the API implementation for the Trading Farm Dashboard application. The API is built using Next.js API routes, which provide a serverless function architecture for handling HTTP requests.

## API Structure

The API follows a RESTful structure with resource-based endpoints:

- `/api/dashboard` - Dashboard data
- `/api/farms` - Farm resource
- `/api/agents` - Agent resource
- `/api/orders` - Order resource
- `/api/trades` - Trade resource
- `/api/analytics` - Analytics endpoints

## Authentication

> Note: Authentication is not implemented in this version. In a production environment, all API routes should be protected.

## API Endpoints

### Dashboard

- `GET /api/dashboard` - Get dashboard summary

### Farms

- `GET /api/farms` - List all farms
- `POST /api/farms` - Create a new farm
- `GET /api/farms/:id` - Get a specific farm
- `PUT /api/farms/:id` - Update a farm
- `DELETE /api/farms/:id` - Delete a farm

### Agents

- `GET /api/agents` - List all agents
- `POST /api/agents` - Create a new agent
- `GET /api/agents/:id` - Get a specific agent
- `PUT /api/agents/:id` - Update an agent
- `DELETE /api/agents/:id` - Delete an agent
- `POST /api/agents/:id/actions` - Perform agent actions (start/stop)

### Orders

- `GET /api/orders` - List all orders
- `POST /api/orders` - Create a new order
- `GET /api/orders/:id` - Get a specific order
- `PUT /api/orders/:id` - Update an order (limited fields)
- `DELETE /api/orders/:id` - Cancel an order

### Trades

- `GET /api/trades` - List trades (with filtering options)

### Analytics

- `GET /api/analytics/trade-metrics` - Get trade performance metrics

## Response Format

All API responses follow a consistent format:

```json
{
  "data": {
    // Response data
  },
  "error": "Error message (only included if there's an error)",
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100
  }
}
```

## Error Handling

The API handles errors consistently across all endpoints:

- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server-side errors

## Example Usage

### Getting Dashboard Data

```typescript
// In a React component
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/dashboard?userId=1');
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        setDashboardData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Active Farms: {dashboardData.activeFarms}</p>
      {/* Render other dashboard data */}
    </div>
  );
}
```

## Implementation Notes

- API routes use the service layer to access the data layer
- The service layer handles business logic
- The repository layer handles data access
- Routes handle request/response formatting, validation, and error handling 