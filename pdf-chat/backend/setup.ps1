# PowerShell script to set up Python backend for PDF Chat

Write-Host "Setting up PDF Chat Backend..." -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.8+ from https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Create virtual environment
Write-Host "`nCreating virtual environment..." -ForegroundColor Cyan
python -m venv venv

# Activate virtual environment and install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Create data directories
Write-Host "`nCreating data directories..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "data\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "data\vector_store" | Out-Null

Write-Host "`n✓ Backend setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Copy your Streamlit RAG code into the backend folder"
Write-Host "2. Update the services files with your RAG logic"
Write-Host "3. Add your OPENAI_API_KEY to the .env file"
Write-Host "4. Run 'pnpm dev' from the project root to start both servers"
