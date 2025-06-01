# Trading Farm Dashboard Deployment Guide

This guide provides comprehensive instructions for deploying the Trading Farm Dashboard to various environments, including development, staging, and production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Build Process](#build-process)
5. [Deployment Options](#deployment-options)
   - [Netlify Deployment](#netlify-deployment)
   - [Vercel Deployment](#vercel-deployment)
   - [Docker Deployment](#docker-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring and Alerts](#monitoring-and-alerts)
8. [Rollback Procedures](#rollback-procedures)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have the following prerequisites:

- Node.js v20.x or later
- npm v10.x or later
- Supabase account and project
- Git access to the repository
- Appropriate deployment platform credentials (Netlify, Vercel, etc.)
- Environment variables configured

## Environment Setup

### Environment Variables

Create an `.env` file based on the `.env.example` template. The following variables are required:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API Configuration
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.example.com

# Analytics Configuration (Optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token
NEXT_PUBLIC_AMPLITUDE_API_KEY=your-amplitude-key

# Security Configuration
NEXT_PUBLIC_CSP_ENABLED=true
NEXT_PUBLIC_HSTS_ENABLED=true
```

### Different Environments

For multi-environment deployments, create specific environment files:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

The deployment CI/CD pipeline will use the appropriate environment file based on the deployment target.

## Database Configuration

### Supabase Setup

1. Create a new Supabase project from the Supabase dashboard
2. Initialize the database schema using migration files:

```bash
# Apply migrations to set up schema
npx supabase migration up

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.types.ts
```

### Row Level Security

Ensure Row Level Security (RLS) policies are correctly configured in your Supabase project to protect user data. All migrations needed for this are included in the migration files.

## Build Process

To build the application for deployment:

```bash
# Install dependencies
npm ci

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test:all

# Build the application
npm run build
```

This will create a production-ready build in the `.next` directory.

## Deployment Options

### Netlify Deployment

#### Using the Netlify UI

1. Log in to your Netlify account
2. Click "New site from Git"
3. Connect to your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variables from your `.env.production` file
6. Deploy your site

#### Using the Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize your site
netlify init

# Deploy to production
netlify deploy --prod
```

#### Using GitHub Actions (Recommended)

We've set up a GitHub Actions workflow in `.github/workflows/ci-cd.yml` that automatically deploys to Netlify when changes are pushed to the main branch.

To use this workflow:

1. Add the following secrets to your GitHub repository:
   - `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
   - `NETLIFY_PRODUCTION_SITE_ID`: Your production site ID
   - `NETLIFY_STAGING_SITE_ID`: Your staging site ID

2. Push to the appropriate branch:
   - `develop` branch deploys to staging
   - `main` branch deploys to production

### Vercel Deployment

#### Using the Vercel UI

1. Log in to your Vercel account
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add environment variables from your `.env.production` file
6. Deploy your site

#### Using the Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to development
vercel

# Deploy to production
vercel --prod
```

### Docker Deployment

A `Dockerfile` is provided to containerize the application for cloud or self-hosted deployments.

```bash
# Build the Docker image
docker build -t trading-farm-dashboard:latest .

# Run the Docker container
docker run -p 3000:3000 --env-file .env.production trading-farm-dashboard:latest
```

#### Docker Compose

For deployments with additional services, use the provided `docker-compose.yml`:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Post-Deployment Verification

After deploying, perform these verification checks:

1. **Accessibility Check**:
   - Verify the site is accessible via the deployment URL
   - Check that HTTPS is properly configured

2. **Authentication Check**:
   - Verify that users can sign up and log in
   - Test password reset functionality

3. **Functionality Check**:
   - Test exchange connections
   - Create and execute test orders (in staging environments)
   - Verify strategy creation and management
   - Test data visualization components

4. **Performance Check**:
   - Run Lighthouse performance tests
   - Verify load times are acceptable

5. **Security Check**:
   - Verify CSP headers are correctly applied
   - Test that RLS policies are functioning correctly
   - Check for exposed environment variables

## Monitoring and Alerts

### Application Monitoring

We use the following tools for monitoring:

1. **Error Tracking**: Sentry is configured to track runtime errors
2. **Performance Monitoring**: Vercel/Netlify Analytics
3. **Usage Analytics**: Google Analytics, Mixpanel, or Amplitude
4. **Uptime Monitoring**: UptimeRobot

### Setting Up Alerts

Configure alerts for:

1. **Downtime**: Set up alerts through UptimeRobot for any downtime
2. **Error Spikes**: Configure Sentry to alert on error spikes
3. **Performance Degradation**: Set up alerts for performance degradation
4. **Database Issues**: Monitor Supabase health metrics

## Rollback Procedures

In case of deployment issues, use these rollback procedures:

### Netlify Rollback

1. Go to the Deploys section in your Netlify site dashboard
2. Find the last working deployment
3. Click "Publish deploy" to roll back to that version

### Vercel Rollback

1. Go to the Deployments section in your Vercel project
2. Find the last working deployment
3. Click the three dots menu and select "Promote to Production"

### Database Rollback

To roll back database migrations:

```bash
# Roll back the last migration
npx supabase migration down

# Roll back to a specific migration
npx supabase migration down <migration-name>
```

## Security Considerations

### Content Security Policy (CSP)

Our application implements a strict Content Security Policy. When deploying, ensure the CSP headers are correctly applied:

1. Check the `src/utils/security/csp.ts` file for the current CSP configuration
2. Verify CSP headers are being properly set in the deployment

### API Keys and Secrets

1. Never commit API keys or secrets to the repository
2. Use environment variables for all sensitive information
3. Rotate API keys regularly
4. Use the least privileged access possible for service accounts

### Data Encryption

1. Sensitive data like API keys are encrypted before storage
2. Verify that the encryption utilities in `src/utils/security/encryption.ts` are functioning correctly

## Troubleshooting

### Common Issues

#### Build Failures

If builds fail in CI/CD:

1. Check the build logs for specific errors
2. Verify all dependencies are installed
3. Ensure environment variables are correctly set
4. Check for TypeScript or linting errors

#### Database Connection Issues

If the application can't connect to Supabase:

1. Verify Supabase credentials are correct
2. Check network connectivity to the Supabase instance
3. Ensure RLS policies aren't blocking legitimate access
4. Validate that your IP is not blocked by Supabase

#### Performance Issues

For slow application performance:

1. Run Lighthouse to identify bottlenecks
2. Check for excessive API calls
3. Verify proper caching is implemented
4. Check for memory leaks in React components

#### Authentication Problems

If users can't log in:

1. Verify Supabase authentication is properly configured
2. Check for CORS issues
3. Ensure cookies are being properly set
4. Validate the authentication flow in the application

---

For additional help or support with deployment, contact the development team at dev@tradingfarm.app.

© 2025 Trading Farm. All rights reserved.
