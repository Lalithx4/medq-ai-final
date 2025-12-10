#!/bin/bash
# Bash script to set up Python backend for PDF Chat

echo "Setting up PDF Chat Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "✗ Python not found. Please install Python 3.8+"
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Create virtual environment
echo -e "\nCreating virtual environment..."
python3 -m venv venv

# Activate virtual environment and install dependencies
echo "Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create data directories
echo -e "\nCreating data directories..."
mkdir -p data/uploads
mkdir -p data/vector_store

echo -e "\n✓ Backend setup complete!"
echo -e "\nNext steps:"
echo "1. Copy your Streamlit RAG code into the backend folder"
echo "2. Update the services files with your RAG logic"
echo "3. Add your OPENAI_API_KEY to the .env file"
echo "4. Run 'pnpm dev' from the project root to start both servers"
