# ElizaOS Trading Agent System - Deployment Guide

This comprehensive guide provides detailed instructions for deploying the ElizaOS Trading Agent System in various environments, from local development to production deployments.

## System Requirements

### Hardware Requirements

For optimal performance, the following hardware specifications are recommended:

**Development Environment:**
- CPU: 4+ cores
- RAM: 8GB minimum, 16GB recommended
- Storage: 50GB SSD
- Network: Stable broadband connection

**Production Environment:**
- CPU: 8+ cores
- RAM: 16GB minimum, 32GB recommended
- Storage: 100GB+ SSD with monitoring for space usage
- Network: Low-latency, high-availability connection

### Software Prerequisites

Before installation, ensure your system has the following prerequisites:

- Node.js v20.x or later
- npm v10.x or later
- PostgreSQL v14.x or later
- Docker v24.x or later (for containerized deployment)
- Git v2.30.x or later

### Network Requirements

The ElizaOS Trading Agent System requires the following network access:

- Outbound HTTPS (TCP port 443) to exchange APIs
- Outbound WebSocket connections to exchange APIs
- Outbound HTTPS to ElizaOS API endpoints
- Database connection (typically TCP port 5432 for PostgreSQL)

## Installation Options

### Local Development Installation

For local development and testing, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/your-organization/trading-farm-dashboard.git
cd trading-farm-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Set up the database:

```bash
npx supabase start
npx supabase migration up
npx supabase gen types typescript --local > src/types/database.types.ts
```

4. Create a `.env.local` file with required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ELIZAOS_API_KEY=your-elizaos-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

### Production Installation

For production deployment, follow these steps:

1. Clone the repository on your production server:

```bash
git clone https://github.com/your-organization/trading-farm-dashboard.git
cd trading-farm-dashboard
```

2. Install dependencies:

```bash
npm install --production
```

3. Build the application:

```bash
npm run build
```

4. Set up the production database with Supabase or a hosted PostgreSQL instance.

5. Create a `.env.production` file with required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ELIZAOS_API_KEY=your-elizaos-api-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

6. Start the production server:

```bash
npm start
```

Use a process manager like PM2 to ensure the application stays running:

```bash
npm install -g pm2
pm2 start npm --name "trading-farm" -- start
pm2 save
pm2 startup
```

### Docker Containerization

For containerized deployment, follow these steps:

1. Build the Docker image:

```bash
docker build -t trading-farm:latest .
```

2. Create a `.env` file with your environment variables.

3. Run the container:

```bash
docker run -d \
  --name trading-farm \
  -p 3000:3000 \
  --env-file .env \
  trading-farm:latest
```

For production with Docker Compose:

```yml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: trading-farm:latest
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: always
    depends_on:
      - postgres
  
  postgres:
    image: postgres:14
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: your-secure-password
      POSTGRES_USER: postgres
      POSTGRES_DB: trading_farm
    restart: always

volumes:
  postgres-data:
```

Then run:

```bash
docker-compose up -d
```

### Cloud Deployment

#### Vercel Deployment

To deploy to Vercel:

1. Connect your repository to Vercel
2. Configure the environment variables in the Vercel dashboard
3. Deploy with the Vercel CLI:

```bash
npm install -g vercel
vercel
```

#### AWS Deployment

For AWS deployment with EC2:

1. Launch an EC2 instance with sufficient resources
2. Install Node.js, npm, and other prerequisites
3. Clone the repository and follow the production installation steps
4. Set up an Application Load Balancer for high availability
5. Configure a domain and SSL certificate through AWS Certificate Manager

## Configuration

### Environment Variables

The following environment variables are required for configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| NEXT_PUBLIC_SUPABASE_URL | URL for your Supabase instance | https://project.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Anonymous key for Supabase auth | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| ELIZAOS_API_KEY | API key for ElizaOS services | eliza_api_key_123456789 |
| NEXT_PUBLIC_APP_URL | Public URL of your application | https://trading.yourdomain.com |
| NODE_ENV | Environment (development/production) | production |
| DATABASE_URL | Direct PostgreSQL connection string (optional) | postgresql://user:pass@host:5432/db |
| REDIS_URL | Redis connection URL (for caching) | redis://user:pass@host:6379 |
| LOG_LEVEL | Logging verbosity | info |
| MAX_CONCURRENT_AGENTS | Maximum number of concurrent agents | 10 |
| PAPER_TRADING_ENABLED | Enable paper trading globally | true |

### Database Setup

The application requires a PostgreSQL database. You can configure this in several ways:

1. **Local Supabase**: For development using `npx supabase start`.
2. **Supabase Cloud**: Sign up at supabase.com and create a project.
3. **Self-hosted PostgreSQL**: Configure with the DATABASE_URL environment variable.

After setting up the database, run migrations:

```bash
npx supabase migration up
npx supabase gen types typescript --local > src/types/database.types.ts
```

### Security Settings

