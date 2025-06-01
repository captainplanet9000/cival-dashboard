@echo off
echo =======================================
echo Trading Farm Production Migration Script
echo =======================================
echo.
echo This script will apply all database migrations to the production environment.
echo.
echo Ensure you have:
echo 1. Proper production credentials for Supabase
echo 2. Backed up the current production database
echo 3. Tested migrations on staging environment
echo.
echo Press CTRL+C to cancel or any key to continue...
pause > nul

echo.
echo Setting environment to production...
set NODE_ENV=production

echo.
echo Running database migrations...
cd ..\
npx supabase db push

echo.
echo Generating TypeScript types from schema...
npx supabase gen types typescript --project-id %SUPABASE_PROJECT_ID% > src/types/database.types.ts

echo.
echo Verifying database migrations...
npx supabase db diff

echo.
echo =======================================
echo Migration completed
echo =======================================
echo.
echo Press any key to exit...
pause > nul
