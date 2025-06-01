#!/bin/bash

# Production Deployment Script for Trading Farm Dashboard
# This script handles database migrations and deployment to production environments

echo "╔══════════════════════════════════════════════╗"
echo "║      TRADING FARM PRODUCTION DEPLOYMENT      ║"
echo "╚══════════════════════════════════════════════╝"

# Define colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_DIR/deployment.log"
BRANCH="main"
BUILD_DIR="$PROJECT_DIR/.next"
ENV_FILE="$PROJECT_DIR/.env.production"

# Ensure log file exists
touch $LOG_FILE

# Log function with timestamp
log() {
  local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  echo -e "$message" | tee -a $LOG_FILE
}

# Error handling function
handle_error() {
  log "${RED}ERROR: $1${NC}"
  exit 1
}

# Check for production environment
if [ ! -f "$ENV_FILE" ]; then
  handle_error "Production environment file not found: $ENV_FILE"
fi

# Begin deployment process
log "${GREEN}Starting production deployment process...${NC}"

# Step 1: Update codebase from git
log "${BLUE}Pulling latest changes from $BRANCH branch...${NC}"
cd $PROJECT_DIR
git fetch origin || handle_error "Failed to fetch from remote repository"
git checkout $BRANCH || handle_error "Failed to checkout $BRANCH branch"
git pull origin $BRANCH || handle_error "Failed to pull latest changes"
log "${GREEN}✓ Updated codebase successfully${NC}"

# Step 2: Install dependencies
log "${BLUE}Installing dependencies...${NC}"
npm ci --legacy-peer-deps || handle_error "Failed to install dependencies"
log "${GREEN}✓ Dependencies installed successfully${NC}"

# Step 3: Apply database migrations
log "${BLUE}Applying database migrations...${NC}"
npx supabase migration up || handle_error "Failed to apply database migrations"
log "${GREEN}✓ Database migrations applied successfully${NC}"

# Step 4: Update database types
log "${BLUE}Generating database type definitions...${NC}"
npx supabase gen types typescript --local > src/types/database.types.ts || handle_error "Failed to generate database types"
log "${GREEN}✓ Database types generated successfully${NC}"

# Step 5: Run tests
log "${BLUE}Running tests...${NC}"
npm run test || handle_error "Tests failed"
log "${GREEN}✓ Tests passed successfully${NC}"

# Step 6: Check build output
log "${BLUE}Building application for production...${NC}"
npm run build || handle_error "Build failed"
log "${GREEN}✓ Build completed successfully${NC}"

# Step 7: Verify build output
if [ ! -d "$BUILD_DIR" ]; then
  handle_error "Build directory not found after build process"
fi

# Step 8: Deploy to production
log "${YELLOW}Deploying to production...${NC}"
echo -e "${YELLOW}Are you sure you want to deploy to PRODUCTION? This will affect live users. [y/N]${NC}"
read -r confirmation
if [[ $confirmation =~ ^[Yy]$ ]]; then
  log "${BLUE}Confirmed. Deploying to production...${NC}"
  # Replace with your actual deployment command - examples below:
  # - Vercel: vercel --prod
  # - AWS: aws s3 sync .next s3://your-bucket-name/ --delete
  # - Custom: rsync -avz --delete .next/ user@your-server:/path/to/deployment/
  npm run deploy:production || handle_error "Production deployment failed"
  
  log "${GREEN}✓ Deployment to production completed successfully!${NC}"
  
  # Log deployment metadata
  COMMIT_HASH=$(git rev-parse HEAD)
  DEPLOYED_BY=$(git config user.name)
  DEPLOYMENT_TIME=$(date +'%Y-%m-%d %H:%M:%S')
  
  echo "------------------------------------" >> $LOG_FILE
  echo "DEPLOYMENT METADATA" >> $LOG_FILE
  echo "Environment: Production" >> $LOG_FILE
  echo "Commit: $COMMIT_HASH" >> $LOG_FILE
  echo "Deployed by: $DEPLOYED_BY" >> $LOG_FILE
  echo "Timestamp: $DEPLOYMENT_TIME" >> $LOG_FILE
  echo "------------------------------------" >> $LOG_FILE
  
  log "${GREEN}Deployment complete! Visit https://dashboard.tradingfarm.com to verify.${NC}"
else
  log "${YELLOW}Deployment cancelled by user${NC}"
  exit 0
fi