Configure these security settings for production environments:

1. **API Key Storage**: Store API keys securely in environment variables or a secrets manager.
2. **Authentication**: Configure Supabase authentication with appropriate JWT lifetimes.
3. **Row Level Security**: Enable and test RLS policies in Supabase.
4. **CORS Settings**: Configure allowed origins for API requests:

```typescript
// src/middleware.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## Integration with Exchanges

### API Key Configuration

Configure exchange API keys securely:

1. Generate API keys from each exchange with appropriate permissions:
   - Read account information
   - Read market data
   - Create and manage orders (for trading)

2. Apply appropriate restrictions:
   - IP restrictions to your server IPs
   - Withdrawal restrictions enabled
   - Trading permissions only for required pairs

3. Store keys securely in the database with encryption:
   - Use the exchange connection management UI
   - Enable "Store Encrypted" option for API secrets

### Rate Limit Considerations

Most exchanges enforce API rate limits. Configure the system to respect these limits:

1. Navigate to Dashboard > Settings > Exchanges
2. For each exchange, configure rate limiting parameters:
   - Request throttling delay
   - Burst request limits
   - Weight-based request planning

Example configuration for Binance:

```json
{
  "rate_limits": {
    "request_weight_limit": 1200,
    "order_rate_limit": 10,
    "max_requests_per_minute": 50,
    "throttling_delay_ms": 100,
    "auto_adjust_on_429": true
  }
}
```

### Security Best Practices

Follow these security practices for exchange connections:

1. **Principle of Least Privilege**: Only grant API keys the minimum permissions needed.
2. **Regular Rotation**: Implement a process to rotate API keys periodically.
3. **IP Whitelisting**: Restrict API key usage to specific server IPs.
4. **Monitoring**: Enable alerts for unusual API usage patterns.
5. **Audit Logging**: Keep detailed logs of all API access.

## Scaling and Performance

### Horizontal Scaling Options

For high-volume trading systems, consider these scaling approaches:

1. **Multiple Agent Instances**: 
   - Configure agent pools in Dashboard > Settings > System
   - Set maximum instances per agent type
   - Enable automatic scaling based on load

2. **Service Separation**:
   - Deploy API services separately from the dashboard UI
   - Use separate instances for background processing
   - Implement a microservices architecture for high-volume components

3. **Database Scaling**:
   - Configure read replicas for query-heavy operations
   - Implement database sharding for high-volume trading data
   - Use TimescaleDB extension for time-series data

### Load Balancing

For high-availability deployments:

1. **Application Load Balancing**:
   - Deploy multiple application instances
   - Use Nginx, AWS ALB, or similar load balancer
   - Configure health checks and auto-scaling

2. **Database Load Balancing**:
   - Set up database replication
   - Configure connection pooling
   - Implement read/write splitting

Example Nginx configuration for load balancing:

```nginx
upstream trading_farm {
    server app1.internal:3000;
    server app2.internal:3000;
    server app3.internal:3000;
}

