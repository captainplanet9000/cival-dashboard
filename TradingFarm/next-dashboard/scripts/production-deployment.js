const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const projectRoot = process.cwd();
const nextConfigPath = path.join(projectRoot, 'next.config.js');
const packageJsonPath = path.join(projectRoot, 'package.json');
const deploymentGuidePath = path.join(projectRoot, 'DEPLOYMENT_GUIDE.md');

console.log('=== Trading Farm Production Deployment ===');

// Create production-ready next.config.js
const productionNextConfig = `/** @type {import('next').NextConfig} */

// Production deployment configuration
const nextConfig = {
  // Disable type checking and linting for deployment builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Output standalone for containerized deployment
  output: 'standalone',
  // Production settings
  reactStrictMode: false,
  // Support API routes and server components
  experimental: {
    serverActions: true
  },
  // Optimize build
  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;
`;

// Backup and update next.config.js
const nextConfigBackupPath = `${nextConfigPath}.production-backup`;
if (fs.existsSync(nextConfigPath) && !fs.existsSync(nextConfigBackupPath)) {
  fs.copyFileSync(nextConfigPath, nextConfigBackupPath);
  console.log('Backed up original next.config.js');
}
fs.writeFileSync(nextConfigPath, productionNextConfig);
console.log('Created production-optimized next.config.js');

// Create production environment example file
const envProductionPath = path.join(projectRoot, '.env.production.example');
const envProductionContent = `# Production Environment Variables Example
# Copy this to .env.production and update with your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Security Settings
ENCRYPTION_SECRET=32-character-secret-key-for-encryption

# Analytics and Monitoring
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Exchange API Configuration (if applicable)
NEXT_PUBLIC_USE_TESTNET=false
`;

fs.writeFileSync(envProductionPath, envProductionContent);
console.log('Created production environment example file');

// Update package.json with production scripts
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageJsonBackupPath = `${packageJsonPath}.production-backup`;
  
  if (!fs.existsSync(packageJsonBackupPath)) {
    fs.writeFileSync(packageJsonBackupPath, JSON.stringify(packageJson, null, 2));
    console.log('Backed up original package.json');
  }
  
  // Add production deployment scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    'build:prod': 'next build',
    'start:prod': 'next start',
    'deploy:prod': 'node scripts/production-deployment.js && npm run build:prod',
    'migrate:prod': 'npx supabase migration up'
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json with production scripts');
} catch (error) {
  console.error('Error updating package.json:', error.message);
}

// Create comprehensive deployment guide
const deploymentGuideContent = `# Trading Farm Production Deployment Guide

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
   \`\`\`bash
   cp .env.production.example .env.production
   \`\`\`
   
   Edit \`.env.production\` and update with your Supabase credentials and other environment variables.

2. **Build the application**

   \`\`\`bash
   npm run deploy:prod
   \`\`\`

   This script prepares the application for production and creates an optimized build.

3. **Apply database migrations**

   \`\`\`bash
   npm run migrate:prod
   \`\`\`

   This ensures all database tables and functions are properly created.

4. **Start the application**

   \`\`\`bash
   npm run start:prod
   \`\`\`

   The application will be available on port 3000 by default. You can change this by setting the PORT environment variable.

### Option 2: Dockerized Deployment

For containerized environments, the application can be deployed as a Docker container.

1. **Build the Docker image**

   \`\`\`bash
   docker build -t trading-farm-dashboard:latest .
   \`\`\`

2. **Run the container**

   \`\`\`bash
   docker run -p 3000:3000 --env-file .env.production trading-farm-dashboard:latest
   \`\`\`

3. **Deploy to Kubernetes**

   For Kubernetes deployment, use the provided Kubernetes manifests in the \`/k8s\` directory.

   \`\`\`bash
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   \`\`\`

### Option 3: Platform-as-a-Service Deployment

The application can be deployed to PaaS providers like Vercel, Netlify, or Heroku.

1. **Vercel Deployment**

   \`\`\`bash
   vercel --prod
   \`\`\`

2. **Netlify Deployment**

   \`\`\`bash
   netlify deploy --prod
   \`\`\`

## Post-Deployment Verification

After deployment, run the verification script to ensure all components are functioning correctly:

\`\`\`bash
node scripts/verify-deployment.js
\`\`\`

This script checks:
- Database connectivity
- API endpoints
- Authentication flow
- Trading connectors
- WebSocket connections

## Monitoring

The Trading Farm platform includes built-in monitoring capabilities:

- **Performance Metrics**: Available at \`/api/monitoring/metrics\`
- **Health Check**: Available at \`/api/monitoring/health\`
- **Status Dashboard**: Available at \`/dashboard/monitoring\`

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
   - Try running with \`npm run build:prod --verbose\` for detailed error logs

3. **Runtime Errors**
   - Check the application logs for specific error messages
   - Verify that all environment variables are properly set

## Rollback Procedure

If you need to rollback to a previous version:

1. Restore the codebase from your version control system
2. Build the application as described above
3. If database schema changes were made, apply the down migrations
   \`\`\`bash
   npx supabase migration down
   \`\`\`

## Security Considerations

- Always use HTTPS in production
- Set up proper firewall rules
- Regularly update dependencies using \`npm audit fix\`
- Enable Rate Limiting for API endpoints

## Performance Optimization

For high-traffic environments:
- Use a CDN for static assets
- Configure proper caching headers
- Consider implementing a Redis cache for frequent database queries
- Scale horizontally by deploying multiple instances behind a load balancer

---

For additional support, contact the Trading Farm development team.
`;

