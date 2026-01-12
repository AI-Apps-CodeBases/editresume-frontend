#!/bin/bash
# Start PostgreSQL only
docker compose -f docker-compose.local.yml up -d db

# Wait for DB to be ready
sleep 2

# Create venv if it doesn't exist (using Python 3.12 as required)
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment with Python 3.12..."
    python3.12 -m venv .venv || python3 -m venv .venv
fi

# Activate venv
source .venv/bin/activate

# Install dependencies if requirements.txt is newer than .venv/.installed
if [ ! -f ".venv/.installed" ] || [ "requirements.txt" -nt ".venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt || {
        echo "Warning: Some dependencies failed to install. Continuing anyway..."
        echo "Note: PyMuPDF is optional - app will use pdfplumber/PyPDF2 fallbacks"
    }
    touch .venv/.installed
fi

# Run backend
python uvicorn_config.py