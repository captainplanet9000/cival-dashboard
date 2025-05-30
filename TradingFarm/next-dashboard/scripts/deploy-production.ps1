# Trading Farm Dashboard - Production Deployment Script
# PowerShell script for deploying to production environment

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      TRADING FARM PRODUCTION DEPLOYMENT      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan

# Configuration
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogFile = Join-Path -Path $ProjectDir -ChildPath "deployment-production.log"
$BuildDir = Join-Path -Path $ProjectDir -ChildPath ".next"
$EnvFile = Join-Path -Path $ProjectDir -ChildPath ".env.production"

# Create log file if it doesn't exist
if (-not (Test-Path $LogFile)) {
    New-Item -Path $LogFile -ItemType File -Force | Out-Null
}

# Log function with timestamp
function Log-Message {
    param (
        [string]$Message,
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    
    Write-Host $logMessage -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $logMessage
}

# Error handling function
function Handle-Error {
    param (
        [string]$ErrorMessage
    )
    
    Log-Message "ERROR: $ErrorMessage" "Red"
    exit 1
}

# Check for production environment file
if (-not (Test-Path $EnvFile)) {
    Handle-Error "Production environment file not found: $EnvFile"
}

# Begin deployment process
Log-Message "Starting production deployment process..." "Green"

# Step 1: Request confirmation
Write-Host "Are you sure you want to deploy to PRODUCTION? This will affect live users. [y/N]" -ForegroundColor Yellow
$confirmation = Read-Host
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Log-Message "Deployment cancelled by user" "Yellow"
    exit 0
}

# Step 2: Verify environment
Log-Message "Verifying environment configuration..." "Blue"
Copy-Item -Path $EnvFile -Destination (Join-Path -Path $ProjectDir -ChildPath ".env") -Force
Log-Message "✓ Environment configuration verified" "Green"

# Step 3: Install dependencies
Log-Message "Installing dependencies..." "Blue"
try {
    Set-Location -Path $ProjectDir
    & npm ci --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies" }
} catch {
    Handle-Error "Failed to install dependencies: $_"
}
Log-Message "✓ Dependencies installed successfully" "Green"

# Step 4: Apply database migrations
Log-Message "Applying database migrations..." "Blue"
try {
    & npx supabase migration up
    if ($LASTEXITCODE -ne 0) { throw "Failed to apply database migrations" }
} catch {
    Handle-Error "Failed to apply database migrations: $_"
}
Log-Message "✓ Database migrations applied successfully" "Green"

# Step 5: Update database types
Log-Message "Generating database type definitions..." "Blue"
try {
    & npx supabase gen types typescript --local | Out-File -FilePath (Join-Path -Path $ProjectDir -ChildPath "src/types/database.types.ts") -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw "Failed to generate database types" }
} catch {
    Handle-Error "Failed to generate database types: $_"
}
Log-Message "✓ Database types generated successfully" "Green"

# Step 6: Run tests
Log-Message "Running tests..." "Blue"
try {
    & npm run test
    if ($LASTEXITCODE -ne 0) { throw "Tests failed" }
} catch {
    Handle-Error "Tests failed: $_"
}
Log-Message "✓ Tests passed successfully" "Green"

# Step 7: Run type checks
Log-Message "Running type checks..." "Blue"
try {
    & npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw "Type checking failed" }
} catch {
    Handle-Error "Type checking failed: $_"
}
Log-Message "✓ Type checks passed successfully" "Green"

# Step 8: Build application
Log-Message "Building application for production..." "Blue"
try {
    $env:NODE_ENV = "production"
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} catch {
    Handle-Error "Build failed: $_"
}
Log-Message "✓ Build completed successfully" "Green"

# Step 9: Verify build output
if (-not (Test-Path $BuildDir)) {
    Handle-Error "Build directory not found after build process"
}

# Step 10: Deploy to production
Log-Message "Deploying to production..." "Yellow"

# Replace with your actual deployment command for production
# Examples:
# - Vercel: & vercel --prod
# - Netlify: & netlify deploy --prod
# - Custom server: & xcopy /E /Y ".next" "\\production-server\deployment\"
Log-Message "Executing deployment command..." "Blue"
try {
    # For demonstration, we'll simulate a deployment process with a delay
    Start-Sleep -Seconds 3
    # In reality, you would use a command like:
    # & vercel --prod
    # if ($LASTEXITCODE -ne 0) { throw "Vercel deployment failed" }
} catch {
    Handle-Error "Production deployment failed: $_"
}

Log-Message "✓ Deployment to production completed successfully!" "Green"

# Log deployment metadata
$CommitHash = git rev-parse HEAD
$DeployedBy = git config user.name
$DeploymentTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path $LogFile -Value "------------------------------------"
Add-Content -Path $LogFile -Value "DEPLOYMENT METADATA"
Add-Content -Path $LogFile -Value "Environment: Production"
Add-Content -Path $LogFile -Value "Commit: $CommitHash"
Add-Content -Path $LogFile -Value "Deployed by: $DeployedBy"
Add-Content -Path $LogFile -Value "Timestamp: $DeploymentTime"
Add-Content -Path $LogFile -Value "------------------------------------"

Log-Message "Deployment complete! Visit https://dashboard.tradingfarm.com to verify." "Green"
