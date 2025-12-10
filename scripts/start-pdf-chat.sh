#!/bin/bash

# PDF Chat - Quick Start Script
# This script starts both the FastAPI backend and Next.js frontend

echo "🚀 Starting PDF Chat Services..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10 or higher."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="3.10"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Python $REQUIRED_VERSION or higher is required. You have $PYTHON_VERSION"
    exit 1
fi

echo "✅ Python $PYTHON_VERSION detected"
echo ""

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p data/uploads
echo "✅ Uploads directory ready"
echo ""

# Start FastAPI backend
echo "🐍 Starting FastAPI backend..."
cd pdf-chat/backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f ".dependencies_installed" ]; then
    echo "Installing Python dependencies (this may take a few minutes)..."
    pip install -r requirements.txt
    python -m spacy download en_core_sci_md
    touch .dependencies_installed
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in pdf-chat/backend/"
    echo "Please create .env file with required credentials:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_KEY (service role key)"
    echo "  - CEREBRAS_API_KEY"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi

# Start FastAPI in background
echo "Starting FastAPI server on port 8000..."
uvicorn main:app --reload --port 8000 > ../../logs/fastapi.log 2>&1 &
FASTAPI_PID=$!
echo "✅ FastAPI started (PID: $FASTAPI_PID)"
echo "   Logs: logs/fastapi.log"
echo ""

# Go back to root
cd ../..

# Wait a moment for FastAPI to start
sleep 3

# Check if FastAPI is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ FastAPI is responding"
else
    echo "⚠️  FastAPI may not be ready yet. Check logs/fastapi.log if you encounter issues."
fi
echo ""

# Start Next.js
echo "⚡ Starting Next.js development server..."
echo "   Navigate to: http://localhost:3000/pdf-chat"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C to kill both processes
trap "echo ''; echo '🛑 Stopping services...'; kill $FASTAPI_PID 2>/dev/null; exit" INT

# Start Next.js (this will block)
npm run dev

# If we get here, Next.js was stopped
kill $FASTAPI_PID 2>/dev/null
echo "✅ All services stopped"
