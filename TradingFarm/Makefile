# Trading Farm Makefile
# One-click deployment and management commands

.PHONY: init up down restart logs clean build rebuild status help

# Default target
.DEFAULT_GOAL := help

# Variables
ENV_FILE := .env
EXAMPLE_ENV_FILE := .env.example
DOCKER_COMPOSE_FILE := docker-compose.yml
JWT_SECRET_LENGTH := 32

# Colors
COLOR_RESET := \033[0m
COLOR_GREEN := \033[0;32m
COLOR_BLUE := \033[0;34m
COLOR_YELLOW := \033[0;33m
COLOR_RED := \033[0;31m

# Target help information
define HELP_MESSAGE
$(COLOR_BLUE)Trading Farm Deployment Commands$(COLOR_RESET)

$(COLOR_GREEN)make init$(COLOR_RESET)      Initialize environment (generate .env, check deps)
$(COLOR_GREEN)make up$(COLOR_RESET)        Start all services (one-click deployment)
$(COLOR_GREEN)make down$(COLOR_RESET)      Stop all services
$(COLOR_GREEN)make restart$(COLOR_RESET)   Restart all services
$(COLOR_GREEN)make logs$(COLOR_RESET)      View logs from all services
$(COLOR_GREEN)make build$(COLOR_RESET)     Build all services without starting
$(COLOR_GREEN)make rebuild$(COLOR_RESET)   Rebuild and restart all services
$(COLOR_GREEN)make clean$(COLOR_RESET)     Remove all containers, networks, and volumes
$(COLOR_GREEN)make status$(COLOR_RESET)    Show status of all services
$(COLOR_GREEN)make help$(COLOR_RESET)      Show this help message
endef
export HELP_MESSAGE

# Initialize environment
init:
	@echo "$(COLOR_BLUE)Initializing Trading Farm environment...$(COLOR_RESET)"
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(COLOR_YELLOW)Creating .env file from example...$(COLOR_RESET)"; \
		cp $(EXAMPLE_ENV_FILE) $(ENV_FILE); \
		echo "$(COLOR_YELLOW)Generating random JWT secret...$(COLOR_RESET)"; \
		random_secret=$$(openssl rand -base64 $(JWT_SECRET_LENGTH) | tr -d '\n'); \
		sed -i "s/your_super_secret_jwt_key_change_in_production/$$random_secret/g" $(ENV_FILE); \
		echo "$(COLOR_GREEN)Environment file created. Edit .env to set your API keys.$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_YELLOW).env file already exists. Skipping initialization.$(COLOR_RESET)"; \
	fi
	@echo "$(COLOR_BLUE)Checking Docker and Docker Compose installation...$(COLOR_RESET)"
	@if command -v docker >/dev/null 2>&1; then \
		echo "$(COLOR_GREEN)Docker is installed.$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_RED)Docker is not installed. Please install Docker first.$(COLOR_RESET)"; \
		exit 1; \
	fi
	@if command -v docker-compose >/dev/null 2>&1; then \
		echo "$(COLOR_GREEN)Docker Compose is installed.$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_RED)Docker Compose is not installed. Please install Docker Compose first.$(COLOR_RESET)"; \
		exit 1; \
	fi
	@echo "$(COLOR_GREEN)Initialization complete. Run 'make up' to start all services.$(COLOR_RESET)"

# Start all services
up:
	@echo "$(COLOR_BLUE)Starting all Trading Farm services...$(COLOR_RESET)"
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(COLOR_YELLOW).env file not found. Running initialization first...$(COLOR_RESET)"; \
		$(MAKE) init; \
	fi
	docker-compose up -d
	@echo "$(COLOR_GREEN)Trading Farm is now running!$(COLOR_RESET)"
	@echo "$(COLOR_GREEN)Frontend: http://localhost:3000$(COLOR_RESET)"
	@echo "$(COLOR_GREEN)Backend API: http://localhost:8000$(COLOR_RESET)"
	@echo "$(COLOR_GREEN)Supabase Studio: http://localhost:3002$(COLOR_RESET)"
	@echo "$(COLOR_GREEN)Windmill: http://localhost:8080$(COLOR_RESET)"

# Stop all services
down:
	@echo "$(COLOR_BLUE)Stopping all Trading Farm services...$(COLOR_RESET)"
	docker-compose down
	@echo "$(COLOR_GREEN)All services stopped.$(COLOR_RESET)"

# Restart all services
restart:
	@echo "$(COLOR_BLUE)Restarting all Trading Farm services...$(COLOR_RESET)"
	docker-compose restart
	@echo "$(COLOR_GREEN)All services restarted.$(COLOR_RESET)"

# View logs from all services
logs:
	@echo "$(COLOR_BLUE)Viewing logs from all services (press Ctrl+C to exit)...$(COLOR_RESET)"
	docker-compose logs -f

# Build all services without starting
build:
	@echo "$(COLOR_BLUE)Building all Trading Farm services...$(COLOR_RESET)"
	docker-compose build
	@echo "$(COLOR_GREEN)Build complete. Run 'make up' to start the services.$(COLOR_RESET)"

# Rebuild and restart all services
rebuild:
	@echo "$(COLOR_BLUE)Rebuilding and restarting all Trading Farm services...$(COLOR_RESET)"
	docker-compose down
	docker-compose build
	docker-compose up -d
	@echo "$(COLOR_GREEN)Rebuild and restart complete.$(COLOR_RESET)"

# Remove all containers, networks, and volumes
clean:
	@echo "$(COLOR_RED)WARNING: This will remove all containers, networks, and volumes.$(COLOR_RESET)"
	@echo "$(COLOR_RED)All data will be lost. Are you sure? (y/N)$(COLOR_RESET)"
	@read -p "" confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "$(COLOR_BLUE)Cleaning up Trading Farm resources...$(COLOR_RESET)"; \
		docker-compose down -v; \
		echo "$(COLOR_GREEN)Clean up complete.$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_YELLOW)Clean up cancelled.$(COLOR_RESET)"; \
	fi

# Show status of all services
status:
	@echo "$(COLOR_BLUE)Checking status of all Trading Farm services...$(COLOR_RESET)"
	docker-compose ps

# Show help message
help:
	@echo "$$HELP_MESSAGE"
