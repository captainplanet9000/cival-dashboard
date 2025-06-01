@echo off
REM Start Vault Banking System Server
echo Starting Vault Banking System Server...
echo.
echo This will start the Vault Banking System on http://localhost:9387
echo.
echo To use the system, either:
echo  1. Go directly to http://localhost:9387 in your browser
echo  2. Click on "Vault Banking" in the Trading Farm dashboard navigation
echo.
echo Press Ctrl+C to stop the server
echo.

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    if exist .venv\Scripts\activate.bat (
        call .venv\Scripts\activate.bat
    )
)

REM Run the vault banking server
python run_vault_banking.py --debug

REM Deactivate virtual environment
call deactivate

pause