server {
    listen 80;
    server_name trading.yourdomain.com;

    location / {
        proxy_pass http://trading_farm;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Performance Optimization

Optimize performance with these configurations:

1. **Database Indexing**:
   - Add appropriate indexes for frequently queried fields
   - Run `ANALYZE` regularly on busy tables
   - Monitor query performance with `pg_stat_statements`

2. **Caching Strategy**:
   - Enable Redis caching for market data
   - Configure cache TTL for different data types
   - Implement stale-while-revalidate pattern for UI data

3. **WebSocket Optimization**:
   - Use connection pooling for exchange WebSockets
   - Implement batched updates for UI clients
   - Consider server-side data filtering

## Security Considerations

### API Key Management

Implement secure API key management:

1. Set up a secure vault for API key storage:
   - Use a dedicated secrets manager like AWS Secrets Manager or HashiCorp Vault
   - Implement key encryption at rest
   - Rotate keys periodically

2. Configure the application to fetch keys securely:
   - Use environment variables for service credentials
   - Implement just-in-time key retrieval
   - Log all access to sensitive credentials

### Authentication Best Practices

Enhance security with these authentication practices:

1. **Multi-factor Authentication**:
   - Enable MFA for administrator accounts
   - Implement app-based or hardware token authentication
   - Require MFA for sensitive operations

2. **Session Management**:
   - Set appropriate session timeouts
   - Implement automatic logout for inactivity
   - Use secure, HttpOnly cookies

3. **Password Policies**:
   - Enforce strong password requirements
   - Implement account lockout after failed attempts
   - Require periodic password changes

### Access Control Configuration

Configure granular access control:

1. **Role-Based Access Control**:
   - Create roles with specific permissions
   - Assign users to appropriate roles
   - Implement principle of least privilege

2. **Feature Access**:
   - Restrict sensitive features to authorized roles
   - Implement approval workflows for critical actions
   - Log all access attempts

Example role configuration:

```json
{
  "roles": {
    "admin": {
      "permissions": ["read:*", "write:*", "delete:*"]
    },
    "trader": {
      "permissions": ["read:*", "write:orders", "write:positions"]
    },
    "analyst": {
      "permissions": ["read:*"]
    },
    "auditor": {
      "permissions": ["read:logs", "read:transactions", "read:reports"]
    }
  }
}
```

## Backup and Recovery

### Database Backup Strategies

Implement a robust backup strategy:

1. **Regular Backups**:
   - Configure daily full backups
   - Implement continuous WAL archiving
   - Store backups in multiple locations

2. **Backup Verification**:
   - Test restores regularly
   - Verify backup integrity
   - Document recovery procedures

Example backup script:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump -U postgres -d trading_farm -F c -f /backups/trading_farm_${DATE}.dump
aws s3 cp /backups/trading_farm_${DATE}.dump s3://trading-farm-backups/
```

### Configuration Export/Import

Manage configuration across environments:

1. **Configuration Export**:
   - Navigate to Dashboard > Settings > System
   - Use "Export Configuration" feature
   - Select components to include

2. **Configuration Import**:
   - Navigate to Dashboard > Settings > System
   - Use "Import Configuration" feature
   - Validate before applying

### Disaster Recovery Planning

Prepare for potential failures:

1. **Recovery Time Objectives**:
   - Define RTO for different system components
   - Implement appropriate redundancy for critical components
   - Document manual recovery procedures

2. **Recovery Point Objectives**:
   - Define RPO for trading data
   - Configure backup frequency accordingly
   - Implement transaction logging for point-in-time recovery

3. **Disaster Recovery Documentation**:
   - Create detailed recovery playbooks
   - Assign responsibilities to team members
   - Conduct regular DR drills

## Monitoring and Maintenance

### Health Checks

Implement comprehensive health monitoring:

1. **Service Health Checks**:
   - Configure endpoint monitoring
   - Set up automated tests
   - Implement synthetic transaction monitoring

Sample health check endpoint:

```typescript
// src/app/api/health/route.ts
import { createServerClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    // Check database connection
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('health').select('*').limit(1);
    if (error) throw error;
    
    // Check ElizaOS API
    const elizaResponse = await fetch('https://api.elizaos.com/health', {
      headers: { 'Authorization': `Bearer ${process.env.ELIZAOS_API_KEY}` }
    });
    if (!elizaResponse.ok) throw new Error('ElizaOS API health check failed');
    
    return new Response(JSON.stringify({
      status: 'healthy',
      database: 'connected',
      elizaos_api: 'connected',
      timestamp: new Date().toISOString()
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), { status: 500 });
  }
}
```

2. **Monitoring Integration**:
   - Configure Prometheus metrics collection
   - Set up Grafana dashboards
   - Implement alerting for critical metrics

### Log Management

Implement effective log management:

1. **Log Aggregation**:
   - Configure centralized logging
   - Implement structured logging format
   - Set up log retention policies

2. **Log Analysis**:
   - Configure log parsing for key metrics
   - Set up alerts for error patterns
   - Implement log visualization

Sample logging configuration:

```typescript
// src/services/logging/logger.ts
export const logger = {
  info: (message: string, context?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
      service: 'trading-farm'
    }));
  },
  error: (message: string, error?: any, context?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      service: 'trading-farm'
    }));
  }
  // Additional log levels...
};
```

### Update Procedures

Establish a structured update process:

1. **Regular Updates**:
   - Implement a scheduled update cadence
   - Test updates in staging environment
   - Document rollback procedures

2. **Dependency Management**:
   - Regularly update dependencies
   - Scan for security vulnerabilities
   - Maintain compatibility matrices

3. **Update Documentation**:
   - Document all system changes
   - Maintain a changelog
   - Update user documentation

## Getting Started After Deployment

After deployment, follow these steps to set up your trading system:

1. **Initial Login**:
   - Access the dashboard at your configured URL
   - Login with the default admin credentials
   - Change the password immediately

2. **Connect Exchanges**:
   - Navigate to Dashboard > Settings > Exchanges
   - Add your exchange API keys
   - Test connections

3. **Create Your First Agent**:
   - Navigate to Dashboard > Agents > Create Agent
   - Follow the [First Agent Guide](./first-agent.md)
   - Start with paper trading enabled

4. **Configure Monitoring**:
   - Set up alerts following the [Monitoring Guide](./monitoring.md)
   - Configure performance dashboards
   - Test alert delivery

With these steps completed, your ElizaOS Trading Agent System will be fully operational and ready for trading activities.

## Next Steps

After deployment, explore these guides for additional configuration:

1. [Creating Your First Trading Agent](./first-agent.md)
2. [Paper Trading Guide](./paper-trading.md)
3. [Multi-Agent Systems](./multi-agent-systems.md)
4. [Monitoring & Alerts](./monitoring.md)
5. [API Reference](./api-reference.md)
