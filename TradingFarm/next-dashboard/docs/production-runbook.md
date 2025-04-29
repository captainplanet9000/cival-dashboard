# Trading Farm Production Runbook

This runbook provides essential operational procedures, troubleshooting steps, and recovery processes for managing the Trading Farm platform in production.

**Last Updated:** April 28, 2025

## System Architecture Overview

Trading Farm consists of three main components:

1. **Next.js Dashboard**: The primary user interface and application logic
2. **Vault Banking System**: Flask-based banking and funds management system
3. **Supabase Backend**: Database, authentication, and real-time functionality

### Deployment Architecture

![Trading Farm Architecture](../public/images/architecture-diagram.png)

- **Next.js Dashboard**: Deployed on Vercel
- **Vault Banking System**: Containerized using Docker, deployed on Cloud Run
- **Supabase**: Dedicated project with RLS policies for data security
- **Exchanges**: Connected via secure API connectors with encrypted credentials

## Routine Operations

### Starting Services

#### 1. Starting the Next.js Dashboard

The Next.js dashboard is automatically deployed via Vercel. No manual startup is required.

#### 2. Starting the Vault Banking System

```bash
# SSH into the Vault Banking server
ssh admin@vault-banking-server

# Start the Docker container
docker start trading-farm-vault
```

Or via Cloud Run:

```bash
# Deploy a new revision
gcloud run deploy trading-farm-vault \
  --image gcr.io/trading-farm/vault-banking:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Stopping Services

#### 1. Stopping the Next.js Dashboard

In emergencies, the dashboard can be paused in the Vercel dashboard.

#### 2. Stopping the Vault Banking System

```bash
# SSH into the Vault Banking server
ssh admin@vault-banking-server

# Stop the Docker container
docker stop trading-farm-vault
```

### Routine Checks

Perform these checks daily:

1. **Dashboard Health**: Visit the dashboard health endpoint: `/api/health`
2. **Vault Banking Health**: Visit the Vault health endpoint: `http://[vault-url]/api/health`
3. **Database Health**: Check Supabase metrics in the Supabase dashboard
4. **Exchange Connectivity**: Check `/api/exchanges/status` for all connected exchanges

### Database Management

#### Backing Up the Database

Supabase provides automatic daily backups. To create a manual backup:

1. Navigate to the Supabase dashboard
2. Go to Project Settings > Database
3. Click "Create Backup"

Alternatively, use the Supabase CLI:

```bash
supabase db dump -f backup.sql --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"
```

#### Restoring from Backup

Via Supabase Dashboard:
1. Navigate to the Supabase dashboard
2. Go to Project Settings > Database
3. Select a backup point and click "Restore"

## Monitoring and Alerting

Trading Farm implements a comprehensive monitoring and alerting system to ensure reliable operation and quick response to issues.

### Monitoring System Architecture

The monitoring system consists of the following components:

1. **Client-side Monitoring**: Frontend performance tracking via the `monitoring.ts` library
2. **API Endpoint Monitoring**: Performance and error tracking for all API calls
3. **Server-side Logging**: Structured logs with severity levels and contextual information
4. **Centralized Metrics Collection**: `/api/monitoring` endpoint for collecting all monitoring data
5. **Performance Metrics Dashboard**: Available at `/dashboard/monitoring`

### Key Metrics

| Metric Category | Metrics | Alert Threshold | Description |
|----------------|---------|-----------------|-------------|
| API Performance | Latency | > 2000ms | API response time |
| | Error Rate | > 5% | Percentage of failed API calls |
| | Throughput | < 10 req/sec | Requests per second |
| System Resources | Memory Usage | > 90% | Memory consumption |
| | CPU Usage | > 80% | CPU utilization |
| | DB Connections | > 80% pool capacity | Database connection pool usage |
| Trading | Agent Health | < 80% | Percentage of healthy trading agents |
| | Order Success Rate | < 95% | Percentage of successfully executed orders |
| Vault | Transaction Success | < 95% | Percentage of successful transactions |

### Monitoring Dashboard

The monitoring dashboard provides real-time visibility into system performance and can be accessed at `/dashboard/monitoring`. It includes:

- Real-time performance metrics
- Error logs and trends
- Resource utilization
- Trading agent health
- Vault transaction status

### Alert Notifications

Alerts are sent via multiple channels based on severity:

- **Critical**: Email, SMS, and dashboard notification
- **Error**: Email and dashboard notification
- **Warning**: Dashboard notification only
- **Info**: Logged but no notification

Alert configuration is managed in the `.env.production` file with the following variables:

```
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
MONITORING_API_KEY=your-monitoring-api-key
SENTRY_DSN=your-sentry-dsn
ALERT_EMAIL=alerts@tradingfarm.com
```

### Key Metrics to Monitor

1. **System Health Metrics**
   - CPU & Memory usage
   - API response times
   - Error rates

2. **Business Metrics**
   - Active trading agents
   - Order throughput
   - Trading volume

3. **User Metrics**
   - Active users
   - Session duration
   - Feature usage

### Alert Thresholds

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| API Error Rate | >2% | >5% | Investigate API logs |
| API Response Time | >1000ms | >2000ms | Check for bottlenecks |
| Memory Usage | >70% | >85% | Scale up resources |
| CPU Usage | >70% | >90% | Scale up resources |
| Exchange Connectivity | >500ms latency | Connection failure | Check exchange status |
| Agent Error Rate | >2 errors/minute | >5 errors/minute | Check agent logs |

### Log Access

#### Dashboard Logs (Vercel)

Access logs via the Vercel dashboard or CLI:

```bash
vercel logs trading-farm-dashboard
```

#### Vault Banking Logs

```bash
# View container logs
docker logs trading-farm-vault

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=trading-farm-vault" --limit=50
```

#### Database Logs

Access via Supabase dashboard:
1. Go to Database > Logs
2. Filter logs as needed

## Troubleshooting

### Common Issues & Solutions

#### 1. Dashboard Connectivity Issues

**Symptoms**: Users unable to access dashboard or facing timeouts

**Steps**:
1. Check Vercel deployment status
2. Verify domain DNS configuration
3. Check for rate limiting issues
4. Review error logs for specific errors

**Resolution**:
- Restart the deployment if needed
- Clear CDN cache using Vercel dashboard
- Scale up resources if under heavy load

#### 2. Exchange Connectivity Issues

**Symptoms**: Unable to fetch market data or place orders

**Steps**:
1. Check exchange status via their status page
2. Verify API key permissions and limits
3. Look for rate limiting messages in logs
4. Test exchange APIs directly with the `/api/exchanges/test` endpoint

**Resolution**:
- Refresh API credentials if necessary
- Implement exponential backoff for rate-limited requests
- Switch to backup exchange if primary is down

#### 3. Database Performance Issues

**Symptoms**: Slow queries, timeouts, or connection errors

**Steps**:
1. Check Supabase status
2. Review database metrics for connection count and query times
3. Look for slow query logs
4. Analyze index usage

**Resolution**:
- Optimize slow queries
- Add missing indexes
- Scale up database resources
- Implement better connection pooling

#### 4. Agent System Issues

**Symptoms**: Agents failing to start, execute trades, or reporting errors

**Steps**:
1. Check agent health status in dashboard
2. Review agent logs for specific errors
3. Verify exchange credentials for live agents
4. Check for strategy parameter issues

**Resolution**:
- Restart problematic agents
- Update exchange credentials if expired
- Adjust strategy parameters if causing errors
- Check risk limits if preventing trades

### Emergency Recovery Procedures

#### 1. Exchange Connection Failure Recovery

If all exchange connections fail:

1. Check IP restrictions on exchange API settings
2. Verify SSL certificates haven't expired
3. Check for API key rotation requirements
4. Execute the recovery script to refresh connections:

```bash
node scripts/recover-exchange-connections.js
```

#### 2. Database Corruption Recovery

In case of database corruption:

1. Stop all services to prevent further writes
2. Identify the corruption point and cause
3. Restore from the latest backup before corruption
4. Verify data integrity after restore
5. Restart services

#### 3. Security Incident Response

If a security breach is detected:

1. Isolate affected systems immediately
2. Revoke and rotate all API keys
3. Lock all user accounts temporarily
4. Document the breach details
5. Execute security recovery script:

```bash
node scripts/security-recovery.js
```

#### 4. Vault Banking Emergency Procedures

In case of Vault banking issues:

