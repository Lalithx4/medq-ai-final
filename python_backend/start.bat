@echo off
REM Start War Room Python Backend
echo Starting War Room Python Backend...
echo.

cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies (this may take a minute)...
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Try running manually: pip install -r requirements.txt
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Please create .env with your API keys:
    echo   GOOGLE_GENERATIVE_AI_API_KEY=your_key
    echo   or
    echo   CEREBRAS_API_KEY=your_key
    echo.
)

REM Start the server
echo.
echo ========================================
echo War Room Python Backend
echo ========================================
echo Running on: http://localhost:8000
echo Press Ctrl+C to stop
echo ========================================
echo.

python war_room_api.py
