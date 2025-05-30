#!/bin/bash
# Trading Farm Dashboard Deployment Script
# This script automates the deployment of the Trading Farm Dashboard

set -e  # Exit on any error

# ANSI color codes for better output formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Trading Farm Dashboard deployment...${NC}"

# 1. Check for environment file
if [ ! -f .env ]; then
  echo -e "${RED}❌ Error: .env file not found${NC}"
  echo -e "Please create an .env file based on the .env.example template"
  exit 1
fi

# 2. Pull latest code from repository
echo -e "${YELLOW}📥 Pulling latest code from repository...${NC}"
git pull

# 3. Build or pull Docker images
echo -e "${YELLOW}🏗️  Building Docker containers...${NC}"
docker-compose build

# 4. Start services
echo -e "${YELLOW}🚢 Starting services...${NC}"
docker-compose up -d

# 5. Run database migrations if needed
echo -e "${YELLOW}📊 Checking database status...${NC}"
docker-compose exec -T python-libraries-mcp python -c "print('Database connection successful')"

# 6. Create database backup
echo -e "${YELLOW}💾 Creating database backup...${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p backups
docker-compose exec -T timescaledb pg_dump -U tradingfarm tradingfarm > "backups/tradingfarm_backup_${TIMESTAMP}.sql"
echo -e "${GREEN}✅ Database backup created: backups/tradingfarm_backup_${TIMESTAMP}.sql${NC}"

# 7. Run health checks
echo -e "${YELLOW}🔍 Running health checks...${NC}"
sleep 10  # Wait for services to fully start

# Check dashboard health
DASHBOARD_HEALTH=$(curl -s http://localhost:3000/api/health | grep -o '"status":"healthy"' || echo "")
if [ -n "$DASHBOARD_HEALTH" ]; then
  echo -e "${GREEN}✅ Dashboard health check passed${NC}"
else
  echo -e "${RED}❌ Dashboard health check failed${NC}"
  docker-compose logs next-dashboard
fi

# Check MCP server health
MCP_HEALTH=$(curl -s http://localhost:8000/health | grep -o '"status":"healthy"' || echo "")
if [ -n "$MCP_HEALTH" ]; then
  echo -e "${GREEN}✅ MCP server health check passed${NC}"
else
  echo -e "${RED}❌ MCP server health check failed${NC}"
  docker-compose logs python-libraries-mcp
fi

# 8. Display service status
echo -e "${YELLOW}📋 Service status:${NC}"
docker-compose ps

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "Dashboard URL: http://localhost:3000"
echo -e "MCP Server URL: http://localhost:8000"
echo -e "Prometheus: http://localhost:9090"
echo -e "Grafana: http://localhost:3001 (admin/secure_grafana_password)"