1. Enable emergency mode: `/api/vault/emergency-mode/enable`
2. Freeze all transfers: `/api/vault/transfers/freeze`
3. Execute reconciliation: `/api/vault/reconcile`
4. Document all actions taken
5. Contact support if further assistance is needed

## Performance Optimization and Scaling

### Performance Optimization

The Trading Farm dashboard implements several performance optimizations to ensure a responsive user experience even under heavy load.

#### Code Splitting and Lazy Loading

Components are dynamically loaded using the `lazy-load.tsx` utilities:

```typescript
import { createLazyComponent } from '@/components/ui/lazy-load';

// Usage for heavy components
export const DynamicTradingChart = createLazyComponent(
  () => import('@/components/charts/trading-chart')
);
```

This pattern should be used for all heavy components, especially those not required for initial page load. Common candidates include:

- Chart components
- Complex forms
- Modal dialogs
- Secondary UI sections

#### React Query Optimization

React Query is optimized for different data types in `react-query-config.ts`:

```typescript
// Use these helpers for optimal data fetching
import { getLiveTradingQueryOptions } from '@/lib/react-query-config';

const { data } = useQuery(
  queryKeys.trading.positions(),
  fetchPositions,
  getLiveTradingQueryOptions()
);
```

Key optimization strategies:

| Data Type | Stale Time | Refetch Interval | Notes |
|-----------|------------|------------------|-------|
| Live Trading | 5s | 10s | Real-time market data |
| Account | 30s | 60s | Balance, settings |
| Reference | 30m | On demand | Static lookups |

#### Virtualization for Large Datasets

The `VirtualList` component optimizes rendering of large datasets:

```jsx
<VirtualList
  items={orders}
  renderItem={(order) => <OrderRow order={order} />}
  itemHeight={48}
  overscan={5}
/>
```

Implement virtualization for any list that may contain more than 50 items, including:

- Order history
- Trading logs
- Agent performance tables
- Vault transactions

#### Next.js Build Optimization

The `next.config.js` includes production optimizations:

- SWC minification
- Server components
- Image optimization
- Bundle splitting

To analyze bundle size:

```bash
NEXT_PUBLIC_ENABLE_BUNDLE_ANALYZER=true npm run build
```

Or use the dedicated script:

```bash
node scripts/analyze-bundle.js
```

### Scaling Procedures

#### Scaling the Next.js Dashboard

The dashboard automatically scales via Vercel, but you can:

1. Upgrade to a higher Vercel plan for more resources
2. Add Edge Functions for improved global performance
3. Optimize API routes with caching strategies

#### Database Connection Pooling

The application uses connection pooling to optimize database performance:

```typescript
import { getPooledConnection, releaseConnection } from '@/utils/supabase/connection-pool';

// Get a connection from the pool
const supabase = await getPooledConnection();

// Use the connection...
const { data } = await supabase.from('orders').select('*');

// Always release the connection when done
releaseConnection(supabase);
```

The connection pool settings can be configured in `.env.production`:

```
DB_POOL_SIZE=10
DB_CONNECTION_TIMEOUT=30000
```

To monitor connection pool usage:

```typescript
import { getConnectionStats } from '@/utils/supabase/connection-pool';

const stats = getConnectionStats();
console.log(stats); // View active connections, pool size, etc.
```

#### Scaling the Vault Banking System

To scale the Vault Banking system:

1. **Vertical Scaling**:
   ```bash
   gcloud run services update trading-farm-vault \
     --memory 2Gi \
     --cpu 2
   ```

2. **Horizontal Scaling**:
   ```bash
   gcloud run services update trading-farm-vault \
     --min-instances 2 \
     --max-instances 10
   ```

#### Scaling the Database

To scale the Supabase database:

1. Upgrade to a higher tier in the Supabase dashboard
2. Add read replicas for read-heavy workloads
3. Implement more aggressive caching strategies

## Deployment Procedures

### Deploying Dashboard Updates

1. Merge code to main branch
2. Vercel automatically deploys from main
3. Run post-deployment verification script:
   ```bash
   node scripts/verify-deployment.js
   ```

### Deploying Vault Banking Updates

1. Build new Docker image:
   ```bash
   docker build -t gcr.io/trading-farm/vault-banking:latest ./vault-banking
   ```

2. Push to container registry:
   ```bash
   docker push gcr.io/trading-farm/vault-banking:latest
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy trading-farm-vault \
     --image gcr.io/trading-farm/vault-banking:latest \
     --platform managed \
     --region us-central1
   ```

