# Trading Farm Administrator Guide

## Overview

This guide provides comprehensive instructions for system administrators responsible for deploying, configuring, and maintaining the Trading Farm platform. It covers server setup, database management, security controls, and routine maintenance tasks.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Database Management](#database-management)
5. [User Management](#user-management)
6. [Security Controls](#security-controls)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Backup and Recovery](#backup-and-recovery)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance Tasks](#maintenance-tasks)

## System Requirements

### Production Environment

- **Server**: 
  - CPU: 4+ cores
  - RAM: 8GB+
  - Storage: 50GB+ SSD
  - OS: Ubuntu 22.04 LTS or later

- **Database**:
  - Supabase Managed Database or
  - PostgreSQL 15+ with PostgREST

- **Web Server**:
  - Node.js 18+ (LTS)
  - Nginx (as reverse proxy)

- **Network**:
  - HTTPS required (SSL certificate)
  - WebSocket support
  - Rate limiting capability

### Staging Environment

- Similar to production but can use lower specifications

## Installation

### Deployment via Vercel (Recommended)

1. Fork the Trading Farm repository on GitHub
2. Connect your fork to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy the application

### Manual Deployment

1. Clone the repository:
   ```bash
   git clone https://github.com/yourorg/trading-farm.git
   cd trading-farm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env.production
   ```
   
   Edit `.env.production` with your production environment variables.

5. Start the application:
   ```bash
   npm run start
   ```

6. Configure Nginx as a reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. Set up SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abcdefghijklm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1...` |
| `CREDENTIAL_ENCRYPTION_KEY` | 32-byte hex key for API credential encryption | `deadbeefdeadbeef...` |
| `REDIS_URL` | URL for Redis (optional, for caching) | `redis://localhost:6379` |
| `LOG_LEVEL` | Application logging level | `info` |
| `MAX_CONNECTIONS_PER_USER` | Connection limit per user | `5` |
| `ORDER_SIZE_LIMIT` | Maximum order size in USD | `10000` |
| `WEBHOOK_SECRET` | Secret for webhook validation | `your-secret-key` |

### Feature Flags

Feature flags can be configured in the Supabase database table `feature_flags`. The application checks this table on startup to enable or disable features.

Example feature flag configuration:

```sql
INSERT INTO feature_flags (flag_key, enabled, description) 
VALUES 
  ('enable_advanced_trading', true, 'Enable advanced trading features'),
  ('enable_agent_orchestration', true, 'Enable trading agent orchestration'),
  ('maintenance_mode', false, 'Put application in maintenance mode');
```

## Database Management

### Database Schema

The Trading Farm application requires several database tables defined in migration files located in `supabase/migrations/`.

### Running Migrations

To apply database migrations:

```bash
npm run db:migrate
```

To generate TypeScript types based on the schema:

```bash
npm run db:typegen
```

### Database Maintenance

Regular maintenance tasks:

1. **Vacuum** the database to reclaim storage:
   ```sql
   VACUUM FULL ANALYZE;
   ```

2. **Reindex** tables for performance:
   ```sql
   REINDEX TABLE orders;
   REINDEX TABLE positions;
   ```

3. **Analyze** tables to update statistics:
   ```sql
   ANALYZE VERBOSE;
   ```

### Data Retention

Configure data retention policies for audit logs and historical data:

```sql
-- Create a function to delete old records
CREATE OR REPLACE FUNCTION purge_old_records()
RETURNS void AS $$
BEGIN
  -- Delete trading audit logs older than 1 year
  DELETE FROM trading_audit_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Delete security logs older than 6 months
  DELETE FROM security_access_logs
  WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run the function
SELECT cron.schedule(
  'purge-old-records',
  '0 1 * * 0', -- Run at 1:00 AM every Sunday
  'SELECT purge_old_records()'
);
```

## User Management

### Managing User Accounts

1. **View Users**: Access the Supabase dashboard and navigate to Authentication > Users.

2. **Create Admin User**:
   ```sql
   -- First, create the user via Supabase Auth
   -- Then, set admin privileges
   UPDATE auth.users
   SET raw_app_meta_data = jsonb_set(
     raw_app_meta_data,
     '{role}',
     '"admin"'
   )
   WHERE email = 'admin@example.com';
   ```

3. **Disable User Account**:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = jsonb_set(
     raw_user_meta_data,
     '{status}',
     '"disabled"'
   )
   WHERE email = 'user@example.com';
   ```

### User Roles and Permissions

The Trading Farm platform has several built-in roles:

- **Admin**: Full access to all features
- **Manager**: Can manage trading farms and view all data
- **Trader**: Can trade and manage their own farms
- **Viewer**: Read-only access to data

To assign roles, update the user's metadata in the Supabase auth system.

## Security Controls

### API Rate Limiting

Configure rate limiting in the `middleware/security.ts` file:

```typescript
const options = {
  enforce: true,
  rateLimit: true,
  rateLimitThreshold: 100 // Requests per minute
};
```

### IP Restrictions

IP restrictions are managed through the `security_ip_allowlist` table:

```sql
-- Allow IP for specific user
INSERT INTO security_ip_allowlist (user_id, ip_address, description)
VALUES 
  ('user-uuid', '192.168.1.1', 'Office IP');
```

### Credential Security

1. **Generate Encryption Key**:
   ```bash
   openssl rand -hex 32
   ```
   Set this as `CREDENTIAL_ENCRYPTION_KEY` in your environment variables.

2. **Rotate Encryption Key** (requires application downtime):
   - Generate a new key
   - Decrypt all credentials with old key
   - Encrypt all credentials with new key
   - Update environment variable

### Security Auditing

Review security logs regularly:

```sql
-- Find suspicious activity
SELECT *
FROM security_access_logs
WHERE risk_score > 70
ORDER BY created_at DESC;
```

## Monitoring and Alerting

### Application Health Monitoring

Set up monitoring endpoints:

1. `/api/healthcheck`: Verifies the application is running
2. `/api/healthcheck/db`: Verifies database connectivity
3. `/api/healthcheck/deep`: Performs a deep health check

### Performance Monitoring

Monitor key performance indicators:

1. **API Response Times**: Track via server logs or APM tool
2. **Database Query Performance**: Monitor slow queries
3. **Memory Usage**: Watch for memory leaks
4. **CPU Utilization**: Ensure adequate capacity

### Alert Configuration

Set up alerts for critical issues:

1. **High Error Rate**: Alert when error rate exceeds threshold
2. **Database Connectivity**: Alert on database connection failures
3. **Authentication Failures**: Alert on multiple failed login attempts
4. **API Latency**: Alert when API endpoints are slow
5. **Disk Space**: Alert when storage is running low

## Backup and Recovery

### Database Backup

Supabase provides automated backups, but additional backups can be configured:

```bash
# Manual backup
pg_dump -h your-database-host -U postgres -d postgres -F c -f backup.dump

# Restore from backup
pg_restore -h your-database-host -U postgres -d postgres -F c backup.dump
```

### Application Backup

Back up application code and configuration:

```bash
# Backup environment variables
cp .env.production .env.production.backup

# Backup custom configurations
tar -czvf config-backup.tar.gz .env.production config/
```

### Disaster Recovery Plan

1. **Database Failure**:
   - Restore from latest backup
   - Apply transaction logs if available

2. **Application Server Failure**:
   - Deploy to backup server
   - Update DNS settings
   - Verify database connectivity

3. **Complete System Failure**:
   - Restore database from backup
   - Deploy application code
   - Restore configuration files
   - Verify system functionality

## Performance Tuning

### Application Performance

1. **Node.js Optimization**:
   ```bash
   # Set Node.js options for production
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Next.js Build Optimization**:
   - Enable output compression
   - Optimize image loading
   - Use serverless functions appropriately

### Database Performance

1. **Index Optimization**:
   ```sql
   -- Add index for frequent queries
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   ```

2. **Query Optimization**:
   - Review and optimize slow queries
   - Use EXPLAIN ANALYZE to identify bottlenecks

### Caching Strategy

1. **Redis Cache** (if configured):
   - Market data caching
   - User preference caching
   - Session data storage

2. **API Response Caching**:
   - Use Next.js ISR for semi-static data
   - Configure cache headers appropriately

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify connection string
   - Check network connectivity
   - Validate credentials

2. **Authentication Problems**:
   - Verify Supabase configuration
   - Check JWT tokens and expiry
   - Validate user roles

3. **Performance Degradation**:
   - Check server resources
   - Monitor database load
   - Review application logs

### Log Analysis

Important log locations:

1. **Application Logs**: Available in the deployment platform (Vercel/server)
2. **Database Logs**: Available in Supabase dashboard
3. **Error Tracking**: Configure with a service like Sentry

### Diagnostic Commands

```bash
# Check application status
pm2 status

# View application logs
pm2 logs

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check disk space
df -h
```

## Maintenance Tasks

### Routine Maintenance Checklist

#### Weekly Tasks
- Review error logs
- Monitor disk space
- Check backup integrity
- Review security logs

#### Monthly Tasks
- Apply security patches
- Review user accounts
- Optimize database
- Test backup restoration

#### Quarterly Tasks
- Review access controls
- Update documentation
- Performance testing
- Security audit

### Upgrading the Application

1. **Prepare for Upgrade**:
   - Backup database
   - Backup configuration
   - Schedule maintenance window

2. **Perform Upgrade**:
   ```bash
   # Pull latest code
   git pull origin main
   
   # Install dependencies
   npm install
   
   # Run migrations
   npm run db:migrate
   
   # Build application
   npm run build
   
   # Restart services
   pm2 restart all
   ```

3. **Verify Upgrade**:
   - Test critical functionality
   - Verify database connectivity
   - Check error logs
