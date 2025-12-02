#!/bin/bash
# Fix localhost setup for macOS - Upgrade WeasyPrint and verify dependencies

set -e

echo "🔧 Fixing localhost setup for PDF export..."
echo ""

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please create it first:"
    echo "   python3 -m venv .venv"
    exit 1
fi

echo "1. Activating virtual environment..."
source .venv/bin/activate

echo "2. Upgrading WeasyPrint to fix PDF export issues..."
pip install --upgrade "weasyprint>=63.0,<64.0"

echo "3. Verifying WeasyPrint installation..."
WEASYPRINT_VERSION=$(python -c "import weasyprint; print(weasyprint.__version__)" 2>&1)
echo "   ✓ WeasyPrint version: $WEASYPRINT_VERSION"

echo "4. Checking macOS system dependencies..."
if command -v brew &> /dev/null; then
    if brew list cairo &> /dev/null && brew list pango &> /dev/null && brew list gdk-pixbuf &> /dev/null; then
        echo "   ✓ System dependencies installed"
    else
        echo "   ⚠ Missing system dependencies. Installing..."
        brew install cairo pango gdk-pixbuf libffi
    fi
else
    echo "   ⚠ Homebrew not found. Please install system dependencies manually:"
    echo "      brew install cairo pango gdk-pixbuf libffi"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Clear browser cache"
echo "3. Try exporting a PDF again"