### Database Migrations

1. Create migration using Supabase CLI:
   ```bash
   supabase migration new migration_name
   ```

2. Apply the migration:
   ```bash
   supabase migration up
   ```

3. Generate updated TypeScript types:
   ```bash
   supabase gen types typescript --schema public > src/types/database.types.ts
   ```

## Backup and Recovery

### Backup Schedule

| Component | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| Database | Daily automated | 7 days | Supabase |
| Database | Weekly manual | 90 days | Cloud Storage |
| Exchange Credentials | After changes | Indefinite | Encrypted vault |
| User Settings | Daily | 30 days | Database backup |

### Recovery Time Objectives

| Severity | Recovery Time | Recovery Point |
|----------|---------------|----------------|
| Critical | 1 hour | 15 minutes |
| High | 3 hours | 1 hour |
| Medium | 8 hours | 4 hours |
| Low | 24 hours | 24 hours |

## Contact Information

### Support Team

| Role | Name | Contact | Hours |
|------|------|---------|-------|
| Primary Admin | [Your Name] | [Your Email/Phone] | 24/7 |
| Database Admin | [DB Admin Name] | [DB Admin Email/Phone] | Business hours + On-call |
| Security Officer | [Security Name] | [Security Email/Phone] | Business hours + On-call |

### External Contacts

| Service | Contact | Support Plan | Account ID |
|---------|---------|--------------|------------|
| Vercel | support@vercel.com | Pro | [Vercel Account ID] |
| Supabase | support@supabase.io | Pro | [Supabase Project ID] |
| Google Cloud | cloud-support@google.com | Standard | [GCP Project ID] |

## Disaster Recovery

### Complete System Failure

In case of complete system failure:

1. Deploy dashboard from backup template:
   ```bash
   vercel deploy --prod --force
   ```

2. Restore database from latest backup
3. Deploy Vault Banking container from backup image
4. Run system integrity verification:
   ```bash
   node scripts/verify-system-integrity.js
   ```

### Data Center Outage

If the primary data center is unavailable:

1. Switch DNS to backup region
2. Activate replicated database in backup region
3. Deploy services to backup region
4. Verify system integrity in backup region

## Compliance and Audit

### Regular Auditing Procedures

1. **Weekly Database Audit**:
   ```bash
   node scripts/audit-database-access.js
   ```

2. **Monthly Security Audit**:
   ```bash
   node scripts/security-audit.js
   ```

3. **Quarterly Compliance Check**:
   ```bash
   node scripts/compliance-check.js
   ```

### Audit Logs

Audit logs are stored in:
- Supabase database table `audit_logs`
- Encrypted log files in Cloud Storage
- Vercel deployment logs

Access audit logs via:
```bash
node scripts/view-audit-logs.js --days 7
```

## Performance Optimization

### Database Query Optimization

Run the query analysis tool monthly:
```bash
node scripts/analyze-query-performance.js
```

### Frontend Performance

Run Lighthouse tests after each deployment:
```bash
node scripts/lighthouse-test.js
```

### API Performance

Monitor API performance via the dashboard:
`/admin/api-performance`

## Appendix

### Important Endpoints

| Endpoint | Purpose | Access Required |
|----------|---------|-----------------|
| /api/health | System health check | Public |
| /api/admin/status | Detailed system status | Admin only |
| /api/exchanges/status | Exchange connection status | Authenticated |
| /api/vault/health | Vault banking health | Authenticated |
| /admin/monitoring | Monitoring dashboard | Admin only |

### Configuration Reference

| Configuration | Default | Description | Update Method |
|---------------|---------|-------------|--------------|
| MAX_AGENTS_PER_USER | 10 | Maximum agents per user | Environment variable |
| ORDER_RATE_LIMIT | 20/min | Order placement rate limit | Environment variable |
| CONNECTION_POOL_SIZE | 10 | Database connection pool size | Environment variable |
| CACHE_DURATION | 60s | API cache duration | Environment variable |

### Maintenance Windows

Scheduled maintenance windows:
- **Weekly**: Sundays, 01:00 - 03:00 UTC
- **Monthly**: First Saturday, 01:00 - 05:00 UTC

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-04-28 | 1.0 | Initial documentation | [Your Name] |
