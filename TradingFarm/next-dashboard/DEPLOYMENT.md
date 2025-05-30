# Trading Farm Deployment Guide

This document provides instructions for deploying the Trading Farm platform to production.

## Deployment Process

1. **Prepare for deployment**

   ```bash
   node scripts/prepare-deployment.js
   ```

   This script creates a deployment-ready configuration by:
   - Creating a separate deployment branch
   - Adding "use client" directives to React components
   - Modifying Next.js configuration to bypass TypeScript errors
   - Updating package.json with deployment-specific scripts

2. **Build the application**

   ```bash
   npm run build:deployment
   ```

   This creates an optimized production build with TypeScript checking disabled.

3. **Apply database migrations**

   ```bash
   # Fix agent table issues first
   npx supabase migration up 20250428000000_fix_agents_policy.sql
   
   # Apply monitoring tables migration
   npx supabase migration up 20250428T035413_add_monitoring_tables.sql
   
   # Apply remaining migrations
   npx supabase db push
   ```

4. **Start the application in production**

   ```bash
   npm run start:deployment
   ```

5. **Verify deployment**

   ```bash
   node scripts/verify-deployment.js
   ```

6. **Restore development settings**

   After deploying, you can restore original development settings:

   ```bash
   npm run restore:development
   ```

## Deployment with CI/CD

This project includes a GitHub Actions workflow for automated deployment. The workflow is configured in `.github/workflows/deployment.yml`.

To deploy using the CI/CD pipeline:

1. Push changes to the `main` branch for staging deployment
2. Push changes to the `production` branch for production deployment
3. You can also manually trigger a deployment from the GitHub Actions interface

## Environment Variables

Ensure all required environment variables are set in your production environment. See `.env.production.example` for a list of required variables.

## Troubleshooting

If you encounter issues during deployment:

1. Check the build logs for errors
2. Verify all environment variables are correctly set
3. Ensure database migrations have been applied successfully
4. Check network connectivity to external services
5. Verify file permissions on the deployment server
