@echo off
echo ============================================
echo       TRADING FARM STAGING DEPLOYMENT
echo ============================================

:: Set variables
set PROJECT_DIR=%~dp0..
set LOG_FILE=%PROJECT_DIR%\deployment-staging.log
set BUILD_DIR=%PROJECT_DIR%\.next
set ENV_FILE=%PROJECT_DIR%\.env.staging

:: Create log file if it doesn't exist
if not exist "%LOG_FILE%" type nul > "%LOG_FILE%"

:: Log function
call :log "Starting staging deployment process..."

:: Step 1: Verify environment
call :log "Verifying environment configuration..."
if not exist "%ENV_FILE%" (
    call :error "Staging environment file not found: %ENV_FILE%"
    exit /b 1
)
copy "%ENV_FILE%" "%PROJECT_DIR%\.env" /Y
call :log "Environment configuration verified"

:: Step 2: Install dependencies
call :log "Installing dependencies..."
cd /d "%PROJECT_DIR%"
call npm ci --legacy-peer-deps
if %ERRORLEVEL% neq 0 (
    call :error "Failed to install dependencies"
    exit /b 1
)
call :log "Dependencies installed successfully"

:: Step 3: Apply database migrations
call :log "Applying database migrations..."
call npx supabase migration up
if %ERRORLEVEL% neq 0 (
    call :error "Failed to apply database migrations"
    exit /b 1
)
call :log "Database migrations applied successfully"

:: Step 4: Update database types
call :log "Generating database type definitions..."
call npx supabase gen types typescript --local > src/types/database.types.ts
if %ERRORLEVEL% neq 0 (
    call :error "Failed to generate database types"
    exit /b 1
)
call :log "Database types generated successfully"

:: Step 5: Run tests
call :log "Running tests..."
call npm run test
if %ERRORLEVEL% neq 0 (
    call :error "Tests failed"
    exit /b 1
)
call :log "Tests passed successfully"

:: Step 6: Build application
call :log "Building application for staging..."
set NODE_ENV=production
call npm run build
if %ERRORLEVEL% neq 0 (
    call :error "Build failed"
    exit /b 1
)
call :log "Build completed successfully"

:: Step 7: Verify build output
if not exist "%BUILD_DIR%" (
    call :error "Build directory not found after build process"
    exit /b 1
)

:: Step 8: Deploy to staging
call :log "Deploying to staging..."

:: Replace with your actual deployment command for staging
:: Examples:
:: call npx vercel
:: timeout /t 3 >nul

:: For this example, we'll simulate a successful staging deployment
timeout /t 2 >nul
call :log "Deployment to staging completed successfully!"

:: Log deployment metadata
echo ------------------------------------ >> "%LOG_FILE%"
echo DEPLOYMENT METADATA >> "%LOG_FILE%"
echo Environment: Staging >> "%LOG_FILE%"
echo Timestamp: %date% %time% >> "%LOG_FILE%"
echo ------------------------------------ >> "%LOG_FILE%"

call :log "Deployment complete! Visit https://staging.tradingfarm.com to verify."
exit /b 0

:: Functions
:log
echo [%date% %time%] %~1
echo [%date% %time%] %~1 >> "%LOG_FILE%"
exit /b 0

:error
echo ERROR: %~1
echo [%date% %time%] ERROR: %~1 >> "%LOG_FILE%"
exit /b 0
