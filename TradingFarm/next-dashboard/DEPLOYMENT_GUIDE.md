# Trading Farm Production Deployment Guide

This document provides detailed instructions for deploying the Trading Farm platform to production environments.

## Prerequisites

- Node.js v18.0.0 or higher
- npm v8.0.0 or higher
- Supabase account and project
- Docker (for containerized deployment)
- Hosting environment (AWS, Azure, DigitalOcean, etc.)

## Deployment Options

The Trading Farm platform supports multiple deployment options to fit your infrastructure requirements.

### Option 1: Standalone Server Deployment

This is the simplest deployment option and works well for most use cases.

1. **Prepare the environment**

   Create a production environment file:
   ```bash
   cp .env.production.example .env.production
   ```
   
   Edit `.env.production` and update with your Supabase credentials and other environment variables.

2. **Build the application**

   ```bash
   npm run deploy:prod
   ```

   This script prepares the application for production and creates an optimized build.

3. **Apply database migrations**

   ```bash
   npm run migrate:prod
   ```

   This ensures all database tables and functions are properly created.

4. **Start the application**

   ```bash
   npm run start:prod
   ```

   The application will be available on port 3000 by default. You can change this by setting the PORT environment variable.

### Option 2: Dockerized Deployment

For containerized environments, the application can be deployed as a Docker container.

1. **Build the Docker image**

   ```bash
   docker build -t trading-farm-dashboard:latest .
   ```

2. **Run the container**

   ```bash
   docker run -p 3000:3000 --env-file .env.production trading-farm-dashboard:latest
   ```

3. **Deploy to Kubernetes**

   For Kubernetes deployment, use the provided Kubernetes manifests in the `/k8s` directory.

   ```bash
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   ```

### Option 3: Platform-as-a-Service Deployment

The application can be deployed to PaaS providers like Vercel, Netlify, or Heroku.

1. **Vercel Deployment**

   ```bash
   vercel --prod
   ```

2. **Netlify Deployment**

   ```bash
   netlify deploy --prod
   ```

## Post-Deployment Verification

After deployment, run the verification script to ensure all components are functioning correctly:

```bash
node scripts/verify-deployment.js
```

This script checks:
- Database connectivity
- API endpoints
- Authentication flow
- Trading connectors
- WebSocket connections

## Monitoring

The Trading Farm platform includes built-in monitoring capabilities:

- **Performance Metrics**: Available at `/api/monitoring/metrics`
- **Health Check**: Available at `/api/monitoring/health`
- **Status Dashboard**: Available at `/dashboard/monitoring`

For production environments, consider integrating with external monitoring services like:
- Datadog
- New Relic
- Prometheus/Grafana

## Troubleshooting

Common deployment issues and solutions:

1. **Database Connection Errors**
   - Verify that the Supabase URL and API keys are correct
   - Check that the IP address of your server is allowed in the Supabase dashboard

2. **Build Errors**
   - Ensure Node.js version is 18 or higher
   - Try running with `npm run build:prod --verbose` for detailed error logs

3. **Runtime Errors**
   - Check the application logs for specific error messages
   - Verify that all environment variables are properly set

## Rollback Procedure

If you need to rollback to a previous version:

1. Restore the codebase from your version control system
2. Build the application as described above
3. If database schema changes were made, apply the down migrations
   ```bash
   npx supabase migration down
   ```

## Security Considerations

- Always use HTTPS in production
- Set up proper firewall rules
- Regularly update dependencies using `npm audit fix`
- Enable Rate Limiting for API endpoints

## Performance Optimization

For high-traffic environments:
- Use a CDN for static assets
- Configure proper caching headers
- Consider implementing a Redis cache for frequent database queries
- Scale horizontally by deploying multiple instances behind a load balancer

---

For additional support, contact the Trading Farm development team.
