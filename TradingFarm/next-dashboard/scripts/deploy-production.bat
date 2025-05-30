@echo off
echo ============================================
echo      TRADING FARM PRODUCTION DEPLOYMENT
echo ============================================

:: Set variables
set PROJECT_DIR=%~dp0..
set LOG_FILE=%PROJECT_DIR%\deployment-production.log
set BUILD_DIR=%PROJECT_DIR%\.next
set ENV_FILE=%PROJECT_DIR%\.env.production

:: Create log file if it doesn't exist
if not exist "%LOG_FILE%" type nul > "%LOG_FILE%"

:: Log function
call :log "Starting production deployment process..."

:: Confirm production deployment
echo Are you sure you want to deploy to PRODUCTION? This will affect live users. [y/N]
set /p CONFIRM=
if /I not "%CONFIRM%"=="y" (
    call :log "Deployment cancelled by user"
    exit /b 0
)

:: Step 1: Verify environment
call :log "Verifying environment configuration..."
if not exist "%ENV_FILE%" (
    call :error "Production environment file not found: %ENV_FILE%"
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

:: Step 6: Run type checks
call :log "Running type checks..."
call npm run typecheck
if %ERRORLEVEL% neq 0 (
    call :error "Type checking failed"
    exit /b 1
)
call :log "Type checks passed successfully"

:: Step 7: Build application
call :log "Building application for production..."
set NODE_ENV=production
call npm run build
if %ERRORLEVEL% neq 0 (
    call :error "Build failed"
    exit /b 1
)
call :log "Build completed successfully"

:: Step 8: Verify build output
if not exist "%BUILD_DIR%" (
    call :error "Build directory not found after build process"
    exit /b 1
)

:: Step 9: Deploy to production
call :log "Deploying to production..."

:: Replace with your actual deployment command for production
:: Examples:
:: call npx vercel --prod
:: call netlify deploy --prod
:: xcopy /E /Y ".next" "\\production-server\deployment\"

:: For this example, we'll simulate a successful production deployment
timeout /t 3 >nul
call :log "Deployment to production completed successfully!"

:: Log deployment metadata
for /f "tokens=*" %%a in ('git rev-parse HEAD') do set COMMIT_HASH=%%a
for /f "tokens=*" %%a in ('git config user.name') do set DEPLOYED_BY=%%a

echo ------------------------------------ >> "%LOG_FILE%"
echo DEPLOYMENT METADATA >> "%LOG_FILE%"
echo Environment: Production >> "%LOG_FILE%"
echo Commit: %COMMIT_HASH% >> "%LOG_FILE%"
echo Deployed by: %DEPLOYED_BY% >> "%LOG_FILE%"
echo Timestamp: %date% %time% >> "%LOG_FILE%"
echo ------------------------------------ >> "%LOG_FILE%"

call :log "Deployment complete! Visit https://dashboard.tradingfarm.com to verify."
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