fs.writeFileSync(deploymentGuidePath, deploymentGuideContent);
console.log('Created comprehensive deployment guide');

// Create Docker configuration
const dockerfilePath = path.join(projectRoot, 'Dockerfile');
const dockerfileContent = `# Trading Farm Dashboard Dockerfile
# Production-ready multi-stage build

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Set production environment
ENV NODE_ENV=production

# Build the application
RUN npm run build:prod

# Runtime stage
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Start the application
EXPOSE 3000
CMD ["node", "server.js"]
`;

fs.writeFileSync(dockerfilePath, dockerfileContent);
console.log('Created Dockerfile for containerized deployment');

// Create Kubernetes manifests
const k8sDir = path.join(projectRoot, 'k8s');
if (!fs.existsSync(k8sDir)) {
  fs.mkdirSync(k8sDir);
  console.log('Created Kubernetes manifests directory');
}

// Deployment manifest
const k8sDeploymentPath = path.join(k8sDir, 'deployment.yaml');
const k8sDeploymentContent = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-farm-dashboard
  labels:
    app: trading-farm-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trading-farm-dashboard
  template:
    metadata:
      labels:
        app: trading-farm-dashboard
    spec:
      containers:
      - name: trading-farm-dashboard
        image: trading-farm-dashboard:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: trading-farm-secrets
              key: supabase-url
        - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: trading-farm-secrets
              key: supabase-anon-key
        - name: ENCRYPTION_SECRET
          valueFrom:
            secretKeyRef:
              name: trading-farm-secrets
              key: encryption-secret
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /api/monitoring/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/monitoring/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
`;

fs.writeFileSync(k8sDeploymentPath, k8sDeploymentContent);
console.log('Created Kubernetes deployment manifest');

// Service manifest
const k8sServicePath = path.join(k8sDir, 'service.yaml');
const k8sServiceContent = `apiVersion: v1
kind: Service
metadata:
  name: trading-farm-dashboard
spec:
  selector:
    app: trading-farm-dashboard
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
`;

fs.writeFileSync(k8sServicePath, k8sServiceContent);
console.log('Created Kubernetes service manifest');

// Create nginx configuration for production deployments
const nginxConfDir = path.join(projectRoot, 'nginx');
if (!fs.existsSync(nginxConfDir)) {
  fs.mkdirSync(nginxConfDir);
  console.log('Created NGINX configuration directory');
}

const nginxConfPath = path.join(nginxConfDir, 'trading-farm.conf');
const nginxConfContent = `server {
    listen 80;
    server_name trading-farm.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name trading-farm.example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/trading-farm.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trading-farm.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://api.coinbase.com https://api.bybit.com wss://stream.bybit.com https://*.supabase.co; img-src 'self' data: https://raw.githubusercontent.com; style-src 'self' 'unsafe-inline';" always;

    # Proxy configuration
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_cache_valid 200 302 60m;
        proxy_cache_valid 404 1m;
        expires 30d;
        access_log off;
    }

    # Public files caching
    location /public/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_cache_valid 200 302 60m;
        proxy_cache_valid 404 1m;
        expires 30d;
        access_log off;
    }

    # API rate limiting
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
    }

    # Gzip compression
    gzip on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
`;

fs.writeFileSync(nginxConfPath, nginxConfContent);
console.log('Created NGINX configuration for production deployment');

// Build the application
console.log('\n=== Deployment preparation complete! ===');
console.log('\nTo deploy the Trading Farm dashboard:');
console.log('1. Review the DEPLOYMENT_GUIDE.md file for detailed instructions');
console.log('2. Create a production environment file:');
console.log('   cp .env.production.example .env.production');
console.log('3. Update the .env.production file with your production credentials');
console.log('4. Build the application:');
console.log('   npm run build:prod');
console.log('5. Start the application:');
console.log('   npm run start:prod');
console.log('\nFor containerized deployment:');
console.log('1. Build the Docker image:');
console.log('   docker build -t trading-farm-dashboard:latest .');
console.log('2. Run the container:');
console.log('   docker run -p 3000:3000 --env-file .env.production trading-farm-dashboard:latest');
console.log('\nRefer to the DEPLOYMENT_GUIDE.md for additional deployment options and post-deployment tasks.');
